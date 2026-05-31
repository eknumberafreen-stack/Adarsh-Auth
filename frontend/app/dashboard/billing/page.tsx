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
import { motion } from 'framer-motion'

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
    <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-6 h-6 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="ml-auto text-xs font-black font-mono text-white">
          {current} <span className="text-slate-500 font-normal">/</span> {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.02]">
        {isUnlimited ? (
          <div className="h-full bg-gradient-to-r from-indigo-500/25 to-purple-500/25 rounded-full w-full" />
        ) : (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isNearLimit 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                : 'bg-gradient-to-r from-indigo-500 to-purple-600'
            }`}
          />
        )}
      </div>
      {!isUnlimited && (
        <p className="text-[10px] text-slate-500 font-bold tracking-wide mt-2">
          {isNearLimit
            ? `${Math.round(pct)}% used — Approaching limits`
            : `${Math.round(pct)}% resource volume utilized`}
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
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentPlan = myPlan?.plan
  const usage = myPlan?.usage

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Billing &amp; License</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Review plan statistics, metrics volume, and upgrade cycles</p>
        </div>
        <a
          href="mailto:donumberafreen@gmail.com"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-bold"
        >
          <EnvelopeIcon className="w-4 h-4" />
          Request Enterprise Customization
        </a>
      </div>

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="card relative overflow-hidden p-6 border-indigo-500/25 bg-indigo-500/[0.01] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.04] to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <CreditCardIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Subscribed Plan</p>
                <p className="text-xl font-black text-white mt-0.5 tracking-tight">{currentPlan.displayName}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black font-mono">
              {formatPrice(currentPlan.price, currentPlan.name)}
            </span>
          </div>

          {/* Limits grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            {[
              { label: 'Applications Limit', value: currentPlan.limits.maxApplications },
              { label: 'Max Users / Workspace', value: currentPlan.limits.maxUsersPerApp },
              { label: 'Max Keys / Workspace', value: currentPlan.limits.maxLicensesPerApp },
              { label: 'Daily API Volume', value: currentPlan.limits.maxApiCallsPerDay },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-black/30 border border-white/[0.04] rounded-xl p-3.5 text-center shadow-md"
              >
                <p className="text-base font-black text-white font-mono">{formatLimit(item.value)}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Bars */}
      {usage && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Resource Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageBar
              label="Active Workspaces"
              icon={CubeIcon}
              current={usage.applications?.current ?? 0}
              limit={usage.applications?.limit ?? currentPlan?.limits.maxApplications ?? null}
            />
            <UsageBar
              label="Registered Users"
              icon={UsersIcon}
              current={usage.totalUsers?.current ?? 0}
              limit={usage.totalUsers?.limit ?? currentPlan?.limits.maxUsersPerApp ?? null}
            />
            <UsageBar
              label="Active License Keys"
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
            displayName: 'Free Tier',
            price: 'Free',
            limits: { apps: '5', users: '100 / Workspace', licenses: '50 / Workspace', apis: '5,000 / Day' },
            features: { webhooks: false, support: 'Community Forum', custom: false },
            isCurrent: isFreeCurrent
          },
          {
            name: 'pro',
            displayName: 'Pro Tier',
            price: billingCycle === 'monthly' ? '₹150 / mo' : '₹1,500 / yr',
            limits: { apps: '25', users: '1,000 / Workspace', licenses: '1,000 / Workspace', apis: '50,000 / Day' },
            features: { webhooks: true, support: 'Priority Mail', custom: false },
            isCurrent: isProCurrent
          },
          {
            name: 'enterprise',
            displayName: 'Enterprise Tier',
            price: billingCycle === 'monthly' ? '₹250 / mo' : '₹2,500 / yr',
            limits: { apps: 'Unlimited', users: 'Unlimited', licenses: 'Unlimited', apis: 'Unlimited' },
            features: { webhooks: true, support: '24/7 Dedicated', custom: true },
            isCurrent: isEntCurrent
          }
        ];

        return (
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Subscription Comparison matrix</h2>
            <div className="card overflow-hidden p-0 shadow-2xl">
              <div className="overflow-x-auto w-full scrollbar-thin">
                <table className="w-full text-sm table-modern text-left">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-black/10">
                      <th className="px-5 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px] w-1/4">
                        Capabilities
                      </th>
                      {comparisonPlans.map((col) => (
                        <th
                          key={col.name}
                          className="px-5 py-4 text-center"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`text-[11px] font-black uppercase tracking-wider ${col.isCurrent ? 'text-indigo-400' : 'text-slate-300'}`}>{col.displayName}</span>
                            {col.isCurrent && (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[9px] font-bold uppercase tracking-wide">
                                Active
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price Row */}
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Price Rate</td>
                      {comparisonPlans.map((col) => (
                        <td
                          key={col.name}
                          className={`px-5 py-3.5 text-center font-black text-xs ${
                            col.isCurrent ? 'text-indigo-300' : 'text-white'
                          }`}
                        >
                          {col.price}
                        </td>
                      ))}
                    </tr>

                    {/* Limits Rows */}
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Applications Volume</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3.5 text-center text-xs font-semibold ${col.isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                          {col.limits.apps}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Users Per Workspace</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3.5 text-center text-xs font-semibold ${col.isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                          {col.limits.users}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">License keys Per Application</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3.5 text-center text-xs font-semibold ${col.isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                          {col.limits.licenses}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">API Endpoint Limit</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3.5 text-center text-xs font-semibold ${col.isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                          {col.limits.apis}
                        </td>
                      ))}
                    </tr>

                    {/* Features Rows */}
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Discord Integration</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className="px-5 py-3.5 text-center">
                          {col.features.webhooks ? (
                            <CheckIcon className="w-4.5 h-4.5 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Help Support</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className={`px-5 py-3.5 text-center text-xs font-semibold ${col.isCurrent ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {col.features.support}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-0 hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-bold uppercase tracking-wide">Custom System Snippets</td>
                      {comparisonPlans.map((col) => (
                        <td key={col.name} className="px-5 py-3.5 text-center">
                          {col.features.custom ? (
                            <CheckIcon className="w-4.5 h-4.5 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600">—</span>
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Available Licenses</h2>
            <div className="inline-flex bg-black/40 border border-white/[0.05] rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Monthly cycle
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Yearly cycle (-16%)
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
                <div key={plan._id} className={`bg-[#0a0a14]/60 border rounded-2xl p-6 flex flex-col gap-5 shadow-2xl transition-all ${isCurrent ? 'border-indigo-500/30' : 'border-white/[0.04] hover:border-white/10'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-black text-white text-base tracking-tight">{plan.displayName}</p>
                      {isCurrent && <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-bold uppercase tracking-wider">Active</span>}
                    </div>
                    <p className="text-2xl font-black text-indigo-300 drop-shadow-[0_0_8px_rgba(99,102,241,0.2)] mt-1.5">{formatPrice(plan.price, plan.name)}</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                        <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-500 text-xs font-bold text-center select-none uppercase tracking-wide">
                      Currently Active Plan
                    </div>
                  ) : isDowngradeDisabled ? (
                    <div className="w-full py-3 rounded-xl bg-white/[0.01] border border-white/[0.03] text-slate-600 text-xs font-bold text-center cursor-not-allowed select-none uppercase tracking-wide">
                      Downgrade Disabled
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/dashboard/pay?planId=${plan._id}`)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 uppercase tracking-wider"
                    >
                      <BanknotesIcon className="w-3.5 h-3.5" />
                      Checkout via UPI Gateway
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
