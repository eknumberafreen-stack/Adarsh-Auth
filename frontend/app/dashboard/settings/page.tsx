'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { useAppStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { isValidUsername } from '@/lib/username'
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user } = useAuthStore()
  const { applications, selectedApp, setSelectedApp } = useAppStore()
  const [appData, setAppData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('app-config')
  const [loading, setLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    show: false, title: '', message: '', onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info', confirmText: 'Confirm'
  })

  const isOwner = appData ? appData.userId === user?.id : selectedApp?.userId === user?.id
  const currentMember = (appData || selectedApp)?.team?.find((m: any) => {
    const mId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
    return mId === user?.id;
  })
  const hasManageSettings = isOwner || !!currentMember?.permissions?.includes('manage_settings')

  // App Config state
  const [appStatus, setAppStatus] = useState(true)
  const [hwidLock, setHwidLock] = useState(true)
  const [version, setVersion] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [editingVersion, setEditingVersion] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Webhook state
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookTesting, setWebhookTesting] = useState(false)

  // Account state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)

  // Custom Messages state
  const [customMessages, setCustomMessages] = useState<any>({
    appDisabled: '',
    appPaused: '',
    invalidLicense: '',
    licenseUsed: '',
    invalidUsername: '',
    usernameTaken: '',
    hwidMismatch: '',
    userBanned: '',
    invalidCreds: '',
    invalidPassword: '',
    noSubscription: '',
    accountPaused: '',
    subPaused: '',
    expiredLicense: ''
  })
  const [messagesSaving, setMessagesSaving] = useState(false)

  useEffect(() => {
    setNewUsername(user?.username ?? '')
  }, [user])

  const loadMaintenanceMode = async () => {
    try {
      const res = await api.get('/admin/config')
      setMaintenanceMode(res.data.MAINTENANCE_MODE)
    } catch {}
  }

  const toggleMaintenanceMode = async () => {
    try {
      const newVal = !maintenanceMode
      await api.post('/admin/config/maintenance', { enabled: newVal })
      setMaintenanceMode(newVal)
      toast.success(`Maintenance mode ${newVal ? 'ENABLED' : 'DISABLED'}`)
    } catch {
      toast.error('Failed to update maintenance mode')
    }
  }

  useEffect(() => {
    loadMaintenanceMode()
  }, [])

  useEffect(() => {
    if (selectedApp?._id) {
      loadApp()
    }
  }, [selectedApp?._id])

  const loadApp = async () => {
    if (!selectedApp?._id) return
    try {
      const res = await api.get(`/applications/${selectedApp._id}`)
      const app = res.data.application
      setAppData(app)
      setAppStatus(app.status === 'active')
      setVersion(app.version)
      setNewVersion(app.version)
      setDownloadUrl(app.downloadUrl || '')
      setDiscordWebhook(app.discordWebhook || '')
      if (app.customMessages) {
        setCustomMessages(app.customMessages)
      }
    } catch {
      toast.error('Failed to load application')
    }
  }

  const toggleAppStatus = async () => {
    if (!selectedApp?._id) return
    try {
      const newStatus = appStatus ? 'paused' : 'active'
      await api.patch(`/applications/${selectedApp._id}`, { status: newStatus })
      setAppStatus(!appStatus)
      toast.success(`Application ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const saveVersion = async () => {
    if (!selectedApp?._id) return
    try {
      await api.patch(`/applications/${selectedApp._id}`, { version: newVersion, downloadUrl })
      setVersion(newVersion)
      setEditingVersion(false)
      toast.success('Settings updated!')
    } catch {
      toast.error('Failed to update settings')
    }
  }

  const regenerateSecret = async () => {
    if (!selectedApp?._id) return
    setConfirmModal({
      show: true,
      title: 'Regenerate App Secret?',
      message: 'This will invalidate all active client sessions and require key/signature updates. Are you sure you want to proceed?',
      type: 'warning',
      confirmText: 'Regenerate',
      onConfirm: async () => {
        setConfirmModal(p => ({ ...p, show: false }))
        try {
          await api.post(`/applications/${selectedApp._id}/regenerate-secret`)
          toast.success('App secret regenerated!')
          loadApp()
        } catch {
          toast.error('Failed to regenerate secret')
        }
      }
    })
  }

  const saveWebhook = async () => {
    if (!selectedApp?._id) return
    setWebhookSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}`, { discordWebhook })
      toast.success('Discord webhook saved!')
    } catch {
      toast.error('Failed to save webhook')
    } finally {
      setWebhookSaving(false)
    }
  }

  const testWebhook = async () => {
    if (!selectedApp?._id) return
    if (!discordWebhook) { toast.error('Enter a webhook URL first'); return }
    setWebhookTesting(true)
    try {
      await api.post(`/applications/${selectedApp._id}/test-webhook`, { webhookUrl: discordWebhook })
      toast.success('Test message sent to Discord!')
    } catch {
      toast.error('Failed to send test message')
    } finally {
      setWebhookTesting(false)
    }
  }

  const saveMessages = async () => {
    if (!selectedApp?._id) return
    setMessagesSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}`, { customMessages })
      toast.success('Custom messages saved!')
    } catch {
      toast.error('Failed to save custom messages')
    } finally {
      setMessagesSaving(false)
    }
  }

  const deleteApp = async () => {
    if (!selectedApp?._id) return
    setConfirmModal({
      show: true,
      title: 'DELETE APPLICATION?',
      message: `This will permanently delete all logs, licenses, keys, and configurations for "${selectedApp.name}". This action is IRREVERSIBLE.`,
      type: 'danger',
      confirmText: 'Delete Forever',
      onConfirm: async () => {
        setConfirmModal(p => ({ ...p, show: false }))
        try {
          await api.delete(`/applications/${selectedApp._id}`)
          toast.success('Application deleted')
          setSelectedApp(null)
        } catch {
          toast.error('Failed to delete application')
        }
      }
    })
  }

  const saveUsername = async () => {
    setUsernameSaving(true)
    try {
      const res = await api.patch('/auth/username', { username: newUsername })
      const updatedUsername = res.data?.user?.username || newUsername
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, username: updatedUsername } : state.user,
      }))
      setNewUsername(updatedUsername)
      toast.success('Username updated!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update username')
    } finally {
      setUsernameSaving(false)
    }
  }

  const tabs = [
    { id: 'app-config', label: 'App Config', icon: Cog6ToothIcon },
    { id: 'webhooks',   label: 'Webhooks',   icon: BellIcon },
    { id: 'messages',   label: 'Messages',   icon: ChatBubbleBottomCenterTextIcon },
    { id: 'account',   label: 'Account',    icon: UserCircleIcon },
    { id: 'security',  label: 'Security',   icon: ShieldCheckIcon },
  ]

  return (
    <div className="space-y-8">
      <style dangerouslySetInnerHTML={{__html: `
        .premium-card {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.75) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card:hover {
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.06);
        }
        .premium-input {
          background: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 12px !important;
          color: #fff !important;
          padding: 0.75rem 1rem !important;
          transition: all 0.2s ease !important;
          width: 100%;
        }
        .premium-input:focus {
          border-color: rgba(99, 102, 241, 0.4) !important;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.1) !important;
          background: rgba(0, 0, 0, 0.45) !important;
          outline: none !important;
        }
        .premium-input:read-only {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}} />

      {/* Header */}
      <section className="border-b border-white/[0.04] pb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Configure security credentials, auto-update links, hook alerts, custom error messages, and account profile details.
        </p>
      </section>

      {/* Tabs */}
      <div className="bg-[#0d0e12]/60 backdrop-blur-md border border-white/[0.04] p-1.5 rounded-2xl w-fit flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* App Config Tab */}
      {activeTab === 'app-config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Access Controls */}
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
              Access Controls
            </h2>

            {/* App Status Toggle */}
            <div className="flex items-start justify-between p-4 bg-black/20 rounded-xl border border-white/[0.04]">
              <div className="flex-1 mr-4">
                <p className="font-bold text-xs text-slate-200">App Status</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Enable or disable the application, preventing client loaders from logging in.
                </p>
              </div>
              <button
                onClick={toggleAppStatus}
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  appStatus ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  appStatus ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* HWID Lock Toggle */}
            <div className="flex items-start justify-between p-4 bg-black/20 rounded-xl border border-white/[0.04]">
              <div className="flex-1 mr-4">
                <p className="font-bold text-xs text-slate-200">HWID Lock</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Lock users to their device hardware ID to prevent account sharing and leaks.
                </p>
              </div>
              <button
                onClick={() => setHwidLock(!hwidLock)}
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  hwidLock ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  hwidLock ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* Global Kill Switch (Amber Warning Level) */}
            <div className="flex items-start justify-between p-4 bg-amber-500/[0.02] border border-amber-500/20 rounded-xl">
              <div className="flex-1 mr-4">
                <p className="font-bold text-xs text-amber-400">⚠️ Global Kill Switch</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Enable maintenance mode — instantly block ALL client API requests platform-wide.
                </p>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  maintenanceMode ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  maintenanceMode ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* Danger Zone (Crimson Destruction Level) */}
            <div className="p-4 bg-rose-500/[0.02] border border-rose-500/15 rounded-xl">
              <p className="font-black text-[10px] uppercase tracking-widest text-rose-400 mb-3">Danger Zone</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hasManageSettings && (
                  <button
                    onClick={regenerateSecret}
                    className="w-full px-4 py-2.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <KeyIcon className="w-4 h-4" />
                    Regenerate Secret
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={deleteApp}
                    className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Application
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Download & Update */}
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <ArrowDownTrayIcon className="w-5 h-5 text-indigo-400" />
              Download & Update
            </h2>

            {/* Version */}
            <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04]">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Application Version</p>
              {editingVersion ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="premium-input text-xs"
                    placeholder="1.0"
                  />
                  <button onClick={saveVersion} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-all">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-white tracking-tight">{version || '1.0'}</span>
                  {hasManageSettings && (
                    <button
                      onClick={() => setEditingVersion(true)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Auto-Update Link */}
            <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Auto-Update Download Link</p>
                {hasManageSettings && (
                  <button onClick={saveVersion} className="text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300">Save Link</button>
                )}
              </div>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                readOnly={!hasManageSettings}
                className="premium-input text-xs font-mono"
                placeholder="https://example.com/update.zip"
              />
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Loader clients will automatically prompt users with this URL on mismatch.
              </p>
            </div>

            {/* App Info */}
            {selectedApp && (
              <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04] space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Application Registry Info</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Name</p>
                    <p className="font-bold text-slate-200 mt-0.5">{selectedApp.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Status</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      selectedApp.status === 'active'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedApp.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Registered Users</p>
                    <p className="font-bold text-slate-200 mt-0.5">{selectedApp.userCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Created</p>
                    <p className="font-bold text-slate-300 text-xs mt-0.5">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <BellIcon className="w-5 h-5 text-indigo-400" />
              Discord Integration
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Broadcast security heartbeats, audit events, and login attempts directly into Discord.
            </p>

            {hasManageSettings ? (
              <>
                <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04] space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Webhook URL</label>
                  <input
                    type="text"
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                    className="premium-input text-xs font-mono"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Server Settings → Integrations → Webhooks → Copy Webhook URL
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveWebhook}
                    disabled={webhookSaving}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {webhookSaving ? 'Saving...' : '💾 Save Webhook'}
                  </button>
                  <button
                    onClick={testWebhook}
                    disabled={webhookTesting}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {webhookTesting ? 'Sending...' : '🧪 Test Dispatch'}
                  </button>
                </div>

                {discordWebhook && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-emerald-400 text-xs font-bold">✅ Hook target resolved & active</span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-white/10 text-center text-slate-500 text-xs">
                🔒 Configured URL is encrypted. Needs management scope.
              </div>
            )}
          </div>

          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 border-b border-white/[0.04] pb-4">📋 Monitored System Events</h2>
            <div className="space-y-3">
              {[
                { emoji: '✅', event: 'Login Success',   color: 'text-emerald-400',  desc: 'User metadata, IP routing, active HWID validation' },
                { emoji: '🆕', event: 'New Registration', color: 'text-indigo-400',   desc: 'User creation, profile binding, code claim' },
                { emoji: '❌', event: 'Login Failed',     color: 'text-rose-400',    desc: 'Fail telemetry, security failure reason' },
                { emoji: '🔨', event: 'Banned Attempt',   color: 'text-yellow-400', desc: 'Blacklist breach block tracking' },
                { emoji: '⚠️', event: 'HWID Mismatch',   color: 'text-amber-400', desc: 'Hardware mismatch alert telemetry' },
              ].map((e) => (
                <div key={e.event} className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/[0.04]">
                  <span className="text-lg">{e.emoji}</span>
                  <div>
                    <p className={`font-black text-xs uppercase tracking-wider ${e.color}`}>{e.event}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <UserCircleIcon className="w-5 h-5 text-indigo-400" />
              Account Registry Information
            </h2>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
              <input type="email" value={user?.email || ''} className="premium-input text-xs" readOnly />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="premium-input text-xs"
                placeholder="e.g. cool_user-123"
              />
              {newUsername !== '' && !isValidUsername(newUsername) && (
                <p className="text-rose-400 text-[10px] mt-1 leading-normal">
                  Requires 3–30 lowercase letters, digits, underscores, or hyphens.
                </p>
              )}
              <button
                onClick={saveUsername}
                disabled={usernameSaving || (newUsername !== '' && !isValidUsername(newUsername))}
                className="mt-3 w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                {usernameSaving ? 'Updating...' : 'Save Username'}
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">User ID ID</label>
              <input type="text" value={user?.id || ''} className="premium-input text-xs font-mono" readOnly />
            </div>
          </div>

          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <KeyIcon className="w-5 h-5 text-indigo-400" />
              Credential Shift
            </h2>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="premium-input text-xs"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="premium-input text-xs"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="premium-input text-xs"
                placeholder="••••••••"
              />
            </div>
            <button className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">Update Password</button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
              Security Features
            </h2>
            {[
              { label: 'HMAC SHA256 Signatures', desc: 'All client requests are cryptographically verified', active: true },
              { label: 'Replay Attack Prevention', desc: 'Timestamp + cryptographic nonce checks active', active: true },
              { label: 'Rate Limiting', desc: 'Multi-layer API call limits active on registration, login & updates', active: true },
              { label: 'Audit Logging', desc: 'Historical operational logs written to DB registries', active: true },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between p-4 bg-black/20 rounded-xl border border-white/[0.04]">
                <div className="flex-1 mr-4">
                  <p className="font-bold text-xs text-slate-200">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-md flex-shrink-0">
                  Active
                </span>
              </div>
            ))}
          </div>

          <div className="premium-card p-6 rounded-2xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-white/[0.04] pb-4">
              <BellIcon className="w-5 h-5 text-indigo-400" />
              Cryptographic Policies
            </h2>
            <div className="space-y-4 text-xs text-slate-400">
              <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04]">
                <p className="text-slate-200 font-bold mb-1">Request Verification</p>
                <p className="text-[10px] leading-relaxed">Requests require signed bodies using the application private key payload to guarantee message integrity.</p>
              </div>
              <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04]">
                <p className="text-slate-200 font-bold mb-1">Replay Prevention window</p>
                <p className="text-[10px] leading-relaxed">Server enforces strict timestamps. Replay attempts outside this timeframe trigger validation failures.</p>
              </div>
              <div className="p-4 bg-black/20 rounded-xl border border-white/[0.04]">
                <p className="text-slate-200 font-bold mb-1">Hardware ID Lockouts</p>
                <p className="text-[10px] leading-relaxed">Client bounds user credential arrays to specific hardware UUID metrics. Reset keys to re-bind.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="premium-card p-6 rounded-2xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/[0.04] pb-4 gap-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-400" />
                  Alert Override Registry
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">
                  Customize text values returned to your loader client for specific error events.
                </p>
              </div>
              {hasManageSettings && (
                <button
                  onClick={saveMessages}
                  disabled={messagesSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] shrink-0"
                >
                  {messagesSaving ? 'Saving...' : '💾 Save Custom Alerts'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'appDisabled', label: 'Application is Disabled', desc: 'Triggered when the app status is set to inactive' },
                { id: 'appPaused', label: 'Application is Paused', desc: 'Triggered when maintenance mode is active' },
                { id: 'invalidLicense', label: 'Invalid License', desc: 'Triggered when an unknown license key is provided' },
                { id: 'licenseUsed', label: 'License Already Used', desc: 'Triggered when a key is bound to another user' },
                { id: 'invalidUsername', label: 'Invalid Username', desc: 'Triggered during registration for invalid chars' },
                { id: 'usernameTaken', label: 'Username Taken', desc: 'Triggered when a username is already registered' },
                { id: 'hwidMismatch', label: 'HWID Mismatch', desc: 'Triggered when a user logs in from a different device' },
                { id: 'userBanned', label: 'User is Blacklisted', desc: 'Triggered when a banned user attempts login' },
                { id: 'invalidCreds', label: 'Invalid Credentials', desc: 'Triggered for generic login failures' },
                { id: 'invalidPassword', label: 'Password Mismatch', desc: 'Triggered when the password provided is incorrect' },
                { id: 'noSubscription', label: 'No Active Subscription', desc: 'Triggered when user subscription has ended or no plan is found' },
                { id: 'accountPaused', label: 'Subscription Paused', desc: 'Triggered when a specific user is paused by staff' },
                { id: 'versionMismatch', label: 'Version Mismatch', desc: 'Triggered when the loader version is outdated' },
              ].map((field) => (
                <div key={field.id} className="p-4 bg-black/20 rounded-xl border border-white/[0.04] space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</label>
                  <input
                    type="text"
                    value={customMessages[field.id] || ''}
                    onChange={(e) => setCustomMessages({ ...customMessages, [field.id]: e.target.value })}
                    readOnly={!hasManageSettings}
                    className="premium-input text-xs font-mono"
                    placeholder={hasManageSettings ? `Enter custom message...` : "Permission denied"}
                  />
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{field.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0a0b10] border border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                confirmModal.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? '⚡' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              <h3 className="text-lg font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmModal(p => ({ ...p, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/10">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' :
                    confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
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
