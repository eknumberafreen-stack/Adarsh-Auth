'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, ArrowPathIcon, CpuChipIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'

type Tab = 'initbase' | 'offsets' | 'bones'
type OffsetCategory = 'offsets' | 'weaponOffsets' | 'cameraOffsets' | 'silentAimOffsets' | 'espOffsets' | 'entityOffsets'

const CATEGORY_LABELS: Record<OffsetCategory, string> = {
  offsets: 'General Offsets',
  weaponOffsets: 'Weapon Offsets',
  cameraOffsets: 'Camera Offsets',
  silentAimOffsets: 'SilentAim Offsets',
  espOffsets: 'ESP Offsets',
  entityOffsets: 'Entity Offsets',
}

interface OffsetEntry { _id: string; name: string; value: string; description?: string }
interface BoneEntry { _id: string; name: string; value: string }
interface RV {
  initBase: string
  offsets: OffsetEntry[]; weaponOffsets: OffsetEntry[]; cameraOffsets: OffsetEntry[]
  silentAimOffsets: OffsetEntry[]; espOffsets: OffsetEntry[]; entityOffsets: OffsetEntry[]
  bones: BoneEntry[]; updatedAt?: string
}

const DEFAULT_BONES = ['Head','Neck','Chest','Pelvis','Root','LeftShoulder','LeftElbow','LeftWrist','RightShoulder','RightElbow','RightWrist','LeftHip','LeftKnee','LeftAnkle','RightHip','RightKnee','RightAnkle']

