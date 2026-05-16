'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore, useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  XMarkIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  FingerPrintIcon,
  EnvelopeIcon,
  KeyIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'

const PERMISSIONS = [
  { id: 'manage_users', label: 'Users', icon: '👥' },
  { id: 'manage_licenses', label: 'Licenses', icon: '🔑' },
  { id: 'manage_applications', label: 'Apps', icon: '📦' },
  { id: 'manage_team', label: 'Team', icon: '🤝' },
  { id: 'manage_settings', label: 'Settings', icon: '⚙️' },
  { id: 'view_stats', label: 'Stats', icon: '📊' },
]

export default function Team() {
  const { selectedApp } = useAppStore()
  const { user: currentUser } = useAuthStore()
  const [application, setApplication] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')
  const [invitePermissions, setInvitePermissions] = useState<string[]>(['view_stats'])
  const [inviteAppIds, setInviteAppIds] = useState<string[]>([])
  const [allApps, setAllApps] = useState<any[]>([])

  // Edit Member Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editRole, setEditRole] = useState('manager')
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [editAppIds, setEditAppIds] = useState<string[]>([])
  const [originalAppIds, setOriginalAppIds] = useState<string[]>([])

  useEffect(() => {
    if (selectedApp?._id) loadApplication()
  }, [selectedApp?._id])

  const loadApplication = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/applications/${selectedApp._id}`)
      setApplication(res.data.application)
      
      const appsRes = await api.get('/applications')
      setAllApps(appsRes.data.applications)
      setInviteAppIds([selectedApp._id])
    } catch { toast.error('Failed to load sector data') }
    finally { setLoading(false) }
  }

  const togglePermission = (id: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(id)) setter(list.filter(p => p !== id))
    else setter([...list, id])
  }

  const toggleAppSelection = (id: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(id)) {
      if (list.length > 1) setter(list.filter(aid => aid !== id))
      else toast.error('At least one sector must be selected')
    } else {
      setter([...list, id])
    }
  }

  const handleAddMember = async () => {
    if (!inviteEmail) return toast.error('Identity required')
    setSaving(true)
    try {
      const promises = inviteAppIds.map(appId => 
        api.post(`/applications/${appId}/team`, { userEmail: inviteEmail, role: inviteRole, permissions: invitePermissions })
      )
      await Promise.all(promises)
      toast.success('Team member deployed'); setShowAddModal(false); loadApplication()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Deployment failed') }
    finally { setSaving(false) }
  }

  const openEditModal = async (member: any) => {
    setEditTarget(member); setEditRole(member.role); setEditPermissions([...member.permissions])
    try {
      const res = await api.get('/applications')
      const mAppIds = res.data.applications.filter((app: any) => app.team?.some((m: any) => m.userId?.toString() === member.userId?.toString())).map((app: any) => app._id)
      setEditAppIds(mAppIds); setOriginalAppIds(mAppIds); setShowEditModal(true)
    } catch { setEditAppIds([selectedApp._id]); setOriginalAppIds([selectedApp._id]); setShowEditModal(true) }
  }

  const handleEditMember = async () => {
    setSaving(true)
    try {
      await api.patch(`/applications/${selectedApp._id}/team/${editTarget.userId}`, { role: editRole, permissions: editPermissions })
      const appsToAdd = editAppIds.filter(id => !originalAppIds.includes(id))
      const appsToRemove = originalAppIds.filter(id => !editAppIds.includes(id))
      
      const addPromises = appsToAdd.map(id => api.post(`/applications/${id}/team`, { userEmail: editTarget.userEmail, role: editRole, permissions: editPermissions }))
      const removePromises = appsToRemove.map(id => api.delete(`/applications/${id}/team/${editTarget.userId}`))
      
      await Promise.all([...addPromises, ...removePromises])
      toast.success('Clearance updated'); setShowEditModal(false); loadApplication()
    } catch { toast.error('Sync failed') }
    finally { setSaving(false) }
  }

  const removeMember = async (userId: string, email: string) => {
    if (!confirm(`Revoke all clearance for ${email}?`)) return
    try {
      const res = await api.get('/applications')
      const mAppIds = res.data.applications.filter((app: any) => app.team?.some((m: any) => m.userId?.toString() === userId?.toString())).map((app: any) => app._id)
      await Promise.all(mAppIds.map(id => api.delete(`/applications/${id}/team/${userId}`)))
      toast.success('Clearance revoked'); loadApplication()
    } catch { toast.error('Revocation failed') }
  }

  const isOwner = currentUser?.email === application.owner?.email

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-500 mb-1">Collaborative Workspace</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">Team Management</h2>
        </div>
        
        {isOwner && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary shadow-glow shadow-primary-600/20"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Invite Member</span>
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-600 animate-pulse">Syncing Personnel...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Owner Card - Always visible */}
            <TeamMemberCard 
              member={{ 
                userEmail: application.owner?.email, 
                userName: application.owner?.username, 
                role: 'Owner', 
                permissions: ['all_clearance'],
                addedByName: 'System'
              }} 
              isOwnerCard={true} 
            />

            {application.team?.map((member: any, idx: number) => (
              <TeamMemberCard 
                key={member.userId}
                member={member}
                idx={idx}
                isOwner={isOwner}
                onEdit={() => openEditModal(member)}
                onRemove={() => removeMember(member.userId, member.userEmail)}
              />
            ))}
          </div>

          {(!application.team || application.team.length === 0) && (
            <div className="card-premium p-12 text-center border-dashed border-white/10 bg-transparent">
              <UserGroupIcon className="w-10 h-10 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No external personnel assigned to this sector.</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl card-premium p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Deploy Personnel</h3>
                  <p className="text-sm text-slate-400">Grant administrative access to a new team member.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8">
                <div className="input-group">
                  <label className="label">Member Identity (Email)</label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input pl-12" placeholder="person@example.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="label">Clearance Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    <RoleOption active={inviteRole === 'manager'} onClick={() => setInviteRole('manager')} label="Manager" desc="Full operational control" />
                    <RoleOption active={inviteRole === 'support'} onClick={() => setInviteRole('support')} label="Support" desc="Restricted view & help" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="label">Granular Permissions</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PERMISSIONS.map(p => (
                      <PermissionToggle 
                        key={p.id} 
                        active={invitePermissions.includes(p.id)} 
                        onClick={() => togglePermission(p.id, invitePermissions, setInvitePermissions)} 
                        label={p.label} 
                        icon={p.icon} 
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="label">Sector Authorization (Applications)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-2 bg-white/[0.02] rounded-2xl border border-white/5">
                    {allApps.map(app => (
                      <button 
                        key={app._id} 
                        onClick={() => toggleAppSelection(app._id, inviteAppIds, setInviteAppIds)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${inviteAppIds.includes(app._id) ? 'bg-primary-500/10 border-primary-500/50 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${inviteAppIds.includes(app._id) ? 'bg-primary-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`} />
                        <span className="text-xs font-bold truncate">{app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Abort</button>
                  <button onClick={handleAddMember} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Deploying...' : 'Deploy Personnel'}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal (Similar structure to Invite Modal) */}
      <AnimatePresence>
        {showEditModal && editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl card-premium p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Adjust Clearance</h3>
                  <p className="text-sm text-slate-400">Modifying access for <span className="text-primary-400 font-bold">{editTarget.userEmail}</span></p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <RoleOption active={editRole === 'manager'} onClick={() => setEditRole('manager')} label="Manager" desc="Full control" />
                  <RoleOption active={editRole === 'support'} onClick={() => setEditRole('support')} label="Support" desc="Restricted help" />
                </div>

                <div className="space-y-4">
                  <label className="label">Granular Permissions</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PERMISSIONS.map(p => (
                      <PermissionToggle 
                        key={p.id} 
                        active={editPermissions.includes(p.id)} 
                        onClick={() => togglePermission(p.id, editPermissions, setEditPermissions)} 
                        label={p.label} 
                        icon={p.icon} 
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                  <button onClick={handleEditMember} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Syncing...' : 'Apply Changes'}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TeamMemberCard({ member, idx = 0, isOwner = false, isOwnerCard = false, onEdit, onRemove }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: idx * 0.1 }}
      className={`card-premium p-6 flex flex-col justify-between h-full group hover:shadow-primary-950/20 ${isOwnerCard ? 'border-primary-500/20 bg-primary-500/[0.02]' : ''}`}
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black border transition-transform group-hover:scale-110 ${isOwnerCard ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-white/5 border-white/5 text-slate-400'}`}>
              {(member.userEmail || member.userId).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight truncate max-w-[150px]">{member.userName || 'Anonymous'}</p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <EnvelopeIcon className="w-3 h-3" />
                {member.userEmail || member.userId}
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${member.role === 'manager' || isOwnerCard ? 'bg-primary-500/10 border-primary-500/20 text-primary-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            {member.role}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Capabilities</p>
            <div className="flex flex-wrap gap-1.5">
              {member.permissions.map((p: string) => (
                <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {p.replace('manage_', '').replace('view_', '')}
                </span>
              ))}
              {isOwnerCard && <span className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 rounded text-[10px] font-bold text-primary-400 uppercase tracking-tighter">root_access</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Added By</p>
          <p className="text-[10px] font-bold text-slate-400">{member.addedByName || 'System'}</p>
        </div>
        
        {!isOwnerCard && isOwner && (
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-primary-400 hover:border-primary-500/30 transition-all">
              <PencilSquareIcon className="w-4 h-4" />
            </button>
            <button onClick={onRemove} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-500/10 transition-all">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {isOwnerCard && (
          <div className="flex items-center gap-1.5 text-primary-500/60 font-black text-[9px] uppercase tracking-widest">
            <CheckBadgeIcon className="w-3.5 h-3.5" />
            Immutable
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RoleOption({ active, onClick, label, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all ${active ? 'bg-primary-500/10 border-primary-500/50 shadow-glow' : 'bg-white/5 border-transparent opacity-60 hover:opacity-100 hover:bg-white/10'}`}
    >
      <p className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[10px] text-slate-500 font-medium mt-1">{desc}</p>
    </button>
  )
}

function PermissionToggle({ active, onClick, label, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${active ? 'bg-primary-500/10 border-primary-500/40 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
    >
      <span className="opacity-80">{icon}</span>
      <span className="truncate tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />}
    </button>
  )
}
