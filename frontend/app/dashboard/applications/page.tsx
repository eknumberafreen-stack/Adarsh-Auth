'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
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
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function Applications() {
  const { applications, setApplications, selectedApp, setSelectedApp, loadingApplications } = useAppStore()
  const { user } = useAuthStore()
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
    loadApplications(1, search)
  }, [search])

  useEffect(() => {
    if (selectedApp && !credentials) {
      selectApp(selectedApp)
    }
  }, [selectedApp])

  const loadApplications = async (page = currentPage, searchTerm = search) => {
    setLoading(true)
    try {
      const response = await api.get(`/applications?page=${page}&limit=${limit}&search=${searchTerm}`)
      const apps = response.data.applications
      setApplications(apps)
      setTotalPages(response.data.pagination.pages)
      setTotalApps(response.data.pagination.total)
      setStats(prev => ({ ...prev, total: response.data.pagination.total }))
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadApplications(newPage)
  }

  useEffect(() => {
    if (applications.length > 0) {
      let sessions = 0
      setStats({
        total: applications.length,
        active: applications.filter((app: any) => app.status === 'active').length,
        paused: applications.filter((app: any) => app.status === 'paused').length,
        sessions,
      })
    }
  }, [applications])

  const selectApp = async (app: any) => {
    try {
      const response = await api.get(`/applications/${app._id}`)
      setSelectedApp(response.data.application)
      setCredentials(response.data.application)
    } catch {
      toast.error('Failed to load credentials')
    }
  }

  const createApplication = async () => {
    if (!newAppName.trim()) return toast.error('Name is required')
    try {
      await api.post('/applications', { name: newAppName, version: newAppVersion })
      toast.success('Application created!')
      setShowCreateModal(false)
      setNewAppName('')
      setNewAppVersion('1.0')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create')
    }
  }

  const renameApplication = async () => {
    if (!newName.trim()) return toast.error('Name is required')
    try {
      await api.patch(`/applications/${renameApp._id}`, { name: newName })
      toast.success('Renamed!')
      setShowRenameModal(false)
      loadApplications()
    } catch {
      toast.error('Failed to rename')
    }
  }

  const toggleStatus = async (app: any) => {
    try {
      const newStatus = app.status === 'active' ? 'paused' : 'active'
      await api.patch(`/applications/${app._id}`, { status: newStatus })
      toast.success(`Application ${newStatus}`)
      loadApplications()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const deleteApplication = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Application?',
      message: 'Are you sure you want to delete this application and ALL its associated data? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Now',
      onConfirm: async () => {
        try {
          await api.delete(`/applications/${id}`)
          toast.success('Deleted')
          if (selectedApp?._id === id) {
            setSelectedApp(null)
            setCredentials(null)
          }
          loadApplications()
        } catch {
          toast.error('Failed to delete')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const regenerateSecret = async () => {
    if (!credentials) return
    setConfirmModal({
      show: true,
      title: 'Regenerate Secret?',
      message: 'This will invalidate all current user sessions and old secrets. Your clients will need to update to the new secret to connect. Continue?',
      type: 'warning',
      confirmText: 'Regenerate Now',
      onConfirm: async () => {
        try {
          const response = await api.post(`/applications/${credentials._id}/regenerate-secret`)
          setCredentials({ ...credentials, appSecret: response.data.appSecret })
          toast.success('Secret regenerated!')
        } catch {
          toast.error('Failed to regenerate')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const copy = (text: string, label = 'Copied!') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  const statTiles = [
    { label: 'Total Apps', value: stats.total, icon: CubeIcon, tone: 'text-indigo-400', bg: 'shadow-indigo-500/10' },
    { label: 'Active Status', value: stats.active, icon: CheckIcon, tone: 'text-emerald-400', bg: 'shadow-emerald-500/10' },
    { label: 'Paused Status', value: stats.paused, icon: PauseIcon, tone: 'text-amber-400', bg: 'shadow-amber-500/10' },
    { label: 'Active Sessions', value: stats.sessions, icon: SignalIcon, tone: 'text-sky-400', bg: 'shadow-sky-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Applications</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Configure, rename, inspect, or toggle live system workspaces</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2 py-2.5">
          <PlusIcon className="h-4 w-4" /> Create Application
        </button>
      </div>

      {/* Stat Tiles */}
      <section className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            key={tile.label} 
            className="card p-5 flex flex-col gap-1 shadow-lg hover:border-white/10 transition-colors"
            style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{tile.label}</p>
              <tile.icon className={`h-4.5 w-4.5 ${tile.tone}`} />
            </div>
            <p className="text-2xl font-black mt-1 text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">Live summary metrics</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Left Side: Credentials */}
        <div className="card shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_-4px_rgba(99,102,241,0.4)]">
              <DocumentDuplicateIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="page-eyebrow">Selected Credentials</p>
              <h2 className="text-xl font-black text-white tracking-tight">Security details</h2>
            </div>
          </div>

          {credentials ? (
            <div className="mt-6 space-y-4 animate-in fade-in duration-300">
              {[
                { label: 'Application Name', value: credentials.name, copyValue: credentials.name },
                { label: 'Owner ID', value: credentials.ownerId, copyValue: credentials.ownerId },
                {
                  label: 'Application Secret',
                  value: showSecret ? credentials.appSecret : '•'.repeat(48),
                  copyValue: credentials.appSecret,
                  actions: (
                    <button onClick={() => setShowSecret(!showSecret)} className="btn btn-secondary px-3 py-1.5 text-[11px] font-bold">
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  ),
                },
                { label: 'Version ID', value: credentials.version },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.04] bg-black/40 p-4">
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <div className="flex items-center gap-2">
                      {item.actions}
                      {item.copyValue && (
                        <button onClick={() => copy(item.copyValue)} className="rounded-xl border border-white/[0.06] p-2 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="break-all rounded-xl border border-white/[0.03] bg-black/30 px-4 py-3 font-mono text-xs font-bold text-slate-200">
                    {item.value}
                  </div>
                </div>
              ))}

              <button onClick={regenerateSecret} className="btn btn-danger w-full py-3 text-xs font-black shadow-lg shadow-red-950/20 mt-2">
                Regenerate Secrets
              </button>

              {/* Systematic Code Snippet Section */}
              <div className="mt-6 pt-6 border-t border-white/[0.05] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <CodeBracketIcon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Integration Snippet</span>
                  </div>
                  <button
                    onClick={() => setShowSnippet(!showSnippet)}
                    className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 border border-white/5 ${
                      showSnippet ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-all ${
                      showSnippet ? 'left-5.5' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>

                {showSnippet && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Select Programming Language:</label>
                      <select
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="input py-2.5 text-xs bg-slate-950/60 border-white/[0.05] focus:border-indigo-500/40"
                      >
                        <option className="bg-[#0b0b14]">C++</option>
                        <option className="bg-[#0b0b14]">C#</option>
                        <option className="bg-[#0b0b14]">Python</option>
                        <option className="bg-[#0b0b14]">Java</option>
                      </select>
                    </div>

                    <div className="relative group rounded-2xl border border-white/[0.04] bg-[#07070d]/80 p-1">
                      <pre className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed bg-black/20 rounded-xl min-h-[140px] text-indigo-300">
                        {renderSystematicSnippet(selectedLang, credentials)}
                      </pre>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        onClick={() => copy(getSnippet(selectedLang, credentials))}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-900/20"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Copy Code
                      </button>
                      <button className="flex-1 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all">
                        View Example
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center">
              <CubeIcon className="mx-auto h-11 w-11 text-slate-600" />
              <p className="mt-4 text-sm font-bold text-white">Select an application workspace</p>
              <p className="mt-2 text-xs text-slate-500 font-semibold max-w-xs mx-auto">Choose a workspace from the list to populate structural credentials.</p>
            </div>
          )}
        </div>

        {/* Right Side: List of Applications */}
        <div className="card shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="page-eyebrow">Inventory</p>
              <h2 className="text-xl font-black text-white tracking-tight">Registered Workspaces</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applications..."
                className="input pl-10 text-xs font-bold bg-black/40 border-white/[0.06] focus:border-indigo-500/40 text-white"
              />
            </div>
          </div>

          <div className="space-y-3.5">
            {loading || loadingApplications ? (
              <div className="flex justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-12 text-center text-sm text-slate-500 font-semibold">
                No matching applications found.
              </div>
            ) : (
              <>
                 {applications.map((app: any, i: number) => {
                  const isSelected = selectedApp?._id === app._id
                  const isOwner = app.userId === user?.id
                  const currentMember = app.team?.find((m: any) => {
                    const mId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
                    return mId === user?.id;
                  })
                  const hasManageSettings = isOwner || !!currentMember?.permissions?.includes('manage_settings')
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      key={app._id}
                      className={`rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? 'border-indigo-500/25 bg-indigo-500/[0.06] shadow-lg shadow-indigo-950/20'
                          : 'border-white/[0.04] bg-black/20 hover:border-white/10 hover:bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                             <h3 className="text-base font-black text-white">{app.name}</h3>
                            <span
                              className={`badge ${
                                app.status === 'active'
                                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                  : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300'
                              }`}
                            >
                              {app.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                              {app.status}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <CubeIcon className="h-4 w-4 text-slate-500" />
                              v{app.version}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <UserGroupIcon className="h-4 w-4 text-slate-500" />
                              {app.userCount || 0} users
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => selectApp(app)} className={`btn px-3 py-2 text-xs font-bold ${isSelected ? 'btn-secondary' : 'btn-primary'}`}>
                            <CheckIcon className="h-4 w-4" />
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          {hasManageSettings && (
                            <button
                              onClick={() => {
                                setRenameApp(app)
                                setNewName(app.name)
                                setShowRenameModal(true)
                              }}
                              className="btn btn-secondary px-3 py-2 text-xs font-bold"
                            >
                              <PencilIcon className="h-4 w-4" />
                              Rename
                            </button>
                          )}
                          {hasManageSettings && (
                            <button onClick={() => toggleStatus(app)} className="btn btn-secondary px-3 py-2 text-xs font-bold">
                              {app.status === 'active' ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                              {app.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                          )}
                          {isOwner && (
                            <button onClick={() => deleteApplication(app._id)} className="btn btn-danger px-3 py-2 text-xs font-bold">
                              <TrashIcon className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-2 py-4 bg-transparent border-t border-white/[0.04]">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="text-xs font-semibold text-slate-500">
                    Showing page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages || 1}</span>
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Create Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card w-full max-w-md p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Create Workspace</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Register New Application</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-slate-400 hover:text-white transition-all">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Application Name</label>
                <input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="input" placeholder="e.g. My Premium Cheat" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">Version</label>
                <input type="text" value={newAppVersion} onChange={(e) => setNewAppVersion(e.target.value)} className="input" placeholder="1.0" />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createApplication} className="btn btn-primary flex-1">
                  Create Workspace
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rename Application Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card w-full max-w-md p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Rename Workspace</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Update Application Name</p>
              </div>
              <button onClick={() => setShowRenameModal(false)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-slate-400 hover:text-white transition-all">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-400">New Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="New application name" />
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowRenameModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={renameApplication} className="btn btn-primary flex-1">
                  Rename Workspace
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card w-full max-w-sm p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? '🗑️' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 font-semibold leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 rounded-2xl text-xs font-bold border border-white/[0.05] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-950/40' :
                    confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-950/40' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                  }`}
                >
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

function renderSystematicSnippet(lang: string, app: any) {
  if (!app) return null;
  const name = app.name;
  const ownerid = app.ownerId;
  const secret = app.appSecret || 'YOUR_APP_SECRET';
  const version = app.version || '1.0';
  const url = 'https://api.adarshauth.online/api/client';

  if (lang === 'C++') {
    return (
      <div className="space-y-0.5">
        <div><span className="text-blue-400">std::string</span> name = <span className="text-orange-400">skCrypt("{name}").decrypt()</span>;</div>
        <div><span className="text-blue-400">std::string</span> ownerid = <span className="text-orange-400">skCrypt("{ownerid}").decrypt()</span>;</div>
        <div><span className="text-blue-400">std::string</span> secret = <span className="text-orange-400">skCrypt("{secret}").decrypt()</span>;</div>
        <div><span className="text-blue-400">std::string</span> version = <span className="text-orange-400">skCrypt("{version}").decrypt()</span>;</div>
        <div><span className="text-blue-400">std::string</span> url = <span className="text-orange-400">skCrypt("{url}").decrypt()</span>;</div>
        <div className="pt-2 text-slate-500">// Initialize API</div>
        <div><span className="text-blue-400">AdarshAuth::api</span> <span className="text-indigo-300">KeyAuthApp</span>(name, ownerid, version, url, secret);</div>
      </div>
    );
  }

  if (lang === 'C#') {
    return (
      <div className="space-y-0.5">
        <div><span className="text-blue-400">public static api</span> <span className="text-indigo-300">AuthApp</span> = <span className="text-blue-400">new api</span>(</div>
        <div className="pl-4">name: <span className="text-orange-400">"{name}"</span>,</div>
        <div className="pl-4">ownerid: <span className="text-orange-400">"{ownerid}"</span>,</div>
        <div className="pl-4">secret: <span className="text-orange-400">"{secret}"</span>,</div>
        <div className="pl-4">version: <span className="text-orange-400">"{version}"</span></div>
        <div>);</div>
      </div>
    );
  }

  return <span className="text-slate-500">// Integration coming soon...</span>;
}

function getSnippet(lang: string, app: any) {
  if (!app) return ''
  const name = app.name
  const ownerid = app.ownerId
  const secret = app.appSecret || 'YOUR_APP_SECRET'
  const version = app.version || '1.0'
  const url = 'https://api.adarshauth.online/api/client'

  switch (lang) {
    case 'C++':
      return `std::string name = skCrypt("${name}").decrypt();
std::string ownerid = skCrypt("${ownerid}").decrypt();
std::string secret = skCrypt("${secret}").decrypt();
std::string version = skCrypt("${version}").decrypt();
std::string url = skCrypt("${url}").decrypt();

AdarshAuth::api KeyAuthApp(name, ownerid, version, url, secret);`
    case 'C#':
      return `public static api AuthApp = new api(
    name: "${name}",
    ownerid: "${ownerid}",
    secret: "${secret}",
    version: "${version}"
);`
    case 'Python':
      return `# Python Integration Coming Soon\n# Stay tuned for the library update!`
    case 'Java':
      return `// Java Integration Coming Soon\n// Stay tuned for the library update!`
    default:
      return ''
  }
}
