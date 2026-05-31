'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  XMarkIcon, 
  EllipsisVerticalIcon, 
  DocumentDuplicateIcon,
  KeyIcon,
  TagIcon,
  ClockIcon,
  UserIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

// ── Custom Dropdown Menu per license row ───────────────────────────────────────────
function LicenseMenu({ license, onEdit, onPause, onRevoke, onBlacklist, onDelete, onCopy }: any) {
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
            <button onClick={() => { setOpen(false); onCopy(license.key) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2.5">
              <span>📋</span> Copy Key
            </button>
            <button onClick={() => { setOpen(false); onEdit(license) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2.5">
              <span>✏️</span> Edit License
            </button>
            <button onClick={() => { setOpen(false); onPause(license) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2.5">
              <span>{license.paused ? '▶️' : '⏸️'}</span> {license.paused ? 'Unpause Key' : 'Pause Key'}
            </button>
            {!license.revoked ? (
              <button onClick={() => { setOpen(false); onRevoke(license._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2.5">
                <span>🚫</span> Ban/Revoke
              </button>
            ) : (
              <button onClick={() => { setOpen(false); onRevoke(license._id, true) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2.5">
                <span>✅</span> Unban Key
              </button>
            )}
            <button onClick={() => { setOpen(false); onBlacklist(license) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
              <span>⛔</span> Hardware Ban
            </button>
            <div className="h-px bg-white/[0.05] my-1" />
            <button onClick={() => { setOpen(false); onDelete(license._id) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/15 transition-colors flex items-center gap-2.5">
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

const formatToDDMMYYYY = (dateStr: string | null | undefined, fallback = 'Never', includeTime = false) => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallback;
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
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Licenses() {
  const { applications, selectedApp } = useAppStore()
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLicenses, setTotalLicenses] = useState(0)
  const limit = 20

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [form, setForm] = useState({
    count: 1, mask: '', uppercase: true,
    subscriptionLevel: 1, note: '',
    expiryUnit: 'days', expiryDuration: 30
  })

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editData, setEditData] = useState({ note: '', subscriptionLevel: 1, expiryUnit: 'days', expiryDuration: 30 })

  // Blacklist modal
  const [showBlacklistModal, setShowBlacklistModal] = useState(false)
  const [blacklistTarget, setBlacklistTarget] = useState<any>(null)
  const [blacklistReason, setBlacklistReason] = useState('')

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: 'Confirm'
  })

  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([])

  useEffect(() => { 
    if (selectedApp?._id) {
      setCurrentPage(1)
      loadLicenses(1) 
    } 
  }, [selectedApp?._id])

  const loadLicenses = async (page = currentPage) => {
    if (!selectedApp?._id) return
    setLoading(true)
    try {
      const res = await api.get(`/licenses/application/${selectedApp._id}?page=${page}&limit=${limit}`)
      setLicenses(res.data.licenses)
      setTotalPages(res.data.pagination.pages)
      setTotalLicenses(res.data.pagination.total)
      setSelectedLicenseIds([]) // reset selections
    } catch { toast.error('Failed to load licenses') }
    finally { setLoading(false) }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadLicenses(newPage)
  }

  const handleBulkAction = async (action: 'revoke' | 'unrevoke' | 'pause' | 'unpause' | 'delete') => {
    if (selectedLicenseIds.length === 0) return toast.error('No licenses selected')

    const execute = async () => {
      try {
        await api.post('/licenses/bulk-action', {
          licenseIds: selectedLicenseIds,
          action,
          applicationId: selectedApp._id
        })
        toast.success(`Bulk action '${action}' successfully completed on ${selectedLicenseIds.length} license(s).`)
        setSelectedLicenseIds([])
        loadLicenses()
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'Bulk action failed')
      }
      setConfirmModal(prev => ({ ...prev, show: false }))
    }

    if (action === 'delete') {
      setConfirmModal({
        show: true,
        title: 'Bulk Delete Keys?',
        message: `Are you sure you want to permanently delete all ${selectedLicenseIds.length} selected license keys? This is irreversible!`,
        type: 'danger',
        confirmText: 'Delete Selected',
        onConfirm: execute
      })
    } else if (action === 'revoke') {
      setConfirmModal({
        show: true,
        title: 'Bulk Ban/Revoke Keys?',
        message: `Are you sure you want to revoke all ${selectedLicenseIds.length} selected license keys?`,
        type: 'warning',
        confirmText: 'Revoke Selected',
        onConfirm: execute
      })
    } else {
      execute()
    }
  }

  const handleBulkCopyKeys = () => {
    if (selectedLicenseIds.length === 0) return toast.error('No licenses selected')
    const selectedKeys = licenses
      .filter(l => selectedLicenseIds.includes(l._id))
      .map(l => l.key)
      .join('\n')
    
    navigator.clipboard.writeText(selectedKeys)
    toast.success(`Copied ${selectedLicenseIds.length} key(s) to clipboard!`)
  }

  const handleDeleteAllLicenses = async () => {
    setConfirmModal({
      show: true,
      title: 'DELETE ALL LICENSES?',
      message: `DANGER: Are you sure you want to delete ALL licenses for "${selectedApp.name}"? This will permanently delete all keys. This cannot be undone!`,
      type: 'danger',
      confirmText: 'DELETE ALL',
      onConfirm: async () => {
        try {
          await api.delete(`/licenses/application/${selectedApp._id}/all`)
          toast.success('All application licenses successfully deleted.')
          loadLicenses()
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Failed to delete all licenses')
        }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const generateLicenses = async () => {
    if (!selectedApp?._id) return
    try {
      await api.post('/licenses/generate', {
        applicationId: selectedApp._id,
        count: form.count,
        mask: form.mask || null,
        uppercase: form.uppercase,
        subscriptionLevel: form.subscriptionLevel,
        note: form.note || null,
        expiryUnit: form.expiryUnit,
        expiryDuration: form.expiryUnit !== 'lifetime' ? form.expiryDuration : null
      })
      toast.success(`${form.count} license(s) generated!`)
      setShowGenerateModal(false)
      loadLicenses()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to generate')
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Copied!')
  }

  const openEditModal = (license: any) => {
    setEditTarget(license)
    setEditData({
      note: license.note || '',
      subscriptionLevel: license.subscriptionLevel || 1,
      expiryUnit: license.expiryUnit || 'days',
      expiryDuration: license.expiryDuration || 30
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    try {
      await api.patch(`/licenses/${editTarget._id}`, editData)
      toast.success('License updated!')
      setShowEditModal(false)
      loadLicenses()
    } catch { toast.error('Failed to update') }
  }

  const pauseLicense = async (license: any) => {
    try {
      await api.post(`/licenses/${license._id}/${license.paused ? 'unpause' : 'pause'}`)
      toast.success(license.paused ? 'License unpaused' : 'License paused')
      loadLicenses()
    } catch { toast.error('Failed to update') }
  }

  const revokeLicense = async (id: string, unrevoke = false) => {
    if (unrevoke) {
      try {
        await api.post(`/licenses/${id}/unrevoke`)
        toast.success('License unrevoked')
        loadLicenses()
      } catch { toast.error('Failed to update') }
      return
    }

    setConfirmModal({
      show: true,
      title: 'Revoke License?',
      message: 'Are you sure you want to revoke this license? The user will lose access immediately.',
      type: 'warning',
      confirmText: 'Revoke Now',
      onConfirm: async () => {
        try {
          await api.post(`/licenses/${id}/revoke`)
          toast.success('License revoked')
          loadLicenses()
        } catch { toast.error('Failed to update') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const openBlacklistModal = (license: any) => {
    setBlacklistTarget(license)
    setBlacklistReason('')
    setShowBlacklistModal(true)
  }

  const executeBlacklist = async () => {
    try {
      await api.post(`/licenses/${blacklistTarget._id}/blacklist`, { reason: blacklistReason })
      toast.success('License blacklisted!')
      setShowBlacklistModal(false)
      loadLicenses()
    } catch { toast.error('Failed to blacklist') }
  }

  const deleteLicense = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete License?',
      message: 'Are you sure you want to delete this license key? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Key',
      onConfirm: async () => {
        try {
          await api.delete(`/licenses/${id}`)
          toast.success('License deleted')
          loadLicenses()
        } catch { toast.error('Failed to delete') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const getStatusBadge = (license: any) => {
    if (license.blacklisted) return <span className="px-2.5 py-1 bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Hardware Ban</span>
    if (license.revoked) return <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Banned</span>
    if (license.paused) return <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Paused</span>
    if (license.used) return <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Used</span>
    return <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-extrabold tracking-wider rounded-full flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Active</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Licenses</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Manage, edit, pause, or blacklist application keys</p>
        </div>
        <div className="flex items-center gap-3">
          {licenses.length > 0 && (
            <button onClick={handleDeleteAllLicenses} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all">
              <TrashIcon className="w-4 h-4" /> Purge Keys
            </button>
          )}
          <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary flex items-center gap-2 py-2.5" disabled={!selectedApp?._id}>
            <PlusIcon className="w-4 h-4" /> Generate Licenses
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
          Create an application first to manage license credentials.
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center text-sm text-slate-500 font-semibold">
              No licenses generated yet. Generate your first one to issue access keys.
            </div>
          ) : (
            <div className="card overflow-visible p-0 relative shadow-2xl">
              {(() => {
                const showCreatedBy = !!(selectedApp?.team && selectedApp.team.length > 0)
                return (
                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full text-sm table-modern text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          <th className="px-5 py-4 w-10">
                            <input 
                              type="checkbox"
                              checked={licenses.length > 0 && selectedLicenseIds.length === licenses.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLicenseIds(licenses.map(l => l._id))
                                } else {
                                  setSelectedLicenseIds([])
                                }
                              }}
                              className="w-4 h-4 rounded border-white/10 bg-black/40 text-indigo-600 accent-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">License Key</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expiry</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Used By</th>
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Note</th>
                          {showCreatedBy && (
                            <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Created By</th>
                          )}
                          <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Created</th>
                          <th className="px-5 py-4 w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {licenses.map((license: any) => (
                          <tr key={license._id} className={`border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors ${selectedLicenseIds.includes(license._id) ? 'bg-indigo-500/[0.04]' : ''}`}>
                            <td className="px-5 py-4 w-10">
                              <input 
                                type="checkbox"
                                checked={selectedLicenseIds.includes(license._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLicenseIds([...selectedLicenseIds, license._id])
                                  } else {
                                    setSelectedLicenseIds(selectedLicenseIds.filter(id => id !== license._id))
                                  }
                                }}
                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-indigo-600 accent-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-xs font-bold text-indigo-300 drop-shadow-[0_0_6px_rgba(99,102,241,0.15)] bg-indigo-500/5 px-2 py-1 border border-indigo-500/10 rounded-lg max-w-[200px] truncate">{license.key}</code>
                                <button onClick={() => copyKey(license.key)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                                  <DocumentDuplicateIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4">{getStatusBadge(license)}</td>
                            <td className="px-5 py-4 text-slate-300 text-xs font-bold">
                              {license.expiryUnit === 'lifetime' ? (
                                <span className="text-gradient-purple uppercase tracking-wider text-[10px]">Lifetime</span>
                              ) : (
                                `${license.expiryDuration} ${license.expiryUnit}`
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-300 text-xs font-semibold">
                              {license.usedBy?.username ? (
                                <span className="flex items-center gap-1 text-slate-200">
                                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                                  {license.usedBy.username}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[140px]">{license.note || '—'}</td>
                            {showCreatedBy && (
                              <td className="px-5 py-4">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 text-[10px] font-bold border border-white/[0.05]">
                                  {getCreatorDisplay(license.createdBy, selectedApp?.userId)}
                                </span>
                              </td>
                            )}
                            <td className="px-5 py-4 text-slate-400 text-xs font-medium">
                              {formatToDDMMYYYY(license.createdAt, 'N/A', true)}
                            </td>
                            <td className="px-5 py-4">
                              <LicenseMenu
                                license={license}
                                onCopy={copyKey}
                                onEdit={openEditModal}
                                onPause={pauseLicense}
                                onRevoke={revokeLicense}
                                onBlacklist={openBlacklistModal}
                                onDelete={deleteLicense}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              {/* Bulk Controls Panel */}
              {selectedLicenseIds.length > 0 && (
                <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-[#08080f]/95 backdrop-blur-2xl border border-indigo-500/25 px-6 py-4 rounded-[24px] shadow-2xl shadow-black/80 flex items-center gap-5 z-[999] animate-in slide-in-from-bottom duration-300">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    Selected: <span className="text-indigo-400 font-mono text-sm font-black">{selectedLicenseIds.length}</span> keys
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBulkCopyKeys}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      📋 Copy
                    </button>
                    <button 
                      onClick={() => handleBulkAction('revoke')}
                      className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-xs font-bold rounded-xl transition-all"
                    >
                      🚫 Revoke
                    </button>
                    <button 
                      onClick={() => handleBulkAction('unrevoke')}
                      className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs font-bold rounded-xl transition-all"
                    >
                      ✅ Unban
                    </button>
                    <button 
                      onClick={() => handleBulkAction('pause')}
                      className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold rounded-xl transition-all"
                    >
                      ⏸️ Pause
                    </button>
                    <button 
                      onClick={() => handleBulkAction('unpause')}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-xl transition-all"
                    >
                      ▶️ Play
                    </button>
                    <button 
                      onClick={() => handleBulkAction('delete')}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <button 
                    onClick={() => setSelectedLicenseIds([])}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04] bg-black/10">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 font-semibold">
                      Showing <span className="text-white">{(currentPage - 1) * limit + 1}</span> to <span className="text-white">{Math.min(currentPage * limit, totalLicenses)}</span> of <span className="text-white">{totalLicenses}</span> keys
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
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                              currentPage === page
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white/[0.02] border border-white/[0.05] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-1 text-slate-600 font-bold">...</span>;
                      }
                      return null;
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
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

      {/* ── Generate Modal ────────────────────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Generate Licenses</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Key Generation Panel</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Amount <span className="text-red-400">*</span></label>
                <input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) })} className="input" min="1" max="100" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">License Mask</label>
                <input type="text" value={form.mask} onChange={(e) => setForm({ ...form, mask: e.target.value })} className="input" placeholder="e.g. ADARSH-####-####" />
                <p className="text-[10px] text-slate-500 font-semibold mt-1.5 flex items-center gap-1"><InformationCircleIcon className="w-3.5 h-3.5" /> Use # for random characters. Leave empty for default format.</p>
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input type="radio" checked={!form.uppercase} onChange={() => setForm({ ...form, uppercase: false })} className="accent-indigo-500" /> Lowercase
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input type="radio" checked={form.uppercase} onChange={() => setForm({ ...form, uppercase: true })} className="accent-indigo-500" /> Uppercase
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Subscription Level</label>
                <select value={form.subscriptionLevel} onChange={(e) => setForm({ ...form, subscriptionLevel: parseInt(e.target.value) })} className="input">
                  {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-[#0b0b14]">{n} {n === 1 ? '(default)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Note</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" placeholder="e.g. Summer Promotion" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Expiry Unit <span className="text-red-400">*</span></label>
                  <select value={form.expiryUnit} onChange={(e) => setForm({ ...form, expiryUnit: e.target.value })} className="input">
                    <option value="hours" className="bg-[#0b0b14]">Hours</option>
                    <option value="days" className="bg-[#0b0b14]">Days</option>
                    <option value="weeks" className="bg-[#0b0b14]">Weeks</option>
                    <option value="months" className="bg-[#0b0b14]">Months</option>
                    <option value="lifetime" className="bg-[#0b0b14]">Lifetime</option>
                  </select>
                </div>
                {form.expiryUnit !== 'lifetime' && (
                  <div className="flex-1">
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Duration <span className="text-red-400">*</span></label>
                    <input type="number" value={form.expiryDuration} onChange={(e) => setForm({ ...form, expiryDuration: parseInt(e.target.value) })} className="input" min="1" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowGenerateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={generateLicenses} className="btn btn-primary flex-1">Generate</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Edit License</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide font-mono text-xs truncate max-w-[240px]">{editTarget.key}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-2 bg-white/[0.02] border border-white/[0.05] rounded-xl transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Note</label>
                <input type="text" value={editData.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} className="input" placeholder="Enter note" />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Subscription Level</label>
                <select value={editData.subscriptionLevel} onChange={(e) => setEditData({ ...editData, subscriptionLevel: parseInt(e.target.value) })} className="input">
                  {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-[#0b0b14]">{n}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Expiry Unit</label>
                  <select value={editData.expiryUnit} onChange={(e) => setEditData({ ...editData, expiryUnit: e.target.value })} className="input">
                    <option value="hours" className="bg-[#0b0b14]">Hours</option>
                    <option value="days" className="bg-[#0b0b14]">Days</option>
                    <option value="weeks" className="bg-[#0b0b14]">Weeks</option>
                    <option value="months" className="bg-[#0b0b14]">Months</option>
                    <option value="lifetime" className="bg-[#0b0b14]">Lifetime</option>
                  </select>
                </div>
                {editData.expiryUnit !== 'lifetime' && (
                  <div className="flex-1">
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">Duration</label>
                    <input type="number" value={editData.expiryDuration} onChange={(e) => setEditData({ ...editData, expiryDuration: parseInt(e.target.value) })} className="input" min="1" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} className="btn btn-primary flex-1">Save</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Blacklist Modal ───────────────────────────────────────────── */}
      {showBlacklistModal && blacklistTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-[#0a0a14]/90 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 md:p-8 shadow-2xl shadow-red-950/20"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs font-black">—</span>
                  </div>
                  <h2 className="text-lg font-black text-red-400 uppercase tracking-wide">Hardware Ban</h2>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-2 bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl truncate max-w-[280px]">{blacklistTarget.key}</p>
              </div>
              <button onClick={() => setShowBlacklistModal(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                  Ban Reason <span className="text-slate-500 font-normal">(internal log)</span>
                </label>
                <input
                  type="text"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-red-500/40 transition-all font-bold"
                  placeholder="e.g. Suspicious debug attempts, leaks..."
                />
              </div>
              <div className="flex items-start gap-2.5 px-4 py-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <span className="text-red-400 text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-red-300 leading-relaxed font-semibold">
                  This action permanently bans this license. Any client device associated with this hardware blueprint will be locked out immediately.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBlacklistModal(false)} className="flex-1 py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-xs font-bold text-slate-300 transition-all">
                  Cancel
                </button>
                <button onClick={executeBlacklist} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/40">
                  Hardware Ban License
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
            className="w-full max-w-sm bg-[#08080e]/95 border border-white/[0.05] rounded-[28px] p-6 shadow-2xl shadow-black/80"
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
                  className="flex-1 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 rounded-2xl text-xs font-bold transition-all border border-white/[0.05]"
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
