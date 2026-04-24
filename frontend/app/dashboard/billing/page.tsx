'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  CreditCardIcon,
  CheckIcon,
  CubeIcon,
  UsersIcon,
  KeyIcon,
  EnvelopeIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface PlanLimits {
  maxApplications: number
  maxUsersPerApp: number
  maxLicensesPerApp: number
  maxApiCallsPerDay: number
}

interface Plan {
  _id: string
  name: string
  displayName: string
  price: number
  limits: PlanLimits
  features: string[]
  isActive: boolean
}

interface Usage {
  applications: { current: number; limit: number | null }
  totalUsers: { current: number; limit: number | null }
  totalLicenses: { current: number; limit: number | null }
}

interface MyPlanResponse {
  plan: Plan
  usage: Usage
}

function formatLimit(value: number): string {
  return value === -1 ? 'Unlimited' : String(value)
}

function formatPrice(cents: number, planName?: string): string {
  if (cents === 0) return 'Free'
  const dollars = cents / 100
  const display = dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(1)
  const suffix = planName === 'yearly' ? '/year' : '/month'
  return '$' + display + suffix
}

function UsageBar({
  label,
  icon: Icon,
  current,
  limit,
}: {
  label: string
  icon: React.ElementType
  current: number
  limit: number | null
}) {
  const isUnlimited = limit === null || limit === -1
  const pct = isUnlimited ? 0 : Math.min((current / (limit as number)) * 100, 100)
  const isNearLimit = !isUnlimited && pct >= 80

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="ml-auto text-sm font-semibold text-white">
          {current} / {isUnlimited ? 'Unlimited' : limit}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full bg-indigo-500/40 rounded-full w-full" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {!isUnlimited && (
        <p className="text-xs text-gray-500 mt-1.5">
          {isNearLimit
            ? `${Math.round(pct)}% used — approaching limit`
            : `${Math.round(pct)}% used`}
        </p>
      )}
    </div>
  )
}

export default function BillingPage() {
  const router = useRouter()
  const [myPlan, setMyPlan] = useState<MyPlanResponse | null>(null)
  const [allPlans, setAllPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, myRes] = await Promise.all([
          api.get('/plans'),
          api.get('/plans/my'),
        ])
        setAllPlans(plansRes.data.plans ?? plansRes.data)
        setMyPlan(myRes.data)
      } catch {
        toast.error('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentPlan = myPlan?.plan
  const usage = myPlan?.usage

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Plan &amp; Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your current plan and resource usage</p>
        </div>
        <a
          href="mailto:support@example.com"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors text-sm font-medium"
        >
          <EnvelopeIcon className="w-4 h-4" />
          Contact us to upgrade
        </a>
      </div>

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-white/[0.02] border border-indigo-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                <CreditCardIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Current Plan</p>
                <p className="text-lg font-bold text-white">{currentPlan.displayName}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              {formatPrice(currentPlan.price, currentPlan.name)}
            </span>
          </div>

          {/* Limits grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Applications', value: currentPlan.limits.maxApplications },
              { label: 'Users / App', value: currentPlan.limits.maxUsersPerApp },
              { label: 'Licenses / App', value: currentPlan.limits.maxLicensesPerApp },
              { label: 'API Calls / Day', value: currentPlan.limits.maxApiCallsPerDay },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-center"
              >
                <p className="text-xl font-bold text-white">{formatLimit(item.value)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Bars */}
      {usage && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Resource Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UsageBar
              label="Applications"
              icon={CubeIcon}
              current={usage.applications?.current ?? 0}
              limit={usage.applications?.limit ?? currentPlan?.limits.maxApplications ?? null}
            />
            <UsageBar
              label="Total Users"
              icon={UsersIcon}
              current={usage.totalUsers?.current ?? 0}
              limit={usage.totalUsers?.limit ?? currentPlan?.limits.maxUsersPerApp ?? null}
            />
            <UsageBar
              label="Total Licenses"
              icon={KeyIcon}
              current={usage.totalLicenses?.current ?? 0}
              limit={usage.totalLicenses?.limit ?? currentPlan?.limits.maxLicensesPerApp ?? null}
            />
          </div>
        </div>
      )}

      {/* Plan Comparison Table */}
      {allPlans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Available Plans</h2>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium w-1/3">
                      Feature
                    </th>
                    {allPlans.map((plan) => (
                      <th
                        key={plan._id}
                        className={`px-5 py-3 text-center text-xs uppercase tracking-wider font-medium ${
                          plan.name === currentPlan?.name
                            ? 'text-indigo-300'
                            : 'text-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{plan.displayName}</span>
                          {plan.name === currentPlan?.name && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] normal-case font-normal">
                              Current
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Price row */}
                  <tr className="border-b border-white/[0.04]">
                    <td className="px-5 py-3 text-gray-400">Price</td>
                    {allPlans.map((plan) => (
                      <td
                        key={plan._id}
                        className={`px-5 py-3 text-center font-semibold ${
                          plan.name === currentPlan?.name ? 'text-indigo-300' : 'text-white'
                        }`}
                      >
                        {formatPrice(plan.price, plan.name)}
                      </td>
                    ))}
                  </tr>

                  {/* Limits rows */}
                  {[
                    { label: 'Applications', key: 'maxApplications' as keyof PlanLimits },
                    { label: 'Users / App', key: 'maxUsersPerApp' as keyof PlanLimits },
                    { label: 'Licenses / App', key: 'maxLicensesPerApp' as keyof PlanLimits },
                    { label: 'API Calls / Day', key: 'maxApiCallsPerDay' as keyof PlanLimits },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">{row.label}</td>
                      {allPlans.map((plan) => (
                        <td
                          key={plan._id}
                          className={`px-5 py-3 text-center ${
                            plan.name === currentPlan?.name ? 'text-indigo-200' : 'text-gray-300'
                          }`}
                        >
                          {formatLimit(plan.limits[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Features rows */}
                  {Array.from(
                    new Set(allPlans.flatMap((p) => p.features))
                  ).map((feature) => (
                    <tr key={feature} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-3 text-gray-400">{feature}</td>
                      {allPlans.map((plan) => (
                        <td key={plan._id} className="px-5 py-3 text-center">
                          {plan.features.includes(feature) ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plans Grid */}
      {allPlans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allPlans.filter(p => p.name !== 'free').map((plan) => {
              const isCurrent = plan.name === currentPlan?.name
              return (
                <div key={plan._id} className={`bg-white/[0.02] border rounded-xl p-5 flex flex-col gap-4 ${isCurrent ? 'border-indigo-500/30' : 'border-white/[0.06]'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-white">{plan.displayName}</p>
                      {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">Current</span>}
                    </div>
                    <p className="text-xl font-black text-indigo-300">{formatPrice(plan.price, plan.name)}</p>
                  </div>
                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-gray-500 text-xs font-medium text-center">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/dashboard/pay?planId=${plan._id}`)}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <BanknotesIcon className="w-3.5 h-3.5" />
                      Pay via UPI
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
