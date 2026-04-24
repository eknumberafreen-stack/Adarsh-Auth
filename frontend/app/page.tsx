'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircleIcon,
  FingerPrintIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/store'
import ParticleField from '@/components/ParticleField'

const features = [
  {
    icon: LockClosedIcon,
    title: 'Secure authentication',
    description: 'Authenticate dashboard users and application users with protected sessions and controlled access.',
  },
  {
    icon: KeyIcon,
    title: 'License management',
    description: 'Create, redeem, pause, revoke, and blacklist license keys for each application.',
  },
  {
    icon: FingerPrintIcon,
    title: 'HWID protection',
    description: 'Bind access to hardware identifiers and review session activity from the dashboard.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Security controls',
    description: 'Use request signing, replay protection, rate limiting, and audit visibility across the platform.',
  },
]

const dashboardItems = [
  'Applications with owner ID and secret management',
  'License inventory with expiry and status controls',
  'User administration with ban and HWID actions',
  'Session monitoring with terminate controls',
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
    return <div className="min-h-screen bg-[#07070a]" />
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07070a] text-white">
      <ParticleField
        className="fixed inset-0 pointer-events-none opacity-70"
        particleColor="rgba(161, 161, 170, 0.22)"
        lineColor="rgba(99, 102, 241, 0.14)"
        count={80}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(67,56,202,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(39,39,42,0.24),transparent_28%)]" />

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <LockClosedIcon className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Authentication</p>
              <p className="text-lg font-bold text-white">Adarsh Auth</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#dashboard" className="transition-colors hover:text-white">Dashboard</a>
            <a href="#security" className="transition-colors hover:text-white">Security</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-secondary hidden sm:inline-flex">Sign In</Link>
            <Link href="/register" className="btn btn-primary">Create Account</Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="badge border-white/10 bg-white/[0.04] text-slate-300">
              <ShieldCheckIcon className="h-4 w-4 text-indigo-300" />
              Self-hosted authentication and licensing
            </div>

            <h1 className="mt-8 max-w-4xl text-balance text-5xl font-bold leading-[1.04] text-white md:text-7xl">
              Authentication, licenses, users, and sessions in one dark control center.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Manage secure sign-in, application credentials, license keys, hardware-based access, and active sessions with a cleaner,
              more professional interface built around authentication workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="btn btn-primary px-6 py-3.5">Get Started</Link>
              <Link href="/login" className="btn btn-secondary px-6 py-3.5">Open Dashboard</Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                'JWT access and refresh token support',
                'Signed client requests with replay protection',
                'License key lifecycle controls',
                'Session monitoring and audit visibility',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-300" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel overflow-hidden">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="page-eyebrow">Dashboard Preview</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Classic dark workspace for auth management</h2>
            </div>

            <div className="grid gap-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Applications', value: 'Multi-app', note: 'Owner ID and secret control' },
                  { label: 'Licenses', value: 'Managed', note: 'Generate and control key status' },
                  { label: 'Users', value: 'Protected', note: 'Ban, pause, and monitor access' },
                  { label: 'Sessions', value: 'Live', note: 'Review activity and terminate fast' },
                ].map((item) => (
                  <div key={item.label} className="stat-tile">
                    <p className="stat-label">{item.label}</p>
                    <p className="stat-value">{item.value}</p>
                    <p className="stat-meta">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What you manage</p>
                <div className="mt-4 space-y-3">
                  {dashboardItems.map((item, index) => (
                    <div key={item} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-200">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Features</p>
              <h2 className="page-title">Built around authentication operations</h2>
            </div>
            <p className="page-subtitle">
              Every section focuses on access control, license administration, user management, and secure session handling.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="card-hover">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <feature.icon className="h-6 w-6 text-indigo-300" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="relative z-10 px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card">
            <p className="page-eyebrow">Auth Dashboard</p>
            <h2 className="mt-2 text-3xl font-bold text-white">A clearer admin flow for applications, licenses, and access.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              The updated dark UI improves readability and action flow across the dashboard while keeping all existing backend behavior and data flow unchanged.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Create and manage applications',
              'Review credentials securely',
              'Track users and sessions',
              'Operate licenses with clarity',
            ].map((item) => (
              <div key={item} className="card-hover flex items-center gap-3">
                <UserGroupIcon className="h-5 w-5 text-indigo-300" />
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.03] px-8 py-10">
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Security</p>
              <h2 className="page-title">Designed for secure authentication workflows</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">Create Account</Link>
              <Link href="/login" className="btn btn-secondary">Sign In</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
