'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function Licenses() {
  const { applications } = useAppStore()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [form, setForm] = useState({
    count: 1,
    mask: '',
    uppercase: true,
    subscriptionLevel: 1,
    note: '',
    expiryUnit: 'days',
    expiryDuration: 30
  })

  useEffect(() => {
    if (applications.length > 0 && !selectedAppId) {
      setSelectedAppId(applications[0]._id)
    }
  }, [applications])

  useEffect(() => {
    if (selectedAppId) loadLicenses()
  }, [selectedAppId])

  const loadLicenses = async () => {
    if (!selectedAppId) return
    setLoading(true)
    try {
      const response = await api.get(`/licenses/application/${selectedAppId}`)
      setLicenses(response.data.licenses)
    } catch {
      toast.error('Failed to load licenses')
    } finally {
      setLoading(false)
    }
  }

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate licenses')
    }
  }

  const revokeLicense = async (id: string) => {
    if (!confirm('Revoke this license?')) return
    try {
      await api.post(`/licenses/${id}/revoke`)
      toast.success('License revoked')
      loadLicenses()
    } catch {
      toast.error('Failed to revoke license')
    }
  }

  const deleteLicense = async (id: string) => {
    if (!confirm('Delete this license?')) return
    try {
      await api.delete(`/licenses/${id}`)
      toast.success('License deleted')
      loadLicenses()
    } catch {
      toast.error('Failed to delete license')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Licenses</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn btn-primary flex items-center gap-2"
          disabled={!selectedAppId}
        >
          <PlusIcon className="w-5 h-5" />
          Generate Licenses
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Create an application first</div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Application</label>
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="input max-w-md">
              {applications.map((app: any) => (
                <option key={app._id} value={app._id}>{app.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((license: any) => (
                <div key={license._id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <code className="text-sm font-mono bg-dark-bg px-3 py-1 rounded cursor-pointer hover:bg-dark-hover" onClick={() => copyToClipboard(license.key)}>
                          {license.key}
                        </code>
                        {license.revoked && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Revoked</span>}
                        {license.used && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Used</span>}
                        {!license.used && !license.revoked && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Available</span>}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Expiry: {license.expiryUnit === 'lifetime' ? 'Lifetime' : `${license.expiryDuration} ${license.expiryUnit}`}</p>
                        {license.subscriptionLevel && <p>Subscription Level: {license.subscriptionLevel}</p>}
                        {license.note && <p>Note: {license.note}</p>}
                        {license.usedBy && <p>Used by: {license.usedBy.username}</p>}
                        {license.usedAt && <p>Used at: {new Date(license.usedAt).toLocaleString()}</p>}
                        <p>Created: {new Date(license.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!license.revoked && (
                        <button onClick={() => revokeLicense(license._id)} className="btn btn-secondary" title="Revoke">
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteLicense(license._id)} className="btn btn-danger" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && (
                <div className="text-center py-12 text-gray-400">No licenses yet. Generate your first one!</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Generate License Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create a new license</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">License Amount <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) })}
                  className="input"
                  min="1" max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">License Mask <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.mask}
                  onChange={(e) => setForm({ ...form, mask: e.target.value })}
                  className="input"
                  placeholder="e.g. Adarsh-Aimkill-#####"
                />
                <p className="text-xs text-gray-500 mt-1">Use # for random characters. Leave empty for default format.</p>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!form.uppercase} onChange={() => setForm({ ...form, uppercase: false })} />
                    Lowercase Letters
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={form.uppercase} onChange={() => setForm({ ...form, uppercase: true })} />
                    Uppercase Letters
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subscription Level <span className="text-red-400">*</span></label>
                <select value={form.subscriptionLevel} onChange={(e) => setForm({ ...form, subscriptionLevel: parseInt(e.target.value) })} className="input">
                  <option value={1}>1 (default)</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">License Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="input"
                  placeholder="Optional note"
                />
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
                    <label className="block text-sm font-medium mb-2">Expiry Duration <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      value={form.expiryDuration}
                      onChange={(e) => setForm({ ...form, expiryDuration: parseInt(e.target.value) })}
                      className="input"
                      min="1"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowGenerateModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={generateLicenses} className="btn btn-primary flex-1">Create License</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
