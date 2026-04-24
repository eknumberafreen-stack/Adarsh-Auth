'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import api from '@/lib/api'
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
} from '@heroicons/react/24/outline'
import { getAvatarInitial, getDisplayName, getEmailPrefix } from '@/lib/username'

const PLAN_STYLE: Record<string, { shell: string; dot: string }> = {
  free: { shell: 'border-zinc-400/20 bg-zinc-400/10 text-zinc-200', dot: 'bg-zinc-300' },
  pro: { shell: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200', dot: 'bg-indigo-300' },
  enterprise: { shell: 'border-slate-300/20 bg-slate-300/10 text-slate-200', dot: 'bg-slate-200' },
  yearly: { shell: 'border-violet-400/20 bg-violet-400/10 text-violet-200', dot: 'bg-violet-300' },
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
  const { isAuthenticated, user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [planName, setPlanName] = useState<string>('free')
  const [planDisplay, setPlanDisplay] = useState<string>('Free')

  const isOwner = user?.email === (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'donumberafreen@gmail.com')

  const navigation = useMemo(
    () => [
      { name: 'Overview', href: '/dashboard', icon: HomeIcon, group: 'Workspace' },
      { name: 'Applications', href: '/dashboard/applications', icon: CubeIcon, group: 'Workspace' },
      { name: 'Licenses', href: '/dashboard/licenses', icon: KeyIcon, group: 'Operations' },
      { name: 'Users', href: '/dashboard/users', icon: UsersIcon, group: 'Operations' },
      { name: 'Sessions', href: '/dashboard/sessions', icon: ClockIcon, group: 'Operations' },
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
    [isOwner]
  )

  const groupedNavigation = useMemo(() => {
    return navigation.reduce<Record<string, typeof navigation>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item)
      return acc
    }, {})
  }, [navigation])

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .get('/plans/my')
      .then((res) => {
        const plan = res.data?.plan
        if (plan) {
          setPlanName(plan.name ?? 'free')
          setPlanDisplay(plan.displayName ?? 'Free')
        }
      })
      .catch(() => {})
  }, [isAuthenticated])

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

  if (!isAuthenticated) return null

  const activePage = navigation.find((item) => item.href === pathname)?.name ?? 'Dashboard'
  const planStyle = PLAN_STYLE[planName] ?? PLAN_STYLE.free

  return (
    <div className="relative min-h-screen text-white">
      <DashboardBackdrop />

      <div className="relative z-10 flex min-h-screen">
        {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/10 bg-slate-950/90 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/20">
                <CubeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/75">Control Center</p>
                <p className="text-lg font-bold text-white">Adarsh Auth</p>
              </div>
            </Link>
            <button className="rounded-xl border border-white/10 p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-white/10 px-6 py-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sm font-bold text-sky-200">
                  {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{getDisplayName(user?.username ?? null, user?.email ?? '')}</p>
                  <p className="truncate text-xs text-slate-400">{user?.username ? user.email : getEmailPrefix(user?.email ?? '')}</p>
                </div>
              </div>

              <Link href="/dashboard/billing" className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${planStyle.shell}`}>
                <span className={`h-2 w-2 rounded-full ${planStyle.dot}`} />
                {planDisplay} Plan
              </Link>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                Manage applications, credentials, users, sessions, and billing from one operational workspace.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-6">
              {Object.entries(groupedNavigation).map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{group}</p>
                  <div className="mt-2 space-y-1.5">
                    {items.map((item) => {
                      const active = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                            active
                              ? 'border border-indigo-400/25 bg-indigo-400/10 text-indigo-100 shadow-lg shadow-indigo-950/30'
                              : 'border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
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

              <div className="ml-auto flex items-center gap-3">
                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-right md:block">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                  <p className="text-sm font-semibold text-indigo-200">Operational</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-sm font-bold text-indigo-100"
                >
                  {getAvatarInitial(user?.username ?? null, user?.email ?? '')}
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

          <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
            Adarsh Auth control center. Same logic, upgraded presentation and workflow clarity.
          </footer>
        </div>
      </div>
    </div>
  )
}
