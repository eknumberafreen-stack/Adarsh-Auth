'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CommandLineIcon,
  CpuChipIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const featureCards = [
  {
    icon: ShieldCheckIcon,
    title: 'Signed request pipeline',
    description: 'HMAC SHA-256 signing, nonce verification, replay protection, and per-endpoint rate limiting stay in front of every client request.',
  },
  {
    icon: KeyIcon,
    title: 'License lifecycle control',
    description: 'Generate, revoke, blacklist, pause, and monitor keys with clean ownership across applications and versions.',
  },
  {
    icon: CpuChipIcon,
    title: 'HWID-aware sessions',
    description: 'Bind sessions to hardware, monitor heartbeat activity, and immediately invalidate risky access patterns.',
  },
  {
    icon: UserGroupIcon,
    title: 'Operational dashboard',
    description: 'Manage users, sessions, plans, payments, and application credentials from one secure admin workspace.',
  },
]

const trustPillars = [
  'MongoDB-backed application and user records',
  'Redis-based nonce storage and rate limiting',
  'JWT access and refresh token flows',
  'Audit logs, Discord webhooks, and admin tooling',
]

const metrics = [
  { value: '2', label: 'Auth layers', note: 'Platform login plus per-application client auth' },
  { value: '24h', label: 'Session window', note: 'Managed heartbeat and expiry for client sessions' },
  { value: '4+', label: 'Core workspaces', note: 'Apps, licenses, users, sessions, billing, and admin' },
  { value: '100%', label: 'Self-hosted', note: 'Your infrastructure, your data, your controls' },
]

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_25%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.4))]" />

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/20">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/75">Self Hosted</p>
              <p className="text-lg font-bold text-white">Adarsh Auth</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#platform" className="transition-colors hover:text-white">Platform</a>
            <a href="#operations" className="transition-colors hover:text-white">Operations</a>
            <a href="#security" className="transition-colors hover:text-white">Security</a>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-secondary hidden sm:inline-flex">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary">
              Launch Workspace
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="badge border-sky-400/20 bg-sky-400/10 text-sky-200">
              <BoltIcon className="h-4 w-4" />
              Production-ready authentication and licensing workspace
            </div>

            <h1 className="mt-8 max-w-4xl text-balance text-5xl font-bold leading-[1.02] text-white md:text-7xl">
              Secure your software with a control panel that feels built for real operations.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Adarsh Auth gives you a self-hosted platform for platform login, application credentials, license lifecycle management,
              HWID-aware client authentication, session control, and billing visibility without handing your data to a third party.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn btn-primary px-6 py-3.5">
                Create Free Account
              </Link>
              <Link href="/login" className="btn btn-secondary px-6 py-3.5">
                Open Dashboard
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {trustPillars.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                  <CheckBadgeIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="page-eyebrow">Live Product View</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Operational snapshot</h2>
                </div>
                <div className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-200">All systems operational</div>
              </div>
            </div>

            <div className="grid gap-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div key={metric.label} className="stat-tile">
                    <p className="stat-label">{metric.label}</p>
                    <p className="stat-value">{metric.value}</p>
                    <p className="stat-meta">{metric.note}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow</p>
                    <h3 className="mt-2 text-xl font-bold text-white">From app creation to active session monitoring</h3>
                  </div>
                  <CommandLineIcon className="h-10 w-10 text-sky-300" />
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    'Create an application and issue a secure owner ID and app secret.',
                    'Generate license inventory with expiry rules and application-level visibility.',
                    'Authenticate client requests with timestamp, nonce, HMAC signature, and HWID checks.',
                    'Track sessions, users, bans, plans, and billing from the same workspace.',
                  ].map((step, index) => (
                    <div key={step} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/15 text-sm font-bold text-sky-200">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Platform Surface</p>
              <h2 className="page-title">Built for software operations, not just a login form</h2>
            </div>
            <p className="page-subtitle">
              The product already has deep backend logic. This frontend refresh brings the same maturity to the way the platform explains itself,
              presents trust signals, and guides operators through the workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((feature) => (
              <div key={feature.title} className="card-hover">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="operations" className="relative z-10 px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-panel p-8">
            <p className="page-eyebrow">Operator Experience</p>
            <h2 className="mt-3 text-3xl font-bold text-white">A clearer dashboard improves speed without touching the backend logic.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              The redesign focuses on stronger hierarchy, easier scanning, better mobile handling, and clearer action surfaces for application
              credentials, licenses, users, and sessions. That means faster administration with the same underlying behavior you already trust.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: ChartBarIcon, title: 'Cleaner KPI presentation', copy: 'Overview metrics are grouped into clearer operational summaries and recent activity panels.' },
                { icon: ArrowTrendingUpIcon, title: 'Better management flow', copy: 'Credentials, list actions, search, and summaries are arranged to support real daily use.' },
                { icon: ShieldCheckIcon, title: 'Stronger trust presentation', copy: 'Security details are surfaced in a more product-grade way across landing and dashboard surfaces.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.copy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { title: 'Applications', note: 'Credential visibility, selection state, and app status management' },
              { title: 'Licenses', note: 'Inventory scanning, action density, and safer presentation of states' },
              { title: 'Users', note: 'Operational context for bans, HWID resets, and expiry tracking' },
              { title: 'Sessions', note: 'Cleaner active session review with faster terminate actions' },
            ].map((item, index) => (
              <div key={item.title} className="card-hover">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Area 0{index + 1}</p>
                <h3 className="mt-3 text-2xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 px-6 pb-8">
        <div className="mx-auto max-w-7xl surface-panel px-8 py-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="page-eyebrow">Security Posture</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Security controls are part of the product story, not hidden implementation detail.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                This project already includes meaningful controls like replay prevention, HMAC validation, audit logging, rate limiting,
                session management, and HWID locking. The new presentation makes those protections easier to understand and trust.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Replay attack prevention',
                'Per-app request verification',
                'JWT access and refresh flow',
                'Rate limiting with Redis support',
                'Session heartbeat validation',
                'Audit logs and suspicious activity tracing',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Pricing</p>
              <h2 className="page-title">Simple plans, clearer presentation</h2>
            </div>
            <p className="page-subtitle">
              The existing pricing structure remains the same. The difference is a cleaner product presentation that helps users understand where they fit.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                name: 'Free',
                price: '$0',
                tone: 'border-white/10 bg-white/[0.04]',
                cta: 'Create Free Account',
                features: ['5 Applications', '100 Users / App', '50 Licenses / App', 'HWID Locking'],
              },
              {
                name: 'Pro',
                price: '$1.6',
                tone: 'border-sky-400/30 bg-sky-400/10 shadow-lg shadow-sky-500/10',
                cta: 'Upgrade Path',
                features: ['25 Applications', '1,000 Users / App', '500 Licenses / App', 'Discord Webhooks'],
              },
              {
                name: 'Enterprise',
                price: '$3',
                tone: 'border-amber-400/30 bg-amber-400/10',
                cta: 'Contact Support',
                features: ['Unlimited Applications', 'Unlimited Users', 'Unlimited Licenses', 'Priority Support'],
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-3xl border p-8 ${plan.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{plan.name}</p>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-400">/ month</span>
                </div>
                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Link href={plan.name === 'Enterprise' ? '/login' : '/register'} className="btn btn-secondary mt-8 w-full">
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-gradient-to-r from-sky-400/12 via-white/[0.04] to-amber-400/12 px-8 py-10">
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Start Now</p>
              <h2 className="page-title">Keep your current backend logic. Ship a better product face.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Open Your Workspace
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
