'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon, FingerPrintIcon, KeyIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'

export default function Login() {
  const router = useRouter()
  const { setAuth, accessToken, hasHydrated } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    if (accessToken) {
      router.replace('/dashboard')
    }
  }, [accessToken, hasHydrated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = response.data
      setAuth({ id: user.id, email, username: user.username ?? null }, accessToken, refreshToken)
      toast.success('Welcome back')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated) {
    return <div className="min-h-screen bg-[#07070a]" />
  }

  if (accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-slate-400">
        Redirecting...
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070a] text-white">
      <ParticleField
        className="absolute inset-0 pointer-events-none opacity-70"
        particleColor="rgba(161, 161, 170, 0.2)"
        lineColor="rgba(99, 102, 241, 0.14)"
        count={90}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(39,39,42,0.26),transparent_28%)]" />

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden w-[52%] flex-col justify-between border-r border-white/10 px-14 py-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Authentication</p>
              <p className="text-lg font-bold text-white">Adarsh Auth</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="badge border-white/10 bg-white/[0.04] text-slate-300">
              <ShieldCheckIcon className="h-4 w-4 text-indigo-300" />
              Secure dashboard sign in
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-tight text-white">
              Sign in to manage authentication, licenses, users, and sessions.
            </h1>

            <p className="mt-5 text-base leading-8 text-slate-400">
              Access a classic dark control center for secure sign-in, application credentials, license key management,
              and active session visibility.
            </p>

            <div className="mt-10 grid gap-3">
              {[
                { icon: LockClosedIcon, title: 'Protected sign-in', text: 'Access the admin workspace with secure dashboard authentication.' },
                { icon: KeyIcon, title: 'License control', text: 'Manage license inventory, status, and expiry from one place.' },
                { icon: FingerPrintIcon, title: 'Session protection', text: 'Review hardware-bound sessions and live activity quickly.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <item.icon className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-8">
            {[
              { value: 'JWT', label: 'Session Tokens' },
              { value: 'HMAC', label: 'Request Signing' },
              { value: 'HWID', label: 'Device Binding' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-bold text-white">{item.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 text-center lg:hidden">
              <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Authentication</p>
              <h1 className="mt-2 text-3xl font-bold text-white">Adarsh Auth</h1>
            </div>

            <div className="surface-panel overflow-hidden">
              <div className="border-b border-white/10 px-8 py-6">
                <p className="page-eyebrow">Sign In</p>
                <h2 className="mt-2 text-3xl font-bold text-white">Welcome back</h2>
                <p className="mt-2 text-sm text-slate-400">Enter your account credentials to open the auth dashboard.</p>
              </div>

              <div className="p-8">
                <button
                  type="button"
                  onClick={() => (window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://adarsh-auth.up.railway.app'}/api/auth/google`)}
                  className="btn btn-secondary w-full justify-center py-3"
                >
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pr-11"
                        placeholder="Enter your password"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">
                        {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3">
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  <span>Authentication</span>
                  <span>•</span>
                  <span>Licenses</span>
                  <span>•</span>
                  <span>Sessions</span>
                </div>

                <p className="mt-5 text-center text-sm text-slate-400">
                  Need an account?{' '}
                  <Link href="/register" className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200">
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
