'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  SignalIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ServerIcon,
  TrashIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline'

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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sessions</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Real-time monitor of active client execution nodes</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live refresh indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Auto-Sync Active
          </div>
          {sessions.length > 0 && (
            <button onClick={terminateAll} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all">
              <NoSymbolIcon className="w-4 h-4" /> Terminate All Sessions
            </button>
          )}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
          Create an application first to monitor client connections.
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Total Sessions', value: sessions.length, subtitle: selectedApp?.name, glow: 'shadow-indigo-500/15', textStyle: 'text-white' },
              { title: 'Live Now', value: activeSessions.length, subtitle: 'Heartbeat < 45s', glow: 'shadow-emerald-500/15', textStyle: 'text-emerald-400' },
              { title: 'Stale / Offline', value: offlineSessions.length, subtitle: 'Disconnected', glow: 'shadow-red-500/15', textStyle: 'text-red-400' },
              { title: 'Avg Ping latency', value: activeSessions.length === 0 ? 'N/A' : `${Math.round(activeSessions.filter(s => s.ping && s.ping !== 'N/A').reduce((a, s) => a + parseInt(s.ping), 0) / (activeSessions.filter(s => s.ping && s.ping !== 'N/A').length || 1))}ms`, subtitle: 'Live nodes only', glow: 'shadow-indigo-500/15', textStyle: 'text-indigo-300' }
            ].map((stat, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3, delay: idx * 0.05 }} 
                key={stat.title}
                className="card p-5 flex flex-col gap-1 shadow-lg hover:border-white/10 transition-colors"
                style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{stat.title}</p>
                <p className={`text-2xl font-black mt-1 ${stat.textStyle}`}>{stat.value}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{stat.subtitle}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Sessions Table ── */}
          <div className="card overflow-visible p-0 relative shadow-2xl">
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
                No active execution sessions found. Connect clients to see them live.
              </div>
            ) : (
              <div className="overflow-x-auto w-full scrollbar-thin">
                <table className="w-full text-sm table-modern text-left">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">User Node</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Connection</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ping Latency</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">IP Address</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">HWID Blueprint</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Last Heartbeat</th>
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expires</th>
                      <th className="px-5 py-4 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSessions.map((session: any, i: number) => {
                      const isLive = Date.now() - new Date(session.lastHeartbeat).getTime() < 45000
                      const ping = session.ping && session.ping !== 'N/A' ? parseInt(session.ping) : null
                      const pingColor = ping === null ? 'text-slate-500' : ping < 100 ? 'text-green-400 font-bold' : ping < 300 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.02 }}
                          key={session._id} 
                          className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors"
                        >
                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-xs shrink-0">
                                {(session.userId?.username || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white">{session.userId?.username || 'Unknown'}</p>
                                <p className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider mt-0.5">ID: {session._id?.slice(-8)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live Connection
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-extrabold text-red-400 uppercase tracking-wider">
                                Offline
                              </span>
                            )}
                          </td>

                          {/* Ping */}
                          <td className="px-5 py-4 font-mono">
                            <span className={`text-xs ${isLive && ping !== null ? pingColor : 'text-slate-500'}`}>
                              {isLive && ping !== null ? `${ping} ms` : '—'}
                            </span>
                          </td>

                          {/* IP */}
                          <td className="px-5 py-4 font-mono text-xs font-bold text-slate-300">
                            {session.ip || 'N/A'}
                          </td>

                          {/* HWID */}
                          <td className="px-5 py-4 font-mono">
                            <button
                              onClick={() => { navigator.clipboard.writeText(session.hwid || ''); toast.success('HWID copied!') }}
                              className="text-xs text-slate-400 font-bold hover:text-indigo-400 bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              title={session.hwid}
                            >
                              {session.hwid ? `${session.hwid.slice(0, 12)}…` : 'N/A'}
                            </button>
                          </td>

                          {/* Last Heartbeat */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-300 font-bold">{timeAgo(session.lastHeartbeat)}</p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{formatDate(session.lastHeartbeat)}</p>
                          </td>

                          {/* Expires */}
                          <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                            {formatDate(session.expiresAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => terminateSession(session._id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all"
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04] bg-black/10">
                <button
                  onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                  disabled={sessionsPage === 1}
                  className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                <div className="text-xs font-semibold text-slate-500">
                  Showing page <span className="text-white">{sessionsPage}</span> of <span className="text-white">{totalSessionsPages}</span>
                </div>

                <button
                  onClick={() => setSessionsPage(p => Math.min(totalSessionsPages, p + 1))}
                  disabled={sessionsPage === totalSessionsPages}
                  className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* ── Session History (Audit Logs) ── */}
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Audit activity Logs</h2>
              <p className="text-xs text-slate-500 font-semibold tracking-wide">Audit record of administrative session actions</p>
            </div>

            <div className="card overflow-hidden p-0 relative shadow-2xl">
              {history.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-12 text-center text-sm text-slate-500 font-semibold">
                  No session termination actions logged.
                </div>
              ) : (
                <div className="overflow-x-auto w-full scrollbar-thin">
                  <table className="w-full text-sm table-modern text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05] bg-black/10">
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Client Node</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Action Type</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Issued By</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">IP Address</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">HWID Blueprint</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((log: any, i: number) => {
                        const isCrash = log.action === 'session_crashed';
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.02 }}
                            key={log._id} 
                            className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors"
                          >
                            {/* Client User */}
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-white">{log.details?.clientUsername || 'Unknown'}</p>
                              <p className="text-[9px] text-slate-500 font-mono font-bold uppercase mt-0.5">ID: {log.userId?.slice(-8)}</p>
                            </td>

                            {/* Action */}
                            <td className="px-5 py-3.5">
                              {isCrash ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[9px] font-extrabold text-red-400 uppercase tracking-wider">
                                  💥 Forced Crash
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-extrabold text-amber-400 uppercase tracking-wider">
                                  ⚡ Remote Kick
                                </span>
                              )}
                            </td>

                            {/* Admin who performed it */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-[10px] font-extrabold text-indigo-400 border border-indigo-500/20">
                                  A
                                </span>
                                <span className="font-bold text-slate-300 text-xs">{log.details?.kickedBy || log.details?.crashedBy || 'Admin'}</span>
                              </div>
                            </td>

                            {/* IP Address */}
                            <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-400">
                              {log.details?.clientIp || 'N/A'}
                            </td>

                            {/* HWID */}
                            <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-400">
                              <span title={log.details?.hwid}>
                                {log.details?.hwid ? `${log.details.hwid.slice(0, 12)}…` : 'N/A'}
                              </span>
                            </td>

                            {/* Time */}
                            <td className="px-5 py-3.5 text-xs">
                              <p className="text-slate-300 font-bold">{timeAgo(log.timestamp)}</p>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{formatDate(log.timestamp)}</p>
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04] bg-black/10">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="text-xs font-semibold text-slate-500">
                    Showing page <span className="text-white">{historyPage}</span> of <span className="text-white">{historyTotalPages}</span>
                  </div>

                  <button
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#08080e]/95 border border-white/[0.05] rounded-[28px] p-6 shadow-2xl shadow-black/80"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? '⚡' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 font-semibold leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmModal(p => ({ ...p, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 rounded-2xl text-xs font-bold border border-white/[0.05] transition-all">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-950/40' :
                    confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-950/40' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                  }`}>
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
