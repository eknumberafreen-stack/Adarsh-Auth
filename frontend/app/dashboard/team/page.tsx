'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  XMarkIcon, 
  TrashIcon, 
  PencilSquareIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export default function TeamPage() {
  const { applications, selectedApp } = useAppStore()
  const { user } = useAuthStore()
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reseller')
  const [permissions, setPermissions] = useState<string[]>(['manage_licenses'])
  const [inviteAppIds, setInviteAppIds] = useState<string[]>([])
  const [isLifetime, setIsLifetime] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editRole, setEditRole] = useState('reseller')
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [editAppIds, setEditAppIds] = useState<string[]>([])
  const [originalAppIds, setOriginalAppIds] = useState<string[]>([])
  const [editIsLifetime, setEditIsLifetime] = useState(true)
  const [editExpiresAt, setEditExpiresAt] = useState('')

  const getDefaultExpiry = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  const toLocalISOString = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const isStrictValidDate = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const digits = dateStr.match(/\d+/g);
    if (!digits || digits.length < 3) return false;
    let y = parseInt(digits[0]), m = parseInt(digits[1]), day = parseInt(digits[2]);
    if (y < 1000 && parseInt(digits[2]) > 1000) {
      day = parseInt(digits[0]); m = parseInt(digits[1]); y = parseInt(digits[2]);
    }
    return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === day;
  }

  const formatToDDMMYYYY = (dateStr: string | null | undefined, fallback = 'Lifetime', includeTime = false) => {
    if (!dateStr) return fallback;
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    if (includeTime) {
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    }
    return `${day}-${month}-${year}`;
  }

  useEffect(() => {
    if (selectedApp?._id) loadApplication()
  }, [selectedApp?._id])

  const openAddModal = () => {
    setInviteAppIds([selectedApp?._id || ''])
    setEmail('')
    setRole('reseller')
    setPermissions(['manage_licenses'])
    setIsLifetime(true)
    setExpiresAt('')
    setShowAddModal(true)
  }

  const loadApplication = async () => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const res = await api.get(`/applications/${selectedApp._id}`)
      setApplication(res.data.application)
    } catch {
      toast.error('Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!email) return toast.error('Enter an email')
    if (inviteAppIds.length === 0) return toast.error('Select at least one application')
    
    const expiryPayload = isLifetime ? null : expiresAt
    if (!isLifetime) {
      if (!expiresAt) return toast.error('Please specify an expiration date')
      if (!isStrictValidDate(expiresAt)) return toast.error('Invalid expiration date')
      if (new Date(expiresAt) <= new Date()) return toast.error('Expiration date must be in the future')
    }

    setSaving(true)
    try {
      const promises = inviteAppIds.map(appId => 
        api.post(`/applications/${appId}/team`, { email, role, permissions, expiresAt: expiryPayload })
      )
      await Promise.all(promises)
      
      toast.success(`Team member invited to ${inviteAppIds.length} application(s)!`)
      setShowAddModal(false)
      loadApplication()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add team member')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = async (member: any) => {
    setEditTarget(member)
    setEditRole(member.role)
    setEditPermissions([...member.permissions])
    setEditIsLifetime(!member.expiresAt)
    setEditExpiresAt(member.expiresAt ? toLocalISOString(member.expiresAt) : '')
    setShowEditModal(true)

    try {
      const res = await api.get('/applications')
      const allApps = res.data.applications
      const memberAppIds = allApps
        .filter((app: any) => app.team?.some((m: any) => m.userId?.toString() === member.userId?.toString()))
        .map((app: any) => app._id)
      setEditAppIds(memberAppIds)
      setOriginalAppIds(memberAppIds)
    } catch {
      setEditAppIds([selectedApp?._id || ''])
      setOriginalAppIds([selectedApp?._id || ''])
    }
  }

  const handleEditMember = async () => {
    if (!selectedApp?._id) return

    const expiryPayload = editIsLifetime ? null : editExpiresAt
    if (!editIsLifetime) {
      if (!editExpiresAt) return toast.error('Please specify an expiration date')
      if (!isStrictValidDate(editExpiresAt)) return toast.error('Invalid expiration date')
      if (new Date(editExpiresAt) <= new Date()) return toast.error('Expiration date must be in the future')
    }

    setSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}/team/${editTarget.userId}`, {
        role: editRole,
        permissions: editPermissions,
        expiresAt: expiryPayload
      })

      const appsToAdd = editAppIds.filter(id => !originalAppIds.includes(id))
      for (const appId of appsToAdd) {
        try {
          await api.post(`/applications/${appId}/team`, {
            email: editTarget.userEmail,
            role: editRole,
            permissions: editPermissions,
            expiresAt: expiryPayload
          })
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Failed to add to an app')
        }
      }

      const appsToRemove = originalAppIds.filter(id => !editAppIds.includes(id))
      for (const appId of appsToRemove) {
        try {
          await api.delete(`/applications/${appId}/team/${editTarget.userId}`)
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Failed to remove from an app')
        }
      }

      toast.success('Member updated!')
      setShowEditModal(false)
      loadApplication()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedApp?._id) return
    if (!confirm('Are you sure you want to remove this member and all their access to your applications?')) return
    try {
      await api.delete(`/applications/${selectedApp._id}/team/${userId}?all=true`)
      toast.success('Member removed and all access revoked')
      loadApplication()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to remove member')
    }
  }

  const togglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  const toggleEditPermission = (perm: string) => {
    setEditPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  const toggleEditApp = (appId: string) => {
    setEditAppIds(prev => prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId])
  }

  const isOwner = application?.userId === user?.id

  const PermissionCheckboxes = ({ perms, toggle, currentRole }: { perms: string[], toggle: (p: string) => void, currentRole: string }) => (
    <div className="space-y-2.5 bg-black/40 p-4 rounded-2xl border border-white/[0.05] shadow-inner">
      <label className="flex items-center gap-3 cursor-pointer group select-none">
        <input type="checkbox" checked={perms.includes('manage_licenses')} onChange={() => toggle('manage_licenses')} className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Manage License Keys</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer group select-none">
        <input type="checkbox" checked={perms.includes('manage_users')} onChange={() => toggle('manage_users')} className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Manage Users & Sessions</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer group select-none">
        <input type="checkbox" checked={perms.includes('view_logs')} onChange={() => toggle('view_logs')} className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Inspect Logs & Metrics</span>
      </label>
      {currentRole === 'manager' && (
        <label className="flex items-center gap-3 cursor-pointer group select-none">
          <input type="checkbox" checked={perms.includes('manage_settings')} onChange={() => toggle('manage_settings')} className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
          <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Modify Workspace Settings</span>
        </label>
      )}
    </div>
  )

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return <span className="text-emerald-400 font-black uppercase tracking-wider text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Lifetime</span>
    const d = new Date(expiresAt)
    if (d < new Date()) {
      return <span className="text-rose-400 font-black uppercase tracking-wider text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">Expired</span>
    }
    return <span className="text-slate-300 font-bold text-xs">{formatToDDMMYYYY(expiresAt, 'Lifetime', false)}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Team Management</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Delegate operations access, invite resellers, and audit permissions</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn btn-primary flex items-center gap-2 py-2.5"
          disabled={!selectedApp?._id || !isOwner}
        >
          <PlusIcon className="w-4.5 h-4.5" /> Invite Team Member
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center">
          <UserGroupIcon className="mx-auto h-11 w-11 text-slate-600" />
          <p className="mt-4 text-sm font-bold text-white">Create an application workspace first</p>
          <p className="mt-2 text-xs text-slate-500 font-semibold max-w-xs mx-auto">You must have an active application register to assign team roles.</p>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : !application ? (
            <div className="rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-12 text-center text-sm font-bold text-slate-500">
              Could not retrieve workspace information.
            </div>
          ) : (
            <div className="space-y-6">
              {!isOwner && (
                <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] text-indigo-300 text-xs font-bold leading-relaxed shadow-lg">
                  ⚡ Viewing as Team Member (Role: <span className="text-white uppercase font-black tracking-wider text-[10px]">{application.team?.find((m: any) => m.userId === user?.id)?.role}</span>). Invites and revocations require Workspace Owner clearance.
                </div>
              )}

              {application.team?.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center">
                  <UserGroupIcon className="mx-auto h-11 w-11 text-slate-600 animate-pulse" />
                  <p className="mt-4 text-sm font-bold text-white">No Team Members</p>
                  <p className="mt-2 text-xs text-slate-500 font-semibold max-w-xs mx-auto">Invite moderators, managers, or resellers to join this workspace.</p>
                </div>
              ) : (
                <div className="card overflow-hidden p-0 shadow-2xl">
                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full text-sm table-modern text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05] bg-black/10">
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Member Identity</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Role Badge</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Authorizations</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Granted By</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expiry Time</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Added Date</th>
                          <th className="px-5 py-4 text-right text-slate-400 font-bold uppercase tracking-wider text-[10px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {application.team?.map((member: any) => (
                          <tr key={member.userId} className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="text-xs text-white font-black">{member.userEmail || member.userId}</p>
                                {member.userName && <p className="text-[10px] text-slate-500 font-bold mt-0.5">@{member.userName}</p>}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${
                                member.role === 'manager' 
                                  ? 'bg-purple-500/10 border-purple-500/25 text-purple-300' 
                                  : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {member.permissions.map((p: string) => (
                                  <span key={p} className="px-1.5 py-0.5 bg-white/[0.03] text-slate-400 border border-white/[0.05] rounded text-[9px] font-bold uppercase tracking-wider">{p.replace('_', ' ')}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.05] text-slate-400 text-[10px] font-bold">
                                {member.addedByName || 'Workspace Owner'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {formatExpiry(member.expiresAt)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs font-semibold">
                              {new Date(member.addedAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {isOwner && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModal(member)}
                                    className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-indigo-400 hover:text-white hover:bg-indigo-500/10 transition-colors inline-flex"
                                    title="Edit settings"
                                  >
                                    <PencilSquareIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-rose-400 hover:text-white hover:bg-rose-500/10 transition-colors inline-flex"
                                    title="Revoke member"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Invite Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Invite Collaborator</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Workspace invitation</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-slate-400 hover:text-white transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Registered Email Address <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. reseller@adarshauth.com"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Workspace Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full">
                  <option className="bg-[#0b0b14]" value="reseller">Reseller (Create / Revoke licenses)</option>
                  <option className="bg-[#0b0b14]" value="manager">Manager (Admin operational control)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2.5">Specific permissions</label>
                <PermissionCheckboxes perms={permissions} toggle={togglePermission} currentRole={role} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Access Duration</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLifetime}
                      onChange={(e) => {
                        setIsLifetime(e.target.checked)
                        if (e.target.checked) setExpiresAt('')
                        else setExpiresAt(getDefaultExpiry())
                      }}
                      className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-bold text-slate-400">Unlimited Access</span>
                  </label>
                </div>
                {!isLifetime && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="input w-full text-xs font-bold text-white bg-[#0f0f18]"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2.5">Assign Workspace Scope</label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                  {applications.map((app: any) => (
                    <label key={app._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        checked={inviteAppIds.includes(app._id)}
                        onChange={(e) => {
                          if (e.target.checked) setInviteAppIds([...inviteAppIds, app._id])
                          else setInviteAppIds(inviteAppIds.filter(id => id !== app._id))
                        }}
                        className="w-4 h-4 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddMember} disabled={!email} className="btn btn-primary flex-1 disabled:opacity-50">Send Invitation</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Configure Collaborator</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide truncate max-w-xs">{editTarget.userEmail || editTarget.userId}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-slate-400 hover:text-white transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">Workspace Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input w-full">
                  <option className="bg-[#0b0b14]" value="reseller">Reseller (Create / Revoke licenses)</option>
                  <option className="bg-[#0b0b14]" value="manager">Manager (Admin operational control)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2.5">Specific permissions</label>
                <PermissionCheckboxes perms={editPermissions} toggle={toggleEditPermission} currentRole={editRole} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Access Duration</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsLifetime}
                      onChange={(e) => {
                        setEditIsLifetime(e.target.checked)
                        if (e.target.checked) setEditExpiresAt('')
                        else setEditExpiresAt(getDefaultExpiry())
                      }}
                      className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-bold text-slate-400">Unlimited Access</span>
                  </label>
                </div>
                {!editIsLifetime && (
                  <input
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="input w-full text-xs font-bold text-white bg-[#0f0f18]"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2.5">Workspace Scope</label>
                <div className="space-y-2 bg-black/40 p-3 rounded-2xl border border-white/[0.05] max-h-36 overflow-y-auto custom-scrollbar">
                  {applications.map((app: any) => (
                    <label key={app._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer select-none group">
                      <input 
                        type="checkbox" 
                        checked={editAppIds.includes(app._id)} 
                        onChange={() => toggleEditApp(app._id)} 
                        className="w-4 h-4 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0" 
                      />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{app.name}</span>
                      {originalAppIds.includes(app._id) && <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider ml-auto bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">current</span>}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditMember} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Saving...' : 'Update Collaborator'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
