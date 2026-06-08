'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon, FingerPrintIcon, KeyIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import api, { clearStoredAuth, refreshAccessToken } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'
import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: any) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth, accessToken, refreshToken, hasHydrated } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [verifyingBrowser, setVerifyingBrowser] = useState(false)
  const [verificationStep, setVerificationStep] = useState(0) // 0 = idle, 1 = verifying, 2 = verified/redirecting
  
  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1 = request, 2 = reset
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotShowPassword, setForgotShowPassword] = useState(false)

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      if (!hasHydrated) return

      if (accessToken) {
        router.replace('/dashboard')
        return
      }

      if (refreshToken) {
        try {
          await refreshAccessToken()
          if (active) {
            router.replace('/dashboard')
            return
          }
        } catch {
          clearStoredAuth()
        }
      }

      if (active) {
        setCheckingSession(false)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [accessToken, refreshToken, hasHydrated, router])

  useEffect(() => {
    const error = searchParams.get('error')
    const details = searchParams.get('details')
    if (error) {
      if (error === 'google_failed') {
        toast.error('Google authentication failed. Please try again.')
      } else if (error === 'google_auth_failed') {
        toast.error(`Google Auth Error: ${details || 'Authentication failed'}`)
      } else {
        toast.error(error)
      }
      
      // Clean up the URL parameters so the error toast doesn't re-trigger on reload/refresh
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setVerifyingBrowser(true)
    setVerificationStep(1)
  }

  useEffect(() => {
    if (!verifyingBrowser) return

    let widgetId: string | null = null

    const renderTurnstile = () => {
      if (window.turnstile && document.getElementById('turnstile-container')) {
        try {
          widgetId = window.turnstile.render('#turnstile-container', {
            sitekey: siteKey,
            callback: (token: string) => {
              handleVerifySuccess(token)
            },
            'error-callback': () => {
              handleVerifyError()
            },
            theme: 'dark'
          })
        } catch (err) {
          console.error('[Turnstile] Render error:', err)
        }
      }
    }

    if (window.turnstile) {
      renderTurnstile()
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          renderTurnstile()
        }
      }, 100)
      return () => clearInterval(interval)
    }

    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          console.error('[Turnstile] Clean error:', err)
        }
      }
    }
  }, [verifyingBrowser])

  const handleVerifySuccess = async (token: string) => {
    try {
      // Submit credentials along with turnstile token
      const response = await api.post('/auth/login', {
        email,
        password,
        turnstileToken: token
      })
      const { user, accessToken, refreshToken } = response.data

      // Verification successful!
      setVerificationStep(2)
      await new Promise(resolve => setTimeout(resolve, 800)) // Wait for the user to read the message

      setAuth({ id: user.id, email, username: user.username ?? null }, accessToken, refreshToken)
      toast.success('Welcome back')
      router.push('/dashboard')
    } catch (error: any) {
      setVerifyingBrowser(false)
      setVerificationStep(0)
      const errorMsg = error.response?.data?.details?.[0] || error.response?.data?.error || 'Login failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyError = () => {
    setVerifyingBrowser(false)
    setVerificationStep(0)
    setLoading(false)
    toast.error('Security verification failed. Please try again.')
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail })
      toast.success(res.data.message || 'OTP verification code sent!')
      setForgotStep(2)
    } catch (error: any) {
      const errorMsg = error.response?.data?.details?.[0] || error.response?.data?.error || 'Failed to send OTP. Please try again.'
      toast.error(errorMsg)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail,
        code: forgotCode,
        password: forgotNewPassword
      })
      toast.success(res.data.message || 'Password successfully reset!')
      setShowForgotModal(false)
      // Pre-fill email for better UX
      setEmail(forgotEmail)
      // Reset fields
      setForgotEmail('')
      setForgotCode('')
      setForgotNewPassword('')
      setForgotStep(1)
    } catch (error: any) {
      const errorMsg = error.response?.data?.details?.[0] || error.response?.data?.error || 'Failed to reset password.'
      toast.error(errorMsg)
    } finally {
      setForgotLoading(false)
    }
  }

  if (!hasHydrated || checkingSession) {
    return <div className="min-h-screen bg-[#07070a]" />
  }

  if (verifyingBrowser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#07070a] overflow-hidden text-white">
        <ParticleField
          className="absolute inset-0 pointer-events-none opacity-70"
          particleColor="rgba(161, 161, 170, 0.2)"
          lineColor="rgba(99, 102, 241, 0.14)"
          count={60}
        />
        
        {/* Decorative background blur objects */}
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[440px] p-9 rounded-3xl bg-[#0f1015]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] text-white text-center">
          <h2 className="text-2xl font-bold mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Adarsh Auth
          </h2>

          <p className="text-lg font-semibold mb-1 text-white">Checking your browser...</p>
          <p className="text-xs text-slate-400 mb-8">This process is automatic. Your browser will redirect shortly.</p>

          {/* Custom Turnstile Container Card */}
          <div className="relative flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl max-w-[320px] mx-auto mb-8 shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-400 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Security Check</span>
            </div>
            <div id="turnstile-container" className="min-h-[65px] flex items-center justify-center" />
          </div>

          {verificationStep === 2 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-semibold animate-pulse">
              ✓ Verification successful! Redirecting..
            </div>
          )}
        </div>
      </div>
    )
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
                  onClick={() => (window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.adarshauth.online'}/api/auth/google`)}
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
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Password</label>
                      <button 
                        type="button" 
                        onClick={() => { setShowForgotModal(true); setForgotStep(1); }} 
                        className="text-[11px] font-semibold tracking-wider text-indigo-300 transition-colors hover:text-indigo-200"
                      >
                        Forgot password?
                      </button>
                    </div>
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
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#0f1015] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <KeyIcon className="h-6 w-6 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {forgotStep === 1 ? 'Reset Password' : 'Verify Code'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {forgotStep === 1 
                  ? "Enter your email address and we'll send you a 6-digit verification code to reset your password."
                  : `We have sent a 6-digit verification code to ${forgotEmail}. Please enter it below to set your new password.`
                }
              </p>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button type="submit" disabled={forgotLoading} className="btn btn-primary w-full justify-center py-3">
                  {forgotLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>

                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(false)} 
                  className="btn btn-secondary w-full justify-center py-3"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                    className="input text-center tracking-[0.5em] text-xl font-bold font-mono"
                    placeholder="123456"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">New Password</label>
                  <div className="relative">
                    <input
                      type={forgotShowPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="input pr-11"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setForgotShowPassword(!forgotShowPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">
                      {forgotShowPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={forgotLoading} className="btn btn-primary w-full justify-center py-3">
                  {forgotLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <div className="flex justify-between items-center text-xs mt-4">
                  <button 
                    type="button" 
                    onClick={() => setForgotStep(1)} 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back to Step 1
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={handleRequestOTP} 
                    className="text-indigo-300 hover:text-indigo-200 transition-colors font-semibold"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <Script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" 
        strategy="afterInteractive"
      />
    </div>
  )
}
