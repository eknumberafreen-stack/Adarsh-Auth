'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

export default function TeamPage() {
  const { applications, selectedApp } = useAppStore()
  const { user } = useAuthStore()
  const [selectedAppId, setSelectedAppId] = useState('')
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

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      const defaultId = selectedApp?._id || applications[0]._id
      setSelectedAppId(defaultId)
    }
  }, [applications, selectedApp, selectedAppId])

  useEffect(() => {
    if (selectedAppId) loadApplication()
  }, [selectedAppId])

  const openAddModal = () => {
    setInviteAppIds([selectedAppId])
    setEmail('')
    setRole('reseller')
    setPermissions(['manage_licenses'])
    setShowAddModal(true)
  }

  const loadApplication = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/applications/${selectedAppId}`)
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
      setEditAppIds([selectedAppId])
      setOriginalAppIds([selectedAppId])
    }
  }

  const handleEditMember = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      // 1. Update role/permissions on current app
      await api.patch(`/applications/${selectedAppId}/team/${editTarget.userId}`, {
        role: editRole,
        permissions: editPermissions
      })

      // 2. Add to newly checked apps
      const appsToAdd = editAppIds.filter(id => !originalAppIds.includes(id))
      for (const appId of appsToAdd) {
        try {
          await api.post(`/applications/${appId}/team`, {
            email: editTarget.userEmail,
            role: editRole,
            permissions: editPermissions
          })
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Failed to add to an app')
        }
      }

      // 3. Remove from unchecked apps
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

  // ── Remove Member ───────────────────────────────────────────────────────────
  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      await api.delete(`/applications/${selectedAppId}/team/${userId}`)
      toast.success('Member removed')
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

  // ── Permission Checkboxes (reusable) ────────────────────────────────────────
  const PermissionCheckboxes = ({ perms, toggle, currentRole }: { perms: string[], toggle: (p: string) => void, currentRole: string }) => (
    <div className="space-y-2.5 bg-black/20 p-3 rounded-xl border border-white/5">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={perms.includes('manage_licenses')} onChange={() => toggle('manage_licenses')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
        <span className="text-sm text-gray-300">Manage Licenses</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={perms.includes('manage_users')} onChange={() => toggle('manage_users')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
        <span className="text-sm text-gray-300">Manage Users & Sessions</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={perms.includes('view_logs')} onChange={() => toggle('view_logs')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
        <span className="text-sm text-gray-300">View Logs & Stats</span>
      </label>
      {currentRole === 'manager' && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={perms.includes('manage_settings')} onChange={() => toggle('manage_settings')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
          <span className="text-sm text-gray-300">Manage App Settings</span>
        </label>
      )}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <button
          onClick={openAddModal}
          className="btn btn-primary flex items-center gap-2"
          disabled={!selectedAppId || !isOwner}
        >
          <PlusIcon className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Create an application first</div>
      ) : (
        <>
          <div className="mb-6">
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="input max-w-xs text-sm">
              {applications.map((app: any) => (
                <option key={app._id} value={app._id}>{app.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
            </div>
          ) : !application ? (
            <div className="text-center py-12 text-gray-400">Could not load application details.</div>
          ) : (
            <>
              {!isOwner && (
                <div className="mb-6 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-200 text-sm">
                  You are viewing this application as a Team Member (Role: {application.team?.find((m: any) => m.userId === user?.id)?.role || 'Unknown'}). Only the owner can invite or remove members.
                </div>
              )}

              {application.team?.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border border-white/5 rounded-2xl bg-white/[0.02]">
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
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(member.addedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOwner && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditModal(member)}
                                  className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors inline-flex"
                                  title="Edit member"
                                >
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors inline-flex"
                                  title="Remove member"
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
            </>
          )}
        </>
      )}

      {/* ── Add Member Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="card max-w-md w-full border border-white/10 bg-[#0f1015]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Invite Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">User Email <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full bg-black/20"
                  placeholder="user@example.com"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">The user must already be registered on Adarsh Auth.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full bg-black/20">
                  <option value="reseller">Reseller (Limited Access)</option>
                  <option value="manager">Manager (Admin Access)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {role === 'reseller' ? 'Resellers can only generate and manage licenses they created.' : 'Managers can see all licenses and change app settings.'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">Permissions</label>
                <PermissionCheckboxes perms={permissions} toggle={togglePermission} currentRole={role} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">Assign to Applications</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {applications.map((app: any) => (
                    <label key={app._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={inviteAppIds.includes(app._id)}
                        onChange={(e) => {
                          if (e.target.checked) setInviteAppIds([...inviteAppIds, app._id])
                          else setInviteAppIds(inviteAppIds.filter(id => id !== app._id))
                        }}
                        className="w-4 h-4 rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-offset-0 focus:ring-0"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{app.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="btn bg-white/5 hover:bg-white/10 text-white flex-1 border border-white/10">Cancel</button>
                <button onClick={handleAddMember} disabled={!email} className="btn btn-primary flex-1 disabled:opacity-50">Send Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Member Modal ───────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="card max-w-md w-full border border-white/10 bg-[#0f1015]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Edit Team Member</h2>
                <p className="text-sm text-gray-400 mt-1">{editTarget.userEmail || editTarget.userId}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input w-full bg-black/20">
                  <option value="reseller">Reseller (Limited Access)</option>
                  <option value="manager">Manager (Admin Access)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  {editRole === 'reseller' ? 'Resellers can only generate and manage licenses they created.' : 'Managers can see all licenses and change app settings.'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">Permissions</label>
                <PermissionCheckboxes perms={editPermissions} toggle={toggleEditPermission} currentRole={editRole} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">Assigned Applications</label>
                <div className="space-y-2.5 bg-black/20 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto">
                  {applications.map((app: any) => (
                    <label key={app._id} className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editAppIds.includes(app._id)} 
                        onChange={() => toggleEditApp(app._id)} 
                        className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" 
                      />
                      <span className="text-sm text-gray-300">{app.name}</span>
                      {originalAppIds.includes(app._id) && <span className="text-[10px] text-gray-600">(current)</span>}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">Check/uncheck to add or remove this member from your applications.</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditModal(false)} className="btn bg-white/5 hover:bg-white/10 text-white flex-1 border border-white/10">Cancel</button>
                <button onClick={handleEditMember} disabled={saving} className="btn btn-primary flex-1 disabled:opacity-50">
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
