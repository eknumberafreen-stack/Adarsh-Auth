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
  const inrAmount = Math.round(dollars * 83)
  const suffix = planName?.endsWith('_yearly') ? '/year' : '/month'
  return '₹' + inrAmount + suffix
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

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
      {allPlans.length > 0 && (() => {
        const isProCurrent = currentPlan?.name === 'pro' || currentPlan?.name?.startsWith('pro');
        const isEntCurrent = currentPlan?.name === 'enterprise' || currentPlan?.name === 'enterprice' || currentPlan?.name === 'yearly' || currentPlan?.name?.startsWith('enterprise');
        const isFreeCurrent = currentPlan?.name === 'free' || (!isProCurrent && !isEntCurrent);

        const comparisonPlans = [
          {
            name: 'free',
            displayName: 'Free',
            price: 'Free',
            limits: { apps: '5', users: '100 / App', licenses: '50 / App', apis: '5,000 / Day' },
            features: { webhooks: false, support: 'Community', custom: false },
            isCurrent: isFreeCurrent
          },
          {
            name: 'pro',
            displayName: 'Pro',
            price: billingCycle === 'monthly' ? '₹150 / mo' : '₹1,500 / yr',
            limits: { apps: '25', users: '1,000 / App', licenses: '1,000 / App', apis: '50,000 / Day' },
            features: { webhooks: true, support: 'Priority', custom: false },
            isCurrent: isProCurrent
          },
          {
            name: 'enterprise',
            displayName: 'Enterprise',
            price: billingCycle === 'monthly' ? '₹250 / mo' : '₹2,500 / yr',
            limits: { apps: 'Unlimited', users: 'Unlimited', licenses: 'Unlimited', apis: 'Unlimited' },
            features: { webhooks: true, support: 'Priority (24/7)', custom: true },
            isCurrent: isEntCurrent
          }
        ];

        return (
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Available Plans</h2>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium w-1/4">
                        Feature
                      </th>
                      {comparisonPlans.map((col) => (
                        <th
                          key={col.name}
                          className={`px-5 py-3 text-center text-xs uppercase tracking-wider font-medium ${
                            col.isCurrent ? 'text-indigo-300' : 'text-gray-500'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{col.displayName}</span>
                            {col.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] normal-case font-normal">
                                Current Plan
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price Row */}
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Price</td>
                      {comparisonPlans.map((col) => (
                        <td
                          key={col.name}
                          className={`px-5 py-3 text-center font-semibold ${
                            col.isCurrent ? 'text-indigo-300' : 'text-white'
                          }`}
                        >
                          {col.price}
                        </td>
                      ))}
                    </tr>

                    {/* Limits Rows */}
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Applications Limit</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3 text-center ${col.isCurrent ? 'text-indigo-200' : 'text-gray-300'}`}>
                          {col.limits.apps}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Users Per Application</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3 text-center ${col.isCurrent ? 'text-indigo-200' : 'text-gray-300'}`}>
                          {col.limits.users}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Licenses Per Application</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3 text-center ${col.isCurrent ? 'text-indigo-200' : 'text-gray-300'}`}>
                          {col.limits.licenses}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">API Calls Daily Limit</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3 text-center ${col.isCurrent ? 'text-indigo-200' : 'text-gray-300'}`}>
                          {col.limits.apis}
                        </td>
                      ))}
                    </tr>

                    {/* Features Rows */}
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Discord Webhooks</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className="px-5 py-3 text-center">
                          {col.features.webhooks ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.04]">
                      <td className="px-5 py-3 text-gray-400">Customer Support</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3 text-center ${col.isCurrent ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {col.features.support}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-3 text-gray-400">Custom Integrations</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className="px-5 py-3 text-center">
                          {col.features.custom ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Upgrade Plans Grid */}
      {allPlans.length > 0 && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white">Upgrade Your Plan</h2>
            <div className="inline-flex bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Yearly (Save ~16%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {allPlans.filter(p => p.name !== 'free' && p.name.endsWith(`_${billingCycle}`)).map((plan) => {
              const isLegacyEnterprise = currentPlan?.name === 'enterprise' || currentPlan?.name === 'enterprice' || currentPlan?.name === 'yearly';
              const isCurrent = plan.name === currentPlan?.name ||
                (plan.name === 'pro_monthly' && currentPlan?.name === 'pro' && billingCycle === 'monthly') ||
                (plan.name === 'pro_yearly' && currentPlan?.name === 'pro' && billingCycle === 'yearly') ||
                (plan.name === 'enterprise_monthly' && isLegacyEnterprise && billingCycle === 'monthly') ||
                (plan.name === 'enterprise_yearly' && isLegacyEnterprise && billingCycle === 'yearly');

              // Check if user is on Enterprise and target is Pro
              const isUserEnterprise = currentPlan?.name.startsWith('enterprise') || isLegacyEnterprise;
              const isTargetPro = plan.name.startsWith('pro');
              const isDowngradeDisabled = isUserEnterprise && isTargetPro;

              return (
                <div key={plan._id} className={`bg-white/[0.02] border rounded-xl p-5 flex flex-col gap-4 ${isCurrent ? 'border-indigo-500/30' : 'border-white/[0.06]'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-white">{plan.displayName}</p>
                      {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">Current Plan</span>}
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
                  ) : isDowngradeDisabled ? (
                    <div className="w-full py-2.5 rounded-lg bg-white/[0.01] border border-white/[0.04] text-gray-600 text-xs font-medium text-center cursor-not-allowed">
                      Enterprise Active
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
