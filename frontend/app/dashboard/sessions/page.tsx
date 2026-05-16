'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClockIcon, 
  SignalIcon, 
  TrashIcon, 
  UserCircleIcon, 
  XMarkIcon,
  GlobeAltIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

export default function Sessions() {
  const { applications, selectedApp } = useAppStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm'
  })

  useEffect(() => {
    if (selectedApp?._id) loadSessions()
  }, [selectedApp?._id])

  const loadSessions = async () => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const response = await api.get(`/sessions/application/${selectedApp._id}`)
      setSessions(response.data.sessions)
    } catch { toast.error('Sync failed') }
    finally { setLoading(false) }
  }

  const terminateSession = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Sever Link?',
      message: 'This specific client connection will be force-disconnected immediately.',
      type: 'danger',
      confirmText: 'Sever Link',
      onConfirm: async () => {
        try {
          await api.delete(`/sessions/${id}`)
          toast.success('Link severed'); loadSessions()
        } catch { toast.error('Termination failed') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const terminateAll = async () => {
    setConfirmModal({
      show: true,
      title: 'Full Purge?',
      message: 'Sever ALL active connections for this sector? This cannot be undone.',
      type: 'danger',
      confirmText: 'Purge All',
      onConfirm: async () => {
        try {
          await api.delete(`/sessions/application/${selectedApp?._id}/all`)
          toast.success('Fleet Purged'); loadSessions()
        } catch { toast.error('Purge failed') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-500 mb-1">Live Monitor</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">Active Sessions</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">Monitor real-time heartbeats, device bindings, and connection metadata for the active sector.</p>
        </div>
        
        {sessions.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={terminateAll} 
            className="btn bg-rose-600/10 border border-rose-600/20 text-rose-500 shadow-glow shadow-rose-900/10 py-4 px-8 font-black uppercase tracking-widest text-xs"
          >
            <XMarkIcon className="w-5 h-5" />
            <span>Sever All Links</span>
          </motion.button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="card-premium p-20 text-center flex flex-col items-center">
          <BoltIcon className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Applications Found</h3>
          <p className="text-slate-500 max-w-sm">Sessions require an active application sector. Initialize a new application to start monitoring.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Status Sidebar */}
          <div className="space-y-6 h-fit lg:sticky lg:top-28">
            <div className="card-premium p-6 space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-dark-muted">Active Sector</p>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 shadow-glow animate-pulse" />
                  <p className="text-lg font-black text-white truncate">{selectedApp?.name || 'Unknown'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-dark-muted">Live Connections</p>
                <p className="text-4xl font-black text-white tracking-tighter">{sessions.length}</p>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button onClick={loadSessions} className="btn btn-secondary w-full py-3 text-xs uppercase tracking-widest font-black">Refresh Hub</button>
              </div>
            </div>

            <div className="card-premium p-6 bg-primary-500/[0.03] border-primary-500/20">
              <div className="flex items-center gap-2 mb-4 text-primary-400">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sec-Ops Active</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">Session heartbeats are monitored every 60 seconds. Inactive links are purged automatically.</p>
            </div>
          </div>

          {/* Sessions Main View */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400"><SignalIcon className="w-5 h-5" /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Personnel Stream</h3>
            </div>

            {loading ? (
              <div className="py-32 text-center"><div className="h-10 w-10 border-2 border-primary-500 border-t-transparent animate-spin rounded-full mx-auto" /></div>
            ) : sessions.length === 0 ? (
              <div className="card-premium p-20 text-center border-dashed border-white/10 bg-transparent flex flex-col items-center">
                <SignalIcon className="w-12 h-12 text-slate-800 mb-4 opacity-20" />
                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No active links detected in this sector</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 xl:grid-cols-2">
                <AnimatePresence>
                  {sessions.map((session, idx) => (
                    <motion.div
                      key={session._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="card-premium group p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                              <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-white tracking-tight">{session.userId?.username || 'Guest Identity'}</h4>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Application Link Active</p>
                            </div>
                          </div>
                          <button onClick={() => terminateSession(session._id)} className="p-2 rounded-xl bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4" /></button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <SessionField icon={GlobeAltIcon} label="Network IP" value={session.ip} />
                          <SessionField icon={FingerPrintIcon} label="HWID Binding" value={session.hwid} />
                          <div className="grid grid-cols-2 gap-3">
                            <SessionField icon={BoltIcon} label="Heartbeat" value={new Date(session.lastHeartbeat).toLocaleTimeString()} />
                            <SessionField icon={CalendarDaysIcon} label="Expiry" value={new Date(session.expiresAt).toLocaleTimeString()} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Link Secure</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Ref: {session._id.substring(0, 8)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm card-premium p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-6"><XMarkIcon className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="btn btn-secondary flex-1 text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button onClick={confirmModal.onConfirm} className="btn bg-rose-600 text-white flex-1 text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-950/40">Terminate</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SessionField({ icon: Icon, label, value }: any) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">{label}</p>
        <p className="text-[10px] font-mono font-bold text-slate-300 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  )
}
