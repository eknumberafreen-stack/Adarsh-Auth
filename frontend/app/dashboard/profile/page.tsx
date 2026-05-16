'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
  SparklesIcon,
  RocketLaunchIcon
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

const PLAN_THEME: Record<string, { gradient: string, text: string, glow: string }> = {
  free: { gradient: 'from-slate-500/10 to-slate-600/5 border-slate-500/20', text: 'text-slate-400', glow: 'shadow-slate-500/5' },
  pro: { gradient: 'from-primary-500/10 to-primary-600/5 border-primary-500/20', text: 'text-primary-400', glow: 'shadow-primary-500/10' },
  enterprise: { gradient: 'from-amber-500/10 to-orange-600/5 border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
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
      setProfile({
        username: user?.username ?? null,
        email: user?.email ?? '',
        id: meRes.data.user?.id ?? user?.id ?? '',
        createdAt: meRes.data.user?.createdAt ?? '',
        plan: planRes.data?.plan ?? null,
        stats: { applications: apps.length, licenses: 0, users: 0 },
      })
    } catch { toast.error('Sync failed') }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!profile) return null

  const planName = profile.plan?.name ?? 'free'
  const theme = PLAN_THEME[planName] || PLAN_THEME.free
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Identity Banner */}
      <section className="relative overflow-hidden card-premium p-8 sm:p-12 border-primary-500/20 bg-primary-500/[0.02]">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <RocketLaunchIcon className="w-48 h-48 text-primary-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-primary-500/30 group-hover:scale-105 transition-transform duration-500">
              {getAvatarInitial(profile.username, profile.email)}
            </div>
            <div className="absolute -bottom-3 -right-3 p-2 bg-dark-bg rounded-2xl border border-white/10 shadow-xl">
              <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
              <h1 className="text-4xl font-black text-white tracking-tight">{getDisplayName(profile.username, profile.email)}</h1>
              {profile.username && <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-black uppercase tracking-widest text-primary-400"><CheckBadgeIcon className="w-4 h-4" /> Verified Identity</span>}
            </div>
            <p className="text-lg text-slate-400 font-medium mb-6">@{profile.username || 'guest_operator'}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <div className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4 text-primary-400" /> {profile.email}</div>
              <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary-400" /> Joined {joinDate}</div>
            </div>
          </div>

          <Link href="/dashboard/settings" className="btn btn-primary px-8 py-4 text-xs font-black uppercase tracking-widest shadow-glow">Edit Profile</Link>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Tier Details */}
        <section className={`card-premium p-8 bg-gradient-to-br ${theme.gradient} ${theme.glow}`}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5"><SparklesIcon className="w-6 h-6 text-amber-400" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">Active Membership</p>
                <h3 className={`text-2xl font-black tracking-tight ${theme.text}`}>{profile.plan?.displayName || 'Free'} Console</h3>
              </div>
            </div>
            <Link href="/dashboard/billing" className="text-xs font-black uppercase tracking-widest text-primary-400 hover:text-white transition-colors">Upgrade Tier</Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LimitBox label="Sectors" value={profile.plan?.limits.maxApplications} />
            <LimitBox label="Users / Unit" value={profile.plan?.limits.maxUsersPerApp} />
            <LimitBox label="Keys / Unit" value={profile.plan?.limits.maxLicensesPerApp} />
            <LimitBox label="API Limit / Day" value={profile.plan?.limits.maxApiCallsPerDay} />
          </div>
        </section>

        {/* Account Metadata */}
        <section className="card-premium p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5"><IdentificationIcon className="w-6 h-6 text-primary-400" /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Security Metadata</h3>
          </div>

          <div className="space-y-4">
            <MetadataRow label="Unique Registry ID" value={profile.id} mono />
            <MetadataRow label="Authorization Email" value={profile.email} />
            <MetadataRow label="System Status" value="Healthy" color="text-emerald-400" />
            <MetadataRow label="Last Sync" value={new Date().toLocaleTimeString()} />
          </div>

          <Link href="/dashboard/settings" className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
            <PencilSquareIcon className="w-4 h-4" />
            Update Security Protocols
          </Link>
        </section>
      </div>

      {/* Promotions */}
      {!profile.username && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400"><IdentificationIcon className="w-7 h-7" /></div>
            <div>
              <p className="text-lg font-black text-white uppercase tracking-tight">Set Your Identity</p>
              <p className="text-sm text-slate-400 font-medium">Claim your unique username to verify your profile platform-wide.</p>
            </div>
          </div>
          <Link href="/dashboard/settings" className="btn btn-primary px-10 py-4 text-xs font-black uppercase tracking-widest">Set Now</Link>
        </motion.div>
      )}
    </div>
  )
}

function LimitBox({ label, value }: { label: string, value: any }) {
  return (
    <div className="p-5 rounded-2xl bg-black/40 border border-white/5 text-center">
      <p className="text-2xl font-black text-white tracking-tighter">{formatLimit(value)}</p>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function MetadataRow({ label, value, mono = false, color = "text-slate-300" }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</span>
      <span className={`text-xs font-bold truncate max-w-[200px] ${mono ? 'font-mono' : ''} ${color}`}>{value}</span>
    </div>
  )
}