function OffsetRow({ entry, onSave, onDelete }: { entry: OffsetEntry; onSave:(id:string,n:string,v:string,d:string)=>Promise<void>; onDelete:(id:string)=>Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const [desc, setDesc] = useState(entry.description || '')
  const save = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    await onSave(entry._id, name, value, desc); setEditing(false)
  }
  if (editing) return (
    <tr className="border-b border-white/5 bg-indigo-500/5">
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={name} onChange={e=>setName(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e=>setValue(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={desc} onChange={e=>setDesc(e.target.value)} /></td>
      <td className="px-4 py-2 flex gap-2">
        <button onClick={save} className="btn btn-primary px-2 py-1 text-xs"><CheckIcon className="h-3.5 w-3.5" /></button>
        <button onClick={()=>setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs"><XMarkIcon className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  )
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-emerald-300">{entry.value}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{entry.description || '-'}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={()=>{navigator.clipboard.writeText(entry.name+' = '+entry.value);toast.success('Copied!')}} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><DocumentDuplicateIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><PencilIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300"><TrashIcon className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

function BoneRow({ entry, onSave, onDelete }: { entry: BoneEntry; onSave:(id:string,n:string,v:string)=>Promise<void>; onDelete:(id:string)=>Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.name)
  const [value, setValue] = useState(entry.value)
  const save = async () => {
    if (!name.trim() || !value.trim()) return toast.error('Name and value required')
    await onSave(entry._id, name, value); setEditing(false)
  }
  if (editing) return (
    <tr className="border-b border-white/5 bg-violet-500/5">
      <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={name} onChange={e=>setName(e.target.value)} /></td>
      <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={value} onChange={e=>setValue(e.target.value)} /></td>
      <td className="px-4 py-2 flex gap-2">
        <button onClick={save} className="btn btn-primary px-2 py-1 text-xs"><CheckIcon className="h-3.5 w-3.5" /></button>
        <button onClick={()=>setEditing(false)} className="btn btn-secondary px-2 py-1 text-xs"><XMarkIcon className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  )
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] group">
      <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{entry.name}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-violet-300">{entry.value}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={()=>setEditing(true)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"><PencilIcon className="h-3.5 w-3.5" /></button>
          <button onClick={()=>onDelete(entry._id)} className="rounded-lg border border-rose-500/20 p-1.5 text-rose-400 hover:text-rose-300"><TrashIcon className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

export default function OffsetsPage() {
  const { selectedApp } = useAppStore()
  const [tab, setTab] = useState<Tab>('initbase')
  const [rv, setRv] = useState<RV | null>(null)
  const [loading, setLoading] = useState(false)
  const [initBase, setInitBase] = useState('')
  const [savingIB, setSavingIB] = useState(false)
  const [activeCat, setActiveCat] = useState<OffsetCategory>('offsets')
  const [addName, setAddName] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addBoneName, setAddBoneName] = useState('')
  const [addBoneValue, setAddBoneValue] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const appId = selectedApp?._id

  const load = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    try {
      const res = await api.get('/runtime/' + appId)
      setRv(res.data.runtimeValues)
      setInitBase(res.data.runtimeValues.initBase || '')
    } catch { toast.error('Failed to load runtime values') }
    finally { setLoading(false) }
  }, [appId])

  useEffect(() => { load() }, [load])

  const saveInitBase = async () => {
    if (!appId) return
    setSavingIB(true)
    try { await api.patch('/runtime/' + appId + '/initbase', { value: initBase }); toast.success('InitBase saved'); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
    finally { setSavingIB(false) }
  }

  const addOffset = async () => {
    if (!appId || !addName.trim() || !addValue.trim()) return toast.error('Name and value required')
    try { await api.patch('/runtime/' + appId + '/offsets/' + activeCat, { name: addName, value: addValue, description: addDesc }); toast.success('Added'); setAddName(''); setAddValue(''); setAddDesc(''); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const saveOffset = async (id: string, name: string, value: string, description: string) => {
    if (!appId) return
    try { await api.patch('/runtime/' + appId + '/offsets/' + activeCat, { offsetId: id, name, value, description }); toast.success('Saved'); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const deleteOffset = async (id: string) => {
    if (!appId) return
    try { await api.delete('/runtime/' + appId + '/offsets/' + activeCat + '/' + id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const addBone = async () => {
    if (!appId || !addBoneName.trim() || !addBoneValue.trim()) return toast.error('Name and value required')
    try { await api.patch('/runtime/' + appId + '/bones', { name: addBoneName, value: addBoneValue }); toast.success('Added'); setAddBoneName(''); setAddBoneValue(''); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const saveBone = async (id: string, name: string, value: string) => {
    if (!appId) return
    try { await api.patch('/runtime/' + appId + '/bones', { boneId: id, name, value }); toast.success('Saved'); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const deleteBone = async (id: string) => {
    if (!appId) return
    try { await api.delete('/runtime/' + appId + '/bones/' + id); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
  }

  const resetAll = async () => {
    if (!appId) return
    try { await api.delete('/runtime/' + appId + '/reset'); toast.success('Reset'); setShowReset(false); load() }
    catch { toast.error('Failed to reset') }
  }

  const handleImport = async () => {
    if (!appId || !importText.trim()) return toast.error('Paste code first')
    setIsImporting(true)
    try {
      // 1. Parse InitBase
      const ibMatch = importText.match(/InitBase\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)/)
      if (ibMatch) {
        await api.patch('/runtime/' + appId + '/initbase', { value: ibMatch[1] })
      }

      // 2. Parse Offsets (internal static uint Name = Value;)
      const offsetRegex = /uint\s+([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)/g
      let match
      while ((match = offsetRegex.exec(importText)) !== null) {
        const name = match[1]
        const value = match[2]
        if (name === 'InitBase') continue
        await api.patch('/runtime/' + appId + '/offsets/offsets', { name, value })
      }

      // 3. Parse Bones (Name = Value,)
      const boneRegex = /([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|[0-9]+)\s*,/g
      while ((match = boneRegex.exec(importText)) !== null) {
        const name = match[1]
        const value = match[2]
        await api.patch('/runtime/' + appId + '/bones', { name, value })
      }

      toast.success('Import completed')
      setShowImport(false)
      setImportText('')
      load()
    } catch (e: any) {
      toast.error('Import failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setIsImporting(false)
    }
  }

  const buildJson = () => {
    if (!rv) return {}
    const p: Record<string, any> = {}
    if (rv.initBase) p.InitBase = rv.initBase
    const flat = (arr: OffsetEntry[]) => arr.forEach(o => { p[o.name] = o.value })
    flat(rv.offsets); flat(rv.weaponOffsets); flat(rv.cameraOffsets)
    flat(rv.silentAimOffsets); flat(rv.espOffsets); flat(rv.entityOffsets)
    if (rv.bones.length > 0) { p.bones = {}; rv.bones.forEach(b => { p.bones[b.name] = b.value }) }
    return p
  }

  const currentEntries: OffsetEntry[] = rv?.[activeCat] ?? []

  const TABS: { id: Tab; label: string }[] = [
    { id: 'initbase', label: 'InitBase' },
    { id: 'offsets',  label: 'Offsets'  },
    { id: 'bones',    label: 'Bones'    },
  ]

  if (!appId) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <CpuChipIcon className="h-16 w-16 text-slate-600 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">No Application Selected</h2>
      <p className="text-slate-400 text-sm">Select an application from the header dropdown to manage its runtime values.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="page-header">
        <div>
          <p className="page-eyebrow">Runtime Values</p>
          <h1 className="page-title">Offsets, Bones &amp; InitBase</h1>
          <p className="page-subtitle">
            Manage runtime memory values for <span className="text-indigo-300 font-semibold">{selectedApp?.name}</span>.
            Clients fetch these dynamically - no hardcoded values needed.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(true)} className="btn btn-secondary">
            <DocumentDuplicateIcon className="h-4 w-4" /> Import Source
          </button>
          <button onClick={() => setShowJson(!showJson)} className="btn btn-secondary">
            {showJson ? 'Hide' : 'Preview'} JSON
          </button>
          <button onClick={load} className="btn btn-secondary">
            <ArrowPathIcon className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setShowReset(true)} className="btn btn-danger">
            <TrashIcon className="h-4 w-4" /> Reset All
          </button>
        </div>
      </section>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="modal-card w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Import C# Source</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Paste your <code className="text-indigo-300">Offsets.cs</code> or <code className="text-indigo-300">Bones.cs</code> code below. 
              We'll automatically extract names and hex values.
            </p>
            <textarea 
              className="input w-full h-64 font-mono text-xs mb-6 resize-none"
              placeholder="internal static uint LocalPlayer = 0x94; ..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowImport(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleImport} disabled={isImporting} className="btn btn-primary flex-1">
                {isImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJson && rv && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Client JSON Preview</h3>
            <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(buildJson(), null, 2)); toast.success('Copied!') }} className="btn btn-secondary px-3 py-1.5 text-xs">
              <DocumentDuplicateIcon className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs font-mono text-emerald-300 leading-relaxed">
            {JSON.stringify(buildJson(), null, 2)}
          </pre>
        </div>
      )}

      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        </div>
      ) : (
        <>
          {tab === 'initbase' && (
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                  <CpuChipIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="page-eyebrow">Base Address</p>
                  <h3 className="text-lg font-bold text-white">InitBase</h3>
                </div>
              </div>
              <p className="text-sm text-slate-400">The base memory address your client uses to resolve all other offsets at runtime.</p>
              <div className="flex gap-3">
                <input className="input font-mono flex-1" value={initBase} onChange={e => setInitBase(e.target.value)} placeholder="e.g. 0x9EC1C48" />
                <button onClick={saveInitBase} disabled={savingIB} className="btn btn-primary px-8">
                  {savingIB ? 'Saving...' : 'Save'}
                </button>
              </div>
              {rv?.updatedAt && <p className="text-xs text-slate-500">Last updated: {new Date(rv.updatedAt).toLocaleString()}</p>}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Current Value</p>
                <p className="font-mono text-lg text-sky-300">{rv?.initBase || <span className="text-slate-600 italic">Not set</span>}</p>
              </div>
            </div>
          )}

          {tab === 'offsets' && (
            <div className="space-y-4">
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Offset Category</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_LABELS) as OffsetCategory[]).map(cat => (
                    <button key={cat} onClick={() => setActiveCat(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeCat === cat ? 'border-indigo-400/40 bg-indigo-400/15 text-indigo-200' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}>
                      {CATEGORY_LABELS[cat]}
                      <span className="ml-2 opacity-60">({(rv?.[cat] ?? []).length})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="page-eyebrow">{activeCat}</p>
                    <h3 className="text-lg font-bold text-white">{CATEGORY_LABELS[activeCat]}</h3>
                  </div>
                  <span className="badge border-white/10 bg-white/5 text-slate-400">{currentEntries.length} entries</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Name</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/4">Value</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEntries.map(entry => (
                        <OffsetRow key={entry._id} entry={entry} onSave={saveOffset} onDelete={deleteOffset} />
                      ))}
                      <tr className="border-b border-white/5 bg-white/[0.015]">
                        <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="OffsetName" /></td>
                        <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={addValue} onChange={e=>setAddValue(e.target.value)} placeholder="0x0000" /></td>
                        <td className="px-4 py-2"><input className="input py-1.5 text-xs w-full" value={addDesc} onChange={e=>setAddDesc(e.target.value)} placeholder="Description (optional)" /></td>
                        <td className="px-4 py-2">
                          <button onClick={addOffset} className="btn btn-primary px-3 py-1.5 text-xs">
                            <PlusIcon className="h-3.5 w-3.5" /> Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'bones' && (
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
                      <BoneRow key={bone._id} entry={bone} onSave={saveBone} onDelete={deleteBone} />
                    ))}
                    <tr className="border-b border-white/5 bg-white/[0.015]">
                      <td className="px-4 py-2">
                        <input className="input py-1.5 text-xs w-full" value={addBoneName} onChange={e=>setAddBoneName(e.target.value)} placeholder="BoneName (e.g. Head)" list="bone-list" />
                        <datalist id="bone-list">{DEFAULT_BONES.map(b=><option key={b} value={b}/>)}</datalist>
                      </td>
                      <td className="px-4 py-2"><input className="input py-1.5 text-xs font-mono w-full" value={addBoneValue} onChange={e=>setAddBoneValue(e.target.value)} placeholder="0x0000" /></td>
                      <td className="px-4 py-2">
                        <button onClick={addBone} className="btn btn-primary px-3 py-1.5 text-xs">
                          <PlusIcon className="h-3.5 w-3.5" /> Add
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="modal-card w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-3xl">🗑️</div>
            <h3 className="text-xl font-bold text-white mb-2">Reset All Values?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Permanently deletes all InitBase, offsets, and bones for <span className="text-white font-semibold">{selectedApp?.name}</span>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={resetAll} className="btn btn-danger flex-1">Reset All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
