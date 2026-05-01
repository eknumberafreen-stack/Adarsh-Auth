'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, EyeIcon, EyeSlashIcon, XMarkIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'

// ── 3-dot dropdown per user row ───────────────────────────────────────────────
function UserMenu({ user, onEdit, onBan, onPermanentBan, onUnban, onPause, onResetHwid, onDelete }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white transition-colors"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed mt-1 w-44 bg-[#1a1a24] border border-dark-border rounded-xl shadow-2xl z-[9999] overflow-hidden py-1"
          style={{
            top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
            right: window.innerWidth - (ref.current ? ref.current.getBoundingClientRect().right : 0)
          }}
        >
          <button onClick={() => { setOpen(false); onEdit(user) }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-dark-hover transition-colors flex items-center gap-2">
            <span>✏️</span> Edit
          </button>
          <button onClick={() => { setOpen(false); onPause(user) }} className="w-full text-left px-4 py-2.5 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-2">
            <span>{user.paused ? '▶️' : '⏸️'}</span> {user.paused ? 'Unpause' : 'Pause'}
          </button>
          <button onClick={() => { setOpen(false); onResetHwid(user._id) }} className="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-2">
            <span>🔄</span> Reset HWID
          </button>
          {user.banned ? (
            <button onClick={() => { setOpen(false); onUnban(user._id) }} className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-green-500/10 transition-colors flex items-center gap-2">
              <span>✅</span> Unban
            </button>
          ) : (
            <button onClick={() => { setOpen(false); onBan(user) }} className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2">
              <span>🚫</span> Ban
            </button>
          )}
          <button onClick={() => { setOpen(false); onPermanentBan(user) }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
            <span>⛔</span> Permanent Ban
          </button>
          <button onClick={() => { setOpen(false); onDelete(user._id) }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2">
            <span>🗑️</span> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const { applications, selectedApp } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const getDefaultExpiry = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  const [newUser, setNewUser] = useState({
    username: '', password: '', email: '',
    subscription: 'default', expiryDate: getDefaultExpiry(), hwidAffected: true
  })
  const [creating, setCreating] = useState(false)

  const isStrictValidDate = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false

    // Extract digits to handle both YYYY-MM-DD and DD-MM-YYYY fallbacks
    const digits = dateStr.match(/\d+/g)
    if (!digits || digits.length < 3) return false

    // Standard datetime-local is YYYY-MM-DD
    let y = parseInt(digits[0])
    let m = parseInt(digits[1])
    let day = parseInt(digits[2])

    // Detect if format is DD-MM-YYYY (if year is at the end)
    if (y < 1000 && parseInt(digits[2]) > 1000) {
      day = parseInt(digits[0])
      m = parseInt(digits[1])
      y = parseInt(digits[2])
    }

    return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === day
  }

  // Ban modal
  const [showBanModal, setShowBanModal] = useState(false)
  const [banTarget, setBanTarget] = useState<any>(null)
  const [banReason, setBanReason] = useState('')
  const [banMessage, setBanMessage] = useState('')
  const [banIp, setBanIp] = useState(false)
  const [banning, setBanning] = useState(false)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editData, setEditData] = useState({ username: '', email: '', subscription: 'default', expiryDate: '', hwidAffected: true })

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm'
  })

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      // Use the globally selected app if available, otherwise fall back to first
      const defaultId = selectedApp?._id || applications[0]._id
      setSelectedAppId(defaultId)
    }
  }, [applications, selectedApp])

  useEffect(() => { if (selectedAppId) loadUsers() }, [selectedAppId])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/users/application/${selectedAppId}`)
      setUsers(res.data.users)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const createUser = async () => {
    if (!newUser.username || !newUser.password) return toast.error('Username and password required')
    
    if (newUser.expiryDate) {
      if (!isStrictValidDate(newUser.expiryDate)) {
        return toast.error('The selected date does not exist (e.g. April 31st)')
      }
      if (new Date(newUser.expiryDate) <= new Date()) {
        return toast.error('Expiration date must be in the future')
      }
    }

    setCreating(true)
    try {
      await api.post('/users/create', {
        applicationId: selectedAppId,
        username: newUser.username,
        password: newUser.password,
        email: newUser.email || null,
        subscription: newUser.subscription || 'default',
        expiryDate: newUser.expiryDate || null,
        hwidAffected: newUser.hwidAffected
      })
      toast.success('User created!')
      setShowCreateModal(false)
      setNewUser({ username: '', password: '', email: '', subscription: 'default', expiryDate: getDefaultExpiry(), hwidAffected: true })
      loadUsers()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create user')
    } finally { setCreating(false) }
  }

  const openBanModal = (user: any) => {
    setBanTarget(user)
    setBanReason('')
    setBanMessage('')
    setBanIp(false)
    setShowBanModal(true)
  }

  // Soft ban — just sets banned=true, HWID NOT blacklisted → PC reset = access again
  const softBan = async (user: any) => {
    setConfirmModal({
      show: true,
      title: 'Ban User?',
      message: `Are you sure you want to ban "${user.username}"? They can regain access by resetting their PC/HWID.`,
      type: 'warning',
      confirmText: 'Ban User',
      onConfirm: async () => {
        try {
          await api.post(`/users/${user._id}/ban`, {
            reason: 'Soft ban',
            banMessage: null,
            banIp: false,
            softBan: true
          })
          toast.success('User banned (soft)')
          loadUsers()
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to ban user') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  // Pause user — sets expiryDate to now (blocks login without banning)
  const pauseUser = async (user: any) => {
    try {
      if (user.paused) {
        // Unpause — restore expiry
        await api.patch(`/users/${user._id}/unpause`)
        toast.success('User unpaused')
      } else {
        await api.patch(`/users/${user._id}/pause`)
        toast.success('User paused')
      }
      loadUsers()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update user') }
  }

  // Open edit modal
  const openEditModal = (user: any) => {
    setEditTarget(user)
    setEditData({
      username: user.username,
      email: user.email || '',
      subscription: user.subscription || 'default',
      expiryDate: user.expiryDate ? new Date(user.expiryDate).toISOString().slice(0, 16) : '',
      hwidAffected: user.hwidAffected !== false
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!editTarget) return

    if (editData.expiryDate) {
      if (!isStrictValidDate(editData.expiryDate)) {
        return toast.error('The selected date does not exist (e.g. April 31st)')
      }
      if (new Date(editData.expiryDate) <= new Date()) {
        return toast.error('Expiration date must be in the future')
      }
    }

    try {
      await api.patch(`/users/${editTarget._id}/edit`, editData)
      toast.success('User updated!')
      setShowEditModal(false)
      loadUsers()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update user') }
  }

  const executeBan = async () => {
    if (!banTarget) return
    setBanning(true)
    try {
      const res = await api.post(`/users/${banTarget._id}/ban`, {
        reason: banReason || 'Manual ban',
        banMessage: banMessage || null,
        banIp
      })
      toast.success(`Permanently banned. ${res.data.licensesBlacklisted} license(s) blacklisted.`)
      setShowBanModal(false)
      loadUsers()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to ban user') }
    finally { setBanning(false) }
  }

  const unbanUser = async (id: string) => {
    try { await api.post(`/users/${id}/unban`); toast.success('User unbanned'); loadUsers() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed to unban') }
  }

  const resetHwid = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Reset HWID?',
      message: 'Are you sure you want to reset the Hardware ID for this user?',
      type: 'info',
      confirmText: 'Reset Now',
      onConfirm: async () => {
        try { await api.post(`/users/${id}/reset-hwid`); toast.success('HWID reset'); loadUsers() }
        catch (e: any) { toast.error(e.response?.data?.error || 'Failed to reset HWID') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const deleteUser = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete User?',
      message: 'Are you sure you want to permanently delete this user? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try { await api.delete(`/users/${id}`); toast.success('User deleted'); loadUsers() }
        catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        {selectedAppId && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Create User
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Create an application first</div>
      ) : (
        <>
          {/* App selector */}
          <div className="mb-6">
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="input max-w-xs text-sm">
              {applications.map((app: any) => (
                <option key={app._id} value={app._id}>{app.name}</option>
              ))}
            </select>
          </div>

          {/* Users table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No users yet</div>
          ) : (
            <div className="card overflow-visible p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Username</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">HWID</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Login</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Last IP</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Expiry</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">HWID Affected</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user._id} className="border-b border-dark-border/50 hover:bg-dark-hover/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.username}</td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">Banned</span>
                        ) : user.paused ? (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">Paused</span>
                        ) : user.expiryDate && new Date(user.expiryDate) < new Date() ? (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">Expired</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]">
                        {user.hwid ? user.hwid.slice(0, 16) + '...' : 'Not set'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{user.lastIp || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.paused 
                          ? (user.pausedExpiry ? new Date(user.pausedExpiry).toLocaleDateString() : 'Lifetime') 
                          : (user.expiryDate ? new Date(user.expiryDate).toLocaleDateString() : 'Lifetime')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {user.hwidAffected ? (
                          <span className="text-indigo-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <UserMenu
                          user={user}
                          onEdit={openEditModal}
                          onBan={softBan}
                          onPermanentBan={openBanModal}
                          onUnban={unbanUser}
                          onPause={pauseUser}
                          onResetHwid={resetHwid}
                          onDelete={deleteUser}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Create User Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username <span className="text-red-400">*</span></label>
                <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="input" placeholder="Enter username" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input pr-10" placeholder="Enter password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription</label>
                <input type="text" value={newUser.subscription} onChange={(e) => setNewUser({ ...newUser, subscription: e.target.value })} className="input" placeholder="default" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Expiration</label>
                <input type="datetime-local" value={newUser.expiryDate} onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })} className="input" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hwidAffected" checked={newUser.hwidAffected} onChange={(e) => setNewUser({ ...newUser, hwidAffected: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                <label htmlFor="hwidAffected" className="text-sm">HWID Affected</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={createUser} disabled={creating} className="btn btn-primary flex-1">{creating ? 'Creating...' : 'Create User'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Edit User</h2>
                <p className="text-sm text-gray-400 mt-0.5">Editing: <span className="text-white font-medium">{editTarget.username}</span></p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input type="text" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription</label>
                <input type="text" value={editData.subscription} onChange={(e) => setEditData({ ...editData, subscription: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Expiry Date</label>
                <input type="datetime-local" value={editData.expiryDate} onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })} className="input" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="editHwidAffected" checked={editData.hwidAffected} onChange={(e) => setEditData({ ...editData, hwidAffected: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                <label htmlFor="editHwidAffected" className="text-sm">HWID Affected</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} className="btn btn-primary flex-1">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Ban Modal ───────────────────────────────────────── */}
      {showBanModal && banTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#13131a] border border-dark-border rounded-2xl p-6 shadow-2xl">

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">—</span>
                  </div>
                  <h2 className="text-xl font-bold text-red-400">Permanent Ban</h2>
                </div>
                <p className="text-sm text-gray-400 ml-8">
                  Banning: <span className="text-white font-semibold">{banTarget.username}</span>
                </p>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Ban Reason */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ban Reason{' '}
                  <span className="text-gray-500 font-normal">(internal — not shown to user)</span>
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="e.g. Cheating, Refund abuse..."
                />
              </div>

              {/* Message to User */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Message to User <span className="text-red-400">*</span>{' '}
                  <span className="text-gray-500 font-normal">(shown when they try to login)</span>
                </label>
                <textarea
                  value={banMessage}
                  onChange={(e) => setBanMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all resize-none"
                  placeholder="e.g. You have been permanently banned for cheating. This decision is final."
                />
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <span>💡</span> This exact message will appear on the user's screen when they try to login.
                </p>
              </div>

              {/* Ban IP checkbox */}
              <div className="flex items-center gap-3 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl">
                <input
                  type="checkbox"
                  id="banIpCheck"
                  checked={banIp}
                  onChange={(e) => setBanIp(e.target.checked)}
                  className="w-4 h-4 accent-red-600 flex-shrink-0"
                />
                <label htmlFor="banIpCheck" className="text-sm cursor-pointer">
                  Also ban user's IP address{' '}
                  <span className="text-gray-500">({banTarget.lastIp || 'unknown'})</span>
                </label>
              </div>

              {/* Warning box */}
              <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-yellow-400 text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-red-300 leading-relaxed">
                  This will permanently ban the user, blacklist all their licenses, and kill all sessions. This action cannot be undone.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 py-3 px-4 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-xl text-sm font-semibold text-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBan}
                  disabled={banning}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  {banning ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-xs font-bold">—</span>
                      </div>
                      Permanently Ban
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Custom Confirmation Modal ────────────────────────────────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {/* Icon Based on Type */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                confirmModal.type === 'danger' ? 'bg-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {confirmModal.type === 'danger' ? '🗑️' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' :
                    confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                  }`}
                >
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
