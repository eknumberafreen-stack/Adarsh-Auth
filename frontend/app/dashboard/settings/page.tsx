'use client'

import { useEffect, useState, useCallback } from 'react'
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
  ChatBubbleBottomCenterTextIcon,
  CpuChipIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

type OffsetsTab = 'initbase' | 'offsets' | 'bones'
type OffsetCategory = 'offsets' | 'weaponOffsets' | 'cameraOffsets' | 'silentAimOffsets' | 'espOffsets' | 'entityOffsets'

const CATEGORY_LABELS: Record<OffsetCategory, string> = {
  offsets: 'General Offsets',
  weaponOffsets: 'Weapon Offsets',
  cameraOffsets: 'Camera Offsets',
  silentAimOffsets: 'SilentAim Offsets',
  espOffsets: 'ESP Offsets',
  entityOffsets: 'Entity Offsets',
}

interface OffsetEntry { _id: string; name: string; value: string; description?: string }
interface BoneEntry { _id: string; name: string; value: string }
interface RV {
  initBase: string
  offsets: OffsetEntry[]; weaponOffsets: OffsetEntry[]; cameraOffsets: OffsetEntry[]
  silentAimOffsets: OffsetEntry[]; espOffsets: OffsetEntry[]; entityOffsets: OffsetEntry[]
  bones: BoneEntry[]; updatedAt?: string
}

const DEFAULT_BONES = ['Head','Neck','Chest','Pelvis','Root','LeftShoulder','LeftElbow','LeftWrist','RightShoulder','RightElbow','RightWrist','LeftHip','LeftKnee','LeftAnkle','RightHip','RightKnee','RightAnkle']

