'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { UsersIcon, CubeIcon, ClockIcon, ShieldCheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface Plan {
  _id: string
  name: string
  displayName: string
}

interface Developer {
  _id: string
  email: string
  loginMethod: string
  appCount: number
  createdAt: string
  lastLogin: string | null
  plan?: {
    _id: string
    name: string
    displayName: string
  }
  planAssignedAt?: string | null
}

const PLAN_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  free:       { bg: 'bg-gray-500/10',    text: 'text-gray-400',   border: 'border-gray-500/20' },
  pro:        { bg: 'bg-indigo-500/10',  text: 'text-indigo-400', border: 'border-indigo-500/20' },
  enterprise: { bg: 'bg-amber-500/10',   text: 'text-amber-400',  border: 'border-amber-500/20' },
}

function PlanBadge({ planName, displayName }: { planName: string; displayName: string }) {
  const style = PLAN_BADGE[planName] ?? PLAN_BADGE.free
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {displayName}
    </span>
  )
}

export default function Developers() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // Track which developer row has the plan dropdown open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  // Track in-flight plan assignment per developer id
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return
    const handler = () => setOpenDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openDropdown])

  const loadData = async () => {
    setLoading(true)
    try {
      const [devsRes, plansRes] = await Promise.all([
        api.get('/admin/developers'),
        api.get('/admin/plans'),
      ])
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
      // Refresh the list to reflect the new plan
      await loadData()
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        'Failed to update plan'
      toast.error(msg)
    } finally {
      setAssigning((prev) => ({ ...prev, [devId]: false }))
    }
  }

  const filtered = developers.filter((d) =>
    d.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalApps = developers.reduce((sum, d) => sum + d.appCount, 0)
  const googleUsers = developers.filter((d) => d.loginMethod === 'Google').length
  const activeToday = developers.filter((d) => {
    if (!d.lastLogin) return false
    return Date.now() - new Date(d.lastLogin).getTime() < 86400000
  }).length

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Developers</h1>
        <p className="text-gray-500 text-sm mt-1">All accounts registered on your platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Accounts',   value: developers.length, icon: <UsersIcon className="w-5 h-5" />,       color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Total Apps Created', value: totalApps,       icon: <CubeIcon className="w-5 h-5" />,        color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Active Today',     value: activeToday,       icon: <ClockIcon className="w-5 h-5" />,       color: 'text-green-400',  bg: 'bg-green-500/10' },
          { label: 'Google Sign-ins',  value: googleUsers,       icon: <ShieldCheckIcon className="w-5 h-5" />, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} ${s.color} mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="w-full max-w-sm px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {search ? 'No developers found' : 'No accounts registered yet'}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Login Method</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Apps</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Plan</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Plan Since</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Registered</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Change Plan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dev, i) => {
                  const planName = dev.plan?.name ?? 'free'
                  const planDisplay = dev.plan?.displayName ?? 'Free'
                  const isAssigning = assigning[dev._id]

                  return (
                    <tr key={dev._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{i + 1}</td>

                      {/* Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                            {dev.email[0].toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{dev.email}</span>
                        </div>
                      </td>

                      {/* Login Method */}
                      <td className="px-5 py-3.5">
                        {dev.loginMethod === 'Google' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium">
                            ✉️ Email
                          </span>
                        )}
                      </td>

                      {/* Apps */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${dev.appCount > 0 ? 'bg-violet-500/15 text-violet-400' : 'bg-white/[0.04] text-gray-600'}`}>
                          {dev.appCount}
                        </span>
                      </td>

                      {/* Current Plan */}
                      <td className="px-5 py-3.5">
                        <PlanBadge planName={planName} displayName={planDisplay} />
                      </td>

                      {/* Plan Since */}
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {dev.planAssignedAt
                          ? new Date(dev.planAssignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-600">—</span>
                        }
                      </td>

                      {/* Registered */}
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {new Date(dev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {dev.lastLogin
                          ? new Date(dev.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : <span className="text-gray-600">Never</span>
                        }
                      </td>

                      {/* Change Plan Dropdown */}
                      <td className="px-5 py-3.5">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={isAssigning || plans.length === 0}
                            onClick={() => setOpenDropdown(openDropdown === dev._id ? null : dev._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.07] hover:border-white/[0.12] transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAssigning ? (
                              <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                Assign
                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${openDropdown === dev._id ? 'rotate-180' : ''}`} />
                              </>
                            )}
                          </button>

                          {openDropdown === dev._id && plans.length > 0 && (
                            <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] bg-[#1a1a2e] border border-white/[0.10] rounded-xl shadow-xl overflow-hidden">
                              {plans.map((plan) => {
                                const isCurrent = plan._id === dev.plan?._id || plan.name === planName
                                return (
                                  <button
                                    key={plan._id}
                                    onClick={() => assignPlan(dev._id, plan._id)}
                                    disabled={isCurrent}
                                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 ${
                                      isCurrent
                                        ? 'text-gray-600 cursor-default'
                                        : 'text-gray-200 hover:bg-white/[0.06] cursor-pointer'
                                    }`}
                                  >
                                    <span>{plan.displayName}</span>
                                    {isCurrent && (
                                      <span className="text-[10px] text-gray-600 font-medium">current</span>
                                    )}
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
