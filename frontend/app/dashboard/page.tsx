'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore, useAppStore } from '@/lib/store'
import { getDisplayName } from '@/lib/username'
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  CubeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { applications, loadingApplications } = useAppStore()
  const [stats, setStats] = useState({
    applications: 0,
    licenses: 0,
    users: 0,
    sessions: 0,
    usedLicenses: 0,
    bannedUsers: 0,
  })
  const [recentApps, setRecentApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (applications.length > 0) {
      loadStats()
    } else {
      // If store is empty (first load), wait for layout to fill it or do a one-time fetch
      api.get('/applications').then(res => {
        setRecentApps(res.data.applications.slice(0, 4))
        loadStats(res.data.applications)
      })
    }
  }, [applications])

  const loadStats = async (appsToUse = applications) => {
    if (appsToUse.length === 0) {
      setLoading(false)
      return
    }
    setRecentApps(appsToUse.slice(0, 4))

    try {

      let totalLicenses = 0
      let usedLicenses = 0
      let totalUsers = 0
      let bannedUsers = 0
      let totalSessions = 0

      // Fetch all stats in parallel for all apps
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
        }
      })

      setStats({
        applications: appsToUse.length,
        licenses: totalLicenses,
        users: totalUsers,
        sessions: totalSessions,
        usedLicenses,
        bannedUsers,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Applications',
      value: stats.applications,
      icon: CubeIcon,
      meta: `${recentApps.length} recently active`,
      color: 'text-indigo-300',
    },
    {
      name: 'Licenses',
      value: stats.licenses,
      icon: KeyIcon,
      meta: `${stats.usedLicenses} activated`,
      color: 'text-slate-200',
    },
    {
      name: 'Users',
      value: stats.users,
      icon: UsersIcon,
      meta: `${Math.max(stats.users - stats.bannedUsers, 0)} currently active`,
      color: 'text-zinc-200',
    },
    {
      name: 'Sessions',
      value: stats.sessions,
      icon: ClockIcon,
      meta: 'Live authenticated client sessions',
      color: 'text-indigo-200',
    },
  ]

  const licenseUsage = stats.licenses > 0 ? Math.round((stats.usedLicenses / stats.licenses) * 100) : 0
  const healthyUsers = stats.users > 0 ? Math.round(((stats.users - stats.bannedUsers) / stats.users) * 100) : 100

  return (
    <div className="space-y-8">
      <section className="surface-panel px-6 py-8 md:px-8">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Overview</p>
            <h1 className="page-title">Manage authentication, licenses, users, and sessions from one workspace.</h1>
            <p className="page-subtitle">
              Welcome back, {getDisplayName(user?.username ?? null, user?.email ?? '')}. This view consolidates your applications,
              license inventory, users, and active sessions with a cleaner classic dark layout.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/80">Authentication</p>
              <p className="mt-2 text-lg font-bold text-white">Secure sign-in, tokens, and request protection</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Dashboard</p>
              <p className="mt-2 text-lg font-bold text-white">Clearer views for apps, licenses, users, and live sessions</p>
            </div>
          </div>
        </div>
      </section>

      {loading || loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.name} className="stat-tile">
                <div className="flex items-center justify-between">
                  <p className="stat-label">{stat.name}</p>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-meta">{stat.meta}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
                  <ChartBarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="page-eyebrow">Recent Applications</p>
                  <h2 className="text-2xl font-bold text-white">Most recently managed apps</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {recentApps.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-slate-400">
                    No applications yet. Create your first app to start issuing credentials and client sessions.
                  </div>
                ) : (
                  recentApps.map((app: any) => (
                    <div key={app._id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-bold text-white">{app.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Version {app.version} • {app.userCount || 0} users currently linked
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            app.status === 'active'
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                              : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Operational Ratios</p>
                    <h2 className="text-2xl font-bold text-white">Health indicators</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {[
                    {
                      label: 'License activation',
                      value: licenseUsage,
                      caption: `${stats.usedLicenses} of ${stats.licenses} licenses have been consumed`,
                      color: 'bg-indigo-400',
                    },
                    {
                      label: 'User health',
                      value: healthyUsers,
                      caption: `${Math.max(stats.users - stats.bannedUsers, 0)} active versus ${stats.bannedUsers} banned`,
                      color: 'bg-emerald-400',
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-300">{item.label}</span>
                        <span className="text-slate-400">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{item.caption}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-200">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Security Summary</p>
                    <h2 className="text-2xl font-bold text-white">Controls currently surfaced</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    'JWT access and refresh handling',
                    'Signed client requests and replay protection',
                    'HWID-aware session validation',
                    'Audit visibility for authentication events',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
