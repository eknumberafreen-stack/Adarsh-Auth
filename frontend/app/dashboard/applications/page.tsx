'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SignalIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
  CodeBracketIcon,
  CommandLineIcon,
  KeyIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function Applications() {
  const { applications, setApplications, selectedApp, setSelectedApp, loadingApplications } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameApp, setRenameApp] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newAppName, setNewAppName] = useState('')
  const [newAppVersion, setNewAppVersion] = useState('1.0')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, sessions: 0 })
  const [credentials, setCredentials] = useState<any>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [showSnippet, setShowSnippet] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalApps, setTotalApps] = useState(0)
  const limit = 10
  const [selectedLang, setSelectedLang] = useState('C++')

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm'
  })

  useEffect(() => {
    loadApplications(1, search)
  }, [search])

  const loadApplications = async (page = currentPage, searchTerm = search) => {
    setLoading(true)
    try {
      const response = await api.get(`/applications?page=${page}&limit=${limit}&search=${searchTerm}`)
      setApplications(response.data.applications)
      setTotalPages(response.data.pagination.pages)
      setTotalApps(response.data.pagination.total)
      setStats(prev => ({ ...prev, total: response.data.pagination.total }))
    } catch { toast.error('Sync failed') }
    finally { setLoading(false) }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage); loadApplications(newPage)
  }

  useEffect(() => {
    if (applications.length > 0) {
      setStats({
        total: totalApps,
        active: applications.filter((app: any) => app.status === 'active').length,
        paused: applications.filter((app: any) => app.status === 'paused').length,
        sessions: 0,
      })
    }
  }, [applications, totalApps])

  const selectApp = async (app: any) => {
    try {
      const response = await api.get(`/applications/${app._id}`)
      setSelectedApp(response.data.application)
      setCredentials(response.data.application)
    } catch { toast.error('Identity fetch failed') }
  }

  const createApplication = async () => {
    if (!newAppName.trim()) return toast.error('Name required')
    try {
      await api.post('/applications', { name: newAppName, version: newAppVersion })
      toast.success('Sector Initialized'); setShowCreateModal(false); setNewAppName(''); setNewAppVersion('1.0'); loadApplications()
    } catch { toast.error('Initialization failed') }
  }

  const renameApplication = async () => {
    if (!newName.trim()) return toast.error('Name required')
    try {
      await api.patch(`/applications/${renameApp._id}`, { name: newName })
      toast.success('Identity Updated'); setShowRenameModal(false); loadApplications()
    } catch { toast.error('Update failed') }
  }

  const toggleStatus = async (app: any) => {
    try {
      const newStatus = app.status === 'active' ? 'paused' : 'active'
      await api.patch(`/applications/${app._id}`, { status: newStatus })
      toast.success(`Unit ${newStatus}`); loadApplications()
    } catch { toast.error('Status toggle failed') }
  }

  const deleteApplication = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Purge Application?',
      message: 'ALL data associated with this sector will be permanently erased.',
      type: 'danger',
      confirmText: 'Purge Now',
      onConfirm: async () => {
        try {
          await api.delete(`/applications/${id}`)
          toast.success('Purged'); if (selectedApp?._id === id) { setSelectedApp(null); setCredentials(null) }
          loadApplications()
        } catch { toast.error('Purge failed') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const regenerateSecret = async () => {
    if (!credentials) return
    setConfirmModal({
      show: true,
      title: 'Rotate Secret?',
      message: 'All current links will be severed. Clients must update to the new key.',
      type: 'warning',
      confirmText: 'Rotate Now',
      onConfirm: async () => {
        try {
          const response = await api.post(`/applications/${credentials._id}/regenerate-secret`)
          setCredentials({ ...credentials, appSecret: response.data.appSecret })
          toast.success('Secret Rotated')
        } catch { toast.error('Rotation failed') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied') }

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-500 mb-1">Fleet Management</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">Applications</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">Initialize and manage your software fleet. Control authorization tokens, versioning, and operational status.</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)} 
          className="btn btn-primary shadow-glow shadow-primary-600/20 py-4 px-8"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Application</span>
        </motion.button>
      </div>

      {/* Stats Summary */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Fleet', value: stats.total, icon: CubeIcon, color: 'text-indigo-400' },
          { label: 'Operational', value: stats.active, icon: RocketLaunchIcon, color: 'text-emerald-400' },
          { label: 'Standby', value: stats.paused, icon: PauseIcon, color: 'text-amber-400' },
          { label: 'Live Link', value: stats.sessions, icon: SignalIcon, color: 'text-sky-400' },
        ].map((stat, idx) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            className="card-premium p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-dark-muted">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </motion.div>
        ))}
      </section>

      {/* Main Grid */}
      <section className="grid gap-8 xl:grid-cols-2">
        {/* Inventory Side */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400"><CubeIcon className="w-5 h-5" /></div>
              Sector Inventory
            </h3>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter fleet..." className="input pl-11 py-2.5 sm:w-64" />
            </div>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
            {loading || loadingApplications ? (
              <div className="py-24 text-center"><div className="h-8 w-8 border-2 border-primary-500 border-t-transparent animate-spin rounded-full mx-auto" /></div>
            ) : applications.length === 0 ? (
              <div className="card-premium p-16 text-center border-dashed border-white/10 bg-transparent"><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Units Found</p></div>
            ) : (
              applications.map((app: any, idx: number) => (
                <motion.div
                  key={app._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`card-premium group p-6 transition-all ${selectedApp?._id === app._id ? 'border-primary-500/40 bg-primary-500/[0.03] shadow-glow' : 'hover:border-white/10'}`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border transition-all ${selectedApp?._id === app._id ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' : 'bg-white/5 border-white/5 text-slate-500 group-hover:text-white'}`}>
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white tracking-tight">{app.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${app.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>{app.status}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">v{app.version}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Personnel</p>
                      <p className="text-xl font-black text-white tracking-tighter">{app.userCount || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <button onClick={() => selectApp(app)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedApp?._id === app._id ? 'bg-primary-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Inspect</button>
                    <button onClick={() => { setRenameApp(app); setNewName(app.name); setShowRenameModal(true) }} className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-colors"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => toggleStatus(app)} className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-colors">{app.status === 'active' ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}</button>
                    <button onClick={() => deleteApplication(app._id)} className="p-2.5 rounded-xl bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Credentials Side */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 px-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><KeyIcon className="w-5 h-5" /></div>
            Secure Vault
          </h3>

          <AnimatePresence mode="wait">
            {credentials ? (
              <motion.div key={credentials._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="card-premium p-8 space-y-8 bg-gradient-to-br from-dark-card/80 to-dark-bg/80 backdrop-blur-2xl">
                <div className="space-y-6">
                  <CredentialField label="Sector ID" value={credentials._id} onCopy={() => copy(credentials._id)} />
                  <CredentialField label="Owner Link" value={credentials.ownerId} onCopy={() => copy(credentials.ownerId)} />
                  <CredentialField label="Master Secret" value={showSecret ? credentials.appSecret : '•'.repeat(48)} onCopy={() => copy(credentials.appSecret)} isSecret={true} showSecret={showSecret} onToggleSecret={() => setShowSecret(!showSecret)} />
                </div>

                <button onClick={regenerateSecret} className="btn bg-rose-600/10 border border-rose-600/20 text-rose-400 w-full font-bold uppercase tracking-widest text-xs py-4 hover:bg-rose-600/20">Rotate Security Key</button>

                <div className="pt-8 border-t border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <CodeBracketIcon className="w-5 h-5 text-primary-400" />
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Integration Link</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {['C++', 'C#', 'Python'].map(lang => (
                        <button key={lang} onClick={() => setSelectedLang(lang)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedLang === lang ? 'bg-primary-500 text-white shadow-glow' : 'text-slate-500 hover:text-slate-300'}`}>{lang}</button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <pre className="p-6 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300">
                      {getSnippetContent(selectedLang, credentials)}
                    </pre>
                    <button onClick={() => copy(getSnippetRaw(selectedLang, credentials))} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="card-premium p-16 text-center border-dashed border-white/10 bg-transparent h-full flex flex-col items-center justify-center space-y-4">
                <ShieldCheckIcon className="w-12 h-12 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs max-w-[200px]">Select a sector from the inventory to unlock the vault</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal title="Initialize Sector" onClose={() => setShowCreateModal(false)}>
            <div className="space-y-6">
              <div className="input-group"><label className="label">Unit Name</label><input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="input" placeholder="Primary Core" /></div>
              <div className="input-group"><label className="label">Base Version</label><input type="text" value={newAppVersion} onChange={(e) => setNewAppVersion(e.target.value)} className="input" placeholder="1.0.0" /></div>
              <div className="flex gap-4 pt-4"><button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Abort</button><button onClick={createApplication} className="btn btn-primary flex-1">Initialize</button></div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenameModal && (
          <Modal title="Adjust Identity" onClose={() => setShowRenameModal(false)}>
            <div className="space-y-6">
              <div className="input-group"><label className="label">New Designation</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="New Unit Name" /></div>
              <div className="flex gap-4 pt-4"><button onClick={() => setShowRenameModal(false)} className="btn btn-secondary flex-1">Abort</button><button onClick={renameApplication} className="btn btn-primary flex-1">Apply</button></div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm card-premium p-8 text-center">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 ${confirmModal.type === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}><XMarkIcon className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="btn btn-secondary flex-1 text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button onClick={confirmModal.onConfirm} className={`btn flex-1 text-xs font-bold uppercase tracking-widest ${confirmModal.type === 'danger' ? 'bg-rose-600 text-white' : 'btn-primary'}`}>{confirmModal.confirmText}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CredentialField({ label, value, onCopy, isSecret, showSecret, onToggleSecret }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">{label}</label>
        <div className="flex items-center gap-2">
          {isSecret && <button onClick={onToggleSecret} className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-400 transition-colors">{showSecret ? 'Hide' : 'Show'}</button>}
          <button onClick={onCopy} className="text-slate-500 hover:text-white transition-colors"><DocumentDuplicateIcon className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 font-mono text-xs text-slate-300 break-all">{value}</div>
    </div>
  )
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg card-premium p-10">
        <div className="flex justify-between items-start mb-10">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function getSnippetContent(lang: string, app: any) {
  if (lang === 'C++') {
    return (
      <div className="space-y-0.5">
        <div className="text-slate-500">// Adarsh Auth Interface</div>
        <div><span className="text-primary-400">api</span> <span className="text-white">AuthApp</span>(<span className="text-amber-400">"{app.name}"</span>, <span className="text-amber-400">"{app.ownerId}"</span>, <span className="text-amber-400">"{app.version}"</span>);</div>
      </div>
    )
  }
  if (lang === 'C#') {
    return (
      <div className="space-y-0.5">
        <div><span className="text-primary-400">public static api</span> <span className="text-white">AuthApp</span> = <span className="text-primary-400">new api</span>(</div>
        <div className="pl-4">name: <span className="text-amber-400">"{app.name}"</span>,</div>
        <div className="pl-4">ownerid: <span className="text-amber-400">"{app.ownerId}"</span></div>
        <div>);</div>
      </div>
    )
  }
  return <div className="text-slate-500 italic">// Integration documentation coming soon for {lang}</div>
}

function getSnippetRaw(lang: string, app: any) {
  if (lang === 'C++') return `api AuthApp("${app.name}", "${app.ownerId}", "${app.version}");`
  if (lang === 'C#') return `public static api AuthApp = new api(name: "${app.name}", ownerid: "${app.ownerId}");`
  return ''
}
