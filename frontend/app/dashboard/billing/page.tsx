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
} from '@heroicons/react/24/outline'

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

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(0)}/month`
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
              {formatPrice(currentPlan.price)}
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
                        {formatPrice(plan.price)}
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

                  {/* Features rows — collect all unique features */}
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

      {/* CTA */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Need more resources?</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Reach out and we&apos;ll find the right plan for your needs.
          </p>
        </div>
        <a
          href="mailto:support@example.com"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
        >
          <EnvelopeIcon className="w-4 h-4" />
          Contact us to upgrade
        </a>
      </div>
    </div>
  )
}
