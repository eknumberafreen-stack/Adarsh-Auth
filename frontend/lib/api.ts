import axios from 'axios'
import React from 'react'
import toast from 'react-hot-toast'
import { useAuthStore, isTokenExpired } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.adarshauth.online/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// ── Token refresh queue ────────────────────────────────────────────────────────
// Prevents multiple simultaneous refresh calls when many API requests fail
// with 401 at the same time. Only ONE refresh is in-flight at any time.
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function notifySubscribers(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function notifySubscribersFailed() {
  refreshSubscribers = []
}

// ── Proactive background refresh timer ─────────────────────────────────────────
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null

function getTokenExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (!decoded?.exp) return null
    return decoded.exp * 1000 - Date.now()
  } catch {
    return null
  }
}

/**
 * Schedules a proactive refresh 60 seconds before the access token expires.
 * This means if the token lasts 15 minutes, a silent refresh fires at ~14 min,
 * so the user never encounters a 401 while idle.
 */
export function scheduleProactiveRefresh() {
  // Clear any existing timer
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer)
    proactiveRefreshTimer = null
  }

  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) return

  const remainingMs = getTokenExpiryMs(accessToken)
  if (remainingMs === null || remainingMs <= 0) return

  // Refresh 60 seconds before expiry, but at least 10 seconds from now
  const refreshIn = Math.max(remainingMs - 60_000, 10_000)

  proactiveRefreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken()
      // After a successful refresh, schedule the next one
      scheduleProactiveRefresh()
    } catch {
      // Refresh failed — token is likely invalid, user will be redirected on next action
      console.warn('[Auth] Proactive token refresh failed')
    }
  }, refreshIn)
}

export function clearProactiveRefresh() {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer)
    proactiveRefreshTimer = null
  }
}

// ── Request interceptor ────────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('accessToken')

    // If the token is expired but we have a refresh token, try to refresh
    // proactively BEFORE sending the request (prevents the 401 round-trip)
    if (token && isTokenExpired(token)) {
      const refreshToken = getStoredRefreshToken()
      if (refreshToken && !isRefreshing) {
        try {
          token = await refreshAccessToken()
        } catch {
          // Let the response interceptor handle it
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ── Helpers ────────────────────────────────────────────────────────────────────
function getStoredRefreshToken(): string | null {
  let refreshToken = localStorage.getItem('refreshToken')
  if (refreshToken) return refreshToken

  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.refreshToken || null
  } catch {
    return null
  }
}

export function clearStoredAuth(): void {
  clearProactiveRefresh()
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  })
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getStoredRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  // Use a raw axios call (not our `api` instance) to avoid interceptor loops
  const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
  const { accessToken, refreshToken: nextRefreshToken } = response.data

  localStorage.setItem('accessToken', accessToken)
  if (nextRefreshToken) {
    localStorage.setItem('refreshToken', nextRefreshToken)
  }

  useAuthStore.setState((state) => ({
    user: state.user,
    accessToken,
    refreshToken: nextRefreshToken || refreshToken,
    isAuthenticated: true,
  }))

  // Re-schedule the proactive timer for the new token
  scheduleProactiveRefresh()

  return accessToken
}

/**
 * Determines whether an axios error represents a plan-limit 403 response.
 * Exported for unit/property testing.
 */
export function isPlanLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { response?: { status?: number; data?: { upgradeRequired?: unknown } } }
  return e.response?.status === 403 && e.response?.data?.upgradeRequired === true
}

/**
 * Shows the upgrade prompt toast. Exported for unit/property testing.
 */
export function showUpgradePrompt(): void {
  toast.error(
    (t) =>
      React.createElement(
        'span',
        null,
        'Plan limit reached \u2014 ',
        React.createElement(
          'a',
          {
            href: '/dashboard/billing',
            style: { textDecoration: 'underline', fontWeight: 600 },
            onClick: () => toast.dismiss(t.id),
          },
          'upgrade your plan'
        )
      ),
    { duration: 6000, id: 'plan-limit-reached' }
  )
}

// ── Response interceptor (401 queue-based refresh) ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (isPlanLimitError(error)) {
      showUpgradePrompt()
      return Promise.reject(error)
    }

    const isAuthRoute = originalRequest.url && originalRequest.url.includes('/auth/')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      // If a refresh is already in-flight, queue this request to retry after it completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const accessToken = await refreshAccessToken()
        isRefreshing = false

        // Notify all queued requests that were waiting for the refresh
        notifySubscribers(accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        notifySubscribersFailed()
        clearStoredAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
