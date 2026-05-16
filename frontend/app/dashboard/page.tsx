'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore, useAppStore } from '@/lib/store'
import { getDisplayName } from '@/lib/username'
import { motion } from 'framer-motion'
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CubeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { applications, loadingApplications, statsCache, setStatsCache } = useAppStore()
  const [stats, setStats] = useState(statsCache || {
    applications: 0,
    licenses: 0,
    users: 0,
    sessions: 0,
    usedLicenses: 0,
    bannedUsers: 0,
  })
  const [recentApps, setRecentApps] = useState<any[]>(statsCache?.recentApps || [])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(!statsCache)
  const limit = 4

  useEffect(() => {
    loadRecentApps(currentPage)
  }, [currentPage])

  const loadRecentApps = async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get(`/applications?page=${page}&limit=${limit}`)
      setRecentApps(res.data.applications)
      setTotalPages(res.data.pagination.pages)
      setStats(prev => ({ ...prev, applications: res.data.pagination.total }))
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

  const statCards = [
    { name: 'Sectors', value: stats.applications, icon: CubeIcon, meta: `${recentApps.length} active units`, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { name: 'Auth Keys', value: stats.licenses, icon: KeyIcon, meta: `${stats.usedLicenses} consumed`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { name: 'Personnel', value: stats.users, icon: UsersIcon, meta: `${Math.max(stats.users - stats.bannedUsers, 0)} healthy`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Live Link', value: stats.sessions, icon: ClockIcon, meta: 'Active sessions', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  ]

  const licenseUsage = stats.licenses > 0 ? Math.round((stats.usedLicenses / stats.licenses) * 100) : 0
  const healthyUsers = stats.users > 0 ? Math.round(((stats.users - stats.bannedUsers) / stats.users) * 100) : 100

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <section className="relative overflow-hidden card-premium p-8 sm:p-12 border-primary-500/20 bg-primary-500/[0.02]">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <SparklesIcon className="w-32 h-32 text-primary-500" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-500 mb-4">Command Center Console</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] mb-6">
              Welcome back, <span className="text-primary-400">{getDisplayName(user?.username ?? null, user?.email ?? '')}</span>.
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed">
              Your authentication network is currently operational. Monitor your applications, license inventory, and active personnel sessions from this central hub.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                Network Online
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                <ShieldCheckIcon className="w-4 h-4 text-primary-400" />
                Secure Protocol Active
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={stat.name} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            className="card-premium group p-6 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-dark-muted">{stat.name}</p>
            </div>
            <p className="text-4xl font-black text-white tracking-tighter mb-1">{stat.value}</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.meta}</p>
          </motion.div>
        ))}
      </section>

      {/* Main Content Area */}
      <section className="grid gap-8 xl:grid-cols-3">
        {/* Recent Activity */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Active Sectors</h2>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-500 disabled:opacity-20"><ArrowRightIcon className="w-4 h-4 rotate-180" /></button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-500 disabled:opacity-20"><ArrowRightIcon className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent animate-spin rounded-full mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 animate-pulse">Syncing Active Sectors...</p>
              </div>
            ) : recentApps.length === 0 ? (
              <div className="card-premium p-16 text-center border-dashed border-white/10 bg-transparent">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Active Sectors Found</p>
              </div>
            ) : (
              recentApps.map((app: any, idx: number) => (
                <motion.div 
                  key={app._id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: idx * 0.1 }}
                  className="card-premium group p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary-500/30 transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-xl font-black text-slate-400 border border-white/5 group-hover:border-primary-500/20 group-hover:text-primary-400 transition-all">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">{app.name}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        Version {app.version} • {app.userCount || 0} Connected
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${app.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>
                      {app.status}
                    </span>
                    <button className="p-2 rounded-xl bg-white/5 text-slate-600 group-hover:text-white transition-colors">
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-8">
          {/* Health Ratios */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <ArrowTrendingUpIcon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">System Health</h2>
            </div>

            <div className="space-y-10">
              <HealthBar label="License Consumed" value={licenseUsage} color="bg-primary-500" />
              <HealthBar label="Personnel Safety" value={healthyUsers} color="bg-emerald-500" />
            </div>
          </div>

          {/* Features / Security */}
          <div className="card-premium p-8 bg-gradient-to-br from-dark-card to-dark-bg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Sec-Ops Summary</h2>
            </div>
            
            <ul className="space-y-4">
              {['JWT Multi-Factor Sync', 'HWID Protocol Enforced', 'Signed Request Layer', 'Audit Log Trail v2'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

function HealthBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">{label}</p>
          <p className="text-2xl font-black text-white tracking-tighter">{value}%</p>
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${value > 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
          {value > 80 ? 'Optimal' : 'Caution'}
        </div>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${value}%` }} 
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color} shadow-[0_0_12px_rgba(99,102,241,0.3)]`} 
        />
      </div>
    </div>
  )
}
