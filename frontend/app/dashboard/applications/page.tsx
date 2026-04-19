'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  UserGroupIcon,
  SignalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Applications() {
  const { applications, setApplications, selectedApp, setSelectedApp } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameApp, setRenameApp] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newAppName, setNewAppName] = useState('')
  const [newAppVersion, setNewAppVersion] = useState('1.0.0')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, sessions: 0 })
  const [credentials, setCredentials] = useState<any>(null)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => { loadApplications() }, [])

  const loadApplications = async () => {
    try {
      const response = await api.get('/applications')
      const apps = response.data.applications
      setApplications(apps)

      let sessions = 0
      for (const app of apps) {
        try {
          const s = await api.get(`/sessions/application/${app._id}`)
          sessions += s.data.sessions.length
        } catch {}
      }

      setStats({
        total: apps.length,
        active: apps.filter((a: any) => a.status === 'active').length,
        paused: apps.filter((a: any) => a.status === 'paused').length,
        sessions
      })
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

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
      setNewAppVersion('1.0.0')
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
    if (!confirm('Delete this application and ALL its data?')) return
    try {
      await api.delete(`/applications/${id}`)
      toast.success('Deleted')
      if (selectedApp?._id === id) { setSelectedApp(null); setCredentials(null) }
      loadApplications()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const regenerateSecret = async () => {
    if (!credentials) return
    if (!confirm('This will invalidate all active sessions. Continue?')) return
    try {
      const response = await api.post(`/applications/${credentials._id}/regenerate-secret`)
      setCredentials({ ...credentials, appSecret: response.data.appSecret })
      toast.success('Secret regenerated!')
    } catch {
      toast.error('Failed to regenerate')
    }
  }

  const copy = (text: string, label = 'Copied!') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  const filtered = applications.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manage Applications</h1>
        <p className="text-gray-400 text-sm mt-1">Applications are the backbone of all the data.</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden border border-dark-border">
        {[
          { label: 'Total Apps', value: stats.total, icon: CubeIcon, active: false },
          { label: 'Active', value: stats.active, icon: CheckIcon, active: true },
          { label: 'Paused', value: stats.paused, icon: PauseIcon, active: false },
          { label: 'Active Sessions', value: stats.sessions, icon: SignalIcon, active: false },
        ].map((s, i) => (
          <div key={i} className={`flex flex-col items-center justify-center py-6 ${s.active ? 'bg-primary-600' : 'bg-dark-card'} ${i !== 3 ? 'border-r border-dark-border' : ''}`}>
            <span className="text-3xl font-bold">{s.value}</span>
            <span className="text-sm text-gray-300 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credentials Panel */}
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-bold">Application Credentials</h2>
            <p className="text-xs text-gray-400 mt-1">Select an application to view its credentials</p>
          </div>

          {credentials ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Application Name</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono">
                    {credentials.name}
                  </div>
                  <button onClick={() => copy(credentials.name)} className="p-2 hover:bg-dark-hover rounded-lg text-gray-400">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Account Owner ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono truncate">
                    {credentials.ownerId}
                  </div>
                  <button onClick={() => copy(credentials.ownerId)} className="p-2 hover:bg-dark-hover rounded-lg text-gray-400">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Application Secret</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono truncate">
                    {showSecret ? credentials.appSecret : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <button onClick={() => setShowSecret(!showSecret)} className="p-2 hover:bg-dark-hover rounded-lg text-gray-400 text-xs">
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => copy(credentials.appSecret)} className="p-2 hover:bg-dark-hover rounded-lg text-gray-400">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Version</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-mono">
                    {credentials.version}
                  </div>
                </div>
              </div>
              <button onClick={regenerateSecret} className="w-full btn btn-danger text-sm mt-2">
                Regenerate Secret
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CubeIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Click "Select" on an application to view credentials</p>
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My Applications</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
              className="input pl-9 text-sm"
            />
          </div>

          {/* Create Button */}
          <button onClick={() => setShowCreateModal(true)} className="w-full btn btn-primary flex items-center justify-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Create Application
          </button>

          {/* App List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No applications found</div>
            ) : (
              filtered.map((app: any) => (
                <div key={app._id} className={`border rounded-xl p-4 transition-all ${selectedApp?._id === app._id ? 'border-primary-500 bg-primary-600/10' : 'border-dark-border bg-dark-bg hover:border-gray-600'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${app.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>App Version: <span className="text-gray-200">{app.version}</span></span>
                        <span>Users: <span className="text-gray-200">{app.userCount || 0}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => selectApp(app)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${selectedApp?._id === app._id ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                      <CheckIcon className="w-3 h-3" />
                      {selectedApp?._id === app._id ? 'Selected' : 'Select'}
                    </button>
                    <button
                      onClick={() => { setRenameApp(app); setNewName(app.name); setShowRenameModal(true) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                    >
                      <PencilIcon className="w-3 h-3" />
                      Rename
                    </button>
                    <button
                      onClick={() => toggleStatus(app)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1"
                    >
                      {app.status === 'active' ? <PauseIcon className="w-3 h-3" /> : <PlayIcon className="w-3 h-3" />}
                      {app.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => deleteApplication(app._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Application</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Application Name</label>
                <input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="input" placeholder="My Application" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Version</label>
                <input type="text" value={newAppVersion} onChange={(e) => setNewAppVersion(e.target.value)} className="input" placeholder="1.0.0" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={createApplication} className="btn btn-primary flex-1">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Rename Application</h2>
              <button onClick={() => setShowRenameModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="New application name" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRenameModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={renameApplication} className="btn btn-primary flex-1">Rename</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
