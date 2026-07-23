'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
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
  CommandLineIcon
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

      // Update local stats from pagination data for "Total Apps"
      setStats(prev => ({ ...prev, total: response.data.pagination.total }))

      // Note: Full stats like "Active Sessions" would still need a separate call or be returned by backend
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

  const filtered = applications.filter((app: any) => app.name.toLowerCase().includes(search.toLowerCase()))

  const statTiles = [
    { label: 'Total Apps', value: stats.total, icon: CubeIcon, tone: 'text-indigo-300' },
    { label: 'Active', value: stats.active, icon: CheckIcon, tone: 'text-emerald-300' },
    { label: 'Paused', value: stats.paused, icon: PauseIcon, tone: 'text-zinc-200' },
    { label: 'Active Sessions', value: stats.sessions, icon: SignalIcon, tone: 'text-slate-200' },
  ]

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
          transform: translateY(-2px);
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
          transform: translateY(-2px);
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
          transform: translateY(-2px);
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
          transform: translateY(-2px);
        }

        .premium-card-amber {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.7) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(245, 158, 11, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(245, 158, 11, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-amber:hover {
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 20px 45px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
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
          transform: translateY(-2px);
        }

        .tactical-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
          transition: all 0.25s ease;
        }
        .tactical-input:focus {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(0, 0, 0, 0.5);
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.05);
        }
        .credential-glow-text {
          text-shadow: 0 0 8px rgba(165, 180, 252, 0.25);
        }
        .tactical-btn {
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tactical-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
      `}} />

      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/[0.04] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Registry
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Applications Control</h1>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-400 max-w-xl">
            Create applications, review credentials, rotate secrets, and control status from one classic dark workspace.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)} 
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-950/40 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300"
        >
          <PlusIcon className="h-4 w-4" />
          Create Application
        </button>
      </section>

      {/* Stats tiles section */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile, i) => {
          const cardStyles = [
            'premium-card-indigo',
            'premium-card-emerald',
            'premium-card-amber',
            'premium-card-cyan'
          ]
          const colors = [
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            'bg-amber-500/10 border-amber-500/20 text-amber-400',
            'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          ]
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
              key={tile.label} 
              className={`rounded-2xl p-5 ${cardStyles[i]}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{tile.label}</p>
                <div className={`rounded-xl border p-2 ${colors[i]}`}>
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3.5 text-3xl font-black text-white tracking-tight">{tile.value}</p>
              <p className="mt-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory status</p>
            </motion.div>
          )
        })}
      </section>

      {/* Main split grid */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        
        {/* Credentials Column */}
        <div className="premium-card-indigo rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300 border border-white/[0.04]">
              <DocumentDuplicateIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Tokens</p>
              <h2 className="text-xl font-bold text-white tracking-tight">Application Identity</h2>
            </div>
          </div>

          {credentials ? (
            <div className="mt-6 space-y-4">
              {[
                { label: 'Application Name', value: credentials.name, copyValue: credentials.name },
                { label: 'Owner ID', value: credentials.ownerId, copyValue: credentials.ownerId },
                {
                  label: 'Application Secret',
                  value: showSecret ? credentials.appSecret : '•'.repeat(48),
                  copyValue: credentials.appSecret,
                  actions: (
                    <button 
                      onClick={() => setShowSecret(!showSecret)} 
                      className="tactical-btn px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-lg"
                    >
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  ),
                },
                { label: 'Version', value: credentials.version },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-indigo-500/10 bg-[#0d0e16]/60 p-4 shadow-[0_4px_20px_rgba(99,102,241,0.02)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                    <div className="flex items-center gap-2">
                      {item.actions}
                      {item.copyValue && (
                        <button 
                          onClick={() => copy(item.copyValue)} 
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="break-all rounded-xl border border-indigo-500/10 bg-black/45 px-4 py-3 font-mono text-xs text-indigo-200/90 credential-glow-text">
                    {item.value}
                  </div>
                </div>
              ))}

              <button 
                onClick={regenerateSecret} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.04)]"
              >
                Regenerate Application Secret
              </button>

              {/* Systematic Code Snippet Section */}
              <div className="mt-8 pt-8 border-t border-white/[0.04] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      <CodeBracketIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">Integration Snippet</span>
                  </div>
                  <button
                    onClick={() => setShowSnippet(!showSnippet)}
                    className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 border border-white/10 ${
                      showSnippet ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`absolute top-[1px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                      showSnippet ? 'left-5' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>

                {showSnippet && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Select Language Target:</label>
                      <select
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/40 focus:bg-black/50 transition-all font-semibold"
                      >
                        <option>C++</option>
                        <option>C#</option>
                        <option>Python</option>
                        <option>Java</option>
                      </select>
                    </div>

                    <div className="relative group rounded-2xl border border-white/[0.06] bg-[#06070a]/90 p-1">
                      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-black/30 rounded-xl min-h-[140px] text-slate-300">
                        {renderSystematicSnippet(selectedLang, credentials)}
                      </pre>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => copy(getSnippet(selectedLang, credentials))}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/20"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Copy Code
                      </button>
                      <button className="flex-1 px-4 py-3.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                        View Example
                      </button>
                      <button className="flex-1 px-4 py-3.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/[0.04]">
                        Tutorial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.02] px-5 py-16 text-center">
              <CubeIcon className="mx-auto h-12 w-12 text-slate-700 animate-pulse" />
              <p className="mt-4 text-sm font-bold text-slate-200 uppercase tracking-wider">Select Application</p>
              <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
                Choose an application from the inventory list to load security credentials and snippets.
              </p>
            </div>
          )}
        </div>

        {/* Inventory Column */}
        <div className="premium-card-purple rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.04] pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>
              <h2 className="text-xl font-bold text-white tracking-tight">Application Inventory</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applications..."
                className="w-full rounded-xl border border-white/[0.06] bg-black/40 pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 transition-all focus:border-indigo-500/40 focus:bg-black/50 outline-none"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            {loading || loadingApplications ? (
              <div className="flex justify-center py-24">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                </div>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.06] px-5 py-14 text-center text-xs text-slate-500">
                No applications found in inventory.
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
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
                      key={app._id}
                      className={`rounded-2xl border p-5 transition-all duration-300 border-l-4 ${
                        isSelected
                          ? 'border-indigo-500/35 bg-indigo-500/[0.08] shadow-lg shadow-indigo-950/40 border-l-indigo-500'
                          : app.status === 'active'
                          ? 'border-white/[0.04] bg-[#0c1017]/40 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] border-l-emerald-500/70 shadow-[0_4px_20px_rgba(16,185,129,0.01)]'
                          : 'border-white/[0.04] bg-[#0f0e0d]/40 hover:border-amber-500/30 hover:bg-amber-500/[0.02] border-l-amber-500/70 shadow-[0_4px_20px_rgba(245,158,11,0.01)]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-black text-slate-100">{app.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
                                app.status === 'active'
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                  : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {app.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                              {app.status === 'paused' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                              {app.status}
                            </span>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <CubeIcon className="h-3.5 w-3.5 text-slate-500" />
                              v{app.version}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <UserGroupIcon className="h-3.5 w-3.5 text-slate-500" />
                              {app.userCount || 0} users
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button 
                            onClick={() => selectApp(app)} 
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                              isSelected 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400/20'
                            }`}
                          >
                            <CheckIcon className="h-3 w-3" />
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          
                          {hasManageSettings && (
                            <button
                              onClick={() => {
                                setRenameApp(app)
                                setNewName(app.name)
                                setShowRenameModal(true)
                              }}
                              className="tactical-btn rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1"
                            >
                              <PencilIcon className="h-3 w-3" />
                              Rename
                            </button>
                          )}
                          
                          {hasManageSettings && (
                            <button 
                              onClick={() => toggleStatus(app)} 
                              className="tactical-btn rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 inline-flex items-center gap-1"
                            >
                              {app.status === 'active' ? <PauseIcon className="h-3 w-3" /> : <PlayIcon className="h-3 w-3" />}
                              {app.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                          )}
                          
                          {isOwner && (
                            <button 
                              onClick={() => deleteApplication(app._id)} 
                              className="rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 inline-flex items-center gap-1 transition-colors"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-2 pt-4 bg-transparent border-t border-white/[0.04]">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Page <span className="text-gray-200">{currentPage}</span> of <span className="text-gray-200">{totalPages || 1}</span>
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0b10]/95 border border-white/[0.08] rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registry</p>
                <h2 className="text-2xl font-black text-white tracking-tight">New application</h2>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300 uppercase tracking-wide">Application Name</label>
                <input 
                  type="text" 
                  value={newAppName} 
                  onChange={(e) => setNewAppName(e.target.value)} 
                  className="w-full rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-200 focus:border-indigo-400/50 focus:bg-black/40 outline-none" 
                  placeholder="My Application" 
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300 uppercase tracking-wide">Version</label>
                <input 
                  type="text" 
                  value={newAppVersion} 
                  onChange={(e) => setNewAppVersion(e.target.value)} 
                  className="w-full rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-200 focus:border-indigo-400/50 focus:bg-black/40 outline-none" 
                  placeholder="1.0" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={createApplication} 
                  className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/35"
                >
                  Create App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0b10]/95 border border-white/[0.08] rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rename</p>
                <h2 className="text-2xl font-black text-white tracking-tight">Update Application Name</h2>
              </div>
              <button 
                onClick={() => setShowRenameModal(false)} 
                className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-300 uppercase tracking-wide">New Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="w-full rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-200 focus:border-indigo-400/50 focus:bg-black/40 outline-none" 
                  placeholder="New application name" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRenameModal(false)} 
                  className="flex-1 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={renameApplication} 
                  className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/35"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirmation Modal ────────────────────────────────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0a0b10] border border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? '🗑️' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              
              <h3 className="text-lg font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-lg ${
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

function renderSystematicSnippet(lang: string, app: any) {
  if (!app) return null;
  const name = app.name;
  const ownerid = app.ownerId;
  const secret = app.appSecret || 'YOUR_APP_SECRET';
  const version = app.version || '1.0';
  const url = 'https://api.adarshauth.store/api/client';

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
      <div className="space-y-0.5">
        <div><span className="text-slate-500"># Python Integration</span></div>
        <div><span className="text-blue-400">import</span> <span className="text-indigo-300">adarsh_auth</span></div>
        <div className="pt-1"><span className="text-indigo-300">auth</span> = adarsh_auth.api(</div>
        <div className="pl-4">name=<span className="text-orange-400">"{name}"</span>,</div>
        <div className="pl-4">ownerid=<span className="text-orange-400">"{ownerid}"</span>,</div>
        <div className="pl-4">secret=<span className="text-orange-400">"{secret}"</span>,</div>
        <div className="pl-4">version=<span className="text-orange-400">"{version}"</span></div>
        <div>)</div>
      </div>
    );
  }

  if (lang === 'Java') {
    return (
      <div className="space-y-0.5">
        <div><span className="text-slate-500">// Java Integration</span></div>
        <div><span className="text-blue-400">public static</span> api AuthApp = <span className="text-blue-400">new</span> api(</div>
        <div className="pl-4"><span className="text-orange-400">"{name}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{ownerid}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{secret}"</span>,</div>
        <div className="pl-4"><span className="text-orange-400">"{version}"</span></div>
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
  const url = 'https://api.adarshauth.store/api/client'

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
      return `import adarsh_auth

auth = adarsh_auth.api(
    name="${name}",
    ownerid="${ownerid}",
    secret="${secret}",
    version="${version}"
)`
    case 'Java':
      return `public static api AuthApp = new api(
    "${name}",
    "${ownerid}",
    "${secret}",
    "${version}"
);`
    default:
      return ''
  }
}
