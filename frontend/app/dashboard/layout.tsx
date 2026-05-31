'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useAppStore } from '@/lib/store'
import api, { clearStoredAuth, refreshAccessToken } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  Bars3Icon,
  ClockIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  KeyIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'
import { getAvatarInitial, getDisplayName, getEmailPrefix } from '@/lib/username'

const PLAN_STYLE: Record<string, { shell: string; dot: string }> = {
  free: { shell: 'border-slate-500/20 bg-slate-500/5 text-slate-300 hover:bg-slate-500/10', dot: 'bg-slate-400' },
  pro: { shell: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-[0_0_15px_-4px_rgba(99,102,241,0.4)] hover:bg-indigo-500/15', dot: 'bg-indigo-400 animate-pulse' },
  enterprise: { shell: 'border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_15px_-4px_rgba(168,85,247,0.4)] hover:bg-purple-500/15', dot: 'bg-purple-400 animate-pulse' },
  yearly: { shell: 'border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_15px_-4px_rgba(168,85,247,0.4)] hover:bg-purple-500/15', dot: 'bg-purple-400 animate-pulse' },
}

function DashboardBackdrop() {
  return (
    <>
      <ParticleField
        className="pointer-events-none fixed inset-0 opacity-40 z-0"
        particleColor="rgba(139, 92, 246, 0.18)"
        lineColor="rgba(99, 102, 241, 0.12)"
        count={70}
      />
      {/* Premium backdrop mesh gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.1),transparent_35%)]" />
      <div className="pointer-events-none fixed left-1/3 top-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[160px] pulse-glowing" />
      <div className="pointer-events-none fixed right-1/4 bottom-10 h-[450px] w-[450px] rounded-full bg-purple-600/5 blur-[140px] pulse-glowing" />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { accessToken, refreshToken, hasHydrated, user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [planName, setPlanName] = useState<string>('free')
  const [planDisplay, setPlanDisplay] = useState<string>('Free')
  const [checkingSession, setCheckingSession] = useState(true)

  // App Store for global data
  const { applications, setApplications, selectedApp, setSelectedApp, setLoadingApplications } = useAppStore()

  const isOwner = user?.email === (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'donumberafreen@gmail.com')

  const navigation = useMemo(
    () => [
      { name: 'Overview', href: '/dashboard', icon: HomeIcon, group: 'Workspace' },
      { name: 'Applications', href: '/dashboard/applications', icon: CubeIcon, group: 'Workspace' },
      ...(planName !== 'free' ? [{ name: 'Team', href: '/dashboard/team', icon: UserGroupIcon, group: 'Workspace' }] : []),
      { name: 'Licenses', href: '/dashboard/licenses', icon: KeyIcon, group: 'Operations' },
      { name: 'Users', href: '/dashboard/users', icon: UsersIcon, group: 'Operations' },
      { name: 'Sessions', href: '/dashboard/sessions', icon: ClockIcon, group: 'Operations' },
      ...(planName !== 'free' ? [{ name: 'App Registry', href: '/dashboard/offsets', icon: CpuChipIcon, group: 'Operations' }] : []),
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon, group: 'Account' },

      { name: 'My Payments', href: '/dashboard/my-payments', icon: BanknotesIcon, group: 'Account' },
      { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon, group: 'Account' },
      ...(isOwner
        ? [
            { name: 'Developers', href: '/dashboard/developers', icon: UserGroupIcon, group: 'Owner' },
            { name: 'Payments', href: '/dashboard/payments', icon: BanknotesIcon, group: 'Owner' },
          ]
        : []),
      { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, group: 'Account' },
    ],
    [isOwner, planName]
  )

  const groupedNavigation = useMemo(() => {
    return navigation.reduce<Record<string, typeof navigation>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item)
      return acc
    }, {})
  }, [navigation])

  useEffect(() => {
    let active = true

    const ensureSession = async () => {
      if (!hasHydrated) return

      const fetchFreshProfile = async () => {
        try {
          const res = await api.get('/auth/me')
          if (res.data?.user) {
            useAuthStore.setState((state) => ({
              user: state.user ? {
                ...state.user,
                email: res.data.user.email,
                username: res.data.user.username || null,
              } : {
                id: res.data.user.id,
                email: res.data.user.email,
                username: res.data.user.username || null,
              }
            }))
          }
        } catch (err) {
          console.error('Failed to sync fresh profile:', err)
        }
      }

      if (accessToken) {
        await fetchFreshProfile()
        if (active) setCheckingSession(false)
        return
      }

      if (refreshToken) {
        try {
          await refreshAccessToken()
          await fetchFreshProfile()
          if (active) {
            setCheckingSession(false)
            return
          }
        } catch {
          clearStoredAuth()
        }
      }

      if (active) {
        router.replace('/login')
      }
    }

    ensureSession()

    return () => {
      active = false
    }
  }, [accessToken, refreshToken, hasHydrated, router])

  useEffect(() => {
    if (!hasHydrated || !accessToken) return
    api
      .get('/plans/my')
      .then((res) => {
        const plan = res.data?.plan
        if (plan) {
          let name = (plan.name ?? 'free').toLowerCase()
          if (name.startsWith('pro')) {
            name = 'pro'
          } else if (name.startsWith('enterprise') || name === 'yearly' || name === 'enterprice') {
            name = 'enterprise'
          }
          setPlanName(name)
          setPlanDisplay(plan.displayName ?? 'Free')
        }
      })
      .catch(() => {})
  }, [accessToken, hasHydrated])

  // Pre-load applications globally
  useEffect(() => {
    if (!hasHydrated || !accessToken) return
    
    // Only fetch if we haven't loaded applications yet
    if (applications.length === 0) {
      api.get('/applications')
        .then((res) => {
          const apps = res.data.applications || []
          setApplications(apps)
          // Automatically select the first app if none is selected
          if (apps.length > 0 && !selectedApp) {
            setSelectedApp(apps[0])
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingApplications(false)
        })
    } else {
      setLoadingApplications(false)
    }
  }, [accessToken, hasHydrated, applications.length, selectedApp, setApplications, setSelectedApp, setLoadingApplications])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    logout()
    toast.success('Logged out')
    router.push('/login')
  }

  if (!hasHydrated || checkingSession) {
    return <div className="min-h-screen bg-[#030305]" />
  }

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030305] text-slate-400 font-medium">
        Redirecting...
      </div>
    )
  }

  const activePage = navigation.find((item) => item.href === pathname)?.name ?? 'Dashboard'
  const planStyle = PLAN_STYLE[planName] ?? PLAN_STYLE.free

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#030306]">
      <DashboardBackdrop />

      <div className="relative z-10 flex min-h-screen">
        {mobileOpen && <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/[0.05] bg-[#06060c]/60 backdrop-blur-3xl transition-transform duration-300 lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo Area */}
          <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-6">
            <button type="button" onClick={() => router.push('/dashboard')} className="flex items-center gap-3 text-left group">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 group-hover:scale-105">
                <CubeIcon className="h-5 w-5 animate-pulse" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-md group-hover:opacity-60 transition-opacity duration-300" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-indigo-400/85">Control Center</p>
                <p className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">Adarsh Auth</p>
              </div>
            </button>
            <button className="rounded-xl border border-white/5 p-2 text-slate-400 hover:text-white lg:hidden transition-colors" onClick={() => setMobileOpen(false)}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Profile Widget */}
          <div className="border-b border-white/[0.05] px-6 py-5">
            <div className="rounded-[22px] border border-white/[0.05] bg-[#0c0c16]/50 p-4 relative overflow-hidden shadow-inner">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-sm font-bold text-indigo-200">
                  {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white tracking-tight">{getDisplayName(user?.username ?? null, user?.email ?? '')}</p>
                  <p className="truncate text-xs text-slate-400 font-medium">{user?.username ? user.email : getEmailPrefix(user?.email ?? '')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/dashboard/billing')}
                className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-300 ${planStyle.shell}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${planStyle.dot}`} />
                {planDisplay} Plan
              </button>

              <p className="mt-3.5 text-[11px] leading-relaxed text-slate-500 font-medium">
                Manage applications, credentials, users, sessions, and billing from one premium operational workspace.
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
            <div className="space-y-6">
              {Object.entries(groupedNavigation).map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500/80">{group}</p>
                  <div className="mt-3.5 space-y-1.5">
                    {items.map((item) => {
                      const active = pathname === item.href
                      return (
                        <button
                          type="button"
                          key={item.name}
                          onClick={() => router.push(item.href)}
                          className={`group w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all duration-300 relative overflow-hidden ${
                            active
                              ? 'border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent text-indigo-100 shadow-md shadow-indigo-950/20 before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-1 before:rounded-r-full before:bg-indigo-400'
                              : 'border border-transparent text-slate-400 hover:border-white/[0.04] hover:bg-white/[0.02] hover:text-white'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${active ? 'text-indigo-400 glow-text-indigo' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          <span className="font-semibold">{item.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-white/[0.05] px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200 transition-all duration-300 hover:bg-rose-500/15 active:scale-98"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-[290px] w-full">
          {/* Header Bar */}
          <header className="sticky top-0 z-20 border-b border-white/[0.04] bg-[#030306]/40 backdrop-blur-2xl">
            <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <button className="rounded-2xl border border-white/5 p-2 text-slate-300 hover:text-white transition-colors lg:hidden" onClick={() => setMobileOpen(true)}>
                <Bars3Icon className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-500">Adarsh Auth Dashboard</p>
                <h1 className="truncate text-xl font-black text-white tracking-tight">{activePage}</h1>
              </div>

              {/* Global App Selector */}
              {applications.length > 0 && (pathname.includes('/users') || pathname.includes('/licenses') || pathname.includes('/sessions') || pathname.includes('/settings') || pathname.includes('/team') || pathname.includes('/offsets')) && (
                <div className="relative z-50 ml-8 hidden md:flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Select Application:</span>
                  <select
                    value={selectedApp?._id || ''}
                    onChange={(e) => {
                      const app = applications.find(a => a._id === e.target.value)
                      if (app) setSelectedApp(app)
                    }}
                    className="h-10 rounded-2xl border border-white/[0.06] bg-black/40 px-4 text-xs font-bold text-white outline-none focus:border-indigo-500/40 transition-all min-w-[190px]"
                  >
                    {applications.map((app) => (
                      <option key={app._id} value={app._id} className="bg-[#08080e]">
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ml-auto flex items-center gap-4">
                <div className="hidden rounded-2xl border border-white/[0.05] bg-[#0c0c16]/50 px-4 py-1.5 text-right md:block">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Status</p>
                  <p className="text-xs font-bold text-indigo-300 glow-text-indigo flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Operational
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-sm font-bold text-indigo-100 transition-all hover:bg-indigo-500/20 hover:scale-103"
                >
                  {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                </button>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.main 
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 px-4 py-8 sm:px-6 lg:px-8"
            >
              {children}
            </motion.main>
          </AnimatePresence>

          <footer className="border-t border-white/[0.04] px-4 py-5 text-center text-[11px] text-slate-500 font-semibold tracking-wider sm:px-6 lg:px-8">
           |    © 2026    •    Developed By Adarsh Cheats    •    Dev - Hariom    |
          </footer>
        </div>
      </div>
    </div>
  )
}
