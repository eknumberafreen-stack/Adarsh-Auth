'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  CheckIcon,
  ChevronUpDownIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

function getAppInitials(name: string) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return (name || 'AP').slice(0, 2).toUpperCase()
}

export default function AppSelector() {
  const { applications, selectedApp, setSelectedApp } = useAppStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 20)
    } else {
      setQuery('')
    }
  }, [open])

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return applications
    return applications.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        (app.version && app.version.toLowerCase().includes(q))
    )
  }, [applications, query])

  if (applications.length === 0) return null

  const activeIsPaused = selectedApp?.status === 'paused'

  return (
    <div ref={containerRef} className="relative z-50 flex items-center gap-2.5">
      <span className="hidden xl:inline-block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
        Application
      </span>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group flex items-center gap-2.5 h-10 rounded-xl border px-3 text-left transition-all duration-200 min-w-[200px] sm:min-w-[240px] max-w-[300px] ${
          open
            ? 'border-indigo-500/60 bg-[#121422] shadow-[0_0_24px_rgba(99,102,241,0.2)]'
            : 'border-white/10 bg-white/[0.04] hover:border-indigo-500/40 hover:bg-white/[0.07]'
        }`}
      >
        {/* App monogram + status dot */}
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-400/30 text-[10px] font-black text-indigo-200">
          {selectedApp ? getAppInitials(selectedApp.name) : <CubeIcon className="h-3.5 w-3.5" />}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[#0b0d14] ${
              activeIsPaused ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs sm:text-sm font-bold text-white leading-tight">
            {selectedApp?.name || 'Select Application'}
          </p>
        </div>

        <span className="shrink-0 rounded-md bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
          {applications.length}
        </span>

        <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white transition-colors" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 sm:left-auto sm:right-0 lg:left-0 top-[calc(100%+8px)] w-[300px] sm:w-[350px] rounded-2xl border border-white/10 bg-[#0b0d16]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_30px_rgba(99,102,241,0.12)] overflow-hidden"
        >
          {/* Search Input */}
          <div className="p-3 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredApps.length > 0) {
                    setSelectedApp(filteredApps[0])
                    setOpen(false)
                  }
                }}
                placeholder="Search applications..."
                className="w-full rounded-xl border border-white/10 bg-black/50 pl-9 pr-8 py-2 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>All Applications</span>
              <span className="text-indigo-300">
                {filteredApps.length} of {applications.length}
              </span>
            </div>
          </div>

          {/* Scrollable List of ALL apps */}
          <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-1">
            {filteredApps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No applications matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?._id === app._id
                const paused = app.status === 'paused'
                return (
                  <button
                    key={app._id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedApp(app)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-500/15 border border-indigo-500/35 shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                        : 'border border-transparent hover:bg-white/[0.05] hover:border-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/50 text-white shadow-md shadow-indigo-500/25'
                          : 'bg-white/[0.04] border-white/10 text-slate-300'
                      }`}
                    >
                      {getAppInitials(app.name)}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0b0d16] ${
                          paused ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {app.name}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2.5 text-[10px] font-semibold text-slate-400">
                        <span className="font-mono text-slate-400">v{app.version || '1.0'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="inline-flex items-center gap-1">
                          <UserGroupIcon className="h-3 w-3 text-slate-500" />
                          {app.userCount ?? 0}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className={paused ? 'text-amber-400' : 'text-emerald-400'}>
                          {paused ? 'Paused' : 'Active'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-indigo-300">
                        <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
