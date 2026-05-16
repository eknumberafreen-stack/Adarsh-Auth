'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useAppStore } from '@/lib/store'
import api, { clearStoredAuth, refreshAccessToken } from '@/lib/api'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'
import PageAnimate from '@/components/PageAnimate'
import { motion, AnimatePresence } from 'framer-motion'
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

const PLAN_STYLE: Record<string, { shell: string; dot: string; glow: string }> = {
  free: { shell: 'border-zinc-500/20 bg-zinc-500/5 text-zinc-400', dot: 'bg-zinc-500', glow: 'shadow-zinc-500/10' },
  pro: { shell: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400', dot: 'bg-indigo-500', glow: 'shadow-indigo-500/10' },
  enterprise: { shell: 'border-amber-500/20 bg-amber-500/5 text-amber-400', dot: 'bg-amber-500', glow: 'shadow-amber-500/10' },
  yearly: { shell: 'border-violet-500/20 bg-violet-500/5 text-violet-400', dot: 'bg-violet-500', glow: 'shadow-violet-500/10' },
}

function DashboardBackdrop() {
  return (
    <>
      <ParticleField
        className="pointer-events-none fixed inset-0 opacity-40"
        particleColor="rgba(161, 161, 170, 0.1)"
        lineColor="rgba(99, 102, 241, 0.08)"
        count={50}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.05),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(79,70,229,0.03),transparent_40%)]" />
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
      ...(planName !== 'free' ? [{ name: 'Offsets & Bones', href: '/dashboard/offsets', icon: CpuChipIcon, group: 'Operations' }] : []),
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
      if (accessToken) {
        if (active) setCheckingSession(false)
        return
      }
      if (refreshToken) {
        try {
          await refreshAccessToken()
          if (active) {
            setCheckingSession(false)
            return
          }
        } catch {
          clearStoredAuth()
        }
      }
      if (active) router.replace('/login')
    }
    ensureSession()
    return () => { active = false }
  }, [accessToken, refreshToken, hasHydrated, router])

  useEffect(() => {
    if (!hasHydrated || !accessToken) return
    api.get('/plans/my').then((res) => {
      const plan = res.data?.plan
      if (plan) {
        setPlanName(plan.name ?? 'free')
        setPlanDisplay(plan.displayName ?? 'Free')
      }
    }).catch(() => {})
  }, [accessToken, hasHydrated])

  useEffect(() => {
    if (!hasHydrated || !accessToken) return
    if (applications.length === 0) {
      api.get('/applications').then((res) => {
        const apps = res.data.applications || []
        setApplications(apps)
        if (apps.length > 0 && !selectedApp) setSelectedApp(apps[0])
      }).catch(() => {}).finally(() => setLoadingApplications(false))
    } else {
      setLoadingApplications(false)
    }
  }, [accessToken, hasHydrated, applications.length, selectedApp, setApplications, setSelectedApp, setLoadingApplications])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    logout()
    toast.success('Logged out')
    router.push('/login')
  }

  if (!hasHydrated || checkingSession) return <div className="min-h-screen bg-dark-bg" />

  const activePage = navigation.find((item) => item.href === pathname)?.name ?? 'Dashboard'
  const planStyle = PLAN_STYLE[planName] ?? PLAN_STYLE.free

  return (
    <div className="relative min-h-screen bg-dark-bg selection:bg-primary-500/30 selection:text-white">
      <DashboardBackdrop />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[70] flex w-[280px] flex-col bg-dark-bg/95 backdrop-blur-2xl border-r border-white/5 lg:hidden"
            >
              <SidebarContent navigation={groupedNavigation} pathname={pathname} user={user} planStyle={planStyle} planDisplay={planDisplay} onLogout={handleLogout} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-[280px] flex-col border-r border-white/5 bg-dark-bg/50 backdrop-blur-xl lg:flex">
          <SidebarContent navigation={groupedNavigation} pathname={pathname} user={user} planStyle={planStyle} planDisplay={planDisplay} onLogout={handleLogout} />
        </aside>

        <div className="flex flex-1 flex-col lg:pl-[280px]">
          <header className="sticky top-0 z-[50] border-b border-white/5 bg-dark-bg/60 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-4 sm:px-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 lg:hidden"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark-muted">Platform Hub</p>
                  <h1 className="text-xl font-bold text-white tracking-tight">{activePage}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6">
                {/* Global App Selector - Redesigned for Mobile */}
                {applications.length > 0 && (pathname.includes('/users') || pathname.includes('/licenses') || pathname.includes('/sessions') || pathname.includes('/settings') || pathname.includes('/team') || pathname.includes('/offsets')) && (
                  <div className="hidden md:flex items-center gap-3">
                    <select
                      value={selectedApp?._id || ''}
                      onChange={(e) => {
                        const app = applications.find(a => a._id === e.target.value)
                        if (app) setSelectedApp(app)
                      }}
                      className="h-10 rounded-xl border border-white/5 bg-white/[0.04] px-4 text-xs font-semibold text-white outline-none focus:border-primary-500/50 transition-all hover:bg-white/[0.06]"
                    >
                      {applications.map((app) => (
                        <option key={app._id} value={app._id} className="bg-dark-card text-white">{app.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3">
                   <div className="hidden xl:block text-right">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-dark-muted">Status</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400/90">Healthy</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/dashboard/profile')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-xs font-bold text-primary-400 shadow-glow"
                  >
                    {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Mobile App Selector - Only on mobile and specific pages */}
            {applications.length > 0 && (pathname.includes('/users') || pathname.includes('/licenses') || pathname.includes('/sessions') || pathname.includes('/settings') || pathname.includes('/team') || pathname.includes('/offsets')) && (
              <div className="flex h-12 items-center px-4 border-t border-white/5 md:hidden">
                <select
                  value={selectedApp?._id || ''}
                  onChange={(e) => {
                    const app = applications.find(a => a._id === e.target.value)
                    if (app) setSelectedApp(app)
                  }}
                  className="w-full bg-transparent text-xs font-bold text-slate-300 outline-none"
                >
                  {applications.map((app) => (
                    <option key={app._id} value={app._id} className="bg-dark-card text-white">{app.name}</option>
                  ))}
                </select>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-x-hidden">
            <PageAnimate>
              <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
                {children}
              </div>
            </PageAnimate>
          </main>

          <footer className="py-6 px-8 text-center">
            <p className="text-[10px] font-medium text-dark-muted uppercase tracking-[0.3em] opacity-50">
              © 2026 • Adarsh Cheats Engineering • v2.0
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

function SidebarContent({ navigation, pathname, user, planStyle, planDisplay, onLogout, onClose }: any) {
  const router = useRouter()
  return (
    <>
      <div className="flex h-20 items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/20">
            <CubeIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">Adarsh</p>
            <p className="text-base font-bold text-white tracking-tight">Auth Platform</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white lg:hidden">
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-6">
        <div className="card-premium p-4 group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-xs font-bold text-primary-400 group-hover:scale-110 transition-transform">
              {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{getDisplayName(user?.username ?? null, user?.email ?? '')}</p>
              <p className="truncate text-[10px] font-medium text-dark-muted">{user?.username ? user.email : getEmailPrefix(user?.email ?? '')}</p>
            </div>
          </div>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${planStyle.shell} ${planStyle.glow}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${planStyle.dot}`} />
            {planDisplay} Member
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-4 scrollbar-hide">
        {Object.entries(navigation).map(([group, items]: [string, any]) => (
          <div key={group} className="space-y-2">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.3em] text-dark-muted/60">{group}</p>
            <div className="space-y-1">
              {items.map((item: any) => {
                const active = pathname === item.href
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href)
                      if (onClose) onClose()
                    }}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all active:scale-[0.98] ${
                      active ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 z-0 rounded-xl bg-primary-600/10 border border-primary-500/20 shadow-glow"
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                    <item.icon className={`relative z-10 h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="relative z-10 font-semibold">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  )
}
