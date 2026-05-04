import axios from 'axios'
import React from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.adarshauth.online/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (isPlanLimitError(error)) {
      showUpgradePrompt()
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const accessToken = await refreshAccessToken()

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        clearStoredAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
