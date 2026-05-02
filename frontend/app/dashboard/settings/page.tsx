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
  const [activeTab, setActiveTab] = useState('app-config')
  const [loading, setLoading] = useState(false)

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
      await api.patch('/auth/username', { username: newUsername })
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, username: newUsername } : state.user,
      }))
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
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Control your application and account settings</p>
      </div>


      {/* Tabs */}
      <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* App Config Tab */}
      {activeTab === 'app-config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Access Controls */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary-400" />
              Access Controls
            </h2>

            {/* App Status Toggle */}
            <div className="flex items-start justify-between p-4 bg-dark-bg rounded-xl border border-dark-border">
              <div className="flex-1 mr-4">
                <p className="font-medium text-sm">App Status</p>
                <p className="text-xs text-gray-400 mt-1">
                  Enable or disable the application, preventing users from logging in
                </p>
              </div>
              <button
                onClick={toggleAppStatus}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                  appStatus ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  appStatus ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* HWID Lock Toggle */}
            <div className="flex items-start justify-between p-4 bg-dark-bg rounded-xl border border-dark-border">
              <div className="flex-1 mr-4">
                <p className="font-medium text-sm">HWID Lock</p>
                <p className="text-xs text-gray-400 mt-1">
                  Lock users to their device hardware ID to prevent account sharing
                </p>
              </div>
              <button
                onClick={() => setHwidLock(!hwidLock)}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                  hwidLock ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  hwidLock ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* Global Kill Switch */}
            <div className="flex items-start justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex-1 mr-4">
                <p className="font-medium text-sm text-red-400">🔴 Global Kill Switch</p>
                <p className="text-xs text-gray-400 mt-1">
                  Enable maintenance mode — blocks ALL client API requests platform-wide
                </p>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                  maintenanceMode ? 'bg-red-600' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  maintenanceMode ? 'left-7' : 'left-1'
                }`}></div>
              </button>
            </div>

            {/* Danger Zone */}
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="font-medium text-sm text-red-400 mb-3">Danger Zone</p>
              <div className="space-y-2">
                <button
                  onClick={regenerateSecret}
                  className="w-full px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <KeyIcon className="w-4 h-4" />
                  Regenerate App Secret
                </button>
                <button
                  onClick={deleteApp}
                  className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete Application
                </button>
              </div>
            </div>
          </div>

          {/* Download & Update */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5 text-primary-400" />
              Download & Update
            </h2>

            {/* Version */}
            <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Application Version</p>
              {editingVersion ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="input text-sm flex-1"
                    placeholder="1.0"
                  />
                  <button onClick={saveVersion} className="btn btn-primary px-3">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{version || '1.0'}</span>
                  <button
                    onClick={() => setEditingVersion(true)}
                    className="p-2 hover:bg-dark-hover rounded-lg text-gray-400"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Auto-Update Link */}
            <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Auto-Update Download Link</p>
                <button onClick={saveVersion} className="text-[10px] text-primary-400 hover:underline">Save Link</button>
              </div>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                className="input text-sm"
                placeholder="https://example.com/update.zip"
              />
              <p className="text-xs text-gray-500 mt-2">
                Users will be prompted to download this when version changes
              </p>
            </div>

            {/* App Info */}
            {selectedApp && (
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Application Info</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Name</p>
                    <p className="font-medium">{selectedApp.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedApp.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedApp.status?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total Users</p>
                    <p className="font-medium">{selectedApp.userCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Created</p>
                    <p className="font-medium text-xs">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
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
          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BellIcon className="w-5 h-5 text-primary-400" />
              Discord Webhook
            </h2>
            <p className="text-sm text-gray-400">
              Get real-time notifications in your Discord server when users login, register, fail login, or get banned.
            </p>

            <div className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-3">
              <label className="block text-sm font-medium text-gray-300">Webhook URL</label>
              <input
                type="text"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                className="input text-sm font-mono"
                placeholder="https://discord.com/api/webhooks/..."
              />
              <p className="text-xs text-gray-500">
                Discord Server → Channel Settings → Integrations → Webhooks → New Webhook → Copy URL
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveWebhook}
                disabled={webhookSaving}
                className="btn btn-primary flex-1"
              >
                {webhookSaving ? 'Saving...' : '💾 Save Webhook'}
              </button>
              <button
                onClick={testWebhook}
                disabled={webhookTesting}
                className="btn btn-secondary flex-1"
              >
                {webhookTesting ? 'Sending...' : '🧪 Test Webhook'}
              </button>
            </div>

            {discordWebhook && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-green-400 text-sm">✅ Webhook configured</span>
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-bold">📋 Events Tracked</h2>
            <div className="space-y-3">
              {[
                { emoji: '✅', event: 'Login Success',   color: 'text-green-400',  desc: 'Username, IP, HWID, expiry date' },
                { emoji: '🆕', event: 'New Registration', color: 'text-blue-400',   desc: 'Username, IP, HWID, license key' },
                { emoji: '❌', event: 'Login Failed',     color: 'text-red-400',    desc: 'Username, IP, failure reason' },
                { emoji: '🔨', event: 'Banned Attempt',   color: 'text-yellow-400', desc: 'Username, IP, ban reason' },
                { emoji: '⚠️', event: 'HWID Mismatch',   color: 'text-orange-400', desc: 'Username, IP, app name' },
              ].map((e) => (
                <div key={e.event} className="flex items-start gap-3 p-3 bg-dark-bg rounded-xl border border-dark-border">
                  <span className="text-xl">{e.emoji}</span>
                  <div>
                    <p className={`font-medium text-sm ${e.color}`}>{e.event}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{e.desc}</p>
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
          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5 text-primary-400" />
              Account Information
            </h2>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Email Address</label>
              <input type="email" value={user?.email || ''} className="input" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="input"
                placeholder="e.g. cool_user-123"
              />
              {newUsername !== '' && !isValidUsername(newUsername) && (
                <p className="text-red-400 text-xs mt-1">
                  Username must be 3–30 characters: lowercase letters, digits, underscores, or hyphens only.
                </p>
              )}
              <button
                onClick={saveUsername}
                disabled={usernameSaving || (newUsername !== '' && !isValidUsername(newUsername))}
                className="btn btn-primary mt-3 w-full"
              >
                {usernameSaving ? 'Saving...' : 'Save Username'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">User ID</label>
              <input type="text" value={user?.id || ''} className="input font-mono text-xs" readOnly />
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <KeyIcon className="w-5 h-5 text-primary-400" />
              Change Password
            </h2>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary w-full">Update Password</button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary-400" />
              Security Features
            </h2>
            {[
              { label: 'HMAC SHA256 Signatures', desc: 'All client requests are signed and verified', active: true },
              { label: 'Replay Attack Prevention', desc: 'Timestamp + nonce validation on every request', active: true },
              { label: 'Rate Limiting', desc: 'Global, auth, and client API rate limits active', active: true },
              { label: 'Audit Logging', desc: 'All security events are logged automatically', active: true },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="flex-1 mr-4">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium flex-shrink-0">
                  Active
                </span>
              </div>
            ))}
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BellIcon className="w-5 h-5 text-primary-400" />
              Security Info
            </h2>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium mb-1">Request Signing</p>
                <p>Every client request must include a valid HMAC SHA256 signature using your App Secret.</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium mb-1">Timestamp Tolerance</p>
                <p>Requests must be within ±30 seconds of server time to prevent replay attacks.</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium mb-1">HWID Locking</p>
                <p>Users are bound to their hardware ID on first login. Reset from Users page if needed.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-primary-400" />
                Alert Messages
              </h2>
              <button
                onClick={saveMessages}
                disabled={messagesSaving}
                className="btn btn-primary"
              >
                {messagesSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
            <p className="text-sm text-gray-400">
              Customize the messages returned to your client app for various error scenarios.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'appDisabled', label: 'Application is Disabled', desc: 'Shown when the app status is set to inactive' },
                { id: 'appPaused', label: 'Application is Paused', desc: 'Shown when maintenance mode is active' },
                { id: 'invalidLicense', label: 'Invalid License', desc: 'Shown when an unknown license key is provided' },
                { id: 'licenseUsed', label: 'License Already Used', desc: 'Shown when a key is already bound to another user' },
                { id: 'invalidUsername', label: 'Invalid Username', desc: 'Shown during registration for invalid chars' },
                { id: 'usernameTaken', label: 'Username Taken', desc: 'Shown when a username is already registered' },
                { id: 'hwidMismatch', label: 'HWID Mismatch', desc: 'Shown when a user logs in from a different device' },
                { id: 'userBanned', label: 'User is Blacklisted', desc: 'Shown when a banned user attempts login' },
                { id: 'invalidCreds', label: 'Invalid Credentials', desc: 'Shown for generic login failures' },
                { id: 'invalidPassword', label: 'Password Mismatch', desc: 'Shown when the password provided is incorrect' },
                { id: 'noSubscription', label: 'No Active Subscription', desc: 'Shown when user has no valid plan' },
                { id: 'subPaused', label: 'Subscription Paused', desc: 'Shown when user plan is temporarily disabled' },
                { id: 'expiredLicense', label: 'Expired License', desc: 'Shown when user subscription has ended' },
                { id: 'accountPaused', label: 'Account is Paused', desc: 'Shown when a specific user is paused by staff' },
                { id: 'versionMismatch', label: 'Version Mismatch', desc: 'Shown when the loader version is outdated' },
              ].map((field) => (
                <div key={field.id} className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-2">
                  <label className="block text-sm font-medium text-gray-300">{field.label}</label>
                  <input
                    type="text"
                    value={customMessages[field.id] || ''}
                    onChange={(e) => setCustomMessages({ ...customMessages, [field.id]: e.target.value })}
                    className="input text-sm"
                    placeholder={`Enter custom message for ${field.label}...`}
                  />
                  <p className="text-[10px] text-gray-500">{field.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
