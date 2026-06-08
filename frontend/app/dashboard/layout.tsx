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
  free: { shell: 'border-slate-500/20 bg-slate-500/5 text-slate-300 shadow-[0_0_12px_rgba(148,163,184,0.05)] hover:bg-slate-500/10 transition-all duration-300', dot: 'bg-slate-400' },
  pro: { shell: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:bg-indigo-500/15 transition-all duration-300', dot: 'bg-indigo-400 animate-pulse' },
  enterprise: { shell: 'border-amber-500/35 bg-amber-500/10 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.18)] hover:bg-amber-500/15 transition-all duration-300', dot: 'bg-amber-400 animate-pulse' },
  yearly: { shell: 'border-violet-500/35 bg-violet-500/10 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:bg-violet-500/15 transition-all duration-300', dot: 'bg-violet-400 animate-pulse' },
}

function DashboardBackdrop() {
  return (
    <>
      <ParticleField
        className="pointer-events-none fixed inset-0 opacity-60"
        particleColor="rgba(161, 161, 170, 0.16)"
        lineColor="rgba(99, 102, 241, 0.12)"
        count={60}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(39,39,42,0.24),transparent_26%)]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-[160px]" />
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
    return <div className="min-h-screen bg-[#07070a]" />
  }

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-slate-400">
        Redirecting...
      </div>
    )
  }

  const activePage = navigation.find((item) => item.href === pathname)?.name ?? 'Dashboard'
  const planStyle = PLAN_STYLE[planName] ?? PLAN_STYLE.free

  return (
    <div className="relative min-h-screen text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtle-glow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.2)); }
          50% { filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.45)); }
        }
        .animate-subtle-glow {
          animation: subtle-glow 4s ease-in-out infinite;
        }
        .aside-glass {
          background: linear-gradient(180deg, rgba(8, 9, 13, 0.95) 0%, rgba(4, 4, 6, 0.98) 100%);
        }
        .nav-glow-item {
          position: relative;
        }
        .nav-glow-item::after {
          content: '';
          position: absolute;
          left: 0;
          top: 30%;
          height: 40%;
          width: 3px;
          background: linear-gradient(to bottom, #6366f1, #a855f7);
          border-radius: 9999px;
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-glow-item.active-item::after {
          opacity: 1;
          height: 50%;
          top: 25%;
        }
      `}} />
      <DashboardBackdrop />

      <div className="relative z-10 flex min-h-screen">
        {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/[0.06] aside-glass transition-transform duration-300 lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
            <button type="button" onClick={() => router.push('/dashboard')} className="flex items-center gap-3 text-left group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-950 shadow-lg shadow-sky-500/25 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 animate-subtle-glow">
                <CubeIcon className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/80">Control Center</p>
                <p className="text-lg font-black text-white tracking-wide group-hover:text-indigo-200 transition-colors">Adarsh Auth</p>
              </div>
            </button>
            <button className="rounded-xl border border-white/10 p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-white/[0.06] px-5 py-5">
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-white/[0.08] transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* Glowing Ring representing Online Status */}
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 opacity-60 blur-[3px]" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#090a0f] text-sm font-black text-white border border-white/10">
                    {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                  </div>
                  {/* Active Online Indicator dot */}
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-100 tracking-wide">{getDisplayName(user?.username ?? null, user?.email ?? '')}</p>
                  <p className="truncate text-xs text-slate-400/80 font-medium">{user?.username ? user.email : getEmailPrefix(user?.email ?? '')}</p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.04] pt-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/billing')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${planStyle.shell}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${planStyle.dot}`} />
                  {planDisplay} Plan
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400/70 font-medium">
                Manage applications, credentials, users, sessions, and billing from one workspace.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-6">
              {Object.entries(groupedNavigation).map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600/90">{group}</p>
                  <div className="mt-2 space-y-1">
                    {items.map((item) => {
                      const active = pathname === item.href
                      return (
                        <button
                          type="button"
                          key={item.name}
                          onClick={() => router.push(item.href)}
                          className={`nav-glow-item flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-xs transition-all relative ${
                            active
                              ? 'active-item border border-indigo-500/20 bg-indigo-500/10 text-indigo-100 shadow-[0_4px_20px_rgba(99,102,241,0.08)] font-semibold'
                              : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.03] font-medium'
                          }`}
                        >
                          <item.icon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors duration-200 ${
                            active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                          }`} />
                          <span className="tracking-wide">{item.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-4 py-4.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-rose-300 transition-all duration-300 hover:border-rose-500/30 hover:bg-rose-500/10 shadow-[0_4px_12px_rgba(244,63,94,0.04)]"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-[290px]">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <button className="rounded-2xl border border-white/10 p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)}>
                <Bars3Icon className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Adarsh Auth Dashboard</p>
                <h1 className="truncate text-lg font-bold text-white">{activePage}</h1>
              </div>

              {/* Global App Selector */}
              {applications.length > 0 && (pathname.includes('/users') || pathname.includes('/licenses') || pathname.includes('/sessions') || pathname.includes('/settings') || pathname.includes('/team') || pathname.includes('/offsets')) && (
                <div className="relative z-50 ml-8 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Select Application:</span>
                  <select
                    value={selectedApp?._id || ''}
                    onChange={(e) => {
                      const app = applications.find(a => a._id === e.target.value)
                      if (app) setSelectedApp(app)
                    }}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white outline-none focus:border-indigo-500/50 transition-all min-w-[180px]"
                  >
                    {applications.map((app) => (
                      <option key={app._id} value={app._id} className="bg-[#0f0f13]">
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ml-auto flex items-center gap-3">
                <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-1.5 text-right md:block shadow-sm">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">Status</p>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Operational
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-sm font-bold text-indigo-100"
                >
                  {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                </button>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.main 
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
            >
              {children}
            </motion.main>
          </AnimatePresence>

          <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
           |    © 2026    •    Developed By Adarsh Cheats    •    Dev - Hariom    |
          </footer>
        </div>
      </div>
    </div>
  )
}
