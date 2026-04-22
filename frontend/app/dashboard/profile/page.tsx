'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  UserCircleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  CreditCardIcon,
  CubeIcon,
  KeyIcon,
  UsersIcon,
  PencilIcon,
  ShieldCheckIcon,
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
  usage: {
    applications: { current: number; limit: number | null }
  } | null
  stats: {
    applications: number
    licenses: number
    users: number
  }
}

function formatLimit(v: number) {
  return v === -1 ? 'Unlimited' : String(v)
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const [meRes, planRes, appsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/plans/my').catch(() => ({ data: null })),
        api.get('/applications').catch(() => ({ data: { applications: [] } })),
      ])

      const apps = appsRes.data.applications ?? []
      let totalLicenses = 0
      let totalUsers = 0

      for (const app of apps.slice(0, 5)) {
        try {
          const [lRes, uRes] = await Promise.all([
            api.get(`/licenses/application/${app._id}`),
            api.get(`/users/application/${app._id}`),
          ])
          totalLicenses += lRes.data.licenses?.length ?? 0
          totalUsers += uRes.data.users?.length ?? 0
        } catch {}
      }

      setProfile({
        username: user?.username ?? null,
        email: user?.email ?? '',
        id: meRes.data.user?.id ?? user?.id ?? '',
        createdAt: meRes.data.user?.createdAt ?? '',
        plan: planRes.data?.plan ?? null,
        usage: planRes.data?.usage ?? null,
        stats: {
          applications: apps.length,
          licenses: totalLicenses,
          users: totalUsers,
        },
      })
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const displayName = getDisplayName(profile.username, profile.email)
  const avatarInitial = getAvatarInitial(profile.username, profile.email)
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const PLAN_COLOR: Record<string, string> = {
    free: 'text-gray-400',
    pro: 'text-indigo-400',
    enterprise: 'text-amber-400',
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your account details and activity</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.07] transition-colors text-sm"
        >
          <PencilIcon className="w-4 h-4" />
          Edit Profile
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-300 flex-shrink-0">
            {avatarInitial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-white">{displayName}</h2>
              {profile.plan && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] ${PLAN_COLOR[profile.plan.name] ?? 'text-gray-400'}`}>
                  {profile.plan.displayName} Plan
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Username */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <IdentificationIcon className="w-4 h-4 flex-shrink-0 text-gray-600" />
                {profile.username
                  ? <span className="text-gray-300">@{profile.username}</span>
                  : <span className="text-gray-600 italic">No username set</span>
                }
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <EnvelopeIcon className="w-4 h-4 flex-shrink-0 text-gray-600" />
                <span className="truncate">{profile.email}</span>
              </div>

              {/* User ID */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <UserCircleIcon className="w-4 h-4 flex-shrink-0 text-gray-600" />
                <span className="font-mono text-xs text-gray-500 truncate">{profile.id}</span>
              </div>

              {/* Join date */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CalendarIcon className="w-4 h-4 flex-shrink-0 text-gray-600" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Applications', value: profile.stats.applications, icon: CubeIcon, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Licenses', value: profile.stats.licenses, icon: KeyIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Users', value: profile.stats.users, icon: UsersIcon, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} ${s.color} mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plan & Usage */}
      {profile.plan && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-white">Current Plan</h3>
            </div>
            <Link href="/dashboard/billing" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View billing →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Applications', value: profile.plan.limits.maxApplications },
              { label: 'Users / App', value: profile.plan.limits.maxUsersPerApp },
              { label: 'Licenses / App', value: profile.plan.limits.maxLicensesPerApp },
              { label: 'API Calls / Day', value: profile.plan.limits.maxApiCallsPerDay },
            ].map((item) => (
              <div key={item.label} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">{formatLimit(item.value)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Security</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Password', value: '••••••••', note: 'Change in Settings' },
            { label: 'Login Method', value: profile.email.includes('google') ? 'Google OAuth' : 'Email & Password', note: null },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm text-gray-300 font-medium mt-0.5">{item.value}</p>
              </div>
              {item.note && (
                <Link href="/dashboard/settings" className="text-xs text-indigo-400 hover:text-indigo-300">
                  {item.note}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* No username prompt */}
      {!profile.username && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-300">Set a username</p>
            <p className="text-xs text-gray-500 mt-0.5">Add a username so others can identify you easily</p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors text-sm font-medium"
          >
            Set Username
          </Link>
        </div>
      )}
    </div>
  )
}
