'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function TeamPage() {
  const { applications } = useAppStore()
  const { user } = useAuthStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reseller')
  const [permissions, setPermissions] = useState<string[]>(['manage_licenses'])

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) setSelectedAppId(applications[0]._id)
  }, [applications])

  useEffect(() => {
    if (selectedAppId) loadApplication()
  }, [selectedAppId])

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

  const handleAddMember = async () => {
    try {
      await api.post(`/applications/${selectedAppId}/team`, { email, role, permissions })
      toast.success('Team member added!')
      setShowAddModal(false)
      setEmail('')
      loadApplication()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add team member')
    }
  }

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

  const isOwner = application?.userId === user?.id

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
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
                        <th className="text-left px-4 py-4 text-gray-400 font-medium">User ID</th>
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
                            <code className="font-mono text-xs text-gray-300">{member.userId}</code>
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
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors inline-flex"
                                title="Remove member"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
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
                <div className="space-y-2.5 bg-black/20 p-3 rounded-xl border border-white/5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_licenses')} onChange={() => togglePermission('manage_licenses')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                    <span className="text-sm text-gray-300">Manage Licenses</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_users')} onChange={() => togglePermission('manage_users')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                    <span className="text-sm text-gray-300">Manage Users & Sessions</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_logs')} onChange={() => togglePermission('view_logs')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                    <span className="text-sm text-gray-300">View Logs & Stats</span>
                  </label>
                  {role === 'manager' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={permissions.includes('manage_settings')} onChange={() => togglePermission('manage_settings')} className="rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
                      <span className="text-sm text-gray-300">Manage App Settings</span>
                    </label>
                  )}
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
    </div>
  )
}
