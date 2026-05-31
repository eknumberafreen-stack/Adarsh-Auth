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
  DocumentDuplicateIcon,
  CheckIcon,
  CommandLineIcon,
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

  // Left Column States (Dev Playground & Activity)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<'csharp' | 'python' | 'nodejs'>('csharp')
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  // Initialize selectedAppId once applications are fetched
  useEffect(() => {
    const appsList = applications.length > 0 ? applications : recentApps
    if (appsList.length > 0 && !selectedAppId) {
      setSelectedAppId(appsList[0]._id)
    }
  }, [applications, recentApps, selectedAppId])

  // Simulated NOC terminal activity feed
  useEffect(() => {
    const actions = [
      { type: 'GATEWAY', msg: 'Client authenticated successfully', severity: 'info', prefix: '🔑' },
      { type: 'LICENSE', msg: 'Key verified and consumed', severity: 'success', prefix: '✅' },
      { type: 'SECURITY', msg: 'HWID check passed. No debugger detected', severity: 'success', prefix: '🛡️' },
      { type: 'SESSION', msg: 'Heartbeat response sent', severity: 'info', prefix: '📡' },
      { type: 'WEBHOOK', msg: 'Discord notification payload dispatched', severity: 'info', prefix: '⚡' },
    ]

    const getRandomApp = () => {
      const appsList = applications.length > 0 ? applications : recentApps
      if (appsList && appsList.length > 0) {
        return appsList[Math.floor(Math.random() * appsList.length)].name
      }
      return 'Adarsh App'
    }

    const generateLog = () => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false })
      const action = actions[Math.floor(Math.random() * actions.length)]
      const app = getRandomApp()
      let detail = ''
      if (action.type === 'GATEWAY') {
        const hwid = Math.random().toString(16).substring(2, 8).toUpperCase()
        detail = `in '${app}' (HWID: ${hwid}...${hwid})`
      } else if (action.type === 'LICENSE') {
        const key = `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        detail = `for '${app}' (${key})`
      } else if (action.type === 'SECURITY') {
        detail = `for '${app}' - Signature matching OK`
      } else if (action.type === 'SESSION') {
        const latency = Math.floor(Math.random() * 20) + 10
        detail = `in '${app}' (latency: ${latency}ms)`
      } else {
        detail = `for action: client_authorized in '${app}'`
      }

      return {
        time,
        type: action.type,
        msg: `${action.msg} ${detail}`,
        severity: action.severity,
        prefix: action.prefix
      }
    }

    // Generate initial sequential logs
    const initialLogs = Array.from({ length: 5 }).map((_, idx) => {
      const d = new Date()
      d.setSeconds(d.getSeconds() - (5 - idx) * 12)
      const time = d.toLocaleTimeString('en-US', { hour12: false })
      const log = generateLog()
      log.time = time
      return log
    })
    setLogs(initialLogs)

    const interval = setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, generateLog()]
        if (next.length > 6) {
          next.shift()
        }
        return next
      })
    }, 6000)

    return () => clearInterval(interval)
  }, [applications, recentApps])

  const getCodeSnippet = () => {
    const appsList = applications.length > 0 ? applications : recentApps
    const selectedApp = appsList.find((a: any) => a._id === selectedAppId) || appsList[0]
    const appId = selectedApp?._id || 'APP_ID_PLACEHOLDER'
    const appVersion = selectedApp?.version || '1.0'

    if (selectedLanguage === 'csharp') {
      return `// Initialize AdarshAuth Client
var client = new AdarshAuth.Client(
    appId: "${appId}",
    version: "${appVersion}"
);

if (client.Initialize()) {
    Console.WriteLine("Connection secure.");
    if (client.Authenticate(licenseKey)) {
        Console.WriteLine($"Welcome back, {client.User.Username}!");
        // Run protected code
    }
}`
    }

    if (selectedLanguage === 'python') {
      return `import adarsh_auth

# Initialize Connection
client = adarsh_auth.Client(
    app_id="${appId}",
    version="${appVersion}"
)

if client.initialize():
    print("Connection secure.")
    if client.authenticate(license_key):
        print(f"Welcome back, {client.user.username}!")
        # Run protected code`
    }

    return `const AdarshAuth = require('adarsh-auth-node');

const client = new AdarshAuth({
  appId: '${appId}',
  version: '${appVersion}'
});

async function start() {
  const secure = await client.initialize();
  if (secure) {
    console.log('Connection secure.');
    const user = await client.authenticate(licenseKey);
    if (user) {
      console.log(\`Welcome back, \${user.username}!\`);
    }
  }
}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeSnippet())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      {/* ── Hero Welcome Banner ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f0f1a] via-[#12121f] to-[#0d0d18] p-8 md:p-10"
      >
        {/* Decorative glow orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/8 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-500/8 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-semibold text-indigo-400"
            >
              {getGreeting()},
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-1 text-3xl font-bold text-white md:text-4xl"
            >
              {getDisplayName(user?.username ?? null, user?.email ?? '')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400"
            >
              Welcome to your Adarsh Auth control center. Monitor your applications, manage users and licenses, and track live sessions — all from one unified dashboard.
            </motion.p>
          </div>

          {/* Live Clock Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-5 backdrop-blur-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Local Time</p>
            <p className="font-mono text-3xl font-bold tracking-wider text-white">{formatTime(currentTime)}</p>
            <p className="text-xs text-slate-400">{formatDate(currentTime)}</p>
          </motion.div>
        </div>
      </motion.section>

      {loading || loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
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
            {statCards.map((stat) => (
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                key={stat.name}
                onClick={() => router.push(stat.href)}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border ${stat.border} bg-[#0e0e16] p-5 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-indigo-950/20`}
              >
                {/* Gradient glow on hover */}
                <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.color} opacity-0 blur-[40px] transition-opacity duration-500 group-hover:opacity-20`} />

                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.name}</p>
                  <div className={`rounded-xl ${stat.bg} p-2`}>
                    <stat.icon className="h-5 w-5 text-white/70" />
                  </div>
                </div>
                <p className="relative z-10 mt-3 text-3xl font-bold text-white">{stat.value}</p>
                <div className="relative z-10 mt-2 flex items-center gap-1 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <span>View details</span>
                  <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            ))}
          </motion.section>

          {/* ── Quick Stats Ribbon ── */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="grid gap-4 md:grid-cols-4"
          >
            {[
              { label: 'Licenses Used', value: `${stats.usedLicenses}/${stats.licenses}`, percent: licenseUsage, color: 'bg-amber-400', icon: KeyIcon },
              { label: 'Healthy Users', value: `${Math.max(stats.users - stats.bannedUsers, 0)}/${stats.users}`, percent: healthyUsers, color: 'bg-emerald-400', icon: CheckCircleIcon },
              { label: 'Banned Users', value: stats.bannedUsers, percent: stats.users > 0 ? Math.round((stats.bannedUsers / stats.users) * 100) : 0, color: 'bg-red-400', icon: ExclamationTriangleIcon },
              { label: 'Total Sessions', value: stats.sessions, percent: null, color: '', icon: ClockIcon },
            ].map((item, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                key={item.label}
                className="rounded-2xl border border-white/10 bg-[#0e0e16] p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <item.icon className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                </div>
                <p className="text-2xl font-bold text-white">{item.value}</p>
                {item.percent !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 1, delay: 0.6 + i * 0.1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                    <p className="mt-1.5 text-right text-[11px] text-slate-500">{item.percent}%</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.section>

          {/* ── Main Grid: Recent Apps + Health + Security ── */}
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {/* ── Left Column: Applications Inventory + Symmetrical Dev Playground ── */}
            <div className="space-y-6">
              {/* ── Recent Applications ── */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
                      <ChartBarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="page-eyebrow">Application Inventory</p>
                      <h2 className="text-2xl font-bold text-white">Your Applications</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/applications')}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    View All <ArrowRightIcon className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {recentApps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-slate-400">
                      No applications yet. Create your first app to start issuing credentials.
                    </div>
                  ) : (
                    recentApps.map((app: any, i: number) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.06 }}
                        key={app._id}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 font-bold text-sm">
                            {app.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{app.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              v{app.version} • {app.userCount || 0} users
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                            app.status === 'active'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300'
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
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="text-xs font-medium text-gray-500">
                      Page <span className="text-gray-200">{currentPage}</span> of <span className="text-gray-200">{totalPages}</span>
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </motion.div>

              {/* ── Two Symmetrical Cards: Developer Integration & Live System Stream ── */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* ── CARD A: Developer Integration Playground ── */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                  className="card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                          <CommandLineIcon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Integration SDK</p>
                          <h3 className="text-lg font-bold text-white leading-tight">Code Generator</h3>
                        </div>
                      </div>
                      
                      {/* App Selector */}
                      {(applications.length > 0 || recentApps.length > 0) && (
                        <select
                          value={selectedAppId}
                          onChange={(e) => setSelectedAppId(e.target.value)}
                          className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500/40 transition-colors"
                        >
                          {(applications.length > 0 ? applications : recentApps).map((app: any) => (
                            <option key={app._id} value={app._id} className="bg-[#0e0e16] text-white">
                              {app.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Language Tabs */}
                    <div className="mt-4 flex gap-1 rounded-xl bg-white/[0.03] p-1 border border-white/5">
                      {(['csharp', 'python', 'nodejs'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold uppercase tracking-wide transition-all ${
                            selectedLanguage === lang
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {lang === 'csharp' ? 'C#' : lang === 'nodejs' ? 'Node' : 'Python'}
                        </button>
                      ))}
                    </div>

                    {/* Code Window */}
                    <div className="relative mt-4 group">
                      <pre className="overflow-x-auto rounded-xl bg-[#06060c] p-4 font-mono text-[11px] text-indigo-200 border border-white/5 h-[160px] leading-relaxed select-all scrollbar-thin">
                        <code>{getCodeSnippet()}</code>
                      </pre>
                      
                      {/* Copy Action */}
                      <button
                        onClick={handleCopy}
                        className="absolute right-2 top-2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
                        title="Copy Code"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>SDK Version v2.4.1</span>
                    <a
                      href="/dashboard/developers"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                    >
                      Read full API docs →
                    </a>
                  </div>
                </motion.div>

                {/* ── CARD B: Live System Stream & API Health ── */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="card flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                          <SignalIcon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Operational NOC</p>
                          <h3 className="text-lg font-bold text-white leading-tight">Live Activity</h3>
                        </div>
                      </div>
                      
                      {/* Pulse Status */}
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Connected
                      </div>
                    </div>

                    {/* Gateway Health Indicator Row */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/[0.02] p-2.5 border border-white/5 text-center">
                      {[
                        { name: 'Auth API', ping: '14ms' },
                        { name: 'License Svc', ping: '11ms' },
                        { name: 'Session WS', ping: '24ms' },
                      ].map((gw) => (
                        <div key={gw.name} className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">{gw.name}</span>
                          <span className="mt-0.5 text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 inline-block animate-ping" />
                            {gw.ping}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Terminal Display */}
                    <div className="mt-4 rounded-xl bg-[#06060c] p-3 font-mono text-[10px] border border-white/5 h-[160px] flex flex-col justify-start overflow-hidden gap-1.5">
                      {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-1.5 leading-relaxed text-slate-300 text-left border-b border-white/[0.01] pb-1">
                          <span className="text-slate-600 shrink-0 font-medium">{log.time}</span>
                          <span
                            className={`px-1 rounded text-[9px] font-extrabold uppercase shrink-0 tracking-wider ${
                              log.type === 'GATEWAY'
                                ? 'bg-indigo-500/10 text-indigo-300'
                                : log.type === 'LICENSE'
                                ? 'bg-amber-500/10 text-amber-300'
                                : log.type === 'SECURITY'
                                ? 'bg-red-500/10 text-red-300'
                                : 'bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {log.type}
                          </span>
                          <span className="truncate text-slate-200">
                            {log.msg}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      Audits Sync: Active
                    </span>
                    <a
                      href="/dashboard/sessions"
                      className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                    >
                      Monitor active sessions →
                    </a>
                  </div>
                </motion.div>
                
              </div>
            </div>

            {/* ── Right Side Column ── */}
            <div className="space-y-6">
              {/* ── Health Indicators ── */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Operational Ratios</p>
                    <h2 className="text-2xl font-bold text-white">Health Indicators</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {[
                    {
                      label: 'License Activation',
                      value: licenseUsage,
                      caption: `${stats.usedLicenses} of ${stats.licenses} licenses consumed`,
                      color: 'bg-indigo-400',
                    },
                    {
                      label: 'User Health',
                      value: healthyUsers,
                      caption: `${Math.max(stats.users - stats.bannedUsers, 0)} active vs ${stats.bannedUsers} banned`,
                      color: 'bg-emerald-400',
                    },
                  ].map((item, i) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-300">{item.label}</span>
                        <span className="text-slate-400">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1, delay: 0.7 + i * 0.15, ease: 'easeOut' }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{item.caption}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Security Features ── */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Platform Security</p>
                    <h2 className="text-2xl font-bold text-white">Security Features</h2>
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
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.06 }}
                      key={item.text}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                        <item.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-sm text-slate-300">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* ── Quick Actions ── */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="card"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-200">
                    <BoltIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="page-eyebrow">Shortcuts</p>
                    <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Create Application', href: '/dashboard/applications', icon: CubeIcon, color: 'from-indigo-600 to-purple-600' },
                    { label: 'Manage Users', href: '/dashboard/users', icon: UsersIcon, color: 'from-cyan-600 to-blue-600' },
                    { label: 'Generate License', href: '/dashboard/licenses', icon: KeyIcon, color: 'from-amber-600 to-orange-600' },
                    { label: 'View Sessions', href: '/dashboard/sessions', icon: SignalIcon, color: 'from-emerald-600 to-green-600' },
                  ].map((action, i) => (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.06 }}
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r ${action.color} bg-opacity-5 p-3.5 text-left transition-all hover:border-white/20 hover:shadow-lg`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 shrink-0">
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-white">{action.label}</span>
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
