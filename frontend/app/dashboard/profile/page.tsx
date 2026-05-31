'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  CreditCardIcon,
  CubeIcon,
  KeyIcon,
  UsersIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { getAvatarInitial, getDisplayName } from '@/lib/username'
import { motion } from 'framer-motion'

interface ProfileData {
  username: string | null
  email: string
  id: string
  createdAt: string
  plan: {
    name: string
    displayName: string
    price: number
    limits: {
      maxApplications: number
      maxUsersPerApp: number
      maxLicensesPerApp: number
      maxApiCallsPerDay: number
    }
  } | null
  stats: {
    applications: number
    licenses: number
    users: number
  }
}

function formatLimit(v: number) {
  return v === -1 ? '∞' : String(v)
}

const PLAN_GRADIENT: Record<string, string> = {
  free: 'from-slate-500/10 to-slate-600/5 border-slate-500/10',
  pro: 'from-indigo-500/10 to-purple-600/5 border-indigo-500/10',
  enterprise: 'from-amber-500/10 to-orange-600/5 border-amber-500/10',
}
const PLAN_TEXT: Record<string, string> = {
  free: 'text-slate-300',
  pro: 'text-indigo-300 drop-shadow-[0_0_6px_rgba(99,102,241,0.2)]',
  enterprise: 'text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.2)]',
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      const [meRes, planRes, appsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/plans/my').catch(() => ({ data: null })),
        api.get('/applications').catch(() => ({ data: { applications: [] } })),
      ])

      const apps = appsRes.data.applications ?? []
      let totalLicenses = 0, totalUsers = 0

      await Promise.all(apps.slice(0, 8).map(async (app: any) => {
        try {
          const [lRes, uRes] = await Promise.all([
            api.get(`/licenses/application/${app._id}`),
            api.get(`/users/application/${app._id}`),
          ])
          totalLicenses += lRes.data.licenses?.length ?? 0
          totalUsers += uRes.data.users?.length ?? 0
        } catch {}
      }))

      setProfile({
        username: user?.username ?? null,
        email: user?.email ?? '',
        id: meRes.data.user?.id ?? user?.id ?? '',
        createdAt: meRes.data.user?.createdAt ?? '',
        plan: planRes.data?.plan ?? null,
        stats: { applications: apps.length, licenses: totalLicenses, users: totalUsers },
      })
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Retrieving account telemetries...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const displayName = getDisplayName(profile.username, profile.email)
  const avatarInitial = getAvatarInitial(profile.username, profile.email)
  const planName = profile.plan?.name ?? 'free'
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Hero Banner ── */}
      <div className="relative rounded-[32px] overflow-hidden border border-white/[0.04] bg-[#090912]/80 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-purple-500/[0.02] to-transparent pointer-events-none" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-2xl shadow-indigo-500/20">
                {avatarInitial}
              </div>
              {profile.plan && (
                <div className={`absolute -bottom-1.5 -right-1.5 px-3 py-1 rounded-xl text-[9px] font-extrabold border bg-[#0a0a14] uppercase tracking-wider ${PLAN_TEXT[planName]} border-indigo-500/25`}>
                  {profile.plan.displayName}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{displayName}</h1>
                {profile.username && (
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 uppercase tracking-wider">
                    <CheckBadgeIcon className="w-3.5 h-3.5" />
                    verified
                  </span>
                )}
              </div>

              {profile.username && (
                <p className="text-slate-400 text-xs font-semibold mb-3.5">@{profile.username}</p>
              )}

              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <EnvelopeIcon className="w-4 h-4 text-slate-600" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-600" />
                  Joined {joinDate}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <IdentificationIcon className="w-4 h-4 text-slate-600" />
                  Identity: {profile.id.slice(0, 16)}…
                </span>
              </div>
            </div>

            {/* Edit button */}
            <Link
              href="/dashboard/settings"
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-200 hover:text-white hover:bg-white/[0.05] transition-all text-xs font-black uppercase tracking-wider"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit Account
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Workspaces', value: profile.stats.applications, icon: CubeIcon, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20 shadow-indigo-500/5', href: '/dashboard/applications' },
          { label: 'License Keys', value: profile.stats.licenses, icon: KeyIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20 shadow-emerald-500/5', href: '/dashboard/licenses' },
          { label: 'Registered Users', value: profile.stats.users, icon: UsersIcon, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20 shadow-violet-500/5', href: '/dashboard/users' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className={`group bg-[#0a0a14]/60 border ${s.border} rounded-3xl p-5 hover:border-white/15 transition-all shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${s.bg} border border-white/[0.02]`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ArrowRightIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 transition-colors" />
            </div>
            <p className="text-3xl font-black text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Plan Card */}
        <div className={`rounded-3xl border bg-gradient-to-br p-6 shadow-2xl ${PLAN_GRADIENT[planName] ?? PLAN_GRADIENT.free}`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <CreditCardIcon className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Subscription</p>
                <p className={`text-base font-black tracking-tight ${PLAN_TEXT[planName]}`}>
                  {profile.plan?.displayName ?? 'Free'} subscription
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors uppercase tracking-wide">
              Upgrade <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {profile.plan && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Workspaces', value: profile.plan.limits.maxApplications },
                { label: 'Users / App', value: profile.plan.limits.maxUsersPerApp },
                { label: 'Licenses / App', value: profile.plan.limits.maxLicensesPerApp },
                { label: 'API Limits Daily', value: profile.plan.limits.maxApiCallsPerDay },
              ].map((item) => (
                <div key={item.label} className="bg-black/40 border border-white/[0.03] rounded-2xl p-3.5 text-center">
                  <p className="text-base font-black text-white font-mono">{formatLimit(item.value)}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-3xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Account details</p>
              <p className="text-base font-black text-white tracking-tight">Security details</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Email', value: profile.email, icon: EnvelopeIcon },
              { label: 'Username', value: profile.username ? `@${profile.username}` : 'Not set', icon: IdentificationIcon, muted: !profile.username },
              { label: 'User ID', value: profile.id, icon: IdentificationIcon, mono: true },
              { label: 'Registration Date', value: joinDate, icon: CalendarIcon },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-black/40 border border-white/[0.03] rounded-2xl">
                <item.icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{item.label}</p>
                  <p className={`text-xs font-bold mt-0.5 truncate ${item.mono ? 'font-mono text-indigo-300' : 'text-slate-200'} ${item.muted ? 'text-slate-600 italic' : ''}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/settings"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all text-xs font-black uppercase tracking-wider mt-2">
            <PencilSquareIcon className="w-4.5 h-4.5" />
            Configure Account Settings
          </Link>
        </div>
      </div>

      {/* No username prompt */}
      {!profile.username && (
        <div className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-indigo-500/[0.02] border border-indigo-500/20 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <IdentificationIcon className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Set Account Username</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Define a custom unique username for your user profile credentials.</p>
            </div>
          </div>
          <Link href="/dashboard/settings"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all text-xs font-black uppercase tracking-wider">
            Configure <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
