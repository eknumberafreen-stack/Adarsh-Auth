'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon, FingerPrintIcon, KeyIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { isValidUsername } from '@/lib/username'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'

export default function Register() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      const trimmedUsername = username.trim()
      const payload: { email: string; password: string; username?: string } = { email, password }
      if (trimmedUsername !== '' && isValidUsername(trimmedUsername)) {
        payload.username = trimmedUsername
      }
      const response = await api.post('/auth/register', payload)
      const { user, accessToken, refreshToken } = response.data
      setAuth({ id: user.id, email, username: user.username ?? null }, accessToken, refreshToken)
      toast.success('Account created')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500']
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070a] text-white">
      <ParticleField
        className="absolute inset-0 pointer-events-none opacity-70"
        particleColor="rgba(161, 161, 170, 0.2)"
        lineColor="rgba(99, 102, 241, 0.14)"
        count={90}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(39,39,42,0.26),transparent_28%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_0.7fr]">
          <div className="surface-panel hidden p-10 lg:block">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Authentication</p>
                <p className="text-lg font-bold text-white">Adarsh Auth</p>
              </div>
            </div>

            <h1 className="mt-10 text-5xl font-bold leading-tight text-white">
              Create an account to manage secure access from one dark workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
              Set up your account and start managing authentication, application credentials, license keys, users, and sessions from the dashboard.
            </p>

            <div className="mt-10 grid gap-4">
              {[
                { icon: ShieldCheckIcon, title: 'Account authentication', text: 'Sign in securely and manage protected admin access.' },
                { icon: KeyIcon, title: 'License operations', text: 'Create and control license inventory for each application.' },
                { icon: FingerPrintIcon, title: 'Session oversight', text: 'Monitor secure access and hardware-based session activity.' },
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

          <div className="surface-panel overflow-hidden">
            <div className="border-b border-white/10 px-8 py-6">
              <div className="mb-5 text-center lg:hidden">
                <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Authentication</p>
                <h1 className="mt-2 text-3xl font-bold text-white">Adarsh Auth</h1>
              </div>
              <p className="page-eyebrow">Create Account</p>
              <h2 className="mt-2 text-3xl font-bold text-white">Get started</h2>
              <p className="mt-2 text-sm text-slate-400">Create your account for the auth dashboard.</p>
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
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    placeholder="Optional username"
                  />
                  {username.trim() !== '' && !isValidUsername(username.trim()) && (
                    <p className="mt-2 text-xs text-rose-400">Username must be 3-30 characters using lowercase letters, numbers, underscores, or hyphens.</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-11"
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColor[strength] : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{strengthLabel[strength]}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`input pr-11 ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-rose-500/60'
                          : confirmPassword && confirmPassword === password
                            ? 'border-emerald-500/60'
                            : ''
                      }`}
                      placeholder="Repeat your password"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">
                      {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-2 text-xs text-rose-400">Passwords do not match.</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-4 w-4" />
                      Create Account
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
