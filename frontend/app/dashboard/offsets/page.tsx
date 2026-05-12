'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  CpuChipIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OffsetEntry {
  _id: string
  name: string
  value: string
  description?: string
}

interface BoneEntry {
  _id: string
  name: string
  value: string
}

interface RuntimeValues {
  _id?: string
  applicationId: string
  initBase: string
  offsets: OffsetEntry[]
  weaponOffsets: OffsetEntry[]
  cameraOffsets: OffsetEntry[]
  silentAimOffsets: OffsetEntry[]
  espOffsets: OffsetEntry[]
  entityOffsets: OffsetEntry[]
  bones: BoneEntry[]
  updatedAt?: string
}

type OffsetCategory =
  | 'offsets'
  | 'weaponOffsets'
  | 'cameraOffsets'
  | 'silentAimOffsets'
  | 'espOffsets'
  | 'entityOffsets'

const CATEGORY_LABELS: Record<OffsetCategory, string> = {
  offsets:          'General Offsets',
  weaponOffsets:    'Weapon Offsets',
  cameraOffsets:    'Camera Offsets',
  silentAimOffsets: 'SilentAim Offsets',
  espOffsets:       'ESP Offsets',
  entityOffsets:    'Entity Offsets',
}

const CATEGORY_COLORS: Record<OffsetCategory, string> = {
  offsets:          'indigo',
  weaponOffsets:    'rose',
  cameraOffsets:    'sky',
  silentAimOffsets: 'violet',
  espOffsets:       'emerald',
  entityOffsets:    'amber',
}

const DEFAULT_BONES = [
  'Head', 'Neck', 'Chest', 'Pelvis', 'Root',
  'LeftShoulder', 'LeftElbow', 'LeftWrist',
  'RightShoulder', 'RightElbow', 'RightWrist',
  'LeftHip', 'LeftKnee', 'LeftAnkle',
  'RightHip', 'RightKnee', 'RightAnkle',
]

// ─── Inline editable row ──────────────────────────────────────────────────────

function OffsetRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: OffsetEntry
  onSave: (id: string, name: string, value: string, description: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const [desc, setDesc] = useState(entry.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    setSaving(true)
    await onSave(entry._id, name, value, desc)
    setSaving(false)
    setEditing(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(`${entry.name} = ${entry.value}`)
    toast.success('Copied!')
  }

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-indigo-500/5">
        <td className="px-4 py-2">
          <input
            className="input py-1.5 text-xs w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="OffsetName"
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input py-1.5 text-xs font-mono w-full"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0x0000"
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input py-1.5 text-xs w-full"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Optional description"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary px-2 py-1 text-xs">
              <CheckIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-emerald-300">{entry.value}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{entry.description || '—'}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={copy} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white">
            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function BoneRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: BoneEntry
  onSave: (id: string, name: string, value: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    setSaving(true)
    await onSave(entry._id, name, value)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-violet-500/5">
        <td className="px-4 py-2">
          <input className="input py-1.5 text-xs w-full" value={name} onChange={e => setName(e.target.value)} placeholder="BoneName" />
        </td>
        <td className="px-4 py-2">
          <input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e => setValue(e.target.value)} placeholder="0x0000" />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary px-2 py-1 text-xs">
              <CheckIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-violet-300">{entry.value}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add row form ─────────────────────────────────────────────────────────────

function AddOffsetForm({ onAdd }: { onAdd: (name: string, value: string, description: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    setSaving(true)
    await onAdd(name, value, desc)
    setSaving(false)
    setName('')
    setValue('')
    setDesc('')
  }

  return (
    <tr className="border-b border-white/5 bg-white/[0.015]">
      <td className="px-4 py-2">
        <input className="input py-1.5 text-xs w-full" value={name} onChange={e => setName(e.target.value)} placeholder="OffsetName" />
      </td>
      <td className="px-4 py-2">
        <input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e => setValue(e.target.value)} placeholder="0x0000" />
      </td>
      <td className="px-4 py-2">
        <input className="input py-1.5 text-xs w-full" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" />
      </td>
      <td className="px-4 py-2">
        <button onClick={handle} disabled={saving} className="btn btn-primary px-3 py-1.5 text-xs">
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </td>
    </tr>
  )
}

function AddBoneForm({ onAdd }: { onAdd: (name: string, value: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    setSaving(true)
    await onAdd(name, value)
    setSaving(false)
    setName('')
    setValue('')
  }

  return (
    <tr className="border-b border-white/5 bg-white/[0.015]">
      <td className="px-4 py-2">
        <input className="input py-1.5 text-xs w-full" value={name} onChange={e => setName(e.target.value)} placeholder="BoneName (e.g. Head)" list="bone-suggestions" />
        <datalist id="bone-suggestions">
          {DEFAULT_BONES.map(b => <option key={b} value={b} />)}
        </datalist>
      </td>
      <td className="px-4 py-2">
        <input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e => setValue(e.target.value)} placeholder="0x0000" />
      </td>
      <td className="px-4 py-2">
        <button onClick={handle} disabled={saving} className="btn btn-primary px-3 py-1.5 text-xs">
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </td>
    </tr>
  )
}

// ─── Offset category section ──────────────────────────────────────────────────

function OffsetSection({
  category,
  entries,
  appId,
  onRefresh,
}: {
  category: OffsetCategory
  entries: OffsetEntry[]
  appId: string
  onRefresh: () => void
}) {
  const label = CATEGORY_LABELS[category]

  const handleAdd = async (name: string, value: string, description: string) => {
    try {
      await api.patch(`/runtime/${appId}/offsets/${category}`, { name, value, description })
      toast.success(`${name} added`)
      onRefresh()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add offset')
    }
  }

  const handleSave = async (id: string, name: string, value: string, description: string) => {
    try {
      await api.patch(`/runtime/${appId}/offsets/${category}`, { offsetId: id, name, value, description })
      toast.success('Saved')
      onRefresh()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/runtime/${appId}/offsets/${category}/${id}`)
      toast.success('Deleted')
      onRefresh()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="page-eyebrow">{category}</p>
          <h3 className="text-lg font-bold text-white">{label}</h3>
        </div>
        <span className="badge border-white/10 bg-white/5 text-slate-400">{entries.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Name</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Value</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <OffsetRow key={entry._id} entry={entry} onSave={handleSave} onDelete={handleDelete} />
            ))}
            <AddOffsetForm onAdd={handleAdd} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OffsetsPage() {
  const { selectedApp, applications } = useAppStore()
  const [rv, setRv] = useState<RuntimeValues | null>(null)
  const [loading, setLoading] = useState(false)
  const [initBase, setInitBase] = useState('')
  const [savingInitBase, setSavingInitBase] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [jsonPreview, setJsonPreview] = useState(false)

  const appId = selectedApp?._id

  const load = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    try {
      const res = await api.get(`/runtime/${appId}`)
      setRv(res.data.runtimeValues)
      setInitBase(res.data.runtimeValues.initBase || '')
    } catch (e: any) {
      toast.error('Failed to load runtime values')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => { load() }, [load])

  const saveInitBase = async () => {
    if (!appId) return
    setSavingInitBase(true)
    try {
      await api.patch(`/runtime/${appId}/initbase`, { value: initBase })
      toast.success('InitBase saved')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save InitBase')
    } finally {
      setSavingInitBase(false)
    }
  }

  const handleAddBone = async (name: string, value: string) => {
    if (!appId) return
    try {
      await api.patch(`/runtime/${appId}/bones`, { name, value })
      toast.success(`${name} added`)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to add bone')
    }
  }

  const handleSaveBone = async (id: string, name: string, value: string) => {
    if (!appId) return
    try {
      await api.patch(`/runtime/${appId}/bones`, { boneId: id, name, value })
      toast.success('Bone saved')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save bone')
    }
  }

  const handleDeleteBone = async (id: string) => {
    if (!appId) return
    try {
      await api.delete(`/runtime/${appId}/bones/${id}`)
      toast.success('Bone deleted')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete bone')
    }
  }

  const handleReset = async () => {
    if (!appId) return
    try {
      await api.delete(`/runtime/${appId}/reset`)
      toast.success('All values reset')
      setShowResetConfirm(false)
      load()
    } catch (e: any) {
      toast.error('Failed to reset')
    }
  }

  const buildPreviewPayload = () => {
    if (!rv) return {}
    const payload: Record<string, any> = {}
    if (rv.initBase) payload.InitBase = rv.initBase
    const flat = (arr: OffsetEntry[]) => arr.forEach(o => { payload[o.name] = o.value })
    flat(rv.offsets)
    flat(rv.weaponOffsets)
    flat(rv.cameraOffsets)
    flat(rv.silentAimOffsets)
    flat(rv.espOffsets)
    flat(rv.entityOffsets)
    if (rv.bones.length > 0) {
      payload.bones = {}
      rv.bones.forEach(b => { payload.bones[b.name] = b.value })
    }
    return payload
  }

  if (!appId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <CpuChipIcon className="h-16 w-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Application Selected</h2>
        <p className="text-slate-400 text-sm">Select an application from the header dropdown to manage its runtime values.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <section className="page-header">
        <div>
          <p className="page-eyebrow">Runtime Values</p>
          <h1 className="page-title">Offsets, Bones &amp; InitBase</h1>
          <p className="page-subtitle">
            Manage all runtime memory values for <span className="text-indigo-300 font-semibold">{selectedApp?.name}</span>.
            Authenticated clients fetch these values dynamically — no hardcoded values needed.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setJsonPreview(!jsonPreview)} className="btn btn-secondary">
            {jsonPreview ? 'Hide' : 'Preview'} JSON
          </button>
          <button onClick={load} className="btn btn-secondary">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="btn btn-danger">
            <TrashIcon className="h-4 w-4" />
            Reset All
          </button>
        </div>
      </section>

      {/* ── JSON Preview ── */}
      {jsonPreview && rv && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Client JSON Preview</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(buildPreviewPayload(), null, 2))
                toast.success('Copied!')
              }}
              className="btn btn-secondary px-3 py-1.5 text-xs"
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs font-mono text-emerald-300 leading-relaxed">
            {JSON.stringify(buildPreviewPayload(), null, 2)}
          </pre>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ── InitBase ── */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                <CpuChipIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="page-eyebrow">Base Address</p>
                <h3 className="text-lg font-bold text-white">InitBase</h3>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                className="input font-mono flex-1"
                value={initBase}
                onChange={e => setInitBase(e.target.value)}
                placeholder="e.g. 0x9EC1C48"
              />
              <button onClick={saveInitBase} disabled={savingInitBase} className="btn btn-primary px-6">
                {savingInitBase ? 'Saving…' : 'Save'}
              </button>
            </div>
            {rv?.updatedAt && (
              <p className="mt-2 text-xs text-slate-500">
                Last updated: {new Date(rv.updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* ── Offset categories ── */}
          {(Object.keys(CATEGORY_LABELS) as OffsetCategory[]).map(cat => (
            <OffsetSection
              key={cat}
              category={cat}
              entries={rv?.[cat] ?? []}
              appId={appId}
              onRefresh={load}
            />
          ))}

          {/* ── Bones ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="page-eyebrow">Skeleton</p>
                <h3 className="text-lg font-bold text-white">Bone Structure</h3>
              </div>
              <span className="badge border-white/10 bg-white/5 text-slate-400">{rv?.bones.length ?? 0} bones</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/3">Bone Name</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/3">Value</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(rv?.bones ?? []).map(bone => (
                    <BoneRow key={bone._id} entry={bone} onSave={handleSaveBone} onDelete={handleDeleteBone} />
                  ))}
                  <AddBoneForm onAdd={handleAddBone} />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Reset confirm modal ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="modal-card w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-3xl">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Reset All Values?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete all InitBase, offsets, and bones for{' '}
              <span className="text-white font-semibold">{selectedApp?.name}</span>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleReset} className="btn btn-danger flex-1">
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
