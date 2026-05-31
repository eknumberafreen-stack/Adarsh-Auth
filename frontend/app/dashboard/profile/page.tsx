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
  free: 'from-gray-500/20 to-gray-600/10 border-gray-500/20',
  pro: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/20',
  enterprise: 'from-amber-500/20 to-orange-600/10 border-amber-500/20',
}
const PLAN_TEXT: Record<string, string> = {
  free: 'text-gray-300',
  pro: 'text-indigo-300',
  enterprise: 'text-amber-300',
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
    <div className="space-y-5">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-2xl shadow-indigo-500/30">
                {avatarInitial}
              </div>
              {profile.plan && (
                <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#09090e] ${PLAN_TEXT[planName]} border-current`}>
                  {profile.plan.displayName}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-white">{displayName}</h1>
                {profile.username && (
                  <span className="flex items-center gap-1 text-sm text-indigo-400">
                    <CheckBadgeIcon className="w-4 h-4" />
                    verified
                  </span>
                )}
              </div>

              {profile.username && (
                <p className="text-gray-400 text-sm mb-3">@{profile.username}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <EnvelopeIcon className="w-3.5 h-3.5" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Joined {joinDate}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <IdentificationIcon className="w-3.5 h-3.5" />
                  {profile.id.slice(0, 16)}…
                </span>
              </div>
            </div>

            {/* Edit button */}
            <Link
              href="/dashboard/settings"
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white hover:bg-white/[0.10] transition-all text-sm font-medium"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Applications', value: profile.stats.applications, icon: CubeIcon, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/15', href: '/dashboard/applications' },
          { label: 'Total Licenses', value: profile.stats.licenses, icon: KeyIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', href: '/dashboard/licenses' },
          { label: 'Total Users', value: profile.stats.users, icon: UsersIcon, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15', href: '/dashboard/users' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className={`group bg-white/[0.02] border ${s.border} rounded-2xl p-5 hover:bg-white/[0.04] transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ArrowRightIcon className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            <p className="text-3xl font-black text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Plan Card */}
        <div className={`rounded-2xl border bg-gradient-to-br p-5 ${PLAN_GRADIENT[planName] ?? PLAN_GRADIENT.free}`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.06]">
                <CreditCardIcon className="w-4 h-4 text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Subscription</p>
                <p className={`text-base font-bold ${PLAN_TEXT[planName]}`}>
                  {profile.plan?.displayName ?? 'Free'} Plan
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Manage <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {profile.plan && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Apps', value: profile.plan.limits.maxApplications },
                { label: 'Users / App', value: profile.plan.limits.maxUsersPerApp },
                { label: 'Licenses / App', value: profile.plan.limits.maxLicensesPerApp },
                { label: 'API Calls / Day', value: profile.plan.limits.maxApiCallsPerDay },
              ].map((item) => (
                <div key={item.label} className="bg-black/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-white">{formatLimit(item.value)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-white/[0.04]">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Account</p>
              <p className="text-base font-bold text-white">Details & Security</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Email', value: profile.email, icon: EnvelopeIcon },
              { label: 'Username', value: profile.username ? `@${profile.username}` : 'Not set', icon: IdentificationIcon, muted: !profile.username },
              { label: 'User ID', value: profile.id, icon: IdentificationIcon, mono: true, truncate: true },
              { label: 'Member Since', value: joinDate, icon: CalendarIcon },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <item.icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm mt-0.5 truncate ${item.mono ? 'font-mono text-xs' : 'font-medium'} ${item.muted ? 'text-gray-600 italic' : 'text-gray-200'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/dashboard/settings"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-gray-300 hover:bg-white/[0.07] transition-all text-sm font-medium mt-2">
            <PencilSquareIcon className="w-4 h-4" />
            Edit Account Settings
          </Link>
        </div>
      </div>

      {/* No username prompt */}
      {!profile.username && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
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
