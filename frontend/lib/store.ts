import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.')
    if (!payload) return true

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (!decoded?.exp) return true

    return decoded.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

interface User {
  id: string
  email: string
  username: string | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  setHasHydrated: (value: boolean) => void
  syncAuthFromStorage: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken || '')
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
      syncAuthFromStorage: () => {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        const validAccessToken = accessToken && !isTokenExpired(accessToken) ? accessToken : null

        if (accessToken && !validAccessToken) {
          localStorage.removeItem('accessToken')
        }

        set((state) => ({
          accessToken: validAccessToken,
          refreshToken: refreshToken || state.refreshToken,
          isAuthenticated: Boolean(validAccessToken),
        }))
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.syncAuthFromStorage()
        state?.setHasHydrated(true)
      },
    }
  )
)

interface Application {
  _id: string
  name: string
  ownerId: string
  appSecret: string

interface Application {
  _id: string
  name: string
  ownerId: string
  appSecret: string
  version: string
  status: string
  userCount: number
  createdAt: string
}

interface AppState {
  selectedApp: Application | null
  applications: Application[]
  loadingApplications: boolean
  setSelectedApp: (app: Application | null) => void
  setApplications: (apps: Application[]) => void
  setLoadingApplications: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedApp: null,
  applications: [],
  loadingApplications: true,
  setSelectedApp: (app) => set({ selectedApp: app }),
  setApplications: (apps) => set({ applications: apps }),
  setLoadingApplications: (loading) => set({ loadingApplications: loading }),
}))
