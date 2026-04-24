'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
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

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      const response = await api.get('/applications')
      const apps = response.data.applications
      setApplications(apps)

      let sessions = 0
      for (const app of apps) {
        try {
          const sessionResponse = await api.get(`/sessions/application/${app._id}`)
          sessions += sessionResponse.data.sessions.length
        } catch {}
      }

      setStats({
        total: apps.length,
        active: apps.filter((app: any) => app.status === 'active').length,
        paused: apps.filter((app: any) => app.status === 'paused').length,
        sessions,
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
      if (selectedApp?._id === id) {
        setSelectedApp(null)
        setCredentials(null)
      }
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

  const filtered = applications.filter((app: any) => app.name.toLowerCase().includes(search.toLowerCase()))

  const statTiles = [
    { label: 'Total Apps', value: stats.total, icon: CubeIcon, tone: 'text-indigo-300' },
    { label: 'Active', value: stats.active, icon: CheckIcon, tone: 'text-emerald-300' },
    { label: 'Paused', value: stats.paused, icon: PauseIcon, tone: 'text-zinc-200' },
    { label: 'Active Sessions', value: stats.sessions, icon: SignalIcon, tone: 'text-slate-200' },
  ]

  return (
    <div className="space-y-8">
      <section className="page-header">
        <div>
          <p className="page-eyebrow">Applications</p>
          <h1 className="page-title">Manage the applications behind your authentication workflow.</h1>
          <p className="page-subtitle">
            Create applications, review credentials, rotate secrets, and control status from one classic dark workspace.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <PlusIcon className="h-5 w-5" />
          Create Application
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statTiles.map((tile) => (
          <div key={tile.label} className="stat-tile">
            <div className="flex items-center justify-between">
              <p className="stat-label">{tile.label}</p>
              <tile.icon className={`h-5 w-5 ${tile.tone}`} />
            </div>
            <p className="stat-value">{tile.value}</p>
            <p className="stat-meta">Live summary across your application inventory</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-200">
              <DocumentDuplicateIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="page-eyebrow">Selected Credentials</p>
              <h2 className="text-2xl font-bold text-white">Application secrets and identity</h2>
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
                    <button onClick={() => setShowSecret(!showSecret)} className="btn btn-secondary px-3 py-2 text-xs">
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  ),
                },
                { label: 'Version', value: credentials.version },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                    <div className="flex items-center gap-2">
                      {item.actions}
                      {item.copyValue && (
                        <button onClick={() => copy(item.copyValue)} className="rounded-xl border border-white/10 p-2 text-slate-400 transition-colors hover:text-white">
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="break-all rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-200">
                    {item.value}
                  </div>
                </div>
              ))}

              <button onClick={regenerateSecret} className="btn btn-danger w-full">
                Regenerate Secret
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-16 text-center">
              <CubeIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-base font-semibold text-white">Choose an application to inspect credentials</p>
              <p className="mt-2 text-sm text-slate-400">Selecting an application keeps the logic the same while making the workflow much easier to scan.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-eyebrow">Inventory</p>
              <h2 className="text-2xl font-bold text-white">Application list</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search applications"
                className="input pl-9"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-14 text-center text-sm text-slate-400">
                No applications found for the current search.
              </div>
            ) : (
              filtered.map((app: any) => {
                const isSelected = selectedApp?._id === app._id
                return (
                  <div
                    key={app._id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? 'border-indigo-400/25 bg-indigo-400/10 shadow-lg shadow-indigo-950/30'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-white">{app.name}</h3>
                          <span
                            className={`badge ${
                              app.status === 'active'
                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                                : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-200'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <CubeIcon className="h-4 w-4" />
                            Version {app.version}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <UserGroupIcon className="h-4 w-4" />
                            {app.userCount || 0} linked users
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => selectApp(app)} className={`btn px-3 py-2 text-xs ${isSelected ? 'btn-secondary' : 'btn-primary'}`}>
                          <CheckIcon className="h-4 w-4" />
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                        <button
                          onClick={() => {
                            setRenameApp(app)
                            setNewName(app.name)
                            setShowRenameModal(true)
                          }}
                          className="btn btn-secondary px-3 py-2 text-xs"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Rename
                        </button>
                        <button onClick={() => toggleStatus(app)} className="btn btn-secondary px-3 py-2 text-xs">
                          {app.status === 'active' ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                          {app.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={() => deleteApplication(app._id)} className="btn btn-danger px-3 py-2 text-xs">
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="page-eyebrow">Create</p>
                <h2 className="text-2xl font-bold text-white">New application</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl border border-white/10 p-2 text-slate-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Application Name</label>
                <input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} className="input" placeholder="My Application" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Version</label>
                <input type="text" value={newAppVersion} onChange={(e) => setNewAppVersion(e.target.value)} className="input" placeholder="1.0.0" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={createApplication} className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="page-eyebrow">Rename</p>
                <h2 className="text-2xl font-bold text-white">Update application name</h2>
              </div>
              <button onClick={() => setShowRenameModal(false)} className="rounded-xl border border-white/10 p-2 text-slate-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">New Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="New application name" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRenameModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={renameApplication} className="btn btn-primary flex-1">
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
