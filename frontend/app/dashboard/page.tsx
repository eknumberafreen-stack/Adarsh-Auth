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
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
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
    { name: 'Applications', value: stats.applications, icon: CubeIcon, color: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', href: '/dashboard/applications' },
    { name: 'Total Licenses', value: stats.licenses, icon: KeyIcon, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', href: '/dashboard/licenses' },
    { name: 'Total Users', value: stats.users, icon: UsersIcon, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', href: '/dashboard/users' },
    { name: 'Active Sessions', value: stats.activeSessions || 0, icon: SignalIcon, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', href: '/dashboard/sessions' },
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtle-drift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .premium-hero {
          background: linear-gradient(135deg, #090a10 0%, #111322 50%, #06070a 100%);
          background-size: 200% 200%;
          animation: subtle-drift 15s ease infinite;
        }
        .premium-card-indigo {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(99, 102, 241, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-indigo:hover {
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 20px 45px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .premium-card-cyan {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(6, 182, 212, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(6, 182, 212, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-cyan:hover {
          border-color: rgba(6, 182, 212, 0.4);
          box-shadow: 0 20px 45px rgba(6, 182, 212, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .premium-card-purple {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(168, 85, 247, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(168, 85, 247, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-purple:hover {
          border-color: rgba(168, 85, 247, 0.4);
          box-shadow: 0 20px 45px rgba(168, 85, 247, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .premium-card-emerald {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(16, 185, 129, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(16, 185, 129, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-emerald:hover {
          border-color: rgba(16, 185, 129, 0.4);
          box-shadow: 0 20px 45px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .premium-card-amber {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(245, 158, 11, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(245, 158, 11, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-amber:hover {
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 20px 45px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .quick-action-btn {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 14px;
        }
        .quick-action-btn:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.14);
        }
      `}} />

      {/* ── Hero Welcome Banner ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.06] premium-hero p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.03)]"
      >
        {/* Decorative glow orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-purple-500/8 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Operational Console
            </div>
            
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3.5 text-3xl font-black text-white md:text-4xl tracking-tight"
            >
              <span className="text-slate-400 font-semibold text-lg block mb-0.5">{getGreeting()},</span>
              {getDisplayName(user?.username ?? null, user?.email ?? '')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3.5 max-w-lg text-sm leading-relaxed text-slate-400/90 font-medium"
            >
              Welcome to your Adarsh Auth control center. Monitor your applications, manage users and licenses, and track live sessions — all from one unified dashboard.
            </motion.p>
          </div>

          {/* Live Clock Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/[0.05] bg-black/45 px-8 py-5 backdrop-blur-xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] min-w-[220px]"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Local Time</p>
            <p className="font-mono text-3xl font-black tracking-wider text-white select-none drop-shadow-[0_2px_8px_rgba(255,255,255,0.05)]">{formatTime(currentTime)}</p>
            <p className="text-xs text-slate-400/80 font-bold">{formatDate(currentTime)}</p>
          </motion.div>
        </div>
      </motion.section>

      {loading || loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-1 rounded-full border-2 border-cyan-500/10 border-b-cyan-400 animate-[spin_1.2s_linear_infinite_reverse]" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <motion.section
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {statCards.map((stat, idx) => {
              const cardStyles = [
                'premium-card-indigo',
                'premium-card-amber',
                'premium-card-cyan',
                'premium-card-emerald'
              ]
              return (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.4 }}
                  key={stat.name}
                  onClick={() => router.push(stat.href)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl p-5 ${cardStyles[idx]}`}
                >
                  {/* Top line laser hover glow */}
                  <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  {/* Gradient glow on hover */}
                  <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.color} opacity-0 blur-[40px] transition-opacity duration-500 group-hover:opacity-15`} />

                  <div className="relative z-10 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                    <div className={`rounded-xl ${stat.bg} p-2 border border-white/[0.04]`}>
                      <stat.icon className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                  <p className="relative z-10 mt-3 text-3xl font-black text-white tracking-tight">{stat.value}</p>
                  <div className="relative z-10 mt-3.5 flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-indigo-300 transition-colors uppercase tracking-wider">
                    <span>View details</span>
                    <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.div>
              )
            })}
          </motion.section>

          {/* ── Quick Stats Ribbon ── */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid gap-4 md:grid-cols-4"
          >
            {[
              { label: 'Licenses Used', value: `${stats.usedLicenses}/${stats.licenses}`, percent: licenseUsage, color: 'bg-amber-400', shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]', icon: KeyIcon, cardClass: 'premium-card-amber' },
              { label: 'Healthy Users', value: `${Math.max(stats.users - stats.bannedUsers, 0)}/${stats.users}`, percent: healthyUsers, color: 'bg-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]', icon: CheckCircleIcon, cardClass: 'premium-card-emerald' },
              { label: 'Banned Users', value: stats.bannedUsers, percent: stats.users > 0 ? Math.round((stats.bannedUsers / stats.users) * 100) : 0, color: 'bg-rose-500', shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]', icon: ExclamationTriangleIcon, cardClass: 'premium-card-rose' },
              { label: 'Total Sessions', value: stats.sessions, percent: null, color: '', shadow: '', icon: ClockIcon, cardClass: 'premium-card-indigo' },
            ].map((item, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                key={item.label}
                className={`rounded-2xl p-5 ${item.cardClass}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <item.icon className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">{item.value}</p>
                {item.percent !== null && (
                  <div className="mt-3.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 1, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color} ${item.shadow}`}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-xs font-bold text-slate-400">{item.percent}%</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.section>

          {/* ── Main Balanced Grid (Left: Apps + Actions, Right: Health + Security) ── */}
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            
            {/* ── Left Column ── */}
            <div className="space-y-6 flex flex-col justify-start">
              
              {/* ── Recent Applications ── */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="premium-card-indigo rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300 border border-white/[0.04]">
                      <ChartBarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventory</p>
                      <h2 className="text-xl font-bold text-white tracking-tight">Your Applications</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/applications')}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-bold text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    View All <ArrowRightIcon className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {recentApps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-xs text-slate-400 font-medium">
                      No applications yet. Create your first app to start issuing credentials.
                    </div>
                  ) : (
                    recentApps.map((app: any, i: number) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        key={app._id}
                        className={`group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-3.5 transition-all hover:border-white/[0.08] hover:bg-white/[0.03] border-l-2 ${
                          app.status === 'active' ? 'border-l-emerald-500/80' : 'border-l-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-300 font-black text-xs border border-indigo-500/20">
                            {app.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-sm">{app.name}</p>
                            <p className="mt-0.5 text-xs text-slate-400 font-medium">
                              v{app.version} • {app.userCount || 0} users
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            app.status === 'active'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
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
                  <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/[0.04]">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Page <span className="text-gray-200">{currentPage}</span> of <span className="text-gray-200">{totalPages}</span>
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </motion.div>

              {/* ── Quick Actions ── */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="premium-card-purple rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300 border border-white/[0.04]">
                    <BoltIcon className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Shortcuts</p>
                    <h2 className="text-xl font-bold text-white tracking-tight">Quick Actions</h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Create Application', href: '/dashboard/applications', icon: CubeIcon, hoverShadow: 'hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)] hover:border-indigo-500/40', iconColor: 'text-indigo-400' },
                    { label: 'Manage Users', href: '/dashboard/users', icon: UsersIcon, hoverShadow: 'hover:shadow-[0_4px_20px_rgba(56,189,248,0.15)] hover:border-cyan-500/40', iconColor: 'text-cyan-400' },
                    { label: 'Generate License', href: '/dashboard/licenses', icon: KeyIcon, hoverShadow: 'hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:border-amber-500/40', iconColor: 'text-amber-400' },
                    { label: 'View Sessions', href: '/dashboard/sessions', icon: SignalIcon, hoverShadow: 'hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/40', iconColor: 'text-emerald-400' },
                  ].map((action, i) => (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.45 + i * 0.05 }}
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className={`group flex items-center gap-3.5 rounded-xl quick-action-btn p-3.5 text-left ${action.hoverShadow}`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.04] shrink-0 group-hover:scale-105 transition-all">
                        <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-200 tracking-wide group-hover:text-white transition-colors">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
              
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-6 flex flex-col justify-start">
              
              {/* ── Health Indicators ── */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="premium-card-cyan rounded-2xl p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300 border border-white/[0.04]">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Ratios</p>
                    <h2 className="text-xl font-bold text-white tracking-tight">Health Indicators</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {[
                    {
                      label: 'License Activation',
                      value: licenseUsage,
                      caption: `${stats.usedLicenses} of ${stats.licenses} licenses consumed`,
                      color: 'bg-indigo-400',
                      shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    },
                    {
                      label: 'User Health',
                      value: healthyUsers,
                      caption: `${Math.max(stats.users - stats.bannedUsers, 0)} active vs ${stats.bannedUsers} banned`,
                      color: 'bg-emerald-400',
                      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    },
                  ].map((item, i) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wide">
                        <span>{item.label}</span>
                        <span className="text-indigo-300">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${item.color} ${item.shadow}`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400 font-medium">{item.caption}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Security Features ── */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="premium-card-emerald rounded-2xl p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300 border border-white/[0.04]">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Architecture</p>
                    <h2 className="text-xl font-bold text-white tracking-tight">System Integrity Features</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-2.5">
                  {[
                    { text: 'JWT Access & Refresh Token Handling', icon: KeyIcon },
                    { text: 'Signed Client Requests & Replay Protection', icon: ShieldCheckIcon },
                    { text: 'HWID-Aware Session Validation', icon: ServerStackIcon },
                    { text: 'Real-time Webhook Notifications', icon: BoltIcon },
                    { text: 'Encrypted API Communication (HTTPS)', icon: GlobeAltIcon },
                  ].map((item, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      key={item.text}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.03] bg-white/[0.01] px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/10 shrink-0">
                        <item.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 tracking-wide">{item.text}</span>
                    </motion.div>
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
