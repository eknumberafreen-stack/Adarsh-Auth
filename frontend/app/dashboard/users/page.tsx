'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  BoltSlashIcon,
  CheckBadgeIcon,
  CheckIcon,
  ClockIcon,
  CpuChipIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlayCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  TrashIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type ConfirmIconType = 'delete' | 'ban' | 'reset' | 'crash' | 'warning' | 'info'

// ── 3-dot dropdown per user row (with crisp vector icon badges) ────────────────
function UserMenu({ user, onEdit, onBan, onPermanentBan, onUnban, onPause, onResetHwid, onDelete, onForceClose }: any) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; openUp: boolean }>({
    top: 0,
    right: 0,
    openUp: false,
  })
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const scrollHandler = () => setOpen(false)
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', scrollHandler, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', scrollHandler, true)
    }
  }, [])

  const toggleMenu = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const menuHeight = 320
      const openUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight
      setMenuPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        right: Math.max(window.innerWidth - rect.right, 12),
        openUp,
      })
    }
    setOpen((prev) => !prev)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label={`Actions for ${user.username}`}
        className="p-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed w-52 bg-[#11131d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] z-[9999] overflow-hidden p-1.5 space-y-0.5"
          style={{
            top: menuPos.openUp ? undefined : menuPos.top,
            bottom: menuPos.openUp ? window.innerHeight - menuPos.top : undefined,
            right: menuPos.right,
          }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(user) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 group-hover:scale-105 transition-transform">
              <PencilSquareIcon className="w-4 h-4" />
            </span>
            <span>Edit User</span>
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onPause(user) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 group-hover:scale-105 transition-transform">
              {user.paused ? <PlayCircleIcon className="w-4 h-4" /> : <PauseCircleIcon className="w-4 h-4" />}
            </span>
            <span>{user.paused ? 'Unpause' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onResetHwid(user._id) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-500/10 transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-400 group-hover:scale-105 transition-transform">
              <ArrowPathIcon className="w-4 h-4" />
            </span>
            <span>Reset HWID</span>
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onForceClose(user._id) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 group-hover:scale-105 transition-transform">
              <BoltSlashIcon className="w-4 h-4" />
            </span>
            <span>Crash it</span>
          </button>

          <div className="my-1 border-t border-white/[0.06]" />

          {user.banned ? (
            <button
              type="button"
              onClick={() => { setOpen(false); onUnban(user._id) }}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5 group"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 group-hover:scale-105 transition-transform">
                <CheckBadgeIcon className="w-4 h-4" />
              </span>
              <span>Unban</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setOpen(false); onBan(user) }}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-orange-300 hover:bg-orange-500/10 transition-colors flex items-center gap-2.5 group"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 group-hover:scale-105 transition-transform">
                <NoSymbolIcon className="w-4 h-4" />
              </span>
              <span>Ban</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { setOpen(false); onPermanentBan(user) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 group-hover:scale-105 transition-transform">
              <ShieldExclamationIcon className="w-4 h-4" />
            </span>
            <span>Full Ban</span>
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(user._id) }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-2.5 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/35 text-red-400 group-hover:scale-105 transition-transform">
              <TrashIcon className="w-4 h-4" />
            </span>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

function ConfirmModalIcon({ iconType }: { iconType: ConfirmIconType }) {
  switch (iconType) {
    case 'delete':
      return <TrashIcon className="w-7 h-7" />
    case 'ban':
      return <ShieldExclamationIcon className="w-7 h-7" />
    case 'crash':
      return <BoltSlashIcon className="w-7 h-7" />
    case 'reset':
      return <ArrowPathIcon className="w-7 h-7" />
    case 'warning':
      return <ExclamationTriangleIcon className="w-7 h-7" />
    default:
      return <ShieldCheckIcon className="w-7 h-7" />
  }
}

const getCreatorDisplay = (creator: any, appOwnerId?: string) => {
  if (!creator) return 'Owner'
  const creatorId = typeof creator === 'string' ? creator : creator._id
  if (appOwnerId && creatorId === appOwnerId) return 'Owner'
  if (typeof creator === 'object') {
    return creator.username || creator.email || 'Owner'
  }
  return 'Owner'
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const { applications, setApplications, selectedApp, loadingApplications } = useAppStore()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired' | 'banned'>('all')
  const [limit, setLimit] = useState(10)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string | null>>({})
  const onlineIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mass Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  // Bulk Extend Time Modal
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendDays, setExtendDays] = useState('7')
  const [extendHours, setExtendHours] = useState('0')
  const [extendMakeLifetime, setExtendMakeLifetime] = useState(false)

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
    if (!dateStr) return true
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const digits = dateStr.match(/\d+/g)
    if (!digits || digits.length < 3) return false
    let y = parseInt(digits[0]), m = parseInt(digits[1]), day = parseInt(digits[2])
    if (y < 1000 && parseInt(digits[2]) > 1000) {
      day = parseInt(digits[0]); m = parseInt(digits[1]); y = parseInt(digits[2])
    }
    return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === day
  }

  const formatToDDMMYYYY = (dateStr: string | null | undefined, fallback = 'Lifetime', includeTime = false) => {
    if (!dateStr) return fallback
    const d = new Date(dateStr)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()

    if (includeTime) {
      let hours = d.getHours()
      const actualAmPm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      const hoursStr = hours.toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return `${day}-${month}-${year}, ${hoursStr}:${minutes} ${actualAmPm}`
    }
    return `${day}-${month}-${year}`
  }

  // Full Ban Modal (shared for single user OR bulk selection)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banTarget, setBanTarget] = useState<any>(null)
  const [isBulkBanMode, setIsBulkBanMode] = useState(false)
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
    iconType: 'warning' as ConfirmIconType,
    confirmText: 'Confirm'
  })

  // Clear selection when switching applications
  useEffect(() => {
    setSelectedUserIds([])
    setSelectAllMatching(false)
  }, [selectedApp?._id])

  useEffect(() => {
    if (selectedApp?._id) {
      setCurrentPage(1)
      setSelectAllMatching(false)
      loadUsers(1, searchTerm, statusFilter, limit)
      pollOnlineStatus()
      if (onlineIntervalRef.current) clearInterval(onlineIntervalRef.current)
      onlineIntervalRef.current = setInterval(pollOnlineStatus, 5000)
    }
    return () => {
      if (onlineIntervalRef.current) clearInterval(onlineIntervalRef.current)
    }
  }, [selectedApp?._id, searchTerm, statusFilter, limit])

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

  const loadUsers = async (page = currentPage, search = searchTerm, status = statusFilter, pageLimit = limit) => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const res = await api.get(
        `/users/application/${selectedApp._id}?page=${page}&limit=${pageLimit}&search=${encodeURIComponent(search)}&status=${status}`
      )
      setUsers(res.data.users)
      setTotalPages(res.data.pagination.pages)
      setTotalUsers(res.data.pagination.total)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const syncGlobalAppCounts = async () => {
    try {
      const res = await api.get('/applications?all=true')
      if (res.data?.applications) setApplications(res.data.applications)
    } catch { /* silent */ }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadUsers(newPage, searchTerm, statusFilter, limit)
  }

  // ── Mass Selection Helpers ─────────────────────────────────────────────────
  const pageUserIds = users.map((u) => u._id)
  const selectedOnPageCount = selectAllMatching
    ? users.length
    : pageUserIds.filter((id) => selectedUserIds.includes(id)).length
  const allOnPageSelected = users.length > 0 && selectedOnPageCount === users.length
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected
  const effectiveSelectedCount = selectAllMatching ? totalUsers : selectedUserIds.length

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someOnPageSelected
    }
  }, [someOnPageSelected])

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected || selectAllMatching) {
      setSelectAllMatching(false)
      setSelectedUserIds((prev) => prev.filter((id) => !pageUserIds.includes(id)))
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageUserIds])))
    }
  }

  const toggleSelectUser = (userId: string) => {
    if (selectAllMatching) {
      // Drop out of all-matching into explicit selection of visible page minus this user
      setSelectAllMatching(false)
      setSelectedUserIds(pageUserIds.filter((id) => id !== userId))
      return
    }
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const clearSelection = () => {
    setSelectedUserIds([])
    setSelectAllMatching(false)
  }

  const executeBulkAction = async (
    action: string,
    payload: Record<string, any> = {},
    successLabel?: string
  ) => {
    if (!selectedApp?._id || effectiveSelectedCount === 0) return
    setBulkProcessing(true)
    try {
      const res = await api.post(`/users/application/${selectedApp._id}/bulk`, {
        action,
        userIds: selectAllMatching ? [] : selectedUserIds,
        selectAllMatching,
        search: searchTerm,
        status: statusFilter,
        payload,
      })

      const data = res.data
      if (action === 'force-close') {
        const offlineNote = data.offlineSkipped > 0 ? ` (${data.offlineSkipped} offline)` : ''
        toast.success(`Crash sent to ${data.affected} online user(s)${offlineNote}`)
      } else if (action === 'ban') {
        toast.success(`Full banned ${data.affected} user(s) • ${data.licensesBlacklisted || 0} license(s) blacklisted`)
      } else if (action === 'extend-time') {
        const skippedNote = data.skippedLifetime > 0 ? ` (${data.skippedLifetime} already lifetime)` : ''
        toast.success(`Updated time for ${data.affected} user(s)${skippedNote}`)
      } else if (successLabel) {
        toast.success(`${successLabel} (${data.affected} affected)`)
      } else {
        toast.success(data.message || 'Bulk action completed')
      }

      clearSelection()
      await loadUsers(currentPage, searchTerm, statusFilter, limit)
      if (action === 'delete') {
        await syncGlobalAppCounts()
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Bulk operation failed')
    } finally {
      setBulkProcessing(false)
    }
  }

  const confirmBulkAction = ({
    action,
    title,
    message,
    type,
    iconType,
    confirmText,
    successLabel,
  }: {
    action: string
    title: string
    message: string
    type: 'danger' | 'warning' | 'info'
    iconType: ConfirmIconType
    confirmText: string
    successLabel: string
  }) => {
    setConfirmModal({
      show: true,
      title,
      message,
      type,
      iconType,
      confirmText,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, show: false }))
        await executeBulkAction(action, {}, successLabel)
      },
    })
  }

  // ── Single & Shared Actions ────────────────────────────────────────────────
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
      syncGlobalAppCounts()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create user')
    } finally { setCreating(false) }
  }

  const openBanModal = (user: any) => {
    setIsBulkBanMode(false)
    setBanTarget(user)
    setBanReason('')
    setBanMessage('')
    setBanIp(false)
    setShowBanModal(true)
  }

  const openBulkBanModal = () => {
    setIsBulkBanMode(true)
    setBanTarget(null)
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
      iconType: 'ban',
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
    if (isBulkBanMode) {
      setBanning(true)
      setShowBanModal(false)
      await executeBulkAction('ban', {
        reason: banReason || 'Manual ban (bulk)',
        banMessage: banMessage || null,
        banIp,
      })
      setBanning(false)
      return
    }

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
      iconType: 'reset',
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
      iconType: 'crash',
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
      iconType: 'delete',
      confirmText: 'Delete User',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`)
          toast.success('User deleted')
          setSelectedUserIds((prev) => prev.filter((uid) => uid !== id))
          loadUsers()
          syncGlobalAppCounts()
        }
        catch (e: any) { toast.error(e.response?.data?.error || 'Failed to delete') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const submitExtendTime = async () => {
    const days = parseInt(extendDays || '0', 10) || 0
    const hours = parseInt(extendHours || '0', 10) || 0
    if (!extendMakeLifetime && days <= 0 && hours <= 0) {
      return toast.error('Enter positive days/hours or select Lifetime')
    }
    setShowExtendModal(false)
    await executeBulkAction('extend-time', {
      days,
      hours,
      makeLifetime: extendMakeLifetime,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        .premium-card-indigo {
          background: linear-gradient(180deg, rgba(16, 17, 26, 0.75) 0%, rgba(9, 10, 15, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.18);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.55), 0 0 15px rgba(99, 102, 241, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-input {
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          color: #fff !important;
          padding: 0.75rem 1rem !important;
          transition: all 0.2s ease !important;
          width: 100%;
        }
        .premium-input:focus {
          border-color: rgba(99, 102, 241, 0.5) !important;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.2) !important;
          background: rgba(0, 0, 0, 0.55) !important;
          outline: none !important;
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Users</h1>
          {selectedApp?._id && (
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Managing <span className="text-indigo-300 font-bold">{selectedApp.name}</span> • {totalUsers} total user(s)
            </p>
          )}
        </div>

        {selectedApp?._id && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search username, HWID, IP..."
                className="w-64 pl-10 pr-8 py-2.5 bg-black/45 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-500 text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Rows per page */}
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Users per page"
              className="h-10 px-3 bg-black/45 border border-white/10 rounded-xl text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500/50"
            >
              <option value={10} className="bg-[#0d0e16]">10 / page</option>
              <option value={25} className="bg-[#0d0e16]">25 / page</option>
              <option value={50} className="bg-[#0d0e16]">50 / page</option>
              <option value={100} className="bg-[#0d0e16]">100 / page</option>
            </select>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Create User
            </button>
          </div>
        )}
      </div>

      {/* Status Quick Filter Bar */}
      {selectedApp?._id && !loadingApplications && applications.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'All Users' },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'expired', label: 'Expired' },
              { id: 'banned', label: 'Banned' },
            ] as const).map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    active
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {effectiveSelectedCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-xl">
              <UsersIcon className="w-4 h-4" />
              <span>{effectiveSelectedCount} selected</span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-1 text-slate-400 hover:text-white underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {loadingApplications ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Create an application first</div>
      ) : (
        <>
          {/* Smart Select-All-Across-Pages Banner */}
          {users.length > 0 && allOnPageSelected && totalUsers > users.length && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200">
              {selectAllMatching ? (
                <>
                  <span>
                    All <strong className="text-white">{totalUsers}</strong> matching users across all pages are selected.
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="font-bold text-indigo-300 hover:text-white underline"
                  >
                    Clear selection
                  </button>
                </>
              ) : (
                <>
                  <span>
                    All <strong className="text-white">{users.length}</strong> users on this page are selected.
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectAllMatching(true)}
                    className="font-bold text-indigo-300 hover:text-white underline"
                  >
                    Select all {totalUsers} matching users
                  </button>
                </>
              )}
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="premium-card-indigo rounded-2xl text-center py-14 text-slate-400 text-sm">
              No users found {statusFilter !== 'all' || searchTerm ? 'for the active filter' : 'yet'}.
            </div>
          ) : (
            <div className="premium-card-indigo rounded-2xl overflow-x-auto p-0">
              {(() => {
                const showCreatedBy = selectedApp?.team?.length > 0 || users.some(u => u.createdBy)
                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <th className="pl-5 pr-2 py-4 w-10">
                          <label className="inline-flex items-center cursor-pointer" title="Select all on this page">
                            <input
                              ref={selectAllCheckboxRef}
                              type="checkbox"
                              checked={allOnPageSelected || selectAllMatching}
                              onChange={toggleSelectAllOnPage}
                              className="w-4 h-4 rounded border-white/20 bg-black/50 accent-indigo-500 cursor-pointer"
                            />
                          </label>
                        </th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Username</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">HWID</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Created</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Last Login</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Last IP</th>
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Expiry</th>
                        {showCreatedBy && (
                          <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Created By</th>
                        )}
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">HWID Lock</th>
                        <th className="px-4 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users.map((user: any, i: number) => {
                        const isRowSelected = selectAllMatching || selectedUserIds.includes(user._id)
                        return (
                          <motion.tr
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.25) }}
                            key={user._id}
                            className={`transition-colors ${
                              isRowSelected ? 'bg-indigo-500/[0.08] hover:bg-indigo-500/[0.12]' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="pl-5 pr-2 py-4">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => toggleSelectUser(user._id)}
                                aria-label={`Select user ${user.username}`}
                                className="w-4 h-4 rounded border-white/20 bg-black/50 accent-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* Username */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2.5">
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                  </span>
                                )}
                                <span className="font-bold text-slate-200 text-sm">{user.username}</span>
                                {onlineUsers[user._id] !== undefined && (
                                  <span className="text-xs text-emerald-400/80 font-bold ml-1">
                                    {onlineUsers[user._id] ? `${onlineUsers[user._id]}ms` : 'Live'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4">
                              {user.banned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300 uppercase tracking-wider">
                                  <NoSymbolIcon className="w-3.5 h-3.5 text-rose-400" />
                                  Banned
                                </span>
                              ) : user.paused ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 uppercase tracking-wider">
                                  <PauseCircleIcon className="w-3.5 h-3.5 text-purple-400" />
                                  Paused
                                </span>
                              ) : user.expiryDate && new Date(user.expiryDate) < new Date() ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300 uppercase tracking-wider">
                                  <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
                                  Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  Active
                                </span>
                              )}
                            </td>

                            {/* HWID */}
                            <td className="px-4 py-4 font-mono text-xs text-slate-400">
                              <button
                                onClick={() => {
                                  if (user.hwid) {
                                    navigator.clipboard.writeText(user.hwid)
                                    toast.success('HWID copied!')
                                  }
                                }}
                                className="hover:text-indigo-400 transition-colors cursor-pointer text-left"
                                title="Click to copy full HWID"
                              >
                                {user.hwid ? `${user.hwid.substring(0, 12)}…` : 'Not set'}
                              </button>
                            </td>

                            {/* Created */}
                            <td className="px-4 py-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                              {formatToDDMMYYYY(user.createdAt, 'Unknown', true)}
                            </td>

                            {/* Last Login */}
                            <td className="px-4 py-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                              {formatToDDMMYYYY(user.lastLogin, 'Never', true)}
                            </td>

                            {/* Last IP */}
                            <td className="px-4 py-4 text-xs font-mono text-slate-400">
                              {user.lastIp || 'N/A'}
                            </td>

                            {/* Expiry */}
                            <td className="px-4 py-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                              {user.paused
                                ? formatToDDMMYYYY(user.pausedExpiry, 'Lifetime', true)
                                : formatToDDMMYYYY(user.expiryDate, 'Lifetime', true)}
                            </td>

                            {/* Created By */}
                            {showCreatedBy && (
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                  {getCreatorDisplay(user.createdBy, selectedApp?.userId)}
                                </span>
                              </td>
                            )}

                            {/* HWID Lock */}
                            <td className="px-4 py-4">
                              {user.hwidAffected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                  <CpuChipIcon className="w-3.5 h-3.5 text-indigo-400" />
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  No
                                </span>
                              )}
                            </td>

                            {/* Action Menu */}
                            <td className="px-4 py-4 text-right">
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
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-4 bg-black/20 border-t border-white/5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>

                <div className="text-xs font-medium text-gray-500">
                  Showing page <span className="text-gray-200">{currentPage}</span> of <span className="text-gray-200">{totalPages || 1}</span>
                  <span className="mx-2 text-slate-700">•</span>
                  <span className="text-gray-300">{totalUsers}</span> users
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Floating Mass-Action Bar ───────────────────────────────────────── */}
      {effectiveSelectedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 lg:left-[calc(50%+145px)] z-40 w-[calc(100%-2rem)] max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/35 bg-[#0c0e18]/95 backdrop-blur-2xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(99,102,241,0.2)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/35 text-indigo-300">
                <CheckIcon className="w-4 h-4 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">
                  {effectiveSelectedCount} User{effectiveSelectedCount === 1 ? '' : 's'} Selected
                </p>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() => executeBulkAction('pause', {}, 'Paused selected users')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <PauseCircleIcon className="w-4 h-4" />
                Pause
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() => executeBulkAction('unpause', {}, 'Unpaused selected users')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <PlayCircleIcon className="w-4 h-4" />
                Unpause
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() =>
                  confirmBulkAction({
                    action: 'reset-hwid',
                    title: `Reset HWID for ${effectiveSelectedCount} User(s)?`,
                    message: 'This clears the bound Hardware ID and disconnects active sessions for all selected users.',
                    type: 'info',
                    iconType: 'reset',
                    confirmText: 'Reset HWIDs',
                    successLabel: 'HWIDs reset',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset HWID
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() => setShowExtendModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                <ClockIcon className="w-4 h-4" />
                Add Time
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() =>
                  confirmBulkAction({
                    action: 'force-close',
                    title: `Crash ${effectiveSelectedCount} Selected User(s)?`,
                    message: 'Sends a force-close signal to every currently online user in your selection.',
                    type: 'danger',
                    iconType: 'crash',
                    confirmText: 'Crash Selected',
                    successLabel: 'Crash command sent',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <BoltSlashIcon className="w-4 h-4" />
                Crash
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() =>
                  confirmBulkAction({
                    action: 'soft-ban',
                    title: `Soft Ban ${effectiveSelectedCount} User(s)?`,
                    message: 'Selected users will be banned until unbanned or PC/HWID reset.',
                    type: 'warning',
                    iconType: 'ban',
                    confirmText: 'Ban Selected',
                    successLabel: 'Users soft-banned',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <NoSymbolIcon className="w-4 h-4" />
                Ban
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={openBulkBanModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <ShieldExclamationIcon className="w-4 h-4" />
                Full Ban
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() => executeBulkAction('unban', {}, 'Unbanned selected users')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <CheckBadgeIcon className="w-4 h-4" />
                Unban
              </button>

              <button
                type="button"
                disabled={bulkProcessing}
                onClick={() =>
                  confirmBulkAction({
                    action: 'delete',
                    title: `Delete ${effectiveSelectedCount} User(s)?`,
                    message: `Are you sure you want to permanently delete ${effectiveSelectedCount} selected user(s)? This cannot be undone.`,
                    type: 'danger',
                    iconType: 'delete',
                    confirmText: `Delete ${effectiveSelectedCount}`,
                    successLabel: 'Deleted selected users',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 border border-red-500/40 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Extend Time Modal ────────────────────────────────────────── */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <ClockIcon className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Add Time to Selected Users</h2>
                  <p className="text-xs text-slate-400">Applying to {effectiveSelectedCount} user(s)</p>
                </div>
              </div>
              <button onClick={() => setShowExtendModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-3 bg-dark-bg border border-dark-border rounded-xl">
                <label htmlFor="bulkLifetimeCheck" className="text-sm font-medium text-slate-200 cursor-pointer">
                  Upgrade selected users to Lifetime
                </label>
                <input
                  type="checkbox"
                  id="bulkLifetimeCheck"
                  checked={extendMakeLifetime}
                  onChange={(e) => setExtendMakeLifetime(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500"
                />
              </div>

              {!extendMakeLifetime && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Days to Add</label>
                    <input
                      type="number"
                      min="0"
                      value={extendDays}
                      onChange={(e) => setExtendDays(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Hours to Add</label>
                    <input
                      type="number"
                      min="0"
                      value={extendHours}
                      onChange={(e) => setExtendHours(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowExtendModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={submitExtendTime} className="btn btn-primary flex-1">Apply Time</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card max-w-md w-full">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Expiration</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="createLifetime" checked={newUser.isLifetime} onChange={(e) => setNewUser({ ...newUser, isLifetime: e.target.checked })} className="w-3.5 h-3.5 accent-primary-600" />
                    <label htmlFor="createLifetime" className="text-xs text-gray-400 cursor-pointer">Lifetime Access</label>
                  </div>
                </div>
                {!newUser.isLifetime && (
                  <input type="datetime-local" value={newUser.expiryDate} onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })} className="input" />
                )}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card max-w-md w-full">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Expiration</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="editLifetime" checked={editData.isLifetime} onChange={(e) => setEditData({ ...editData, isLifetime: e.target.checked })} className="w-3.5 h-3.5 accent-primary-600" />
                    <label htmlFor="editLifetime" className="text-xs text-gray-400 cursor-pointer">Lifetime Access</label>
                  </div>
                </div>
                {!editData.isLifetime && (
                  <input type="datetime-local" value={editData.expiryDate} onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })} className="input" />
                )}
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

      {/* ── Full Ban Modal (Single or Bulk) ──────────────────────────────── */}
      {showBanModal && (banTarget || isBulkBanMode) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modal-card w-full max-w-md">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
                    <ShieldExclamationIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-red-400">
                    {isBulkBanMode ? `Full Ban (${effectiveSelectedCount} Users)` : 'Full Ban'}
                  </h2>
                </div>
                <p className="text-sm text-gray-400 ml-10">
                  Banning:{' '}
                  <span className="text-white font-semibold">
                    {isBulkBanMode ? `${effectiveSelectedCount} selected user(s)` : banTarget?.username}
                  </span>
                </p>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ban Reason <span className="text-gray-500 font-normal">(internal)</span>
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="e.g. Cheating, Refund abuse..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Message to User <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={banMessage}
                  onChange={(e) => setBanMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all resize-none"
                  placeholder="Message shown to user..."
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl">
                <input
                  type="checkbox"
                  id="banIpCheck"
                  checked={banIp}
                  onChange={(e) => setBanIp(e.target.checked)}
                  className="w-4 h-4 accent-red-600 flex-shrink-0"
                />
                <label htmlFor="banIpCheck" className="text-sm cursor-pointer">
                  {isBulkBanMode
                    ? "Also ban all selected users' last known IP addresses"
                    : `Also ban user's IP address (${banTarget?.lastIp || 'unknown'})`}
                </label>
              </div>

              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">
                  Bans {isBulkBanMode ? 'all selected users' : 'the user'} and blacklists their licenses permanently.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBanModal(false)} className="flex-1 py-3 px-4 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-xl text-sm font-semibold text-gray-300 transition-all">
                  Cancel
                </button>
                <button
                  onClick={executeBan}
                  disabled={banning}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  {banning ? 'Banning...' : isBulkBanMode ? `Full Ban (${effectiveSelectedCount})` : 'Full Ban'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirmation Modal (with Crisp Vector Icons) ──────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="modal-card w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${
                confirmModal.type === 'danger' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                confirmModal.type === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                'bg-sky-500/15 border-sky-500/30 text-sky-400'
              }`}>
                <ConfirmModalIcon iconType={confirmModal.iconType} />
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
                    confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' :
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
