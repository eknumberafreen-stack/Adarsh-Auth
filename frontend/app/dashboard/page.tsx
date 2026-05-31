'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore, useAppStore } from '@/lib/store'
import { getDisplayName } from '@/lib/username'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CubeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  BoltIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { applications, loadingApplications, statsCache, setStatsCache } = useAppStore()
  const [stats, setStats] = useState(statsCache || {
    applications: 0,
    licenses: 0,
    users: 0,
    sessions: 0,
    usedLicenses: 0,
    bannedUsers: 0,
    activeSessions: 0,
  })
  const [recentApps, setRecentApps] = useState<any[]>(statsCache?.recentApps || [])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(!statsCache)
  const [currentTime, setCurrentTime] = useState(new Date())
  const limit = 5

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadRecentApps(currentPage)
  }, [currentPage])

  useEffect(() => {
    if (!loadingApplications && applications.length > 0) {
      loadStats(applications)
    }
  }, [loadingApplications, applications.length])

  const loadRecentApps = async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/applications?page=${page}&limit=${limit}`)
      setRecentApps(res.data.applications)
      setTotalPages(res.data.pagination.pages)
      setStats((prev: any) => ({ ...prev, applications: res.data.pagination.total }))
    } catch (err) {
      console.error('Failed to load recent apps:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
  }

  const loadStats = async (appsToUse = applications) => {
    if (appsToUse.length === 0) {
      setLoading(false)
      return
    }

    try {
      let totalLicenses = 0
      let usedLicenses = 0
      let totalUsers = 0
      let bannedUsers = 0
      let totalSessions = 0
      let activeSessions = 0

      const results = await Promise.all(appsToUse.map(app =>
        Promise.all([
          api.get(`/licenses/application/${app._id}`),
          api.get(`/users/application/${app._id}`),
          api.get(`/sessions/application/${app._id}`)
        ]).catch(() => [null, null, null])
      ))

      results.forEach(resSet => {
        const [lRes, uRes, sRes] = resSet as any
        if (lRes) {
          totalLicenses += lRes.data.licenses.length
          usedLicenses += lRes.data.licenses.filter((license: any) => license.used).length
        }
        if (uRes) {
          totalUsers += uRes.data.users.length
          bannedUsers += uRes.data.users.filter((appUser: any) => appUser.banned).length
        }
        if (sRes) {
          totalSessions += sRes.data.sessions.length
          activeSessions += sRes.data.sessions.filter((s: any) => Date.now() - new Date(s.lastHeartbeat).getTime() < 45000).length
        }
      })

      const finalStats = {
        applications: appsToUse.length,
        licenses: totalLicenses,
        users: totalUsers,
        sessions: totalSessions,
        usedLicenses,
        bannedUsers,
        activeSessions,
        recentApps: appsToUse.slice(0, limit)
      }

      setStats(finalStats)
      setStatsCache(finalStats)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { name: 'Applications', value: stats.applications, icon: CubeIcon, gradient: 'from-blue-500 to-indigo-500', glow: 'rgba(59,130,246,0.15)', textStyle: 'text-gradient-cyan', href: '/dashboard/applications' },
    { name: 'Total Licenses', value: stats.licenses, icon: KeyIcon, gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.15)', textStyle: 'text-gradient-amber', href: '/dashboard/licenses' },
    { name: 'Total Users', value: stats.users, icon: UsersIcon, gradient: 'from-sky-500 to-cyan-500', glow: 'rgba(14,165,233,0.15)', textStyle: 'text-gradient-primary', href: '/dashboard/users' },
    { name: 'Active Sessions', value: stats.activeSessions || 0, icon: SignalIcon, gradient: 'from-emerald-500 to-teal-500', glow: 'rgba(16,185,129,0.15)', textStyle: 'text-gradient-cyan glow-text-emerald', href: '/dashboard/sessions' },
  ]

  const licenseUsage = stats.licenses > 0 ? Math.round((stats.usedLicenses / stats.licenses) * 100) : 0
  const healthyUsers = stats.users > 0 ? Math.round(((stats.users - stats.bannedUsers) / stats.users) * 100) : 100

  const formatTime = (d: Date) => {
    const hours = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')
    const secs = d.getSeconds().toString().padStart(2, '0')
    return `${hours}:${mins}:${secs}`
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[32px] border border-white/[0.05] bg-gradient-to-br from-[#0c0c16]/80 via-[#07070d]/60 to-black/40 p-8 md:p-10 backdrop-blur-md"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xs font-extrabold uppercase tracking-[0.3em] text-indigo-400"
            >
              {getGreeting()}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-1 text-3xl font-black text-white md:text-4xl tracking-tight"
            >
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                {getDisplayName(user?.username ?? null, user?.email ?? '')}
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3.5 max-w-lg text-sm leading-relaxed text-slate-400 font-medium"
            >
              Monitor your applications, manage users and licenses, and track live sessions — all from one unified premium control panel.
            </motion.p>
          </div>

          {/* Live digital clock card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1.5 rounded-[22px] border border-white/[0.06] bg-black/45 px-8 py-5.5 backdrop-blur-xl shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-500">System Time</p>
            <p className="font-mono text-3xl font-extrabold tracking-widest bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              {formatTime(currentTime)}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">{formatDate(currentTime)}</p>
          </motion.div>
        </div>
      </motion.section>

      {loading || loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Main Cyber Stat Cards */}
          <motion.section
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {statCards.map((stat, i) => (
              <motion.div
                variants={fadeUp}
                key={stat.name}
                onClick={() => router.push(stat.href)}
                className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/[0.05] bg-[#07070d]/50 p-6 transition-all duration-300 hover:border-white/15 hover:-translate-y-1"
                style={{
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                }}
                whileHover={{
                  boxShadow: `0 20px 40px -10px ${stat.glow}, inset 0 1px 1px 0 rgba(255,255,255,0.08)`
                }}
              >
                {/* Accent glow on hover */}
                <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-0 blur-[40px] transition-opacity duration-500 group-hover:opacity-15`} />

                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.name}</p>
                  <div className={`rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 transition-colors group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20`}>
                    <stat.icon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
                
                <p className={`relative z-10 mt-4 text-3xl font-black ${stat.textStyle}`}>
                  {stat.value}
                </p>

                <div className="relative z-10 mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <span>View Details</span>
                  <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            ))}
          </motion.section>

          {/* Quick Stats Ribbon */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid gap-5 md:grid-cols-4"
          >
            {[
              { label: 'Licenses Used', value: `${stats.usedLicenses}/${stats.licenses}`, percent: licenseUsage, gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/20', icon: KeyIcon },
              { label: 'Healthy Users', value: `${Math.max(stats.users - stats.bannedUsers, 0)}/${stats.users}`, percent: healthyUsers, gradient: 'from-emerald-400 to-teal-500', glow: 'shadow-emerald-500/20', icon: CheckCircleIcon },
              { label: 'Banned Users', value: stats.bannedUsers, percent: stats.users > 0 ? Math.round((stats.bannedUsers / stats.users) * 100) : 0, gradient: 'from-rose-500 to-red-600', glow: 'shadow-red-500/20', icon: ExclamationTriangleIcon },
              { label: 'Total Sessions', value: stats.sessions, percent: null, gradient: '', glow: '', icon: ClockIcon },
            ].map((item, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                key={item.label}
                className="rounded-3xl border border-white/[0.05] bg-[#07070d]/30 p-5.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <item.icon className="h-4 w-4 text-slate-500" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                </div>
                <p className="text-2xl font-black text-white">{item.value}</p>
                {item.percent !== null && (
                  <div className="mt-3.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 1.2, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${item.gradient} shadow-lg ${item.glow}`}
                      />
                    </div>
                    <p className="mt-2 text-right text-[10px] font-bold text-slate-500">{item.percent}%</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.section>

          {/* Main Grid: Recent Apps + Health + Security */}
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {/* Recent Applications Card */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-4px_rgba(99,102,241,0.4)]">
                    <ChartBarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Application Inventory</p>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Your Applications</h2>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/applications')}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-bold text-slate-400 transition-all hover:bg-white/[0.05] hover:text-white"
                >
                  View All <ArrowRightIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {recentApps.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-12 text-center text-sm text-slate-500 font-semibold">
                    No applications yet. Create your first app to start issuing credentials.
                  </div>
                ) : (
                  recentApps.map((app: any, i: number) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      key={app._id}
                      className="group flex items-center justify-between rounded-2xl border border-white/[0.04] bg-[#0c0c16]/20 px-5 py-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 font-extrabold text-sm shadow-inner group-hover:scale-103 transition-transform">
                          {app.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-200 transition-colors">{app.name}</p>
                          <p className="mt-1 text-xs text-slate-500 font-medium">
                            v{app.version} • {app.userCount || 0} users
                          </p>
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          app.status === 'active'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]'
                            : 'border-zinc-600/25 bg-zinc-600/10 text-zinc-300'
                        }`}
                      >
                        {app.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {app.status}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/[0.05]">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs font-bold text-gray-400 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <div className="text-xs font-bold text-gray-500">
                    Page <span className="text-gray-200">{currentPage}</span> of <span className="text-gray-200">{totalPages}</span>
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs font-bold text-gray-400 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>

            {/* Right Side Column */}
            <div className="space-y-6">
              {/* Health Indicators Card */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-4px_rgba(99,102,241,0.4)]">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Operational Ratios</p>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Health Indicators</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {[
                    {
                      label: 'License Activation',
                      value: licenseUsage,
                      caption: `${stats.usedLicenses} of ${stats.licenses} licenses consumed`,
                      gradient: 'from-indigo-500 to-purple-500',
                      glow: 'shadow-indigo-500/25',
                    },
                    {
                      label: 'User Health',
                      value: healthyUsers,
                      caption: `${Math.max(stats.users - stats.bannedUsers, 0)} active vs ${stats.bannedUsers} banned`,
                      gradient: 'from-emerald-400 to-teal-500',
                      glow: 'shadow-emerald-500/25',
                    },
                  ].map((item, i) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="text-indigo-300 font-bold">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.2, delay: 0.5 + i * 0.15, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${item.gradient} shadow-lg ${item.glow}`}
                        />
                      </div>
                      <p className="mt-2.5 text-xs text-slate-500 font-medium">{item.caption}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Security Features Card */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-4px_rgba(16,185,129,0.4)]">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Platform Security</p>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Security Features</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    { text: 'JWT Access & Refresh Token Handling', icon: KeyIcon },
                    { text: 'Signed Client Requests & Replay Protection', icon: ShieldCheckIcon },
                    { text: 'HWID-Aware Session Validation', icon: ServerStackIcon },
                    { text: 'Real-time Webhook Notifications', icon: BoltIcon },
                    { text: 'Encrypted API Communication (HTTPS)', icon: GlobeAltIcon },
                  ].map((item, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      key={item.text}
                      className="flex items-center gap-3.5 rounded-2xl border border-white/[0.04] bg-[#0c0c16]/10 px-4 py-3.5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 shadow-inner">
                        <item.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-300 leading-tight">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Quick Actions Shortcuts */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="card"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_-4px_rgba(168,85,247,0.4)]">
                    <BoltIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Shortcuts</p>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">Quick Actions</h2>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Create Application', href: '/dashboard/applications', icon: CubeIcon, color: 'from-blue-600 to-indigo-600', shadow: 'hover:shadow-blue-500/20' },
                    { label: 'Manage Users', href: '/dashboard/users', icon: UsersIcon, color: 'from-cyan-600 to-blue-600', shadow: 'hover:shadow-cyan-500/20' },
                    { label: 'Generate License', href: '/dashboard/licenses', icon: KeyIcon, color: 'from-amber-600 to-orange-600', shadow: 'hover:shadow-amber-500/20' },
                    { label: 'View Sessions', href: '/dashboard/sessions', icon: SignalIcon, color: 'from-emerald-600 to-green-600', shadow: 'hover:shadow-emerald-500/20' },
                  ].map((action, i) => (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.55 + i * 0.05 }}
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className={`group flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-gradient-to-br ${action.color} bg-opacity-5 hover:bg-opacity-10 p-3.5 text-left transition-all duration-300 ${action.shadow} hover:-translate-y-0.5 active:translate-y-0 shadow-md`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 shrink-0 group-hover:scale-103 group-hover:bg-white/10 transition-all">
                        <action.icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white tracking-tight leading-tight">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
