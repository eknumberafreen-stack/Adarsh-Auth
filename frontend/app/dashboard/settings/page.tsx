'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { useAppStore } from '@/lib/store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { isValidUsername } from '@/lib/username'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChatBubbleBottomCenterTextIcon,
  SignalIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user } = useAuthStore()
  const { applications, selectedApp, setSelectedApp } = useAppStore()
  const [appData, setAppData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('app-config')
  const [loading, setLoading] = useState(false)

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
    if (!confirm('This will invalidate all active sessions. Continue?')) return
    try {
      await api.post(`/applications/${selectedApp._id}/regenerate-secret`)
      toast.success('App secret regenerated!')
      loadApp()
    } catch {
      toast.error('Failed to regenerate secret')
    }
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
    if (!confirm('Are you sure? This will delete ALL data for this application.')) return
    if (!confirm('This action is IRREVERSIBLE. Type confirm to proceed.')) return
    try {
      await api.delete(`/applications/${selectedApp._id}`)
      toast.success('Application deleted')
      setSelectedApp(null)
    } catch {
      toast.error('Failed to delete application')
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 font-semibold tracking-wide">Configure operational policies, alert messaging, and security limits</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-black/40 border border-white/[0.05] rounded-2xl p-1.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* App Config Tab */}
          {activeTab === 'app-config' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Access Controls */}
              <div className="card space-y-5 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
                  Access Controls
                </h2>

                {/* App Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                  <div className="flex-1 mr-4">
                    <p className="font-bold text-sm text-white">App Status</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Enable or disable application access, preventing new logins
                    </p>
                  </div>
                  <button
                    onClick={toggleAppStatus}
                    disabled={!hasManageSettings}
                    className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed ${
                      appStatus ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all ${
                      appStatus ? 'left-5.5' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>

                {/* HWID Lock Toggle */}
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                  <div className="flex-1 mr-4">
                    <p className="font-bold text-sm text-white">HWID Lock Check</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Validate system hardware ID constraints to prevent credentials sharing
                    </p>
                  </div>
                  <button
                    onClick={() => setHwidLock(!hwidLock)}
                    disabled={!hasManageSettings}
                    className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed ${
                      hwidLock ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all ${
                      hwidLock ? 'left-5.5' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>

                {/* Global Kill Switch */}
                <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <div className="flex-1 mr-4">
                    <p className="font-bold text-sm text-red-400">🔴 Maintenance Mode</p>
                    <p className="text-[10px] text-red-300/60 font-semibold mt-1">
                      Platform-wide protection mode — rejects client API requests
                    </p>
                  </div>
                  <button
                    onClick={toggleMaintenanceMode}
                    disabled={!hasManageSettings}
                    className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 border border-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed ${
                      maintenanceMode ? 'bg-red-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all ${
                      maintenanceMode ? 'left-5.5' : 'left-0.5'
                    }`}></div>
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="p-4 bg-red-500/[0.02] border border-red-500/25 rounded-2xl space-y-3">
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider">Danger Actions</p>
                  <div className="flex flex-col gap-2.5">
                    {hasManageSettings && (
                      <button
                        onClick={regenerateSecret}
                        className="w-full py-3 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <KeyIcon className="w-4 h-4" />
                        Regenerate Application Secret
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={deleteApp}
                        className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Permanently Delete Application
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Download & Update */}
              <div className="card space-y-5 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ArrowDownTrayIcon className="w-5 h-5 text-indigo-400" />
                  Software Updates
                </h2>

                {/* Version */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Build Target Version</p>
                  {editingVersion ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        className="input text-xs font-bold flex-1"
                        placeholder="1.0"
                      />
                      <button onClick={saveVersion} className="btn btn-primary px-3 py-1">
                        <CheckIcon className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-white tracking-tight">{version || '1.0'}</span>
                      {hasManageSettings && (
                        <button
                          onClick={() => setEditingVersion(true)}
                          className="p-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] rounded-xl text-slate-400 hover:text-white transition-all"
                        >
                          <PencilIcon className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Auto-Update Link */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Update Download URL</p>
                    {hasManageSettings && (
                      <button onClick={saveVersion} className="text-[10px] font-bold text-indigo-400 hover:underline">Save Link</button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    readOnly={!hasManageSettings}
                    className="input text-xs font-mono text-indigo-300"
                    placeholder="https://example.com/update.zip"
                  />
                  <p className="text-[10px] text-slate-500 font-semibold mt-2.5">
                    Clients receive this link target during version mismatch events
                  </p>
                </div>

                {/* App Info */}
                {selectedApp && (
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05] space-y-3.5">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Workspace Summary</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Name</p>
                        <p className="font-bold text-white mt-0.5">{selectedApp.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Status</p>
                        <div className="mt-0.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            selectedApp.status === 'active'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                          }`}>
                            {selectedApp.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Users</p>
                        <p className="font-bold text-white mt-0.5">{selectedApp.userCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Registered</p>
                        <p className="font-bold text-white mt-0.5 text-xs">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
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
              <div className="card space-y-5 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-indigo-400" />
                  Discord Webhook
                </h2>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Post real-time event embeds into your channels upon login, registration, bans, or failures.
                </p>

                {hasManageSettings ? (
                  <>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05] space-y-3">
                      <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Webhook target URL</label>
                      <input
                        type="text"
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        className="input text-xs font-mono text-indigo-300"
                        placeholder="https://discord.com/api/webhooks/..."
                      />
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        Channel Settings → Integrations → Webhooks → Copy URL
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={saveWebhook}
                        disabled={webhookSaving}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        {webhookSaving ? 'Saving...' : 'Save Webhook'}
                      </button>
                      <button
                        onClick={testWebhook}
                        disabled={webhookTesting}
                        className="flex-1 py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        {webhookTesting ? 'Sending...' : 'Test Embed'}
                      </button>
                    </div>

                    {discordWebhook && (
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <span className="text-emerald-400 text-sm">✅ Webhook URL successfully mapped</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] text-center text-slate-500 text-xs font-semibold">
                    🔒 Hook settings are hidden. Requires manage settings permissions.
                  </div>
                )}
              </div>

              <div className="card space-y-5 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <SignalIcon className="w-5 h-5 text-indigo-400" />
                  Events Tracked
                </h2>
                <div className="space-y-3">
                  {[
                    { emoji: '🔑', event: 'Client Authentication',   color: 'text-green-400',  desc: 'User identity, client IP, HWID blueprint' },
                    { emoji: '🆕', event: 'New Registrations', color: 'text-blue-400',   desc: 'Credential details, linked activation code' },
                    { emoji: '❌', event: 'Access Rejections',     color: 'text-red-400',    desc: 'Username, reject code, client telemetry' },
                    { emoji: '🔨', event: 'Hardware Ban triggers',   color: 'text-yellow-400', desc: 'Banned identifiers, logs, source address' },
                    { emoji: '⚠️', event: 'HWID Mismatch alarms',   color: 'text-orange-400', desc: 'Unauthorized system layout attempts' },
                  ].map((e) => (
                    <div key={e.event} className="flex items-center gap-3.5 p-3.5 bg-black/40 rounded-2xl border border-white/[0.05]">
                      <span className="text-xl flex-shrink-0">{e.emoji}</span>
                      <div>
                        <p className={`font-bold text-xs ${e.color}`}>{e.event}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">{e.desc}</p>
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
              <div className="card space-y-4 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCircleIcon className="w-5 h-5 text-indigo-400" />
                  Profile Configuration
                </h2>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Registered Email Address</label>
                  <input type="email" value={user?.email || ''} className="input" readOnly />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="input"
                    placeholder="e.g. adarsh_auth"
                  />
                  {newUsername !== '' && !isValidUsername(newUsername) && (
                    <p className="text-red-400 text-[10px] font-bold mt-1.5">
                      3-30 chars: lowercase letters, digits, underscores, or hyphens only.
                    </p>
                  )}
                  <button
                    onClick={saveUsername}
                    disabled={usernameSaving || (newUsername !== '' && !isValidUsername(newUsername))}
                    className="btn btn-primary mt-4 w-full py-3 text-xs font-black uppercase tracking-wider"
                  >
                    {usernameSaving ? 'Saving...' : 'Update Account Username'}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Internal User Identity Key</label>
                  <input type="text" value={user?.id || ''} className="input font-mono text-xs text-indigo-300" readOnly />
                </div>
              </div>

              <div className="card space-y-4 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <KeyIcon className="w-5 h-5 text-indigo-400" />
                  Update Password
                </h2>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <button className="btn btn-primary w-full py-3 text-xs font-black uppercase tracking-wider mt-2">Change Password</button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card space-y-4 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
                  Active Security Safeguards
                </h2>
                {[
                  { label: 'HMAC SHA256 Signatures', desc: 'Client packets are signed and cryptographically checked', active: true },
                  { label: 'Replay Protection Counters', desc: 'Timestamp + unique nonce validation on operations', active: true },
                  { label: 'Endpoint Rate Limiting', desc: 'Application-level, authentication, and client request checks active', active: true },
                  { label: 'Immutable Audit Logging', desc: 'Crucial configuration events are permanently logged', active: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                    <div className="flex-1 mr-4">
                      <p className="font-bold text-sm text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">{item.desc}</p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-full flex-shrink-0">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              <div className="card space-y-4 shadow-2xl">
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-indigo-400" />
                  Architecture telemetries
                </h2>
                <div className="space-y-3.5 text-xs text-slate-400">
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                    <p className="text-white font-bold mb-1">Request Sign Checks</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Every client transaction must carry a valid signature generated via your unique App Secret key.</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                    <p className="text-white font-bold mb-1">Clock Tolerances</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Requests must fall inside a strict 30-second synchronization window to prevent replay attempts.</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/[0.05]">
                    <p className="text-white font-bold mb-1">Device Hardware Locking</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Active loaders tie account access directly to the host machine signature profile on initial sign-in.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="card space-y-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-400" />
                    Alert Scenarios Message customization
                  </h2>
                  {hasManageSettings && (
                    <button
                      onClick={saveMessages}
                      disabled={messagesSaving}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      {messagesSaving ? 'Saving...' : 'Save Messages'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Modify the precise text strings returned to your client applications during rejection states.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'appDisabled', label: 'Application Disabled', desc: 'Triggered when the app status is switched to paused' },
                    { id: 'appPaused', label: 'Maintenance Mode Active', desc: 'Triggered when maintenance mode is active platform-wide' },
                    { id: 'invalidLicense', label: 'Activation Code Invalid', desc: 'Triggered when the activation key provided is invalid' },
                    { id: 'licenseUsed', label: 'Activation Key Already Bound', desc: 'Triggered when a key is already bound to another profile' },
                    { id: 'invalidUsername', label: 'Format Username Invalid', desc: 'Triggered when registering with non-alphanumeric formats' },
                    { id: 'usernameTaken', label: 'Username Taken', desc: 'Triggered when username already exists' },
                    { id: 'hwidMismatch', label: 'Hardware Lock Alarm', desc: 'Triggered when logged in from a secondary system' },
                    { id: 'userBanned', label: 'Account Banned', desc: 'Triggered when a blacklisted profile attempts authentication' },
                    { id: 'invalidCreds', label: 'Invalid Login Parameters', desc: 'Triggered for general credential failure events' },
                    { id: 'invalidPassword', label: 'Incorrect Password Input', desc: 'Triggered on failed password verification checks' },
                    { id: 'noSubscription', label: 'Active Plan Expired', desc: 'Triggered when the active subscription has expired' },
                    { id: 'accountPaused', label: 'Subscription Suspended', desc: 'Triggered when a specific profile is set to paused' },
                    { id: 'versionMismatch', label: 'Loader Outdated Mismatch', desc: 'Triggered when the client application version is outdated' },
                  ].map((field) => (
                    <div key={field.id} className="p-4 bg-black/40 rounded-2xl border border-white/[0.05] space-y-2">
                      <label className="block text-xs font-bold text-slate-300">{field.label}</label>
                      <input
                        type="text"
                        value={customMessages[field.id] || ''}
                        onChange={(e) => setCustomMessages({ ...customMessages, [field.id]: e.target.value })}
                        readOnly={!hasManageSettings}
                        className="input text-xs font-semibold text-white bg-black/50"
                        placeholder={hasManageSettings ? `Enter custom message...` : "No permission"}
                      />
                      <p className="text-[9px] text-slate-500 font-semibold">{field.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
