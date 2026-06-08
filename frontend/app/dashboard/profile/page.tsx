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
  free: 'from-slate-500/10 via-slate-600/5 to-transparent border-slate-500/20',
  pro: 'from-indigo-600/15 via-purple-600/5 to-transparent border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]',
  enterprise: 'from-amber-600/15 via-orange-600/5 to-transparent border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]',
}
const PLAN_TEXT: Record<string, string> = {
  free: 'text-slate-300',
  pro: 'text-indigo-300 font-bold',
  enterprise: 'text-amber-300 font-bold',
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading profile...</p>
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
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        .premium-card-indigo {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.75) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(99, 102, 241, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}} />

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-2xl shadow-indigo-500/35 border border-white/10">
                {avatarInitial}
              </div>
              {profile.plan && (
                <div className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#09090e] ${PLAN_TEXT[planName]} border-current shadow-lg`}>
                  {profile.plan.displayName}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{displayName}</h1>
                {profile.username && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    <CheckBadgeIcon className="w-3.5 h-3.5" />
                    verified
                  </span>
                )}
              </div>

              {profile.username && (
                <p className="text-slate-400 text-sm font-semibold mb-3">@{profile.username}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <EnvelopeIcon className="w-4 h-4 text-slate-500" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-500" />
                  Joined {joinDate}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                  <IdentificationIcon className="w-4 h-4" />
                  {profile.id.slice(0, 16)}…
                </span>
              </div>
            </div>

            {/* Edit button */}
            <Link
              href="/dashboard/settings"
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-wider shadow-md"
            >
              <PencilSquareIcon className="w-4 h-4 text-slate-400" />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Applications', value: profile.stats.applications, icon: CubeIcon, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/15', href: '/dashboard/applications' },
          { label: 'Total Licenses', value: profile.stats.licenses, icon: KeyIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', href: '/dashboard/licenses' },
          { label: 'Total Users', value: profile.stats.users, icon: UsersIcon, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15', href: '/dashboard/users' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className="premium-card-indigo group p-5 hover:scale-[1.02] transition-all duration-300 rounded-2xl block relative">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl border border-white/[0.04] ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ArrowRightIcon className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <p className="text-4xl font-black text-white tracking-tight">{s.value}</p>
            <p className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-bold">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Plan Card */}
        <div className={`premium-card-indigo bg-gradient-to-br p-6 rounded-2xl flex flex-col justify-between ${PLAN_GRADIENT[planName] ?? PLAN_GRADIENT.free}`}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                  <CreditCardIcon className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subscription</p>
                  <p className={`text-lg font-black tracking-tight ${PLAN_TEXT[planName]}`}>
                    {profile.plan?.displayName ?? 'Free'} Plan
                  </p>
                </div>
              </div>
              <Link href="/dashboard/billing"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1 transition-all">
                Manage <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            {profile.plan && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Apps Limit', value: profile.plan.limits.maxApplications },
                  { label: 'Users / App', value: profile.plan.limits.maxUsersPerApp },
                  { label: 'Licenses / App', value: profile.plan.limits.maxLicensesPerApp },
                  { label: 'API Calls / Day', value: profile.plan.limits.maxApiCallsPerDay },
                ].map((item) => (
                  <div key={item.label} className="bg-black/35 border border-white/[0.04] rounded-xl p-4 text-center shadow-inner">
                    <p className="text-2xl font-black text-white">{formatLimit(item.value)}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div className="premium-card-indigo p-6 rounded-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account</p>
              <p className="text-lg font-black text-white tracking-tight">Details & Security</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Email Address', value: profile.email, icon: EnvelopeIcon },
              { label: 'Username', value: profile.username ? `@${profile.username}` : 'Not set', icon: IdentificationIcon, muted: !profile.username },
              { label: 'User ID Reference', value: profile.id, icon: IdentificationIcon, mono: true, truncate: true },
              { label: 'Member Since', value: joinDate, icon: CalendarIcon },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3.5 p-3.5 bg-black/30 border border-white/[0.04] rounded-xl">
                <item.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm mt-0.5 truncate font-semibold ${item.mono ? 'font-mono text-xs' : ''} ${item.muted ? 'text-slate-500 italic font-medium' : 'text-slate-200'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/settings"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-wider mt-2">
            <PencilSquareIcon className="w-4 h-4 text-slate-400" />
            Edit Account Settings
          </Link>
        </div>
      </div>

      {/* No username prompt */}
      {!profile.username && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <IdentificationIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Set your username</p>
              <p className="text-xs text-gray-500 mt-0.5">Personalise your profile with a unique username</p>
            </div>
          </div>
          <Link href="/dashboard/settings"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all text-sm font-medium">
            Set Username <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
