'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  XMarkIcon, 
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  UserIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

// ── 3-dot dropdown per user row ───────────────────────────────────────────────
function UserMenu({ user, onEdit, onBan, onPermanentBan, onUnban, onPause, onResetHwid, onDelete, onForceClose }: any) {
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
        className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed w-48 bg-[#0a0a14]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1.5"
            style={{
              top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 6 : 0,
              right: window.innerWidth - (ref.current ? ref.current.getBoundingClientRect().right : 0)
            }}
          >
            <button onClick={() => { setOpen(false); onEdit(user) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2.5">
              <span>✏️</span> Edit Profile
            </button>
            <button onClick={() => { setOpen(false); onPause(user) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-2.5">
              <span>{user.paused ? '▶️' : '⏸️'}</span> {user.paused ? 'Unpause User' : 'Pause User'}
            </button>
            <button onClick={() => { setOpen(false); onResetHwid(user._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-2.5">
              <span>🔄</span> Reset HWID
            </button>
            <button onClick={() => { setOpen(false); onForceClose(user._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
              <span>💥</span> Crash Session
            </button>
            <div className="h-px bg-white/[0.05] my-1" />
            {user.banned ? (
              <button onClick={() => { setOpen(false); onUnban(user._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5">
                <span>✅</span> Unban Account
              </button>
            ) : (
              <button onClick={() => { setOpen(false); onBan(user) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2.5">
                <span>🚫</span> Soft Ban
              </button>
            )}
            <button onClick={() => { setOpen(false); onPermanentBan(user) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
              <span>⛔</span> Full Hardware Ban
            </button>
            <button onClick={() => { setOpen(false); onDelete(user._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/15 transition-colors flex items-center gap-2.5">
              <span>🗑️</span> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const getCreatorDisplay = (creator: any, appOwnerId?: string) => {
  if (!creator) return 'Owner';
  const creatorId = typeof creator === 'string' ? creator : creator._id;
  if (appOwnerId && creatorId === appOwnerId) return 'Owner';
  if (typeof creator === 'object') {
    return creator.username || creator.email || 'Owner';
  }
  return 'Owner';
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const { applications, selectedApp, loadingApplications } = useAppStore()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string | null>>({}) // userId -> ping
  const limit = 10
  const onlineIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
    subscription: 'default', expiryDate: getDefaultExpiry(), hwidAffected: true, isLifetime: false
  })
  const [creating, setCreating] = useState(false)

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
      const actualAmPm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours.toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}-${month}-${year}, {hoursStr}:{minutes} {actualAmPm}`;
    }
    return `${day}-${month}-${year}`;
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
  const [editData, setEditData] = useState({ username: '', email: '', subscription: 'default', expiryDate: '', hwidAffected: true, isLifetime: false })

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
    if (selectedApp?._id) {
      setCurrentPage(1)
      loadUsers(1, searchTerm)
      // Start polling live status
      pollOnlineStatus()
      if (onlineIntervalRef.current) clearInterval(onlineIntervalRef.current)
      onlineIntervalRef.current = setInterval(pollOnlineStatus, 5000)
    }
    return () => {
      if (onlineIntervalRef.current) clearInterval(onlineIntervalRef.current)
    }
  }, [selectedApp?._id, searchTerm])

  const pollOnlineStatus = async () => {
    if (!selectedApp?._id) return
    try {
      const res = await api.get(`/users/application/${selectedApp._id}/online-status`)
      const map: Record<string, string | null> = {}
      res.data.online.forEach((entry: { userId: string; ping: string | null }) => {
        map[entry.userId] = entry.ping
      })
      setOnlineUsers(map)
    } catch { /* silent fail */ }
  }

  const loadUsers = async (page = currentPage, search = searchTerm) => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const res = await api.get(`/users/application/${selectedApp._id}?page=${page}&limit=${limit}&search=${search}`)
      setUsers(res.data.users)
      setTotalPages(res.data.pagination.pages)
      setTotalUsers(res.data.pagination.total)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadUsers(newPage)
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const createUser = async () => {
    if (!newUser.username || !newUser.password) return toast.error('Username and password required')
    
    if (!newUser.isLifetime) {
      if (!newUser.expiryDate) {
        return toast.error('Please enter a valid expiration date or check Lifetime')
      }
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
        applicationId: selectedApp._id,
        username: newUser.username,
        password: newUser.password,
        email: newUser.email || null,
        subscription: newUser.subscription || 'default',
        expiryDate: newUser.isLifetime ? null : new Date(newUser.expiryDate).toISOString(),
        hwidAffected: newUser.hwidAffected
      })
      toast.success('User created!')
      setShowCreateModal(false)
      setNewUser({ username: '', password: '', email: '', subscription: 'default', expiryDate: getDefaultExpiry(), hwidAffected: true, isLifetime: false })
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

  const pauseUser = async (user: any) => {
    try {
      if (user.paused) {
        await api.patch(`/users/${user._id}/unpause`)
        toast.success('User unpaused')
      } else {
        await api.patch(`/users/${user._id}/pause`)
        toast.success('User paused')
      }
      loadUsers()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update user') }
  }

  const openEditModal = (user: any) => {
    setEditTarget(user)
    setEditData({
      username: user.username,
      email: user.email || '',
      subscription: user.subscription || 'default',
      expiryDate: user.expiryDate ? new Date(user.expiryDate).toISOString().slice(0, 16) : '',
      hwidAffected: user.hwidAffected !== false,
      isLifetime: !user.expiryDate
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!editTarget) return

    if (!editData.isLifetime) {
      if (!editData.expiryDate) {
        return toast.error('Please enter a valid expiration date or check Lifetime')
      }
      if (!isStrictValidDate(editData.expiryDate)) {
        return toast.error('The selected date does not exist (e.g. April 31st)')
      }
      if (new Date(editData.expiryDate) <= new Date()) {
        return toast.error('Expiration date must be in the future')
      }
    }

    try {
      await api.patch(`/users/${editTarget._id}/edit`, {
        ...editData,
        expiryDate: editData.isLifetime ? null : new Date(editData.expiryDate).toISOString()
      })
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
      toast.success(`User banned. ${res.data.licensesBlacklisted} license(s) blacklisted.`)
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

  const forceCloseUser = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Crash User App?',
      message: 'Are you sure you want to force-close this user\'s running executable? This will terminate their active session.',
      type: 'danger',
      confirmText: 'Crash It',
      onConfirm: async () => {
        try {
          await api.post(`/users/${id}/force-close`)
          toast.success('Force-close command sent to client')
          loadUsers()
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Failed to send force-close command')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const deleteUser = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete User?',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete User',
      onConfirm: async () => {
        try { await api.delete(`/users/${id}`); toast.success('User deleted'); loadUsers() }
        catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Users</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Manage registered accounts, HWID configurations, and bans</p>
        </div>
        {selectedApp?._id && (
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-64 pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.06] rounded-xl text-xs focus:outline-none focus:border-indigo-500/40 transition-all font-bold placeholder-slate-600 text-white"
              />
            </div>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2 py-2.5">
              <PlusIcon className="w-4 h-4" /> Create User
            </button>
          </div>
        )}
      </div>

      {loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
          Create an application first to manage client accounts.
        </div>
      ) : (
        <>
          {/* Users table */}
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
              No users registered yet for this application.
            </div>
          ) : (
            <div className="card overflow-visible p-0 relative shadow-2xl">
              {(() => {
                const showCreatedBy = selectedApp?.team?.length > 0 || users.some(u => u.createdBy)
                return (
                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full text-sm table-modern text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Username</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">HWID ID</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Created</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Last Login</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Last IP</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expiry</th>
                          {showCreatedBy && (
                            <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Created By</th>
                          )}
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">HWID Control</th>
                          <th className="px-5 py-4 w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user: any, i: number) => (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.02 }}
                            key={user._id} 
                            className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors"
                          >
                            <td className="px-5 py-4 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                {onlineUsers[user._id] !== undefined ? (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                                  </span>
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-slate-600 shrink-0" />
                                )}
                                <span className="tracking-tight">{user.username}</span>
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-[9px] text-green-400 font-extrabold tracking-wide uppercase">
                                    {onlineUsers[user._id] ? `${onlineUsers[user._id]}ms` : 'Live'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {user.banned ? (
                                <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full">Banned</span>
                              ) : user.paused ? (
                                <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full">Paused</span>
                              ) : user.expiryDate && new Date(user.expiryDate) < new Date() ? (
                                <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full">Expired</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full">Active</span>
                              )}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-slate-400">
                              <button
                                onClick={() => {
                                  if (user.hwid) {
                                    navigator.clipboard.writeText(user.hwid);
                                    toast.success('HWID copied to clipboard!');
                                  }
                                }}
                                className="hover:text-indigo-400 font-bold transition-colors cursor-pointer text-left bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded-md"
                                title="Click to copy full HWID"
                              >
                                {user.hwid ? `${user.hwid.substring(0, 10)}...` : 'Not set'}
                              </button>
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs font-semibold">
                              {formatToDDMMYYYY(user.createdAt, 'Unknown', true)}
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs font-semibold">
                              {formatToDDMMYYYY(user.lastLogin, 'Never', true)}
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs font-mono font-bold">{user.lastIp || 'N/A'}</td>
                            <td className="px-5 py-4 text-slate-300 text-xs font-bold">
                              {user.paused 
                                ? formatToDDMMYYYY(user.pausedExpiry, 'Lifetime', true)
                                : formatToDDMMYYYY(user.expiryDate, 'Lifetime', true)}
                            </td>
                            {showCreatedBy && (
                              <td className="px-5 py-4">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 text-[10px] font-bold border border-white/[0.05]">
                                  {getCreatorDisplay(user.createdBy, selectedApp?.userId)}
                                </span>
                              </td>
                            )}
                            <td className="px-5 py-4 text-slate-400 text-xs font-bold">
                              {user.hwidAffected ? (
                                <span className="text-indigo-400">Lock Enabled</span>
                              ) : (
                                <span className="text-slate-500">Lock Disabled</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <UserMenu
                                user={user}
                                onEdit={openEditModal}
                                onBan={softBan}
                                onPermanentBan={openBanModal}
                                onUnban={unbanUser}
                                onPause={pauseUser}
                                onResetHwid={resetHwid}
                                onDelete={deleteUser}
                                onForceClose={forceCloseUser}
                              />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04] bg-black/10">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 font-semibold">
                      Showing page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create User Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Create User</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Client Account Provisioner</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Username <span className="text-red-400">*</span></label>
                <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="input" placeholder="Enter unique username" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input pr-10" placeholder="Enter secure password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    {showPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Email</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input" placeholder="Optional email" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Subscription Name</label>
                <input type="text" value={newUser.subscription} onChange={(e) => setNewUser({ ...newUser, subscription: e.target.value })} className="input" placeholder="default" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400">Expiration</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="createLifetime" checked={newUser.isLifetime} onChange={(e) => setNewUser({ ...newUser, isLifetime: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" />
                    <label htmlFor="createLifetime" className="text-xs font-bold text-slate-400 cursor-pointer select-none">Lifetime Access</label>
                  </div>
                </div>
                {!newUser.isLifetime && (
                  <input type="datetime-local" value={newUser.expiryDate} onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })} className="input" />
                )}
              </div>
              <div className="flex items-center gap-3 py-1">
                <input type="checkbox" id="hwidAffected" checked={newUser.hwidAffected} onChange={(e) => setNewUser({ ...newUser, hwidAffected: e.target.checked })} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                <label htmlFor="hwidAffected" className="text-xs font-bold text-slate-300 cursor-pointer select-none">Hardware ID Lock Enabled</label>
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={createUser} disabled={creating} className="btn btn-primary flex-1">{creating ? 'Creating...' : 'Create Account'}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Edit Profile</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Target: {editTarget.username}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Username</label>
                <input type="text" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Email</label>
                <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Subscription Name</label>
                <input type="text" value={editData.subscription} onChange={(e) => setEditData({ ...editData, subscription: e.target.value })} className="input" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400">Expiration</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="editLifetime" checked={editData.isLifetime} onChange={(e) => setEditData({ ...editData, isLifetime: e.target.checked })} className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" />
                    <label htmlFor="editLifetime" className="text-xs font-bold text-slate-400 cursor-pointer select-none">Lifetime Access</label>
                  </div>
                </div>
                {!editData.isLifetime && (
                  <input type="datetime-local" value={editData.expiryDate} onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })} className="input" />
                )}
              </div>
              <div className="flex items-center gap-3 py-1">
                <input type="checkbox" id="editHwidAffected" checked={editData.hwidAffected} onChange={(e) => setEditData({ ...editData, hwidAffected: e.target.checked })} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                <label htmlFor="editHwidAffected" className="text-xs font-bold text-slate-300 cursor-pointer select-none">Hardware ID Lock Enabled</label>
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} className="btn btn-primary flex-1">Save Profile</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Full Ban Modal ───────────────────────────────────────── */}
      {showBanModal && banTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card w-full max-w-md p-6 md:p-8 border border-red-500/25"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs font-black">—</span>
                  </div>
                  <h2 className="text-lg font-black text-red-400 uppercase tracking-wide">Full Hardware Ban</h2>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Target Account: <span className="text-white font-bold">{banTarget.username}</span>
                </p>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                  Ban Reason <span className="text-slate-500 font-normal">(internal logs)</span>
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-red-500/40 transition-all font-bold"
                  placeholder="e.g. Exploiting attempts, refunds..."
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                  Message to User <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={banMessage}
                  onChange={(e) => setBanMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-red-500/40 transition-all resize-none font-bold"
                  placeholder="Reason shown to user upon executable login attempts..."
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <input
                  type="checkbox"
                  id="banIpCheck"
                  checked={banIp}
                  onChange={(e) => setBanIp(e.target.checked)}
                  className="w-4 h-4 accent-red-600 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="banIpCheck" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                  Also blacklist client IP address ({banTarget.lastIp || 'unknown'})
                </label>
              </div>

              <div className="flex items-start gap-2.5 px-4 py-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <span className="text-red-400 text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-red-300 leading-relaxed font-semibold">
                  This permanently blacklists the user's active access codes, resets their session token, and drops an immutable lock on their system HWID blueprint.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBanModal(false)} className="flex-1 py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-xs font-bold text-slate-300 transition-all">
                  Cancel
                </button>
                <button
                  onClick={executeBan}
                  disabled={banning}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-2xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
                >
                  {banning ? 'Banning...' : 'Confirm HWID Ban'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Custom Confirmation Modal ────────────────────────────────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card w-full max-w-sm animate-in zoom-in-95 duration-200 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                confirmModal.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {confirmModal.type === 'danger' ? '🗑️' : confirmModal.type === 'warning' ? '⚠️' : '🔄'}
              </div>
              
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 font-semibold leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 rounded-2xl text-xs font-bold border border-white/[0.05] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 px-4 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-950/40' :
                    confirmModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-950/40' :
                    'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
