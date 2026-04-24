'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { filterDevelopers } from '@/lib/username'
import toast from 'react-hot-toast'
import { ChevronDownIcon, ClockIcon, CubeIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline'

interface Plan {
  _id: string
  name: string
  displayName: string
}

interface Developer {
  _id: string
  email: string
  username: string | null
  loginMethod: string
  appCount: number
  createdAt: string
  lastLogin: string | null
  plan?: {
    _id: string
    name: string
    displayName: string
  } | null
  planAssignedAt?: string | null
}

const PLAN_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  pro: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  yearly: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
}

function formatDate(date?: string | null, withTime = false) {
  if (!date) return '—'

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'

  return withTime
    ? parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPlanExpiry(dev: Developer) {
  const planName = dev.plan?.name ?? 'free'
  if (planName === 'free') return '—'

  const baseDate = new Date(dev.planAssignedAt ?? dev.createdAt)
  if (Number.isNaN(baseDate.getTime())) return '—'

  const expiry = new Date(baseDate)
  if (planName === 'yearly') {
    expiry.setFullYear(expiry.getFullYear() + 1)
  } else {
    expiry.setMonth(expiry.getMonth() + 1)
  }

  return formatDate(expiry.toISOString())
}

function PlanBadge({ planName, displayName }: { planName: string; displayName: string }) {
  const style = PLAN_BADGE[planName] ?? PLAN_BADGE.free
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>{displayName}</span>
}

export default function Developers() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!openDropdown) return
    const handler = () => setOpenDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openDropdown])

  const loadData = async () => {
    setLoading(true)
    try {
      const [devsRes, plansRes] = await Promise.all([api.get('/admin/developers'), api.get('/admin/plans')])
      setDevelopers(devsRes.data.developers)
      setPlans(plansRes.data.plans ?? plansRes.data)
    } catch {
      toast.error('Failed to load developers')
    } finally {
      setLoading(false)
    }
  }

  const assignPlan = async (devId: string, planId: string) => {
    setAssigning((prev) => ({ ...prev, [devId]: true }))
    setOpenDropdown(null)
    try {
      await api.patch(`/admin/developers/${devId}/plan`, { planId })
      toast.success('Plan updated')
      await loadData()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to update plan'
      toast.error(msg)
    } finally {
      setAssigning((prev) => ({ ...prev, [devId]: false }))
    }
  }

  const filtered = filterDevelopers(developers, search)
  const totalApps = developers.reduce((sum, dev) => sum + dev.appCount, 0)
  const googleUsers = developers.filter((dev) => dev.loginMethod === 'Google').length
  const activeToday = developers.filter((dev) => {
    if (!dev.lastLogin) return false
    return Date.now() - new Date(dev.lastLogin).getTime() < 86400000
  }).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Developers</h1>
        <p className="mt-1 text-sm text-gray-500">All accounts registered on your platform</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Accounts', value: developers.length, icon: <UsersIcon className="h-5 w-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Total Apps Created', value: totalApps, icon: <CubeIcon className="h-5 w-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Active Today', value: activeToday, icon: <ClockIcon className="h-5 w-5" />, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Google Sign-ins', value: googleUsers, icon: <ShieldCheckIcon className="h-5 w-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or username..."
          className="w-full max-w-sm rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all focus:border-indigo-500/50 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500">{search ? 'No developers found' : 'No accounts registered yet'}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Username</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Login Method</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Apps</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan Since</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Registered</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expiry Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Login</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Change Plan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dev, index) => {
                  const planName = dev.plan?.name ?? 'free'
                  const planDisplay = dev.plan?.displayName ?? 'Free'
                  const isAssigning = assigning[dev._id]

                  return (
                    <tr key={dev._id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 text-xs text-gray-600">{index + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-600/20 text-xs font-bold text-indigo-300">
                            {dev.email[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{dev.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{dev.username ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        {dev.loginMethod === 'Google' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                            <svg className="h-3 w-3" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                            Email
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${dev.appCount > 0 ? 'bg-violet-500/15 text-violet-400' : 'bg-white/[0.04] text-gray-600'}`}>
                          {dev.appCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <PlanBadge planName={planName} displayName={planDisplay} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(dev.planAssignedAt)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(dev.createdAt)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{getPlanExpiry(dev)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{dev.lastLogin ? formatDate(dev.lastLogin, true) : <span className="text-gray-600">Never</span>}</td>
                      <td className="px-5 py-3.5">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={isAssigning || plans.length === 0}
                            onClick={() => setOpenDropdown(openDropdown === dev._id ? null : dev._id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isAssigning ? (
                              <span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                            ) : (
                              <>
                                Assign
                                <ChevronDownIcon className={`h-3 w-3 transition-transform ${openDropdown === dev._id ? 'rotate-180' : ''}`} />
                              </>
                            )}
                          </button>

                          {openDropdown === dev._id && plans.length > 0 && (
                            <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-white/[0.10] bg-[#1a1a2e] shadow-xl">
                              {plans.map((plan) => {
                                const isCurrent = plan._id === dev.plan?._id || plan.name === planName
                                return (
                                  <button
                                    key={plan._id}
                                    onClick={() => assignPlan(dev._id, plan._id)}
                                    disabled={isCurrent}
                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs transition-colors ${
                                      isCurrent ? 'cursor-default text-gray-600' : 'cursor-pointer text-gray-200 hover:bg-white/[0.06]'
                                    }`}
                                  >
                                    <span>{plan.displayName}</span>
                                    {isCurrent && <span className="text-[10px] font-medium text-gray-600">current</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