function OffsetRow({ entry, onSave, onDelete }: { entry: OffsetEntry; onSave:(id:string,n:string,v:string,d:string)=>Promise<void>; onDelete:(id:string)=>Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const [desc, setDesc] = useState(entry.description || '')
  const save = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    await onSave(entry._id, name, value, desc); setEditing(false)
  }
  if (editing) return (
    <tr className="border-b border-white/5 bg-indigo-500/5">
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={name} onChange={e=>setName(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e=>setValue(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={desc} onChange={e=>setDesc(e.target.value)} /></td>
      <td className="px-4 py-2 flex gap-2">
        <button onClick={save} className="btn btn-primary px-2 py-1 text-xs"><CheckIcon className="h-3.5 w-3.5" /></button>
        <button onClick={()=>setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs"><XMarkIcon className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  )
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-emerald-300">{entry.value}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{entry.description || '-'}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={()=>{navigator.clipboard.writeText(entry.name+' = '+entry.value);toast.success('Copied!')}} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><DocumentDuplicateIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><PencilIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300"><TrashIcon className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

function BoneRow({ entry, onSave, onDelete }: { entry: BoneEntry; onSave:(id:string,n:string,v:string)=>Promise<void>; onDelete:(id:string)=>Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const save = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    await onSave(entry._id, name, value); setEditing(false)
  }
  if (editing) return (
    <tr className="border-b border-white/5 bg-violet-500/5">
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={name} onChange={e=>setName(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e=>setValue(e.target.value)} /></td>
      <td className="px-4 py-2 flex gap-2">
        <button onClick={save} className="btn btn-primary px-2 py-1 text-xs"><CheckIcon className="h-3.5 w-3.5" /></button>
        <button onClick={()=>setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs"><XMarkIcon className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  )
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-violet-300">{entry.value}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><PencilIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300"><TrashIcon className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

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

  // Offsets & Bones tab state
  const [offsetsTab, setOffsetsTab] = useState<OffsetsTab>('initbase')
  const [rv, setRv] = useState<RV | null>(null)
  const [offsetsLoading, setOffsetsLoading] = useState(false)
  const [initBase, setInitBase] = useState('')
  const [savingIB, setSavingIB] = useState(false)
  const [activeCat, setActiveCat] = useState<OffsetCategory>('offsets')
  const [addName, setAddName] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addBoneName, setAddBoneName] = useState('')
  const [addBoneValue, setAddBoneValue] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const loadOffsets = useCallback(async () => {
    if (!selectedApp?._id) return
    setOffsetsLoading(true)
    try {
      const res = await api.get('/runtime/' + selectedApp._id)
      setRv(res.data.data)
      setInitBase(res.data.data.initBase || '')
    } catch { 
      // silent fail
    } finally { 
      setOffsetsLoading(false) 
    }
  }, [selectedApp?._id])

  useEffect(() => {
    if (activeTab === 'offsets') {
      loadOffsets()
    }
  }, [activeTab, loadOffsets])

  const saveInitBase = async () => {
    if (!selectedApp?._id) return
    setSavingIB(true)
    try { 
      await api.patch('/runtime/' + selectedApp._id + '/initbase', { value: initBase })
      toast.success('InitBase saved')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    } finally { 
      setSavingIB(false) 
    }
  }

  const addOffset = async () => {
    if (!selectedApp?._id || !addName.trim() || !addValue.trim()) return toast.error('Name and value required')
    try { 
      await api.patch('/runtime/' + selectedApp._id + '/offsets/' + activeCat, { name: addName, value: addValue, description: addDesc })
      toast.success('Added')
      setAddName('')
      setAddValue('')
      setAddDesc('')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const saveOffset = async (id: string, name: string, value: string, description: string) => {
    if (!selectedApp?._id) return
    try { 
      await api.patch('/runtime/' + selectedApp._id + '/offsets/' + activeCat, { offsetId: id, name, value, description })
      toast.success('Saved')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const deleteOffset = async (id: string) => {
    if (!selectedApp?._id) return
    try { 
      await api.delete('/runtime/' + selectedApp._id + '/offsets/' + activeCat + '/' + id)
      toast.success('Deleted')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const addBone = async () => {
    if (!selectedApp?._id || !addBoneName.trim() || !addBoneValue.trim()) return toast.error('Name and value required')
    try { 
      await api.patch('/runtime/' + selectedApp._id + '/bones', { name: addBoneName, value: addBoneValue })
      toast.success('Added')
      setAddBoneName('')
      setAddBoneValue('')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const saveBone = async (id: string, name: string, value: string) => {
    if (!selectedApp?._id) return
    try { 
      await api.patch('/runtime/' + selectedApp._id + '/bones', { boneId: id, name, value })
      toast.success('Saved')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const deleteBone = async (id: string) => {
    if (!selectedApp?._id) return
    try { 
      await api.delete('/runtime/' + selectedApp._id + '/bones/' + id)
      toast.success('Deleted')
      loadOffsets() 
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Failed') 
    }
  }

  const resetAllOffsets = async () => {
    if (!selectedApp?._id) return
    try { 
      await api.delete('/runtime/' + selectedApp._id + '/reset')
      toast.success('Reset')
      setShowReset(false)
      loadOffsets() 
    } catch { 
      toast.error('Failed to reset') 
    }
  }

  const handleImport = async () => {
    if (!selectedApp?._id || !importText.trim()) return toast.error('Paste code first')
    setIsImporting(true)
    try {
      // 1. Parse InitBase
      const ibMatch = importText.match(/InitBase\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)/)
      if (ibMatch) {
        await api.patch('/runtime/' + selectedApp._id + '/initbase', { value: ibMatch[1] })
      }

      // 2. Parse Offsets
      const offsetRegex = /uint\s+([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)/g
      let match
      while ((match = offsetRegex.exec(importText)) !== null) {
        const name = match[1]
        const value = match[2]
        if (name === 'InitBase') continue
        await api.patch('/runtime/' + selectedApp._id + '/offsets/offsets', { name, value })
      }

      // 3. Parse Bones
      const boneRegex = /([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)\s*,/g
      while ((match = boneRegex.exec(importText)) !== null) {
        const name = match[1]
        const value = match[2]
        await api.patch('/runtime/' + selectedApp._id + '/bones', { name, value })
      }

      toast.success('Import completed')
      setShowImport(false)
      setImportText('')
      loadOffsets()
    } catch (e: any) {
      toast.error('Import failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setIsImporting(false)
    }
  }

  const buildJson = () => {
    if (!rv) return {}
    const p: Record<string, any> = {}
    if (rv.initBase) p.InitBase = rv.initBase
    const flat = (arr: OffsetEntry[]) => arr.forEach(o => { p[o.name] = o.value })
    flat(rv.offsets); flat(rv.weaponOffsets); flat(rv.cameraOffsets)
    flat(rv.silentAimOffsets); flat(rv.espOffsets); flat(rv.entityOffsets)
    if (rv.bones.length > 0) { p.bones = {}; rv.bones.forEach(b => { p.bones[b.name] = b.value }) }
    return p
  }

  const currentEntries: OffsetEntry[] = rv?.[activeCat] ?? []

  const OFFSETS_TABS: { id: OffsetsTab; label: string }[] = [
    { id: 'initbase', label: 'InitBase' },
    { id: 'offsets',  label: 'Offsets'  },
    { id: 'bones',    label: 'Bones'    },
  ]

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
    { id: 'offsets',    label: 'Offsets & Bones', icon: CpuChipIcon },
    { id: 'account',    label: 'Account',    icon: UserCircleIcon },
    { id: 'security',   label: 'Security',   icon: ShieldCheckIcon },
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
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                disabled={!hasManageSettings}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                {hasManageSettings && (
                  <button
                    onClick={regenerateSecret}
                    className="w-full px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <KeyIcon className="w-4 h-4" />
                    Regenerate App Secret
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={deleteApp}
                    className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Application
                  </button>
                )}
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
                  {hasManageSettings && (
                    <button
                      onClick={() => setEditingVersion(true)}
                      className="p-2 hover:bg-dark-hover rounded-lg text-gray-400"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Auto-Update Link */}
            <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Auto-Update Download Link</p>
                {hasManageSettings && (
                  <button onClick={saveVersion} className="text-[10px] text-primary-400 hover:underline">Save Link</button>
                )}
              </div>
              <input
                type="text"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                readOnly={!hasManageSettings}
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

            {hasManageSettings ? (
              <>
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
              </>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-white/10 text-center text-gray-400 text-sm">
                🔒 Webhook URL is hidden. Requires <strong>Edit Application Settings</strong> permission.
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

      {/* Offsets & Bones Tab */}
      {activeTab === 'offsets' && (
        <div className="space-y-6">
          {!selectedApp?._id ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CpuChipIcon className="h-16 w-16 text-slate-600 mb-4 animate-pulse" />
              <h2 className="text-xl font-bold text-white mb-2">No Application Selected</h2>
              <p className="text-slate-400 text-sm">Select an application from the header dropdown to manage its runtime values.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-dark-card border border-dark-border rounded-2xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CpuChipIcon className="w-5 h-5 text-primary-400" />
                    Offsets, Bones &amp; InitBase
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Manage runtime memory values for <span className="text-primary-300 font-semibold">{selectedApp?.name}</span>. Clients fetch these dynamically.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowImport(true)} className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
                    <DocumentDuplicateIcon className="h-3.5 w-3.5" /> Import Source
                  </button>
                  <button onClick={() => setShowJson(!showJson)} className="btn btn-secondary text-xs px-3 py-2">
                    {showJson ? 'Hide' : 'Preview'} JSON
                  </button>
                  <button onClick={loadOffsets} className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1">
                    <ArrowPathIcon className="h-3.5 w-3.5" /> Refresh
                  </button>
                  <button onClick={() => setShowReset(true)} className="btn btn-danger text-xs px-3 py-2 flex items-center gap-1">
                    <TrashIcon className="h-3.5 w-3.5" /> Reset All
                  </button>
                </div>
              </section>

              {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
                  <div className="modal-card w-full max-w-2xl bg-[#12121a] border border-dark-border p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">Import C# Source</h3>
                      <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      Paste your <code className="text-indigo-300">Offsets.cs</code> or <code className="text-indigo-300">Bones.cs</code> code below. 
                      We'll automatically extract names and hex values.
                    </p>
                    <textarea 
                      className="input w-full h-64 font-mono text-xs mb-6 resize-none"
                      placeholder="internal static uint LocalPlayer = 0x94; ..."
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowImport(false)} className="btn btn-secondary flex-1">Cancel</button>
                      <button onClick={handleImport} disabled={isImporting} className="btn btn-primary flex-1">
                        {isImporting ? 'Importing...' : 'Start Import'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showJson && rv && (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Client JSON Preview</h3>
                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(buildJson(), null, 2)); toast.success('Copied!') }} className="btn btn-secondary px-3 py-1.5 text-xs flex items-center gap-1">
                      <DocumentDuplicateIcon className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-dark-border bg-black/30 p-4 text-xs font-mono text-emerald-300 leading-relaxed">
                    {JSON.stringify(buildJson(), null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-1 rounded-xl border border-dark-border bg-white/[0.02] p-1 w-fit">
                {OFFSETS_TABS.map(t => (
                  <button key={t.id} onClick={() => setOffsetsTab(t.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${offsetsTab === t.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/30' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {offsetsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
                </div>
              ) : (
                <>
                  {offsetsTab === 'initbase' && (
                    <div className="card space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                          <CpuChipIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Base Address</p>
                          <h3 className="text-md font-bold text-white">InitBase</h3>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">The base memory address your client uses to resolve all other offsets at runtime.</p>
                      <div className="flex gap-3">
                        <input className="input font-mono flex-1 text-sm" value={initBase} onChange={e => setInitBase(e.target.value)} placeholder="e.g. 0x9EC1C48" />
                        <button onClick={saveInitBase} disabled={savingIB} className="btn btn-primary px-8 text-sm">
                          {savingIB ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      {rv?.updatedAt && <p className="text-[10px] text-slate-500">Last updated: {new Date(rv.updatedAt).toLocaleString()}</p>}
                      <div className="rounded-xl border border-dark-border bg-white/[0.01] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Value</p>
                        <p className="font-mono text-md text-sky-300">{rv?.initBase || <span className="text-slate-600 italic">Not set</span>}</p>
                      </div>
                    </div>
                  )}

                  {offsetsTab === 'offsets' && (
                    <div className="space-y-4">
                      <div className="card">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Offset Category</p>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(CATEGORY_LABELS) as OffsetCategory[]).map(cat => (
                            <button key={cat} onClick={() => setActiveCat(cat)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeCat === cat ? 'border-primary-400/40 bg-primary-400/10 text-primary-200' : 'border-dark-border bg-dark-bg text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                              {CATEGORY_LABELS[cat]}
                              <span className="ml-1 opacity-60">({(rv?.[cat] ?? []).length})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="card">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-slate-500 font-mono">{activeCat}</p>
                            <h3 className="text-md font-bold text-white">{CATEGORY_LABELS[activeCat]}</h3>
                          </div>
                          <span className="badge border-dark-border bg-dark-bg text-slate-400 text-xs px-2 py-0.5 rounded-lg">{currentEntries.length} entries</span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-dark-border">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-dark-border bg-dark-bg">
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Name</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Value</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentEntries.map(entry => (
                                <OffsetRow key={entry._id} entry={entry} onSave={saveOffset} onDelete={deleteOffset} />
                              ))}
                              <tr className="border-b border-dark-border bg-white/[0.01]">
                                <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="OffsetName" /></td>
                                <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={addValue} onChange={e=>setAddValue(e.target.value)} placeholder="0x0000" /></td>
                                <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={addDesc} onChange={e=>setAddDesc(e.target.value)} placeholder="Description (optional)" /></td>
                                <td className="px-4 py-2">
                                  <button onClick={addOffset} className="btn btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                                    <PlusIcon className="h-3.5 w-3.5" /> Add
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {offsetsTab === 'bones' && (
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-slate-500">Skeleton</p>
                          <h3 className="text-md font-bold text-white">Bone Structure</h3>
                        </div>
                        <span className="badge border-dark-border bg-dark-bg text-slate-400 text-xs px-2 py-0.5 rounded-lg">{rv?.bones.length ?? 0} bones</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-dark-border">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-dark-border bg-dark-bg">
                              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/3">Bone Name</th>
                              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/3">Value</th>
                              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rv?.bones ?? []).map(bone => (
                              <BoneRow key={bone._id} entry={bone} onSave={saveBone} onDelete={deleteBone} />
                            ))}
                            <tr className="border-b border-dark-border bg-white/[0.01]">
                              <td className="px-4 py-2">
                                <input className="input py-1.5 text-xs w-full" value={addBoneName} onChange={e=>setAddBoneName(e.target.value)} placeholder="BoneName (e.g. Head)" list="bone-list" />
                                <datalist id="bone-list">{DEFAULT_BONES.map(b=><option key={b} value={b}/>)}</datalist>
                              </td>
                              <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={addBoneValue} onChange={e=>setAddBoneValue(e.target.value)} placeholder="0x0000" /></td>
                              <td className="px-4 py-2">
                                <button onClick={addBone} className="btn btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                                  <PlusIcon className="h-3.5 w-3.5" /> Add
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
                  <div className="modal-card w-full max-w-sm text-center bg-[#12121a] border border-dark-border p-6 rounded-2xl">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-3xl">🗑️</div>
                    <h3 className="text-xl font-bold text-white mb-2">Reset All Values?</h3>
                    <p className="text-sm text-slate-400 mb-6">
                      Permanently deletes all InitBase, offsets, and bones for <span className="text-white font-semibold">{selectedApp?.name}</span>.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowReset(false)} className="btn btn-secondary flex-1">Cancel</button>
                      <button onClick={resetAllOffsets} className="btn btn-danger flex-1">Reset All</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
              {hasManageSettings && (
                <button
                  onClick={saveMessages}
                  disabled={messagesSaving}
                  className="btn btn-primary"
                >
                  {messagesSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
              )}
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
                { id: 'noSubscription', label: 'No Active Subscription', desc: 'Shown when user subscription has ended or no plan is found' },
                { id: 'accountPaused', label: 'Subscription Paused', desc: 'Shown when a specific user is paused by staff' },
                { id: 'versionMismatch', label: 'Version Mismatch', desc: 'Shown when the loader version is outdated' },
              ].map((field) => (
                <div key={field.id} className="p-4 bg-dark-bg rounded-xl border border-dark-border space-y-2">
                  <label className="block text-sm font-medium text-gray-300">{field.label}</label>
                  <input
                    type="text"
                    value={customMessages[field.id] || ''}
                    onChange={(e) => setCustomMessages({ ...customMessages, [field.id]: e.target.value })}
                    readOnly={!hasManageSettings}
                    className="input text-sm"
                    placeholder={hasManageSettings ? `Enter custom message for ${field.label}...` : "No permission to edit"}
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
