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
  TicketIcon,
  CalendarIcon,
  UserIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline'

// ── 3-dot dropdown per license row ───────────────────────────────────────────
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
        className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[#13131a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1.5 backdrop-blur-xl"
          >
            <MenuBtn onClick={() => { setOpen(false); onCopy(license.key) }} icon="📋" label="Copy Key" />
            <MenuBtn onClick={() => { setOpen(false); onEdit(license) }} icon="✏️" label="Edit" />
            <MenuBtn onClick={() => { setOpen(false); onPause(license) }} icon={license.paused ? '▶️' : '⏸️'} label={license.paused ? 'Unpause' : 'Pause'} color="text-yellow-400" />
            {!license.revoked ? (
              <MenuBtn onClick={() => { setOpen(false); onRevoke(license._id) }} icon="🚫" label="Ban" color="text-orange-400" />
            ) : (
              <MenuBtn onClick={() => { setOpen(false); onRevoke(license._id, true) }} icon="✅" label="Unban" color="text-emerald-400" />
            )}
            <MenuBtn onClick={() => { setOpen(false); onBlacklist(license) }} icon="⛔" label="Full Ban" color="text-rose-400" />
            <div className="my-1 border-t border-white/5" />
            <MenuBtn onClick={() => { setOpen(false); onDelete(license._id) }} icon="🗑️" label="Delete" color="text-rose-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuBtn({ onClick, icon, label, color = "text-slate-200" }: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors flex items-center gap-3 ${color}`}>
      <span className="text-sm opacity-80">{icon}</span> {label}
    </button>
  )
}

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
    } catch { toast.error('Failed to load licenses') }
    finally { setLoading(false) }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadLicenses(newPage)
  }

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
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to generate') }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Key Copied to Clipboard!')
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
      toast.success('Updated'); setShowEditModal(false); loadLicenses()
    } catch { toast.error('Failed to update') }
  }

  const pauseLicense = async (license: any) => {
    try {
      await api.post(`/licenses/${license._id}/${license.paused ? 'unpause' : 'pause'}`)
      toast.success(license.paused ? 'Resumed' : 'Paused'); loadLicenses()
    } catch { toast.error('Failed to update') }
  }

  const revokeLicense = async (id: string, unrevoke = false) => {
    if (unrevoke) {
      try { await api.post(`/licenses/${id}/unrevoke`); toast.success('Unbanned'); loadLicenses() }
      catch { toast.error('Failed to update') }
      return
    }

    setConfirmModal({
      show: true,
      title: 'Ban License?',
      message: 'Revoke this license? Access will be cut off immediately.',
      type: 'warning',
      confirmText: 'Ban Now',
      onConfirm: async () => {
        try { await api.post(`/licenses/${id}/revoke`); toast.success('Banned'); loadLicenses() }
        catch { toast.error('Failed to update') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const openBlacklistModal = (license: any) => {
    setBlacklistTarget(license); setBlacklistReason(''); setShowBlacklistModal(true)
  }

  const executeBlacklist = async () => {
    try {
      await api.post(`/licenses/${blacklistTarget._id}/blacklist`, { reason: blacklistReason })
      toast.success('Blacklisted'); setShowBlacklistModal(false); loadLicenses()
    } catch { toast.error('Failed to blacklist') }
  }

  const deleteLicense = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Key?',
      message: 'This key will be permanently purged.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try { await api.delete(`/licenses/${id}`); toast.success('Deleted'); loadLicenses() }
        catch { toast.error('Failed to delete') }
        setConfirmModal(prev => ({ ...prev, show: false }))
      }
    })
  }

  const showCreatedBy = licenses.some(l => l.createdBy)

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-500 mb-1">Authorization Layer</p>
          <h2 className="text-3xl font-bold text-white tracking-tight">Licenses</h2>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowGenerateModal(true)} 
          disabled={!selectedApp?._id}
          className="btn btn-primary shadow-glow shadow-primary-600/20"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Forge Keys</span>
        </motion.button>
      </div>

      {applications.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Initialize Application</h3>
          <p className="text-slate-400 mb-6">Create an application to start generating license keys.</p>
          <button onClick={() => router.push('/dashboard/applications')} className="btn btn-secondary">Create Now</button>
        </div>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 animate-pulse">Scanning Vault...</p>
            </div>
          ) : licenses.length === 0 ? (
            <div className="card-premium p-16 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyIcon className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">The vault is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop View */}
              <div className="hidden lg:block table-responsive">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">License Token</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">Validity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">Bound User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">Metadata</th>
                      {showCreatedBy && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-muted">Forge</th>}
                      <th className="px-6 py-4 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {licenses.map((license: any, idx: number) => (
                      <motion.tr 
                        key={license._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-500/5 border border-primary-500/10 text-primary-400">
                              <KeyIcon className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2 group/key">
                              <code className="font-mono text-xs font-bold text-slate-200 tracking-wider">
                                {license.key}
                              </code>
                              <button onClick={() => copyKey(license.key)} className="opacity-0 group-hover/key:opacity-100 text-slate-500 hover:text-white transition-all">
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <LicenseStatusBadge license={license} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
                            {license.expiryUnit === 'lifetime' ? '∞ Unlimited' : `${license.expiryDuration} ${license.expiryUnit}`}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {license.usedBy ? (
                            <div className="flex items-center gap-2 text-xs font-medium text-primary-400">
                              <UserIcon className="w-3.5 h-3.5" />
                              {license.usedBy.username}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 font-medium">Unlinked</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs text-slate-500 italic max-w-[150px] truncate">{license.note || '—'}</p>
                        </td>
                        {showCreatedBy && (
                          <td className="px-6 py-5">
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500">
                              {license.createdBy?.username || 'Owner'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-5 text-right">
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
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {licenses.map((license: any, idx: number) => (
                  <motion.div 
                    key={license._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card-premium p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <LicenseStatusBadge license={license} />
                        <div className="flex items-center gap-2 pt-2">
                          <code className="text-xs font-mono font-bold text-white tracking-widest break-all">
                            {license.key}
                          </code>
                          <button onClick={() => copyKey(license.key)} className="text-slate-500 active:text-primary-400">
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <LicenseMenu
                        license={license}
                        onCopy={copyKey}
                        onEdit={openEditModal}
                        onPause={pauseLicense}
                        onRevoke={revokeLicense}
                        onBlacklist={openBlacklistModal}
                        onDelete={deleteLicense}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Validity</p>
                        <p className="text-xs font-bold text-slate-300">
                          {license.expiryUnit === 'lifetime' ? 'Lifetime' : `${license.expiryDuration} ${license.expiryUnit}`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Bound To</p>
                        <p className="text-xs font-bold text-primary-400 truncate">{license.usedBy?.username || 'Available'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Forged</p>
                        <p className="text-xs text-slate-500 font-bold">{new Date(license.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Creator</p>
                        <p className="text-xs text-slate-500 font-bold">{license.createdBy?.username || 'Owner'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Vault Sector <span className="text-white">{currentPage}</span> / <span className="text-slate-600">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="btn btn-secondary px-6 py-2.5 text-xs uppercase tracking-widest disabled:opacity-20">Back</button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="btn btn-secondary px-6 py-2.5 text-xs uppercase tracking-widest disabled:opacity-20">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlays & Modals */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGenerateModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg card-premium p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Forge New Keys</h3>
                  <p className="text-sm text-slate-400">Generate cryptographically secure license tokens.</p>
                </div>
                <button onClick={() => setShowGenerateModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="input-group">
                    <label className="label">Quantity</label>
                    <input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) })} className="input text-center font-bold" min="1" max="100" />
                  </div>
                  <div className="input-group">
                    <label className="label">Access Tier</label>
                    <select value={form.subscriptionLevel} onChange={(e) => setForm({ ...form, subscriptionLevel: parseInt(e.target.value) })} className="input font-bold">
                      {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-dark-card">Level {n}</option>)}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="label">Token Pattern (Mask)</label>
                  <input type="text" value={form.mask} onChange={(e) => setForm({ ...form, mask: e.target.value })} className="input font-mono" placeholder="XXXX-####-XXXX" />
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold"># Digit | X Alpha | * Any</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setForm({...form, uppercase: true})} className={`py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${form.uppercase ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-glow' : 'bg-white/5 border-white/5 text-slate-500'}`}>Uppercase</button>
                  <button onClick={() => setForm({...form, uppercase: false})} className={`py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest transition-all ${!form.uppercase ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-glow' : 'bg-white/5 border-white/5 text-slate-500'}`}>Lowercase</button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="input-group">
                    <label className="label">Expiry Unit</label>
                    <select value={form.expiryUnit} onChange={(e) => setForm({ ...form, expiryUnit: e.target.value })} className="input">
                      <option value="hours" className="bg-dark-card">Hours</option>
                      <option value="days" className="bg-dark-card">Days</option>
                      <option value="weeks" className="bg-dark-card">Weeks</option>
                      <option value="months" className="bg-dark-card">Months</option>
                      <option value="lifetime" className="bg-dark-card">Lifetime</option>
                    </select>
                  </div>
                  {form.expiryUnit !== 'lifetime' && (
                    <div className="input-group">
                      <label className="label">Duration</label>
                      <input type="number" value={form.expiryDuration} onChange={(e) => setForm({ ...form, expiryDuration: parseInt(e.target.value) })} className="input" min="1" />
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="label">Operational Note</label>
                  <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" placeholder="Bulk generate for reseller..." />
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowGenerateModal(false)} className="btn btn-secondary flex-1">Abort</button>
                  <button onClick={generateLicenses} className="btn btn-primary flex-1">Start Forge</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm card-premium p-8 text-center">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
                confirmModal.type === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {confirmModal.type === 'danger' ? <XMarkIcon className="w-8 h-8" /> : <ShieldCheckIcon className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(prev => ({...prev, show: false}))} className="btn btn-secondary flex-1 text-xs">Cancel</button>
                <button onClick={confirmModal.onConfirm} className={`btn flex-1 text-xs ${confirmModal.type === 'danger' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'btn-primary'}`}>{confirmModal.confirmText}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LicenseStatusBadge({ license }: any) {
  if (license.blacklisted) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest text-rose-400">Purged</span>
  if (license.revoked) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest text-orange-400">Revoked</span>
  if (license.paused) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400">Inactive</span>
  if (license.used) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400">Validated</span>
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-[10px] font-black uppercase tracking-widest text-primary-400">Available</span>
}
