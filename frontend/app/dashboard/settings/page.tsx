'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useAppStore } from '@/lib/store'
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
  XMarkIcon,
  SignalIcon,
  CommandLineIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const { user } = useAuthStore()
  const { selectedApp, setSelectedApp } = useAppStore()
  const [activeTab, setActiveTab] = useState('app-config')
  const [loading, setLoading] = useState(false)

  // App Config state
  const [appStatus, setAppStatus] = useState(true)
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
    appDisabled: '', appPaused: '', invalidLicense: '', licenseUsed: '',
    invalidUsername: '', usernameTaken: '', hwidMismatch: '', userBanned: '',
    invalidCreds: '', invalidPassword: '', noSubscription: '', accountPaused: '',
    subPaused: '', expiredLicense: ''
  })
  const [messagesSaving, setMessagesSaving] = useState(false)

  useEffect(() => { setNewUsername(user?.username ?? '') }, [user])

  useEffect(() => {
    const loadPlatformConfig = async () => {
      try {
        const res = await api.get('/admin/config')
        setMaintenanceMode(res.data.MAINTENANCE_MODE)
      } catch {}
    }
    loadPlatformConfig()
  }, [])

  useEffect(() => {
    if (selectedApp?._id) loadApp()
  }, [selectedApp?._id])

  const loadApp = async () => {
    if (!selectedApp?._id) return
    try {
      const res = await api.get(`/applications/${selectedApp._id}`)
      const app = res.data.application
      setAppStatus(app.status === 'active'); setVersion(app.version); setNewVersion(app.version)
      setDownloadUrl(app.downloadUrl || ''); setDiscordWebhook(app.discordWebhook || '')
      if (app.customMessages) setCustomMessages(app.customMessages)
    } catch { toast.error('Sync failed') }
  }

  const toggleAppStatus = async () => {
    if (!selectedApp?._id) return
    try {
      const newStatus = appStatus ? 'paused' : 'active'
      await api.patch(`/applications/${selectedApp._id}`, { status: newStatus })
      setAppStatus(!appStatus); toast.success(`Unit ${newStatus}`)
    } catch { toast.error('Status update failed') }
  }

  const toggleMaintenanceMode = async () => {
    try {
      const newVal = !maintenanceMode
      await api.post('/admin/config/maintenance', { enabled: newVal })
      setMaintenanceMode(newVal); toast.success(`Standby Mode ${newVal ? 'Engaged' : 'Disengaged'}`)
    } catch { toast.error('Maintenance toggle failed') }
  }

  const saveVersion = async () => {
    if (!selectedApp?._id) return
    try {
      await api.patch(`/applications/${selectedApp._id}`, { version: newVersion, downloadUrl })
      setVersion(newVersion); setEditingVersion(false); toast.success('Logic Updated')
    } catch { toast.error('Update failed') }
  }

  const regenerateSecret = async () => {
    if (!selectedApp?._id) return
    if (!confirm('Regenerate Master Secret? All active links will be severed.')) return
    try {
      await api.post(`/applications/${selectedApp._id}/regenerate-secret`)
      toast.success('Secret Rotated'); loadApp()
    } catch { toast.error('Rotation failed') }
  }

  const saveWebhook = async () => {
    if (!selectedApp?._id) return
    setWebhookSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}`, { discordWebhook })
      toast.success('Webhook Synced')
    } catch { toast.error('Sync failed') }
    finally { setWebhookSaving(false) }
  }

  const testWebhook = async () => {
    if (!selectedApp?._id || !discordWebhook) return toast.error('Webhook missing')
    setWebhookTesting(true)
    try {
      await api.post(`/applications/${selectedApp._id}/test-webhook`, { webhookUrl: discordWebhook })
      toast.success('Test Pulse Sent')
    } catch { toast.error('Pulse failed') }
    finally { setWebhookTesting(false) }
  }

  const saveMessages = async () => {
    if (!selectedApp?._id) return
    setMessagesSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}`, { customMessages })
      toast.success('Protocol Messages Saved')
    } catch { toast.error('Save failed') }
    finally { setMessagesSaving(false) }
  }

  const deleteApp = async () => {
    if (!selectedApp?._id) return
    if (!confirm('Are you sure? This will delete ALL data for this application.')) return
    try {
      await api.delete(`/applications/${selectedApp._id}`)
      toast.success('Unit Purged'); setSelectedApp(null)
    } catch { toast.error('Purge failed') }
  }

  const saveUsername = async () => {
    setUsernameSaving(true)
    try {
      await api.patch('/auth/username', { username: newUsername })
      useAuthStore.setState((state) => ({ user: state.user ? { ...state.user, username: newUsername } : state.user }))
      toast.success('Identity Updated')
    } catch (e: any) { toast.error(e.response?.data?.error || 'Update failed') }
    finally { setUsernameSaving(false) }
  }

  const tabs = [
    { id: 'app-config', label: 'Unit Config', icon: Cog6ToothIcon },
    { id: 'webhooks',   label: 'Signals',     icon: BellIcon },
    { id: 'messages',   label: 'Protocols',   icon: ChatBubbleBottomCenterTextIcon },
    { id: 'account',    label: 'Identity',    icon: UserCircleIcon },
    { id: 'security',   label: 'Shield',      icon: ShieldCheckIcon },
  ]

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-500 mb-1">System Control</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">Configuration</h2>
        </div>
        
        {/* Modern Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="setting-tab" className="absolute inset-0 bg-primary-500 rounded-xl shadow-glow shadow-primary-500/20" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
              )}
              <tab.icon className={`relative z-10 w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-600'}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'app-config' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <SectionHeader icon={ShieldCheckIcon} title="Access Controls" />
                <div className="space-y-4">
                  <ToggleSetting title="Operational Status" desc="Master switch for all client authorization requests." active={appStatus} onClick={toggleAppStatus} />
                  <ToggleSetting title="Hardware Locking" desc="Bind personnel profiles to unique hardware signatures." active={true} onClick={() => {}} disabled />
                  <ToggleSetting title="Emergency Standby" desc="Global maintenance mode. Blocks all platform API traffic." active={maintenanceMode} onClick={toggleMaintenanceMode} color="bg-rose-600" />
                </div>

                <div className="card-premium p-8 bg-rose-500/[0.02] border-rose-500/20 space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Danger Zone</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={regenerateSecret} className="btn bg-rose-600/10 border border-rose-600/20 text-rose-400 py-3 text-xs uppercase tracking-widest font-black">Rotate Secret</button>
                    <button onClick={deleteApp} className="btn bg-rose-600 text-white py-3 text-xs uppercase tracking-widest font-black">Purge Unit</button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader icon={ArrowDownTrayIcon} title="Logic & Updates" />
                <div className="card-premium p-8 space-y-6">
                  <div className="input-group">
                    <label className="label">Active Version</label>
                    <div className="flex gap-3">
                      <input type="text" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="input flex-1 font-bold text-lg" />
                      <button onClick={saveVersion} className="btn btn-primary px-4"><CheckIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="label">Update Link (Download)</label>
                    <input type="text" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} className="input font-mono text-xs" placeholder="https://updates.adarshauth.online/..." />
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">When the client version mismatches the active version, users will be redirected to this link automatically.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-premium p-8 space-y-8">
                <SectionHeader icon={BellIcon} title="Discord Signal Link" />
                <div className="space-y-6">
                  <div className="input-group">
                    <label className="label">Webhook Target URL</label>
                    <input type="text" value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} className="input font-mono text-xs" placeholder="https://discord.com/api/webhooks/..." />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={saveWebhook} disabled={webhookSaving} className="btn btn-primary flex-1 py-4 text-xs font-black uppercase tracking-widest">{webhookSaving ? 'Syncing...' : 'Sync Webhook'}</button>
                    <button onClick={testWebhook} disabled={webhookTesting} className="btn btn-secondary flex-1 py-4 text-xs font-black uppercase tracking-widest">{webhookTesting ? 'Pulsing...' : 'Test Pulse'}</button>
                  </div>
                </div>
              </div>
              <div className="card-premium p-8 space-y-6">
                <SectionHeader icon={InformationCircleIcon} title="Signal Events" />
                <div className="space-y-3">
                  <SignalEvent emoji="✅" label="Auth Success" desc="Detailed login metadata & profile link" />
                  <SignalEvent emoji="🆕" label="New Profile" desc="Registration event & license binding" />
                  <SignalEvent emoji="🚫" label="Auth Failed" desc="Security triggers & failure reasons" />
                  <SignalEvent emoji="🔨" label="Security Breach" desc="Hardware mismatch or ban bypass attempts" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="card-premium p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <SectionHeader icon={ChatBubbleBottomCenterTextIcon} title="Custom Protocols" />
                <button onClick={saveMessages} disabled={messagesSaving} className="btn btn-primary px-8 py-3 text-xs uppercase tracking-widest font-black">{messagesSaving ? 'Syncing...' : 'Save Protocols'}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(customMessages).map(key => (
                  <div key={key} className="input-group p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-primary-500/20 transition-all">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">{key.replace(/([A-Z])/g, ' $1')}</label>
                    <input type="text" value={customMessages[key]} onChange={(e) => setCustomMessages({ ...customMessages, [key]: e.target.value })} className="input bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-white" placeholder="Default Protocol Message" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-premium p-8 space-y-6">
                <SectionHeader icon={UserCircleIcon} title="Identity Profile" />
                <div className="space-y-6">
                  <div className="input-group"><label className="label">Email Designation</label><input type="text" value={user?.email || ''} className="input opacity-50" readOnly /></div>
                  <div className="input-group">
                    <label className="label">Public Username</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="input font-bold" />
                    {!isValidUsername(newUsername) && <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-2">Invalid Format (3-30 chars, lowercase/numbers)</p>}
                  </div>
                  <button onClick={saveUsername} disabled={usernameSaving || !isValidUsername(newUsername)} className="btn btn-primary w-full py-4 text-xs font-black uppercase tracking-widest">{usernameSaving ? 'Syncing...' : 'Update Identity'}</button>
                </div>
              </div>
              <div className="card-premium p-8 space-y-6">
                <SectionHeader icon={KeyIcon} title="Security Credentials" />
                <div className="space-y-4">
                  <div className="input-group"><label className="label">Current Secret</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
                  <div className="input-group"><label className="label">New Secret</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
                  <div className="input-group"><label className="label">Confirm New Secret</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
                  <button className="btn btn-secondary w-full py-4 text-xs font-black uppercase tracking-widest">Update Credentials</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-premium p-8 space-y-6">
                <SectionHeader icon={ShieldCheckIcon} title="Active Shields" />
                <div className="space-y-4">
                  <SecurityFeature label="HMAC SHA256 Sync" desc="Full cryptographic signing of client requests." />
                  <SecurityFeature label="Replay Protection" desc="Timestamp & Nonce validation protocols active." />
                  <SecurityFeature label="Rate Limit Layer" desc="Dynamic traffic shaping and DDoS protection." />
                  <SecurityFeature label="HWID Entropy" desc="Device signature analysis and lock enforcement." />
                </div>
              </div>
              <div className="card-premium p-8 bg-primary-500/[0.03] border-primary-500/20">
                <SectionHeader icon={SignalIcon} title="System Integrity" />
                <div className="space-y-6 pt-4">
                  <p className="text-sm text-slate-400 leading-relaxed">Your application uses a multi-layered security approach. Every client interaction is verified against your master secret and checked for hardware integrity. In case of a secret leak, use the <span className="text-primary-400 font-bold">Rotate Secret</span> function immediately.</p>
                  <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400"><ArrowPathIcon className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">Auto-Sync Active</p>
                      <p className="text-[10px] text-slate-500 font-medium">Platform-wide security policies are updated in real-time.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400"><Icon className="w-5 h-5" /></div>
      <h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
    </div>
  )
}

function ToggleSetting({ title, desc, active, onClick, color = "bg-primary-500", disabled = false }: any) {
  return (
    <div className="flex items-center justify-between p-5 card-premium bg-white/[0.02] border-white/5 hover:border-white/10 transition-all">
      <div className="flex-1 mr-4">
        <p className="text-sm font-bold text-white tracking-tight">{title}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{desc}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${
          active ? color : 'bg-slate-700'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`}></div>
      </button>
    </div>
  )
}

function SignalEvent({ emoji, label, desc }: any) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
      <span className="text-xl shrink-0">{emoji}</span>
      <div>
        <p className="text-xs font-bold text-white uppercase tracking-widest">{label}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function SecurityFeature({ label, desc }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10">
      <div className="flex-1 mr-4">
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{label}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-1">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 text-emerald-500">
        <CheckIcon className="w-4 h-4" />
        <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
      </div>
    </div>
  )
}

function InformationCircleIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.835a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}
