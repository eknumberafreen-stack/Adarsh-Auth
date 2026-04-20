'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, EllipsisVerticalIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'

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
        className="p-2 rounded-lg hover:bg-dark-hover text-gray-400 hover:text-white transition-colors"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed w-44 bg-[#1a1a24] border border-dark-border rounded-xl shadow-2xl z-[9999] overflow-hidden py-1"
          style={{
            top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
            right: window.innerWidth - (ref.current ? ref.current.getBoundingClientRect().right : 0)
          }}
        >
          <button onClick={() => { setOpen(false); onCopy(license.key) }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-dark-hover transition-colors flex items-center gap-2">
            <span>📋</span> Copy Key
          </button>
          <button onClick={() => { setOpen(false); onEdit(license) }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-dark-hover transition-colors flex items-center gap-2">
            <span>✏️</span> Edit
          </button>
          <button onClick={() => { setOpen(false); onPause(license) }} className="w-full text-left px-4 py-2.5 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors flex items-center gap-2">
            <span>{license.paused ? '▶️' : '⏸️'}</span> {license.paused ? 'Unpause' : 'Pause'}
          </button>
          {!license.revoked ? (
            <button onClick={() => { setOpen(false); onRevoke(license._id) }} className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2">
              <span>🚫</span> Ban
            </button>
          ) : (
            <button onClick={() => { setOpen(false); onRevoke(license._id, true) }} className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-green-500/10 transition-colors flex items-center gap-2">
              <span>✅</span> Unban
            </button>
          )}
          <button onClick={() => { setOpen(false); onBlacklist(license) }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
            <span>⛔</span> Permanent Ban
          </button>
          <button onClick={() => { setOpen(false); onDelete(license._id) }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2">
            <span>🗑️</span> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Licenses() {
  const { applications } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) setSelectedAppId(applications[0]._id)
  }, [applications])

  useEffect(() => { if (selectedAppId) loadLicenses() }, [selectedAppId])

  const loadLicenses = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/licenses/application/${selectedAppId}`)
      setLicenses(res.data.licenses)
    } catch { toast.error('Failed to load licenses') }
    finally { setLoading(false) }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const generateLicenses = async () => {
    try {
      await api.post('/licenses/generate', {
        applicationId: selectedAppId,
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
    if (!unrevoke && !confirm('Revoke this license?')) return
    try {
      await api.post(`/licenses/${id}/${unrevoke ? 'unrevoke' : 'revoke'}`)
      toast.success(unrevoke ? 'License unrevoked' : 'License revoked')
      loadLicenses()
    } catch { toast.error('Failed to update') }
  }

  const openBlacklistModal = (license: any) => {
    setBlacklistTarget(license)
    setBlacklistReason('')
    setShowBlacklistModal(true)
  }

  const executeBlacklist = async () => {
    try {
      await api.post(`/licenses/${blacklistTarget._id}/blacklist`, { reason: blacklistReason })
      toast.success('License permanently blacklisted!')
      setShowBlacklistModal(false)
      loadLicenses()
    } catch { toast.error('Failed to blacklist') }
  }

  const deleteLicense = async (id: string) => {
    if (!confirm('Delete this license?')) return
    try {
      await api.delete(`/licenses/${id}`)
      toast.success('License deleted')
      loadLicenses()
    } catch { toast.error('Failed to delete') }
  }

  const getStatusBadge = (license: any) => {
    if (license.blacklisted) return <span className="px-2 py-0.5 bg-red-900/40 text-red-400 text-xs rounded-full font-medium">Blacklisted</span>
    if (license.revoked) return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">Revoked</span>
    if (license.paused) return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">Paused</span>
    if (license.used) return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Used</span>
    return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">Available</span>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Licenses</h1>
        <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary flex items-center gap-2" disabled={!selectedAppId}>
          <PlusIcon className="w-4 h-4" /> Generate Licenses
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
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No licenses yet. Generate your first one!</div>
          ) : (
            <div className="card overflow-visible p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">License Key</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Expiry</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Used By</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Note</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license: any) => (
                    <tr key={license._id} className="border-b border-dark-border/50 hover:bg-dark-hover/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-gray-300 truncate max-w-[180px]">{license.key}</code>
                          <button onClick={() => copyKey(license.key)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(license)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {license.expiryUnit === 'lifetime' ? 'Lifetime' : `${license.expiryDuration} ${license.expiryUnit}`}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {license.usedBy?.username || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{license.note || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(license.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
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
          )}
        </>
      )}

      {/* ── Generate Modal ────────────────────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Generate Licenses</h2>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount <span className="text-red-400">*</span></label>
                <input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) })} className="input" min="1" max="100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">License Mask</label>
                <input type="text" value={form.mask} onChange={(e) => setForm({ ...form, mask: e.target.value })} className="input" placeholder="Enter mask pattern" />
                <p className="text-xs text-gray-500 mt-1">Use # for random characters. Leave empty for default format.</p>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!form.uppercase} onChange={() => setForm({ ...form, uppercase: false })} /> Lowercase
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={form.uppercase} onChange={() => setForm({ ...form, uppercase: true })} /> Uppercase
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription Level</label>
                <select value={form.subscriptionLevel} onChange={(e) => setForm({ ...form, subscriptionLevel: parseInt(e.target.value) })} className="input">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? '(default)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" placeholder="Optional note" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Expiry Unit <span className="text-red-400">*</span></label>
                  <select value={form.expiryUnit} onChange={(e) => setForm({ ...form, expiryUnit: e.target.value })} className="input">
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                {form.expiryUnit !== 'lifetime' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Duration <span className="text-red-400">*</span></label>
                    <input type="number" value={form.expiryDuration} onChange={(e) => setForm({ ...form, expiryDuration: parseInt(e.target.value) })} className="input" min="1" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowGenerateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={generateLicenses} className="btn btn-primary flex-1">Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit License</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <input type="text" value={editData.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} className="input" placeholder="Optional note" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription Level</label>
                <select value={editData.subscriptionLevel} onChange={(e) => setEditData({ ...editData, subscriptionLevel: parseInt(e.target.value) })} className="input">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Expiry Unit</label>
                  <select value={editData.expiryUnit} onChange={(e) => setEditData({ ...editData, expiryUnit: e.target.value })} className="input">
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                {editData.expiryUnit !== 'lifetime' && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Duration</label>
                    <input type="number" value={editData.expiryDuration} onChange={(e) => setEditData({ ...editData, expiryDuration: parseInt(e.target.value) })} className="input" min="1" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} className="btn btn-primary flex-1">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Blacklist Modal ───────────────────────────────────────────── */}
      {showBlacklistModal && blacklistTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#13131a] border border-dark-border rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">—</span>
                  </div>
                  <h2 className="text-xl font-bold text-red-400">Permanent Ban</h2>
                </div>
                <p className="text-sm text-gray-400 ml-8 font-mono text-xs">{blacklistTarget.key.slice(0, 20)}...</p>
              </div>
              <button onClick={() => setShowBlacklistModal(false)} className="text-gray-500 hover:text-white">
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
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  placeholder="Reason for banning..."
                />
              </div>
              <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-yellow-400 text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-red-300 leading-relaxed">
                  Permanently ban this license. It can never be used again, even after PC reset.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBlacklistModal(false)} className="flex-1 py-3 px-4 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-xl text-sm font-semibold text-gray-300 transition-all">
                  Cancel
                </button>
                <button onClick={executeBlacklist} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold">—</span>
                  </div>
                  Permanently Ban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
