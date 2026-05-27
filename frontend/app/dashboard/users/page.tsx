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
  PencilIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  TrashIcon,
  CheckCircleIcon,
  UsersIcon,
  SignalIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
} as const

// ── Dropdown per user row ──────────────────────────────────────────────────────
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
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/[0.08]"
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
            className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#101018] shadow-2xl z-50 overflow-hidden py-1.5 p-1 backdrop-blur-md"
          >
            <button
              onClick={() => { setOpen(false); onEdit(user) }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <PencilIcon className="w-3.5 h-3.5 text-indigo-400" /> Edit Profile
            </button>

            <button
              onClick={() => { setOpen(false); onPause(user) }}
              className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              {user.paused ? (
                <>
                  <PlayIcon className="w-3.5 h-3.5" /> Resume Access
                </>
              ) : (
                <>
                  <PauseIcon className="w-3.5 h-3.5" /> Pause Access
                </>
              )}
            </button>

            <button
              onClick={() => { setOpen(false); onResetHwid(user._id) }}
              className="w-full text-left px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" /> Reset HWID
            </button>

            <button
              onClick={() => { setOpen(false); onForceClose(user._id) }}
              className="w-full text-left px-3 py-2 text-xs text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" /> Force Close App
            </button>

            <div className="my-1 border-t border-white/5" />

            {user.banned ? (
              <button
                onClick={() => { setOpen(false); onUnban(user._id) }}
                className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" /> Lift Suspension
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onBan(user) }}
                className="w-full text-left px-3 py-2 text-xs text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                <NoSymbolIcon className="w-3.5 h-3.5" /> Soft Suspend
              </button>
            )}

            <button
              onClick={() => { setOpen(false); onPermanentBan(user) }}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <ShieldExclamationIcon className="w-3.5 h-3.5" /> Permanent Ban
            </button>

            <div className="my-1 border-t border-white/5" />

            <button
              onClick={() => { setOpen(false); onDelete(user._id) }}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/20 rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <TrashIcon className="w-3.5 h-3.5" /> Delete User
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
      return `${day}-${month}-${year}, ${hoursStr}:${minutes} ${actualAmPm}`;
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

  // ── Render ─────────────────────────────────────────────────────────────────
  const activeOnlineCount = Object.keys(onlineUsers).length
  const statTiles = [
    { label: 'Total Accounts', value: totalUsers, icon: UsersIcon, tone: 'text-indigo-400', color: 'from-indigo-500/10 to-indigo-500/5', border: 'border-indigo-500/20' },
    { label: 'Active Sessions', value: activeOnlineCount, icon: SignalIcon, tone: 'text-emerald-400', color: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20' },
    { label: 'Banned users', value: users.filter(u => u.banned).length, icon: ShieldExclamationIcon, tone: 'text-red-400', color: 'from-red-500/10 to-red-500/5', border: 'border-red-500/20' },
  ]

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f0f1a] to-[#0d0d18] p-8"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-[80px]" />
        
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">User Registry</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Manage Users</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400 leading-relaxed">
              Monitor active sessions, perform HWID resets, suspend users, or customize subscription levels across your user database.
            </p>
          </div>

          {selectedApp?._id && (
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user profile..."
                  className="input pl-9 text-xs focus:ring-1 focus:ring-indigo-500 w-full"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:opacity-95 transition-all w-full sm:w-auto"
              >
                <PlusIcon className="h-4 w-4" />
                Create User
              </motion.button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Mini Stats Ribbon */}
      {selectedApp?._id && (
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-3"
        >
          {statTiles.map((tile) => (
            <motion.div
              variants={itemVariants}
              key={tile.label}
              className={`relative overflow-hidden rounded-2xl border ${tile.border} bg-gradient-to-b ${tile.color} p-4 flex items-center justify-between`}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{tile.label}</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-white">{tile.value}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2">
                <tile.icon className={`h-5 w-5 ${tile.tone}`} />
              </div>
            </motion.div>
          ))}
        </motion.section>
      )}

      {loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-16 text-center">
          <UsersIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-base font-bold text-white">No Application Available</p>
          <p className="mt-2 text-xs text-slate-400 max-w-xs mx-auto">
            Please register your first application using the Applications tab before populating user details.
          </p>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-16 text-center">
              <UsersIcon className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-base font-bold text-white font-mono">Empty Registry</p>
              <p className="mt-2 text-xs text-slate-400 max-w-xs mx-auto">
                No user records correspond to this selected environment yet. Create a user above to populate this grid.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-[#0e0e16] overflow-visible">
              <div className="overflow-x-auto">
                {(() => {
                  const showCreatedBy = selectedApp?.team?.length > 0 || users.some(u => u.createdBy)
                  return (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-mono font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Username</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Hardware Token (HWID)</th>
                          <th className="px-6 py-4">Registration</th>
                          <th className="px-6 py-4">Last Active</th>
                          <th className="px-6 py-4">IP Address</th>
                          <th className="px-6 py-4">Expiration</th>
                          {showCreatedBy && <th className="px-6 py-4">Manager</th>}
                          <th className="px-6 py-4">Secure HWID</th>
                          <th className="px-6 py-4 text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.map((user: any, i: number) => (
                          <motion.tr
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.03 }}
                            key={user._id}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                  </span>
                                )}
                                <span className="font-semibold text-white text-sm">{user.username}</span>
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                    {onlineUsers[user._id] ? `${onlineUsers[user._id]}ms` : 'Live'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {user.banned ? (
                                <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/10">Banned</span>
                              ) : user.paused ? (
                                <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/10">Paused</span>
                              ) : user.expiryDate && new Date(user.expiryDate) < new Date() ? (
                                <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/10">Expired</span>
                              ) : (
                                <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">Active</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                              <button
                                onClick={() => {
                                  if (user.hwid) {
                                    navigator.clipboard.writeText(user.hwid);
                                    toast.success('HWID copied to clipboard!');
                                  }
                                }}
                                className="inline-flex items-center gap-1 hover:text-indigo-400 transition-colors cursor-pointer text-left py-1 px-2 bg-white/[0.02] border border-white/5 rounded-lg group-hover:border-white/10"
                                title="Click to copy full HWID"
                              >
                                <ClipboardDocumentIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                                {user.hwid ? `${user.hwid.substring(0, 12)}...` : 'Not set'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-slate-400 font-mono">
                              {formatToDDMMYYYY(user.createdAt, 'Unknown', true)}
                            </td>
                            <td className="px-6 py-4 text-slate-400 font-mono">
                              {formatToDDMMYYYY(user.lastLogin, 'Never', true)}
                            </td>
                            <td className="px-6 py-4 text-slate-400 font-mono">{user.lastIp || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-400 font-mono">
                              {user.paused 
                                ? formatToDDMMYYYY(user.pausedExpiry, 'Lifetime', true)
                                : formatToDDMMYYYY(user.expiryDate, 'Lifetime', true)}
                            </td>
                            {showCreatedBy && (
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] text-slate-300 font-mono text-[10px] border border-white/5">
                                  {getCreatorDisplay(user.createdBy, selectedApp?.userId)}
                                </span>
                              </td>
                            )}
                            <td className="px-6 py-4 text-slate-400">
                              {user.hwidAffected ? (
                                <span className="text-indigo-400 font-bold font-mono">Enabled</span>
                              ) : (
                                <span className="text-slate-600 font-mono">Disabled</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
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
                  )
                })()}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Previous
                </button>
                
                <div className="text-xs font-medium text-slate-500">
                  Page <span className="text-slate-300 font-bold">{currentPage}</span> of <span className="text-slate-300 font-bold">{totalPages || 1}</span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals with Scale/Fade blurs ────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Creation Wizard</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Register Profile</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Username <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="input text-sm"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Access Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="input pr-10 text-sm"
                      placeholder="Optional or custom password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Contact Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="input text-sm"
                    placeholder="Optional address details"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Level Name</label>
                  <input
                    type="text"
                    value={newUser.subscription}
                    onChange={(e) => setNewUser({ ...newUser, subscription: e.target.value })}
                    className="input text-sm"
                    placeholder="default"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">Expirations</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="createLifetime"
                        checked={newUser.isLifetime}
                        onChange={(e) => setNewUser({ ...newUser, isLifetime: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600 rounded"
                      />
                      <label htmlFor="createLifetime" className="text-[11px] text-slate-500 cursor-pointer font-bold uppercase tracking-wider">Lifetime</label>
                    </div>
                  </div>
                  {!newUser.isLifetime && (
                    <input
                      type="datetime-local"
                      value={newUser.expiryDate}
                      onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                      className="input text-sm"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <input
                    type="checkbox"
                    id="hwidAffected"
                    checked={newUser.hwidAffected}
                    onChange={(e) => setNewUser({ ...newUser, hwidAffected: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded flex-shrink-0"
                  />
                  <label htmlFor="hwidAffected" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Enforce Secure HWID Bindings for client validation
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button
                    onClick={createUser}
                    disabled={creating}
                    className="btn btn-primary flex-1 py-3 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 border-none shadow-lg shadow-indigo-900/20"
                  >
                    {creating ? 'Creating...' : 'Register User'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Settings Editor</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Edit Profile details</h2>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Username</label>
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Contact Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="input text-sm"
                    placeholder="Optional email details"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Subscription Level</label>
                  <input
                    type="text"
                    value={editData.subscription}
                    onChange={(e) => setEditData({ ...editData, subscription: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">Expirations</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="editLifetime"
                        checked={editData.isLifetime}
                        onChange={(e) => setEditData({ ...editData, isLifetime: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600 rounded"
                      />
                      <label htmlFor="editLifetime" className="text-[11px] text-slate-500 cursor-pointer font-bold uppercase tracking-wider">Lifetime</label>
                    </div>
                  </div>
                  {!editData.isLifetime && (
                    <input
                      type="datetime-local"
                      value={editData.expiryDate}
                      onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })}
                      className="input text-sm"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <input
                    type="checkbox"
                    id="editHwidAffected"
                    checked={editData.hwidAffected}
                    onChange={(e) => setEditData({ ...editData, hwidAffected: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded flex-shrink-0"
                  />
                  <label htmlFor="editHwidAffected" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Enforce Secure HWID Bindings for validation
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button onClick={saveEdit} className="btn btn-primary flex-1 py-3 text-xs font-bold">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Ban Modal */}
        {showBanModal && banTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBanModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-500 font-mono">Registry Ban</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Permanent Suspension</h2>
                </div>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Suspension Reason <span className="text-slate-600">(Internal logs only)</span></label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="input text-sm"
                    placeholder="e.g. Exploiting client systems..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Notification Message to Client <span className="text-red-400">*</span></label>
                  <textarea
                    value={banMessage}
                    onChange={(e) => setBanMessage(e.target.value)}
                    rows={3}
                    className="input text-sm resize-none py-2"
                    placeholder="This notification will display when client attempts initialization"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <input
                    type="checkbox"
                    id="banIpCheck"
                    checked={banIp}
                    onChange={(e) => setBanIp(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded flex-shrink-0"
                  />
                  <label htmlFor="banIpCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Blacklist Client IP Profile ({banTarget.lastIp || 'unknown address'})
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-red-400" />
                  <p className="text-[11px] leading-relaxed">
                    Executing this restriction completely blacklists all licenses associated with {banTarget.username} permanently.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowBanModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button
                    onClick={executeBan}
                    disabled={banning}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/30"
                  >
                    {banning ? 'Processing...' : 'Execute Ban'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#13131a] border border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${
                  confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-400 border-red-500/10' :
                  confirmModal.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' :
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
                }`}>
                  {confirmModal.type === 'danger' ? <TrashIcon className="h-5 w-5" /> : 
                   confirmModal.type === 'warning' ? <ShieldExclamationIcon className="h-5 w-5" /> : 
                   <ArrowPathIcon className="h-5 w-5" />}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1.5">{confirmModal.title}</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2">
                  {confirmModal.message}
                </p>

                <div className="flex gap-2.5 w-full">
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                      confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                      confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500' :
                      'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
