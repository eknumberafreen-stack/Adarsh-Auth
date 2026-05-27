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
  CommandLineIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
} as const

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

      // Update local stats from pagination data for "Total Apps"
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
      // Calculate stats based on existing applications
      setStats({
        total: applications.length,
        active: applications.filter((app: any) => app.status === 'active').length,
        paused: applications.filter((app: any) => app.status === 'paused').length,
        sessions: stats.sessions, // preserve previous sessions count
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
      confirmText: 'Delete',
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
    { label: 'Total Apps', value: stats.total, icon: CubeIcon, tone: 'text-indigo-400', color: 'from-indigo-500/10 to-indigo-500/5', border: 'border-indigo-500/20' },
    { label: 'Active', value: stats.active, icon: CheckIcon, tone: 'text-emerald-400', color: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20' },
    { label: 'Paused', value: stats.paused, icon: PauseIcon, tone: 'text-amber-400', color: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20' },
    { label: 'Active Sessions', value: stats.sessions, icon: SignalIcon, tone: 'text-cyan-400', color: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20' },
  ]

  return (
    <div className="space-y-8">
      {/* Header section with glass background & glow */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f0f1a] to-[#0d0d18] p-8"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Manage Core Configuration</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Applications Inventory</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400 leading-relaxed">
              Create, rotate secrets, track client status, and access developer integration snippets for your applications within this unified control room.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/30 hover:opacity-95 transition-all self-start md:self-auto"
          >
            <PlusIcon className="h-5 w-5" />
            Create Application
          </motion.button>
        </div>
      </motion.section>

      {/* Stats Cards grid */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statTiles.map((tile, i) => (
          <motion.div
            variants={itemVariants}
            key={tile.label}
            className={`relative overflow-hidden rounded-2xl border ${tile.border} bg-gradient-to-b ${tile.color} p-5`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{tile.label}</p>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2">
                <tile.icon className={`h-5 w-5 ${tile.tone}`} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">{tile.value}</p>
            <p className="mt-2 text-[11px] text-slate-500">Live dynamic platform reading</p>
          </motion.div>
        ))}
      </motion.section>

      {/* Main Content Layout */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Column: selected app details / developer keys */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e16] p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-indigo-500/5 blur-3xl" />
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                <KeyIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 font-mono">Secret Passkeys</p>
                <h2 className="text-xl font-bold text-white">Application Credentials</h2>
              </div>
            </div>

            {credentials ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                {/* Visual Developer Badge styling */}
                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-slate-950/80 to-indigo-950/20 p-5">
                  <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">API Access Identity</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-white">{credentials.name}</p>
                  <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase tracking-wider">Version</span>
                      <span className="text-slate-300 font-bold">v{credentials.version}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase tracking-wider">Environment</span>
                      <span className="text-emerald-400 font-bold">Production</span>
                    </div>
                  </div>
                </div>

                {/* Owner ID */}
                <div className="rounded-2xl border border-white/5 bg-[#12121c]/55 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">Owner Identity ID</p>
                    <button
                      onClick={() => copy(credentials.ownerId, 'Owner ID copied!')}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-1.5 text-slate-400 transition-all hover:bg-white/[0.05] hover:text-white"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-xs text-slate-300 bg-black/30 rounded-xl px-3 py-2 border border-white/5">
                    {credentials.ownerId}
                  </p>
                </div>

                {/* Secret Key */}
                <div className="rounded-2xl border border-white/5 bg-[#12121c]/55 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">Application Secret Key</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02] border border-white/5 rounded-lg hover:text-white"
                      >
                        {showSecret ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                        {showSecret ? 'Hide' : 'Reveal'}
                      </button>
                      <button
                        onClick={() => copy(credentials.appSecret, 'App Secret copied!')}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-1.5 text-slate-400 transition-all hover:bg-white/[0.05] hover:text-white"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-xs text-indigo-300 bg-black/30 rounded-xl px-3 py-2 border border-white/5 tracking-wider">
                    {showSecret ? credentials.appSecret : '•'.repeat(48)}
                  </p>
                </div>

                <button
                  onClick={regenerateSecret}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/45 text-red-400 rounded-xl text-xs font-bold transition-all w-full"
                >
                  <ArrowPathIcon className="h-4 w-4 animate-spin-hover" />
                  Regenerate Private Secret Key
                </button>

                {/* Developer Integration snippets */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        <CodeBracketIcon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Developer SDK Snippet</span>
                    </div>
                    <button
                      onClick={() => setShowSnippet(!showSnippet)}
                      className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${
                        showSnippet ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        showSnippet ? 'left-5.5' : 'left-0.5'
                      }`}></div>
                    </button>
                  </div>

                  <AnimatePresence>
                    {showSnippet && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mt-4 space-y-4"
                      >
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] font-mono">Library Platform</label>
                          <div className="grid grid-cols-4 gap-1.5 bg-black/45 p-1 rounded-xl border border-white/5">
                            {['C++', 'C#', 'Python', 'Java'].map((lang) => (
                              <button
                                key={lang}
                                onClick={() => setSelectedLang(lang)}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  selectedLang === lang
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {lang}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative rounded-2xl border border-white/5 bg-black/60 p-4">
                          <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-300 min-h-[120px]">
                            {renderSystematicSnippet(selectedLang, credentials)}
                          </pre>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => copy(getSnippet(selectedLang, credentials))}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                            Copy Snippet
                          </button>
                          <button className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
                <CubeIcon className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-base font-bold text-white">No Application Selected</p>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Click on an application from the inventory list to inspect credentials, rotate keys, or access integration modules.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: inventory list */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0e0e16] p-6">
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                  <CommandLineIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 font-mono">Registry</p>
                  <h2 className="text-xl font-bold text-white">App Inventory</h2>
                </div>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter applications..."
                  className="input pl-9 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {loading || loadingApplications ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-xs text-slate-400">
                  No applications recorded in this registry view.
                </div>
              ) : (
                <div className="space-y-3">
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
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        key={app._id}
                        className={`rounded-2xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? 'border-indigo-500/40 bg-indigo-500/5 shadow-lg shadow-indigo-950/20'
                            : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm border ${
                              app.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {app.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white text-sm">{app.name}</h3>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    app.status === 'active'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                              
                              <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <CubeIcon className="h-3 w-3" /> v{app.version}
                                </span>
                                <span className="flex items-center gap-1">
                                  <UserGroupIcon className="h-3 w-3" /> {app.userCount || 0} users
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => selectApp(app)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white/[0.04] border border-white/5 text-slate-300 hover:bg-white/[0.08]'
                              }`}
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                              {isSelected ? 'Active' : 'Select'}
                            </button>

                            {hasManageSettings && (
                              <>
                                <button
                                  onClick={() => {
                                    setRenameApp(app)
                                    setNewName(app.name)
                                    setShowRenameModal(true)
                                  }}
                                  className="p-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/[0.08]"
                                  title="Rename Application"
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleStatus(app)}
                                  className="p-2 rounded-xl bg-white/[0.04] border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/[0.08]"
                                  title={app.status === 'active' ? 'Pause Application' : 'Resume Application'}
                                >
                                  {app.status === 'active' ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
                                </button>
                              </>
                            )}

                            {isOwner && (
                              <button
                                onClick={() => deleteApplication(app._id)}
                                className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                title="Delete Application"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <div className="text-[11px] font-medium text-slate-500">
                      Page <span className="text-slate-300">{currentPage}</span> of <span className="text-slate-300">{totalPages || 1}</span>
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modals - Scale/Blur entry anims */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Creation Wizard</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">New Application</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Application Name</label>
                  <input
                    type="text"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="input text-sm"
                    placeholder="My SaaS Platform"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Version Tag</label>
                  <input
                    type="text"
                    value={newAppVersion}
                    onChange={(e) => setNewAppVersion(e.target.value)}
                    className="input text-sm"
                    placeholder="1.0"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button onClick={createApplication} className="btn btn-primary flex-1 py-3 text-xs">
                    Create App
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showRenameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenameModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400 font-mono">Registry Update</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Rename Application</h2>
                </div>
                <button
                  onClick={() => setShowRenameModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">New Application Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input text-sm"
                    placeholder="Updated Name"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowRenameModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button onClick={renameApplication} className="btn btn-primary flex-1 py-3 text-xs">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {confirmModal.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${
                  confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-400 border-red-500/10' :
                  confirmModal.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' :
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
                }`}>
                  {confirmModal.type === 'danger' ? <TrashIcon className="h-5 w-5" /> : 
                   confirmModal.type === 'warning' ? <InformationCircleIcon className="h-5 w-5" /> : 
                   <ArrowPathIcon className="h-5 w-5" />}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1.5">{confirmModal.title}</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2">
                  {confirmModal.message}
                </p>

                <div className="flex gap-2.5 w-full">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                      confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                      confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500' :
                      'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

  if (lang === 'Python') {
    return (
      <div className="space-y-0.5 text-slate-400 font-mono text-[11px]">
        <div><span className="text-blue-400">from</span> adarsh_auth <span className="text-blue-400">import</span> api</div>
        <div className="pt-2"><span className="text-indigo-300">auth_app</span> = api(</div>
        <div className="pl-4">name=<span className="text-orange-400">"{name}"</span>,</div>
        <div className="pl-4">ownerid=<span className="text-orange-400">"{ownerid}"</span>,</div>
        <div className="pl-4">secret=<span className="text-orange-400">"{secret}"</span>,</div>
        <div className="pl-4">version=<span className="text-orange-400">"{version}"</span></div>
        <div>)</div>
      </div>
    )
  }

  if (lang === 'Java') {
    return (
      <div className="space-y-0.5 text-slate-400 font-mono text-[11px]">
        <div><span className="text-blue-400">public static</span> api authApp = <span className="text-blue-400">new</span> api(</div>
        <div className="pl-4"><span className="text-orange-400">"{name}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{ownerid}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{secret}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{version}"</span></div>
        <div>);</div>
      </div>
    )
  }

  return <span className="text-slate-500">// Integration module loading...</span>;
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
      return `std::string name = skCrypt("${name}").decrypt();\nstd::string ownerid = skCrypt("${ownerid}").decrypt();\nstd::string secret = skCrypt("${secret}").decrypt();\nstd::string version = skCrypt("${version}").decrypt();\nstd::string url = skCrypt("${url}").decrypt();\n\nAdarshAuth::api KeyAuthApp(name, ownerid, version, url, secret);`
    case 'C#':
      return `public static api AuthApp = new api(\n    name: "${name}",\n    ownerid: "${ownerid}",\n    secret: "${secret}",\n    version: "${version}"\n);`
    case 'Python':
      return `from adarsh_auth import api\n\nauth_app = api(\n    name="${name}",\n    ownerid="${ownerid}",\n    secret="${secret}",\n    version="${version}"\n)`
    case 'Java':
      return `public static api authApp = new api(\n    "${name}",\n    "${ownerid}",\n    "${secret}",\n    "${version}"\n);`
    default:
      return ''
  }
}
