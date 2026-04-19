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
  BoltIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ applications: 0, licenses: 0, users: 0, sessions: 0, usedLicenses: 0, bannedUsers: 0 })
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const appsRes = await api.get('/applications')
      const apps = appsRes.data.applications
      setRecentApps(apps.slice(0, 3))

      let totalLicenses = 0, usedLicenses = 0, totalUsers = 0, bannedUsers = 0, totalSessions = 0

      for (const app of apps) {
        try {
          const [lRes, uRes, sRes] = await Promise.all([
            api.get(`/licenses/application/${app._id}`),
            api.get(`/users/application/${app._id}`),
            api.get(`/sessions/application/${app._id}`)
          ])
          totalLicenses += lRes.data.licenses.length
          usedLicenses += lRes.data.licenses.filter((l: any) => l.used).length
          totalUsers += uRes.data.users.length
          bannedUsers += uRes.data.users.filter((u: any) => u.banned).length
          totalSessions += sRes.data.sessions.length
        } catch {}
      }

      setStats({ applications: apps.length, licenses: totalLicenses, users: totalUsers, sessions: totalSessions, usedLicenses, bannedUsers })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { name: 'Applications', value: stats.applications, icon: CubeIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { name: 'Total Licenses', value: stats.licenses, icon: KeyIcon, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { name: 'Total Users', value: stats.users, icon: UsersIcon, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { name: 'Active Sessions', value: stats.sessions, icon: ClockIcon, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { name: 'Used Licenses', value: stats.usedLicenses, icon: ChartBarIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { name: 'Banned Users', value: stats.bannedUsers, icon: ShieldCheckIcon, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary-600/30 to-purple-600/20 border border-primary-500/30 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back! 👋</h1>
          <p className="text-gray-300 mt-1">{user?.email}</p>
          <p className="text-gray-400 text-sm mt-2">Here's what's happening with your applications today.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary-600/30 border border-primary-500/50 flex items-center justify-center">
            <BoltIcon className="w-8 h-8 text-primary-400" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <div key={stat.name} className={`card border ${stat.border} ${stat.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.name}</p>
                  <p className="text-4xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Apps + Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-primary-400" />
              Recent Applications
            </h2>
            <a href="/dashboard/applications" className="text-xs text-primary-400 hover:text-primary-300">View all →</a>
          </div>
          {recentApps.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <CubeIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No applications yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentApps.map((app: any) => (
                <div key={app._id} className="flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-dark-border">
                  <div>
                    <p className="font-medium text-sm">{app.name}</p>
                    <p className="text-xs text-gray-400">v{app.version} · {app.userCount || 0} users</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${app.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-5 h-5 text-primary-400" />
            Platform Overview
          </h2>
          <div className="space-y-4">
            {[
              { label: 'License Usage Rate', value: stats.licenses > 0 ? Math.round((stats.usedLicenses / stats.licenses) * 100) : 0, suffix: '%', color: 'bg-green-500' },
              { label: 'Active Users', value: stats.users > 0 ? Math.round(((stats.users - stats.bannedUsers) / stats.users) * 100) : 0, suffix: '%', color: 'bg-blue-500' },
              { label: 'Sessions Active', value: stats.sessions, suffix: '', color: 'bg-orange-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="font-medium">{item.value}{item.suffix}</span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.suffix === '%' ? item.value : Math.min(item.value * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-dark-border grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.users - stats.bannedUsers}</p>
              <p className="text-xs text-gray-400 mt-1">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.bannedUsers}</p>
              <p className="text-xs text-gray-400 mt-1">Banned Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="card border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-green-400">Security Active</h3>
            <p className="text-sm text-gray-400 mt-1">
              HMAC SHA256 signatures · Replay attack prevention · Rate limiting · HWID locking · Audit logging
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
