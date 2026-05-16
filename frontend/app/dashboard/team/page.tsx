'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

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

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editRole, setEditRole] = useState('reseller')
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [editAppIds, setEditAppIds] = useState<string[]>([])
  const [originalAppIds, setOriginalAppIds] = useState<string[]>([])

  const isOwner = user?.id === application?.ownerId

  useEffect(() => {
    if (selectedApp?._id) loadApplication()
  }, [selectedApp?._id])

  const openAddModal = () => {
    setInviteAppIds([selectedApp?._id || ''])
    setEmail('')
    setRole('reseller')
    setPermissions(['manage_licenses'])
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

  // ── Add Member ──────────────────────────────────────────────────────────────
  const handleAddMember = async () => {
    if (!email) return toast.error('Enter an email')
    if (inviteAppIds.length === 0) return toast.error('Select at least one application')
    setSaving(true)
    try {
      const promises = inviteAppIds.map(appId => 
        api.post(`/applications/${appId}/team`, { email, role, permissions })
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

  // ── Edit Member ─────────────────────────────────────────────────────────────
  const openEditModal = async (member: any) => {
    setEditTarget(member)
    setEditRole(member.role)
    setEditPermissions([...member.permissions])
    setShowEditModal(true)

    // Fetch all apps to see which ones this member is already assigned to
    try {
      const res = await api.get('/applications')
      const allApps = res.data.applications
      const memberAppIds = allApps
        .filter((app: any) => app.team?.some((m: any) => m.userId?.toString() === member.userId?.toString()))
        .map((app: any) => app._id)
      setEditAppIds(memberAppIds)
      setOriginalAppIds(memberAppIds)
    } catch {
      // Fallback: at minimum they're on the current app
      setEditAppIds([selectedApp?._id || ''])
      setOriginalAppIds([selectedApp?._id || ''])
    }
  }

  const handleEditMember = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      // 1. Update on all apps they ARE on
      const updatePromises = editAppIds.map(appId => 
        api.patch(`/applications/${appId}/team/${editTarget.userId}`, { 
          role: editRole, 
          permissions: editPermissions 
        })
      )
      
      // 2. Remove from apps they were on but aren't anymore
      const removedAppIds = originalAppIds.filter(id => !editAppIds.includes(id))
      const removePromises = removedAppIds.map(appId =>
        api.delete(`/applications/${appId}/team/${editTarget.userId}`)
      )

      await Promise.all([...updatePromises, ...removePromises])
      
      toast.success('Team member updated across selected applications!')
      setShowEditModal(false)
      loadApplication()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update team member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    try {
      await api.delete(`/applications/${selectedApp?._id}/team/${userId}`)
      toast.success('Team member removed')
      loadApplication()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const togglePermission = (p: string) => {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleEditPermission = (p: string) => {
    setEditPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleAppSelection = (id: string, isEdit = false) => {
    if (isEdit) {
      setEditAppIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setInviteAppIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  const availablePermissions = [
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'manage_licenses', label: 'Manage Licenses' },
    { id: 'manage_app', label: 'Manage Application' },
    { id: 'view_stats', label: 'View Stats' }
  ]

  if (!selectedApp) {
    return <div className="text-center py-12 text-gray-400">Please select an application first.</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Team Management</h1>
          <p className="text-sm text-gray-400">Manage who has access to your application</p>
        </div>
        {isOwner && (
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : !application ? (
        <div className="text-center py-12 text-gray-400">Failed to load application data</div>
      ) : (
        <div className="space-y-6">
          {/* Main Table */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-2xl blur-xl" />
            <div className="relative">
              {!application.team || application.team.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 border border-white/10 bg-slate-950/50">
                  No team members yet. Invite someone to help manage your application!
                </div>
              ) : (
                <div className="card overflow-visible p-0 border border-white/10 bg-slate-950/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-4 py-4 text-gray-400 font-medium">Member</th>
                        <th className="text-left px-4 py-4 text-gray-400 font-medium">Role</th>
                        <th className="text-left px-4 py-4 text-gray-400 font-medium">Permissions</th>
                        {isOwner && (
                          <th className="text-left px-4 py-4 text-gray-400 font-medium">Added By</th>
                        )}
                        <th className="text-left px-4 py-4 text-gray-400 font-medium">Added</th>
                        <th className="px-4 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {application.team?.map((member: any) => (
                        <tr key={member.userId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-white font-medium">{member.userEmail || member.userId}</p>
                              {member.userName && <p className="text-[11px] text-gray-500">{member.userName}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              member.role === 'manager' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            <div className="flex flex-wrap gap-1">
                              {member.permissions.map((p: string) => (
                                <span key={p} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] uppercase tracking-wider">{p.replace('_', ' ')}</span>
                              ))}
                            </div>
                          </td>
                          {isOwner && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-300 text-[11px] border border-white/10">
                                {member.addedByName || 'Owner'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(member.addedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOwner && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditModal(member)}
                                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                  title="Edit Permissions"
                                >
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Remove Member"
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ────────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Member Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assign Applications</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/5">
                  {applications.map(app => (
                    <label key={app._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${inviteAppIds.includes(app._id) ? 'bg-primary-500/20 border-primary-500/50' : 'hover:bg-white/5 border-transparent'} border`}>
                      <input type="checkbox" checked={inviteAppIds.includes(app._id)} onChange={() => toggleAppSelection(app._id)} className="w-4 h-4 accent-primary-500" />
                      <span className="text-xs text-white font-medium truncate">{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full">
                    <option value="reseller">Reseller</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Permissions</label>
                  <div className="space-y-2 pt-1">
                    {availablePermissions.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={permissions.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                          className="w-4 h-4 accent-primary-500"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddMember} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Sending Invites...' : 'Send Invites'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Team Member</h2>
                <p className="text-xs text-gray-400 mt-1">{editTarget.userEmail}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Applications</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/5">
                  {applications.map(app => (
                    <label key={app._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${editAppIds.includes(app._id) ? 'bg-primary-500/20 border-primary-500/50' : 'hover:bg-white/5 border-transparent'} border`}>
                      <input type="checkbox" checked={editAppIds.includes(app._id)} onChange={() => toggleAppSelection(app._id, true)} className="w-4 h-4 accent-primary-500" />
                      <span className="text-xs text-white font-medium truncate">{app.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-2 italic">Unchecking an application will remove the member from that application.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Role</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input w-full">
                    <option value="reseller">Reseller</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Permissions</label>
                  <div className="space-y-2 pt-1">
                    {availablePermissions.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={editPermissions.includes(p.id)}
                          onChange={() => toggleEditPermission(p.id)}
                          className="w-4 h-4 accent-primary-500"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditMember} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
