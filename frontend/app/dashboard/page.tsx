'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  CubeIcon,
  KeyIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    applications: 0, licenses: 0, users: 0,
    sessions: 0, usedLicenses: 0, bannedUsers: 0
  })
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const appsRes = await api.get('/applications')
      const apps = appsRes.data.applications
      setRecentApps(apps.slice(0, 3))

      let totalLicenses = 0, usedLicenses = 0, totalUsers = 0,
          bannedUsers = 0, totalSessions = 0

      for (const app of apps) {
        try {
          const [lRes, uRes, sRes] = await Promise.all([
            api.get(`/licenses/application/${app._id}`),
            api.get(`/users/application/${app._id}`),
            api.get(`/sessions/application/${app._id}`)
          ])
          totalLicenses  += lRes.data.licenses.length
          usedLicenses   += lRes.data.licenses.filter((l: any) => l.used).length
          totalUsers     += uRes.data.users.length
          bannedUsers    += uRes.data.users.filter((u: any) => u.banned).length
          totalSessions  += sRes.data.sessions.length
        } catch {}
      }

      setStats({
        applications: apps.length, licenses: totalLicenses,
        users: totalUsers, sessions: totalSessions,
        usedLicenses, bannedUsers
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { name: 'Applications',    value: stats.applications, icon: CubeIcon,        color: 'text-indigo-400',  border: 'border-indigo-500/15' },
    { name: 'Total Licenses',  value: stats.licenses,     icon: KeyIcon,          color: 'text-emerald-400', border: 'border-emerald-500/15' },
    { name: 'Total Users',     value: stats.users,        icon: UsersIcon,        color: 'text-violet-400',  border: 'border-violet-500/15' },
    { name: 'Active Sessions', value: stats.sessions,     icon: ClockIcon,        color: 'text-amber-400',   border: 'border-amber-500/15' },
    { name: 'Used Licenses',   value: stats.usedLicenses, icon: ChartBarIcon,     color: 'text-sky-400',     border: 'border-sky-500/15' },
    { name: 'Banned Users',    value: stats.bannedUsers,  icon: ShieldCheckIcon,  color: 'text-rose-400',    border: 'border-rose-500/15' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className={`bg-white/[0.02] border ${stat.border} rounded-xl p-5 hover:bg-white/[0.04] transition-colors`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.name}</p>
                <stat.icon className={`w-4 h-4 ${stat.color} opacity-70`} />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Applications */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Applications</h2>
            <a href="/dashboard/applications" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              View all
            </a>
          </div>

          {recentApps.length === 0 ? (
            <div className="text-center py-8">
              <CubeIcon className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentApps.map((app: any) => (
                <div
                  key={app._id}
                  className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{app.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">v{app.version} · {app.userCount || 0} users</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    app.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Overview */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Platform Overview</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                label: 'License Usage',
                value: stats.licenses > 0 ? Math.round((stats.usedLicenses / stats.licenses) * 100) : 0,
                suffix: '%',
                color: 'bg-emerald-500'
              },
              {
                label: 'Active Users',
                value: stats.users > 0 ? Math.round(((stats.users - stats.bannedUsers) / stats.users) * 100) : 0,
                suffix: '%',
                color: 'bg-indigo-500'
              },
              {
                label: 'Sessions',
                value: Math.min(stats.sessions * 10, 100),
                suffix: '',
                color: 'bg-amber-500'
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-gray-300 font-medium">
                    {item.label === 'Sessions' ? stats.sessions : `${item.value}${item.suffix}`}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.users - stats.bannedUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Active Users</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-rose-400">{stats.bannedUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Banned Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Security Active</p>
            <p className="text-xs text-gray-500 mt-0.5">
              HMAC SHA256 · Replay Protection · Rate Limiting · HWID Lock · Audit Logging
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
