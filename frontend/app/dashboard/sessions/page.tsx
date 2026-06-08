'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Sessions() {
  const { applications, selectedApp } = useAppStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsPage, setSessionsPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const limit = 10

  const [confirmModal, setConfirmModal] = useState({
    show: false, title: '', message: '', onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info', confirmText: 'Confirm'
  })

  useEffect(() => {
    if (selectedApp?._id) {
      setSessionsPage(1)
      setHistoryPage(1)
      loadSessions()
      loadHistory(1)
      const interval = setInterval(() => loadSessions(true), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedApp?._id])

  useEffect(() => {
    if (selectedApp?._id) {
      loadHistory(historyPage)
      const interval = setInterval(() => loadHistory(historyPage), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedApp?._id, historyPage])

  const loadSessions = async (background = false) => {
    if (!selectedApp?._id) return
    if (!background) setLoading(true)
    try {
      const res = await api.get(`/sessions/application/${selectedApp._id}`)
      setSessions(res.data.sessions)
    } catch { toast.error('Failed to load sessions') }
    finally { if (!background) setLoading(false) }
  }

  const loadHistory = async (page = historyPage) => {
    if (!selectedApp?._id) return
    try {
      const res = await api.get(`/sessions/application/${selectedApp._id}/history?page=${page}&limit=${limit}`)
      setHistory(res.data.history)
      setHistoryTotalPages(res.data.pagination.pages)
    } catch { /* silent fail */ }
  }

  const confirmAction = (title: string, message: string, type: 'danger' | 'warning' | 'info', confirmText: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, type, confirmText, onConfirm })
  }

  const terminateSession = (id: string) => {
    confirmAction('Terminate Session?', 'Are you sure? The user will be disconnected immediately.', 'danger', 'Terminate', async () => {
      try { 
        await api.delete(`/sessions/${id}`); 
        toast.success('Session terminated'); 
        loadSessions();
        loadHistory(historyPage);
      }
      catch { toast.error('Failed to terminate session') }
      setConfirmModal(p => ({ ...p, show: false }))
    })
  }

  const terminateAll = () => {
    confirmAction('Terminate All?', 'This will disconnect ALL active users from this application.', 'danger', 'Terminate All', async () => {
      try { 
        await api.delete(`/sessions/application/${selectedApp?._id}/all`); 
        toast.success('All sessions terminated'); 
        loadSessions();
        loadHistory(historyPage);
      }
      catch { toast.error('Failed to terminate sessions') }
      setConfirmModal(p => ({ ...p, show: false }))
    })
  }

  const activeSessions = sessions.filter(s => Date.now() - new Date(s.lastHeartbeat).getTime() < 45000)
  const offlineSessions = sessions.filter(s => Date.now() - new Date(s.lastHeartbeat).getTime() >= 45000)

  const totalSessionsPages = Math.ceil(sessions.length / limit)
  const paginatedSessions = sessions.slice((sessionsPage - 1) * limit, sessionsPage * limit)

  return (
    <div className="space-y-8">
      <style dangerouslySetInnerHTML={{__html: `
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
        }

        .premium-card-rose {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(244, 63, 94, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(244, 63, 94, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-rose:hover {
          border-color: rgba(244, 63, 94, 0.4);
          box-shadow: 0 20px 45px rgba(244, 63, 94, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .ping-glow {
          text-shadow: 0 0 6px currentColor;
        }
      `}} />

      {/* ── Header ── */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/[0.04] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Feed Active
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Active Sessions</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400 max-w-xl">
            Real-time monitor of active client connections, hardware profiles, heartbeat intervals, and operational logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sessions.length > 0 && (
            <button 
              onClick={terminateAll} 
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/40 transition-all duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.04)]"
            >
              <XMarkIcon className="w-4 h-4" /> 
              Terminate All Sessions
            </button>
          )}
        </div>
      </section>

      {applications.length === 0 ? (
        <div className="premium-card-indigo text-center py-16 rounded-2xl">
          <p className="text-lg font-bold text-white uppercase tracking-wider">Create an application first</p>
          <p className="mt-2 text-xs text-slate-500">Sessions are application-specific. Create an app inside your workspace registry.</p>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3, delay: 0.1 }} 
              className="premium-card-indigo p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sessions</p>
              <p className="text-3xl font-black text-white tracking-tight">{sessions.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedApp?.name}</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3, delay: 0.2 }} 
              className="premium-card-emerald p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🟢 Live Now</p>
              <p className="text-3xl font-black text-emerald-400 tracking-tight">{activeSessions.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Heartbeat</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3, delay: 0.3 }} 
              className="premium-card-rose p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🔴 Offline</p>
              <p className="text-3xl font-black text-rose-400 tracking-tight">{offlineSessions.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stale Sessions</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3, delay: 0.4 }} 
              className="premium-card-purple p-5 rounded-2xl flex flex-col gap-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Ping</p>
              <p className="text-3xl font-black text-purple-400 tracking-tight">
                {activeSessions.length === 0
                  ? 'N/A'
                  : `${Math.round(
                      activeSessions.filter(s => s.ping && s.ping !== 'N/A').reduce((a, s) => a + parseInt(s.ping), 0) /
                      (activeSessions.filter(s => s.ping && s.ping !== 'N/A').length || 1)
                    )}ms`
                }
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Client average</p>
            </motion.div>
          </div>

          {/* ── Sessions Table ── */}
          <div className="premium-card-indigo overflow-hidden rounded-2xl">
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <h3 className="text-base font-bold text-slate-200">Active Connections List</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                </div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-20 bg-black/10">
                <div className="text-3xl mb-4 animate-pulse">📡</div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">No active sessions</p>
                <p className="mt-2 text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">Active client instances heartbeating with the security backend will populate here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] bg-black/20">
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">User</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">Ping</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">IP Address</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">HWID</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">Last Heartbeat</th>
                      <th className="text-left px-5 py-4 text-slate-400 font-bold text-xs uppercase tracking-wider">Expires</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSessions.map((session: any, i: number) => {
                      const isLive = Date.now() - new Date(session.lastHeartbeat).getTime() < 45000
                      const ping = session.ping && session.ping !== 'N/A' ? parseInt(session.ping) : null
                      const pingColor = ping === null ? 'text-slate-500' : ping < 100 ? 'text-emerald-400' : ping < 300 ? 'text-amber-400' : 'text-rose-400'
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.03 }}
                          key={session._id} 
                          className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                        >
                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                                {(session.userId?.username || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-100 text-xs">{session.userId?.username || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-500 font-mono tracking-tight mt-0.5">{session._id?.slice(-8)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300 uppercase tracking-wider">
                                Offline
                              </span>
                            )}
                          </td>

                          {/* Ping */}
                          <td className="px-5 py-4">
                            <span className={`font-mono font-bold text-xs ping-glow ${isLive && ping !== null ? pingColor : 'text-slate-500'}`}>
                              {isLive && ping !== null ? `${ping} ms` : '—'}
                            </span>
                          </td>

                          {/* IP */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-slate-300">{session.ip || 'N/A'}</span>
                          </td>

                          {/* HWID */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => { navigator.clipboard.writeText(session.hwid || ''); toast.success('HWID copied!') }}
                              className="font-mono text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer text-left focus:outline-none"
                              title={session.hwid}
                            >
                              {session.hwid ? `${session.hwid.slice(0, 12)}…` : 'N/A'}
                            </button>
                          </td>

                          {/* Last Heartbeat */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-200">{timeAgo(session.lastHeartbeat)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(session.lastHeartbeat)}</p>
                          </td>

                          {/* Expires */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-400">{formatDate(session.expiresAt)}</p>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => terminateSession(session._id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider transition-all"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                              Kick
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalSessionsPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-t border-white/[0.04]">
                <button
                  onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                  disabled={sessionsPage === 1}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Page <span className="text-gray-200">{sessionsPage}</span> of <span className="text-gray-200">{totalSessionsPages}</span>
                </div>

                <button
                  onClick={() => setSessionsPage(p => Math.min(totalSessionsPages, p + 1))}
                  disabled={sessionsPage === totalSessionsPages}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* ── Session History (Audit Logs) ── */}
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Audit Logs & Crash Events</h2>
              <p className="text-xs text-slate-400 mt-0.5">Historical log of crashed heartbeat connections and security kick events</p>
            </div>

            <div className="premium-card-cyan overflow-hidden rounded-2xl">
              {history.length === 0 ? (
                <div className="text-center py-16 bg-black/10">
                  <div className="text-2xl mb-2">📜</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No audit history yet</p>
                  <p className="text-xs text-slate-500 mt-1">Operational logs of disconnected clients will automatically register here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04] bg-black/20">
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">User</th>
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Action</th>
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Performed By</th>
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">IP Address</th>
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">HWID</th>
                        <th className="text-left px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((log: any, i: number) => {
                        const actionType = log.action === 'session_crashed' ? 'Crash' : 'Kick';
                        const isCrash = log.action === 'session_crashed';
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.02 }}
                            key={log._id} 
                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Client User */}
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-200 text-xs">{log.details?.clientUsername || 'Unknown'}</p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">{log.userId?.slice(-8)}</p>
                            </td>

                            {/* Action */}
                            <td className="px-5 py-3.5">
                              {isCrash ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300 uppercase tracking-wider">
                                  💥 crash
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300 uppercase tracking-wider">
                                  ⚡ kick
                                </span>
                              )}
                            </td>

                            {/* Admin who performed it */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-xs font-bold text-indigo-300">
                                  A
                                </span>
                                <span className="text-xs font-semibold text-slate-300">{log.details?.kickedBy || log.details?.crashedBy || 'System'}</span>
                              </div>
                            </td>

                            {/* IP Address */}
                            <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                              {log.details?.clientIp || 'N/A'}
                            </td>

                            {/* HWID */}
                            <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                              <span title={log.details?.hwid}>
                                {log.details?.hwid ? `${log.details.hwid.slice(0, 12)}…` : 'N/A'}
                              </span>
                            </td>

                            {/* Time */}
                            <td className="px-5 py-3.5 text-xs text-slate-300">
                              <p className="font-semibold text-slate-200">{timeAgo(log.timestamp)}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{formatDate(log.timestamp)}</p>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-t border-white/[0.04]">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Page <span className="text-gray-200">{historyPage}</span> of <span className="text-gray-200">{historyTotalPages}</span>
                  </div>

                  <button
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0a0b10] border border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]' :
                confirmModal.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              }`}>
                {confirmModal.type === 'danger' ? '⚡' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              <h3 className="text-lg font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmModal(p => ({ ...p, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' :
                    confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                  }`}>
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
