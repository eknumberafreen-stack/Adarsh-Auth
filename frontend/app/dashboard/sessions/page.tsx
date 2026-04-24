'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { ClockIcon, SignalIcon, TrashIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Sessions() {
  const { applications } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      setSelectedAppId(applications[0]._id)
    }
  }, [applications, selectedAppId])

  useEffect(() => {
    if (selectedAppId) {
      loadSessions()
    }
  }, [selectedAppId])

  const loadSessions = async () => {
    if (!selectedAppId) return
    setLoading(true)
    try {
      const response = await api.get(`/sessions/application/${selectedAppId}`)
      setSessions(response.data.sessions)
    } catch {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (id: string) => {
    try {
      await api.delete(`/sessions/${id}`)
      toast.success('Session terminated')
      loadSessions()
    } catch {
      toast.error('Failed to terminate session')
    }
  }

  const terminateAll = async () => {
    if (!confirm('Terminate all sessions for this application?')) return
    try {
      await api.delete(`/sessions/application/${selectedAppId}/all`)
      toast.success('All sessions terminated')
      loadSessions()
    } catch {
      toast.error('Failed to terminate sessions')
    }
  }

  const activeApplication = applications.find((app: any) => app._id === selectedAppId)

  return (
    <div className="space-y-8">
      <section className="page-header">
        <div>
          <p className="page-eyebrow">Sessions</p>
          <h1 className="page-title">Review active client sessions with better operational context.</h1>
          <p className="page-subtitle">
            Monitor session heartbeat activity, device binding, and expiry windows for each application, then terminate specific or all
            sessions when needed. Underlying logic stays exactly the same.
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
            <div className="card">
              <p className="page-eyebrow">Filter</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Select application</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Switch applications to view their currently active authenticated sessions.</p>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-300">Application</label>
                <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="input">
                  {applications.map((app: any) => (
                    <option key={app._id} value={app._id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="stat-tile">
                  <div className="flex items-center justify-between">
                    <p className="stat-label">Selected App</p>
                    <SignalIcon className="h-5 w-5 text-sky-300" />
                  </div>
                  <p className="mt-4 text-xl font-bold text-white">{activeApplication?.name ?? 'Unknown'}</p>
                  <p className="stat-meta">Version {activeApplication?.version ?? 'N/A'}</p>
                </div>

                <div className="stat-tile">
                  <div className="flex items-center justify-between">
                    <p className="stat-label">Active Sessions</p>
                    <ClockIcon className="h-5 w-5 text-amber-300" />
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
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
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
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
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
    </div>
  )
}
