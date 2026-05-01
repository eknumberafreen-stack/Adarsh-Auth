'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { ClockIcon, SignalIcon, TrashIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Sessions() {
  const { applications, selectedApp } = useAppStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm'
  })

  useEffect(() => {
    if (selectedApp?._id) {
      loadSessions()
    }
  }, [selectedApp?._id])

  const loadSessions = async () => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const response = await api.get(`/sessions/application/${selectedApp._id}`)
      setSessions(response.data.sessions)
    } catch {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Terminate Session?',
      message: 'Are you sure you want to terminate this active session? The user will be disconnected immediately.',
      type: 'danger',
      confirmText: 'Terminate',
      onConfirm: async () => {
        try {
          await api.delete(`/sessions/${id}`)
          toast.success('Session terminated')
          loadSessions()
        } catch {
          toast.error('Failed to terminate session')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const terminateAll = async () => {
    setConfirmModal({
      show: true,
      title: 'Terminate All?',
      message: 'Are you sure you want to terminate EVERY active session for this application? All users will be disconnected.',
      type: 'danger',
      confirmText: 'Terminate All',
      onConfirm: async () => {
        try {
          await api.delete(`/sessions/application/${selectedApp?._id}/all`)
          toast.success('All sessions terminated')
          loadSessions()
        } catch {
          toast.error('Failed to terminate sessions')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }


  return (
    <div className="space-y-8">
      <section className="page-header">
        <div>
          <p className="page-eyebrow">Sessions</p>
          <h1 className="page-title">Review active authenticated sessions with a clearer dark layout.</h1>
          <p className="page-subtitle">
            Monitor session heartbeat activity, device binding, and expiry windows for each application, then terminate specific or all
            sessions when needed.
          </p>
        </div>

        {sessions.length > 0 && (
          <button onClick={terminateAll} className="btn btn-danger">
            <XMarkIcon className="h-5 w-5" />
            Terminate All
          </button>
        )}
      </section>

      {applications.length === 0 ? (
        <div className="card text-center">
          <p className="text-lg font-semibold text-white">Create an application first</p>
          <p className="mt-2 text-sm text-slate-400">Sessions are application-specific, so there is nothing to monitor yet.</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="card h-fit">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="stat-tile">
                  <div className="flex items-center justify-between">
                    <p className="stat-label">Selected App</p>
                    <SignalIcon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <p className="mt-4 text-xl font-bold text-white">{selectedApp?.name ?? 'Unknown'}</p>
                  <p className="stat-meta">Version {selectedApp?.version ?? 'N/A'}</p>
                </div>

                <div className="stat-tile">
                  <div className="flex items-center justify-between">
                    <p className="stat-label">Active Sessions</p>
                    <ClockIcon className="h-5 w-5 text-slate-200" />
                  </div>
                  <p className="stat-value">{sessions.length}</p>
                  <p className="stat-meta">Real-time count for the selected application</p>
                </div>
              </div>
            </div>

            <div className="card">
              <p className="page-eyebrow">Session Surface</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Active authenticated clients</h2>

              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-16 text-center">
                  <p className="text-lg font-semibold text-white">No active sessions</p>
                  <p className="mt-2 text-sm text-slate-400">When a client logs in and starts heartbeating, it will appear here.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {sessions.map((session: any) => (
                    <div key={session._id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
                              <UserCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">{session.userId?.username || 'Unknown User'}</p>
                              <p className="text-sm text-slate-400">Application session record</p>
                            </div>
                          </div>
                        </div>

                        <button onClick={() => terminateSession(session._id)} className="btn btn-danger px-3 py-2 text-xs">
                          <TrashIcon className="h-4 w-4" />
                          Terminate
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3">
                        {[
                          { label: 'IP Address', value: session.ip },
                          { label: 'HWID', value: session.hwid },
                          { label: 'Last Heartbeat', value: new Date(session.lastHeartbeat).toLocaleString() },
                          { label: 'Created', value: new Date(session.createdAt).toLocaleString() },
                          { label: 'Expires', value: new Date(session.expiresAt).toLocaleString() },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-white/8 bg-slate-950/40 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                            <p className="mt-1 break-all text-sm text-slate-200">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {/* ── Custom Confirmation Modal ────────────────────────────────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                confirmModal.type === 'danger' ? 'bg-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {confirmModal.type === 'danger' ? '🗑️' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' :
                    confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                  }`}
                >
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
