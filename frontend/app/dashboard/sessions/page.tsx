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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time monitor of all active client connections</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Live refresh indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Auto-refreshing every 5s
          </div>
          {sessions.length > 0 && (
            <button onClick={terminateAll} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all w-full sm:w-auto">
              <XMarkIcon className="w-4 h-4" /> Terminate All
            </button>
          )}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-lg font-semibold text-white">Create an application first</p>
          <p className="mt-2 text-sm text-gray-400">Sessions are application-specific.</p>
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="card p-4 flex flex-col gap-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Sessions</p>
              <p className="text-3xl font-bold text-white">{sessions.length}</p>
              <p className="text-xs text-gray-500">{selectedApp?.name}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="card p-4 flex flex-col gap-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🟢 Live Now</p>
              <p className="text-3xl font-bold text-green-400">{activeSessions.length}</p>
              <p className="text-xs text-gray-500">heartbeat &lt; 45s</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="card p-4 flex flex-col gap-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🔴 Offline</p>
              <p className="text-3xl font-bold text-red-400">{offlineSessions.length}</p>
              <p className="text-xs text-gray-500">stale sessions</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="card p-4 flex flex-col gap-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Avg Ping</p>
              <p className="text-3xl font-bold text-indigo-400">
                {activeSessions.length === 0
                  ? 'N/A'
                  : `${Math.round(
                      activeSessions.filter(s => s.ping && s.ping !== 'N/A').reduce((a, s) => a + parseInt(s.ping), 0) /
                      (activeSessions.filter(s => s.ping && s.ping !== 'N/A').length || 1)
                    )}ms`
                }
              </p>
              <p className="text-xs text-gray-500">live clients only</p>
            </motion.div>
          </div>

          {/* ── Sessions Table ── */}
          <div className="card overflow-hidden p-0 border border-white/10 bg-[#0f1015]/60 backdrop-blur-md">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📡</div>
                <p className="text-lg font-semibold text-white">No active sessions</p>
                <p className="mt-2 text-sm text-gray-400">When a client logs in and starts heartbeating, it will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm min-w-[950px]">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">User</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">Ping</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">IP Address</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">HWID</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">Last Heartbeat</th>
                      <th className="text-left px-5 py-3.5 text-gray-400 font-medium text-xs uppercase tracking-wider">Expires</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSessions.map((session: any, i: number) => {
                      const isLive = Date.now() - new Date(session.lastHeartbeat).getTime() < 45000
                      const ping = session.ping && session.ping !== 'N/A' ? parseInt(session.ping) : null
                      const pingColor = ping === null ? 'text-gray-500' : ping < 100 ? 'text-green-400' : ping < 300 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.03 }}
                          key={session._id} 
                          className="border-b border-dark-border/50 hover:bg-dark-hover/20 transition-colors"
                        >
                          {/* User */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                                {(session.userId?.username || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{session.userId?.username || 'Unknown'}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{session._id?.slice(-8)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-bold text-green-400 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                                Offline
                              </span>
                            )}
                          </td>

                          {/* Ping */}
                          <td className="px-5 py-4">
                            <span className={`font-mono font-semibold text-sm ${isLive && ping !== null ? pingColor : 'text-gray-500'}`}>
                              {isLive && ping !== null ? `${ping} ms` : '—'}
                            </span>
                          </td>

                          {/* IP */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-gray-300">{session.ip || 'N/A'}</span>
                          </td>

                          {/* HWID */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => { navigator.clipboard.writeText(session.hwid || ''); toast.success('HWID copied!') }}
                              className="font-mono text-xs text-gray-400 hover:text-primary-400 transition-colors cursor-pointer"
                              title={session.hwid}
                            >
                              {session.hwid ? `${session.hwid.slice(0, 10)}…` : 'N/A'}
                            </button>
                          </td>

                          {/* Last Heartbeat */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-gray-300">{timeAgo(session.lastHeartbeat)}</p>
                            <p className="text-[11px] text-gray-500">{formatDate(session.lastHeartbeat)}</p>
                          </td>

                          {/* Expires */}
                          <td className="px-5 py-4">
                            <p className="text-xs text-gray-400">{formatDate(session.expiresAt)}</p>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => terminateSession(session._id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-all"
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

            {/* Pagination Controls — KeyAuth Style */}
            {totalSessionsPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-t border-white/5">
                <button
                  onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                  disabled={sessionsPage === 1}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                <div className="text-xs font-medium text-gray-500">
                  Showing page <span className="text-gray-200">{sessionsPage}</span> of <span className="text-gray-200">{totalSessionsPages}</span>
                </div>

                <button
                  onClick={() => setSessionsPage(p => Math.min(totalSessionsPages, p + 1))}
                  disabled={sessionsPage === totalSessionsPages}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* ── Session History (Audit Logs) ── */}
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Session Activity History</h2>
              <p className="text-xs text-gray-400 mt-0.5">Audit log of all manual session kicks and force-closes</p>
            </div>

            <div className="card overflow-hidden p-0">
              {history.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">📜</div>
                  <p className="text-sm font-semibold text-gray-300">No session history yet</p>
                  <p className="text-xs text-gray-500 mt-1">Logs of kicked or crashed sessions will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border bg-dark-hover/10">
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Action</th>
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Performed By</th>
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">IP Address</th>
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">HWID</th>
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Time</th>
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
                            className="border-b border-dark-border/30 hover:bg-dark-hover/10 transition-colors"
                          >
                            {/* Client User */}
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-white">{log.details?.clientUsername || 'Unknown'}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{log.userId?.slice(-8)}</p>
                            </td>

                            {/* Action */}
                            <td className="px-5 py-3.5">
                              {isCrash ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                  💥 Crash It
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  ⚡ Kick
                                </span>
                              )}
                            </td>

                            {/* Admin who performed it */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                                  A
                                </span>
                                <span className="font-medium text-gray-200">{log.details?.kickedBy || log.details?.crashedBy || 'Admin'}</span>
                              </div>
                            </td>

                            {/* IP Address */}
                            <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                              {log.details?.clientIp || 'N/A'}
                            </td>

                            {/* HWID */}
                            <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                              <span title={log.details?.hwid}>
                                {log.details?.hwid ? `${log.details.hwid.slice(0, 12)}…` : 'N/A'}
                              </span>
                            </td>

                            {/* Time */}
                            <td className="px-5 py-3.5 text-xs text-gray-300">
                              <p>{timeAgo(log.timestamp)}</p>
                              <p className="text-[10px] text-gray-500">{formatDate(log.timestamp)}</p>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls — KeyAuth Style */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-t border-white/5">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="text-xs font-medium text-gray-500">
                    Showing page <span className="text-gray-200">{historyPage}</span> of <span className="text-gray-200">{historyTotalPages}</span>
                  </div>

                  <button
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="w-full max-w-sm bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl ${
                confirmModal.type === 'danger' ? 'bg-red-500/20' : confirmModal.type === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
              }`}>
                {confirmModal.type === 'danger' ? '⚡' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmModal(p => ({ ...p, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl text-sm font-bold transition-all">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white transition-all ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' : confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'
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
