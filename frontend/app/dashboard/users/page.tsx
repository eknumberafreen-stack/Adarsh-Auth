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
  TrashIcon,
  CheckIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
} as const

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
        className="p-2 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/5 text-slate-400 hover:text-white transition-all"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed mt-1 w-48 bg-[#12121a] border border-white/5 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1.5 backdrop-blur-md"
            style={{
              top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
              right: window.innerWidth - (ref.current ? ref.current.getBoundingClientRect().right : 0)
            }}
          >
            <button
              onClick={() => { setOpen(false); onEdit(user) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition-all flex items-center gap-2"
            >
              <PencilIcon className="w-3.5 h-3.5 text-indigo-400" /> Edit Credentials
            </button>
            
            <button
              onClick={() => { setOpen(false); onPause(user) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-400/5 transition-all flex items-center gap-2"
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
              className="w-full text-left px-4 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-400/5 transition-all flex items-center gap-2"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" /> Reset HWID
            </button>

            <button
              onClick={() => { setOpen(false); onForceClose(user._id) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-400/5 transition-all flex items-center gap-2"
            >
              <BoltIcon className="w-3.5 h-3.5 animate-pulse" /> Crash it
            </button>

            <div className="border-t border-white/5 my-1" />

            {user.banned ? (
              <button
                onClick={() => { setOpen(false); onUnban(user._id) }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-400/5 transition-all flex items-center gap-2"
              >
                <CheckIcon className="w-3.5 h-3.5" /> Lift Ban
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onBan(user) }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-400/5 transition-all flex items-center gap-2"
              >
                <NoSymbolIcon className="w-3.5 h-3.5" /> Ban Session
              </button>
            )}

            <button
              onClick={() => { setOpen(false); onPermanentBan(user) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-400/5 transition-all flex items-center gap-2"
            >
              <ShieldExclamationIcon className="w-3.5 h-3.5" /> Full Ban
            </button>

            <div className="border-t border-white/5 my-1" />

            <button
              onClick={() => { setOpen(false); onDelete(user._id) }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-2"
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header section with glass background & glow */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f0f1a] to-[#0d0d18] p-8 shadow-xl"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">User Operations</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Users Registry</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400 leading-relaxed">
              Monitor, ban, pause, and configure authentication profiles for all clients bound to the current application scope.
            </p>
          </div>
          {selectedApp?._id && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by username..."
                  className="pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-full sm:w-64 transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:opacity-95 transition-all"
              >
                <PlusIcon className="h-4.5 w-4.5" />
                Create User
              </motion.button>
            </div>
          )}
        </div>
      </motion.section>

      {loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
          <CommandLineIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-base font-bold text-white">Create an application first</p>
          <p className="mt-2 text-xs text-slate-400">You must register an application in the Applications registry before managing users.</p>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#ffaa00]/10 bg-[#ffaa00]/5 p-12 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-[#ffaa00]/50" />
              <p className="mt-4 text-base font-bold text-white">No Users Found</p>
              <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
                No user profiles match your search criteria, or no users are currently assigned to this application scope.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="rounded-3xl border border-white/10 bg-[#0e0e16] overflow-hidden shadow-2xl"
            >
              <div className="overflow-x-auto">
                {(() => {
                  const showCreatedBy = selectedApp?.team?.length > 0 || users.some(u => u.createdBy)
                  return (
                    <table className="w-full text-xs font-semibold text-slate-300">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01] uppercase tracking-[0.1em] text-slate-500">
                          <th className="text-left px-6 py-4">Username</th>
                          <th className="text-left px-6 py-4">Status</th>
                          <th className="text-left px-6 py-4">HWID Reference</th>
                          <th className="text-left px-6 py-4">Created Date</th>
                          <th className="text-left px-6 py-4">Last Connection</th>
                          <th className="text-left px-6 py-4">Last IP Route</th>
                          <th className="text-left px-6 py-4">Access Expiry</th>
                          {showCreatedBy && (
                            <th className="text-left px-6 py-4">Origin Maker</th>
                          )}
                          <th className="text-left px-6 py-4">HWID Lock</th>
                          <th className="px-6 py-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.map((user: any, i: number) => (
                          <motion.tr 
                            variants={rowVariants}
                            key={user._id} 
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                {onlineUsers[user._id] !== undefined ? (
                                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                                  </span>
                                ) : (
                                  <span className="h-2.5 w-2.5 rounded-full bg-slate-700 shrink-0" />
                                )}
                                <span className="font-bold text-white text-[13px]">{user.username}</span>
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                    {onlineUsers[user._id] ? `${onlineUsers[user._id]}ms` : 'Live'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {user.banned ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Banned
                                </span>
                              ) : user.paused ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Paused
                                </span>
                              ) : user.expiryDate && new Date(user.expiryDate) < new Date() ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                  Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                              <button
                                onClick={() => {
                                  if (user.hwid) {
                                    navigator.clipboard.writeText(user.hwid);
                                    toast.success('HWID copied!');
                                  }
                                }}
                                className="hover:text-indigo-400 transition-colors cursor-pointer text-left focus:outline-none"
                                title="Click to copy full HWID"
                              >
                                {user.hwid ? `${user.hwid.substring(0, 12)}...` : 'Not set'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-[11px]">
                              {formatToDDMMYYYY(user.createdAt, 'Unknown', true)}
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-[11px]">
                              {formatToDDMMYYYY(user.lastLogin, 'Never', true)}
                            </td>
                            <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">{user.lastIp || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-400 text-[11px]">
                              {user.paused 
                                ? formatToDDMMYYYY(user.pausedExpiry, 'Lifetime', true)
                                : formatToDDMMYYYY(user.expiryDate, 'Lifetime', true)}
                            </td>
                            {showCreatedBy && (
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-400 text-[10px] border border-white/5">
                                  {getCreatorDisplay(user.createdBy, selectedApp?.userId)}
                                </span>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              {user.hwidAffected ? (
                                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/10">Locked</span>
                              ) : (
                                <span className="text-slate-500 font-bold bg-white/[0.02] px-2 py-0.5 rounded-lg border border-white/5">None</span>
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
              <div className="flex items-center justify-between px-6 py-4 bg-black/45 border-t border-white/5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="text-xs font-medium text-slate-500">
                  Page <span className="text-slate-300">{currentPage}</span> of <span className="text-slate-300">{totalPages || 1}</span>
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Modals with scale & blur overlays ────────────────────────────── */}
      <AnimatePresence>
        
        {/* Create User Modal */}
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
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Creation Panel</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Register Profile</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Username <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="input text-sm"
                    placeholder="User profile identity"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="input text-sm pr-10"
                      placeholder="Access security key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Identity</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="input text-sm"
                    placeholder="Enter email (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subscription Level</label>
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
                    <label className="block text-xs font-semibold text-slate-400">Access Expiry</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="createLifetime"
                        checked={newUser.isLifetime}
                        onChange={(e) => setNewUser({ ...newUser, isLifetime: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600 rounded"
                      />
                      <label htmlFor="createLifetime" className="text-[10px] text-slate-400 font-bold cursor-pointer uppercase tracking-wider">Lifetime</label>
                    </div>
                  </div>
                  {!newUser.isLifetime && (
                    <input
                      type="datetime-local"
                      value={newUser.expiryDate}
                      onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                      className="input text-sm text-slate-300"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="hwidAffected"
                    checked={newUser.hwidAffected}
                    onChange={(e) => setNewUser({ ...newUser, hwidAffected: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <label htmlFor="hwidAffected" className="text-xs font-bold text-slate-400 cursor-pointer">Enforce Hardware ID (HWID) Lock</label>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button onClick={createUser} disabled={creating} className="btn btn-primary flex-1 py-3 text-xs">
                    {creating ? 'Registering...' : 'Create Account'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
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
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Settings Editor</p>
                  <h2 className="text-xl font-bold text-white mt-0.5">Edit Profile</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Scope: {editTarget.username}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Username Identifier</label>
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Identity</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="input text-sm"
                    placeholder="Enter email (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subscription Level</label>
                  <input
                    type="text"
                    value={editData.subscription}
                    onChange={(e) => setEditData({ ...editData, subscription: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400">Expiration Status</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="editLifetime"
                        checked={editData.isLifetime}
                        onChange={(e) => setEditData({ ...editData, isLifetime: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600 rounded"
                      />
                      <label htmlFor="editLifetime" className="text-[10px] text-slate-400 font-bold cursor-pointer uppercase tracking-wider">Lifetime</label>
                    </div>
                  </div>
                  {!editData.isLifetime && (
                    <input
                      type="datetime-local"
                      value={editData.expiryDate}
                      onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })}
                      className="input text-sm text-slate-300"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="editHwidAffected"
                    checked={editData.hwidAffected}
                    onChange={(e) => setEditData({ ...editData, hwidAffected: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <label htmlFor="editHwidAffected" className="text-xs font-bold text-slate-400 cursor-pointer">Enforce Hardware ID (HWID) Lock</label>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button onClick={saveEdit} className="btn btn-primary flex-1 py-3 text-xs">
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
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <ShieldExclamationIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">Security Override</p>
                    <h2 className="text-xl font-bold text-white mt-0.5">Permanent Ban</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-1.5 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Internal Reason Reference
                  </label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="input text-sm"
                    placeholder="e.g. Chargeback, Terms violation..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Ban Description to Client <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={banMessage}
                    onChange={(e) => setBanMessage(e.target.value)}
                    rows={3}
                    className="input text-sm resize-none"
                    placeholder="This notification will be displayed on the client authentication window."
                  />
                </div>

                <div className="flex items-center gap-2.5 p-3.5 bg-black/45 border border-white/5 rounded-2xl">
                  <input
                    type="checkbox"
                    id="banIpCheck"
                    checked={banIp}
                    onChange={(e) => setBanIp(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded flex-shrink-0"
                  />
                  <label htmlFor="banIpCheck" className="text-xs font-bold text-slate-400 cursor-pointer">
                    Blacklist Client Route IP ({banTarget.lastIp || 'unknown'})
                  </label>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <InformationCircleIcon className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300 leading-relaxed">
                    Executing a full ban immediately terminates all active sockets, voids licensing access, and locks future client handshakes permanently.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button onClick={() => setShowBanModal(false)} className="btn btn-secondary flex-1 py-3 text-xs">
                    Cancel
                  </button>
                  <button
                    onClick={executeBan}
                    disabled={banning}
                    className="btn btn-danger flex-1 py-3 text-xs bg-red-600 hover:bg-red-500"
                  >
                    {banning ? 'Executing Ban...' : 'Confirm Permanent Ban'}
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
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
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
                   confirmModal.type === 'warning' ? <ExclamationTriangleIcon className="h-5 w-5" /> : 
                   <ArrowPathIcon className="h-5 w-5 animate-spin-hover" />}
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
