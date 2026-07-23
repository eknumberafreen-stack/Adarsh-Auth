'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon, FingerPrintIcon, KeyIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import api, { clearStoredAuth, refreshAccessToken } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import ParticleField from '@/components/ParticleField'

// DJB2 Hash function
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Slow nested hashing for browser verification
function slowHash(salt: string, nonce: string): number {
  let val = salt + nonce;
  for (let i = 0; i < 250; i++) {
    val = djb2Hash(val).toString();
  }
  return djb2Hash(val);
}

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
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [securityStatus, setSecurityStatus] = useState('Checking browser environment...')
  
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

  useEffect(() => {
    if (!verifyingBrowser) return

    let script = document.getElementById('cloudflare-turnstile-script') as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = 'cloudflare-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => setScriptLoaded(true)
      document.body.appendChild(script)
    } else {
      setScriptLoaded(true)
    }

    let interval: NodeJS.Timeout
    const initialize = () => {
      if (window.turnstile && turnstileContainerRef.current && !turnstileWidgetIdRef.current) {
        try {
          const id = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAADgoaqh4zbu9o-tW',
            callback: (token: string) => {
              handleTurnstileVerified(token)
            },
            'error-callback': () => {
              toast.error('Browser verification failed. Please try again.')
              setVerifyingBrowser(false)
              setVerificationStep(0)
              setLoading(false)
            },
            'expired-callback': () => {
              toast.error('Verification expired. Please try again.')
              setVerifyingBrowser(false)
              setVerificationStep(0)
              setLoading(false)
            },
            theme: 'dark',
            appearance: 'always',
          })
          turnstileWidgetIdRef.current = id
        } catch (err) {
          console.error('Failed to render Turnstile:', err)
        }
      }
    }

    if (window.turnstile) {
      initialize()
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          initialize()
        }
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current)
          turnstileWidgetIdRef.current = null
        } catch (e) {}
      }
    }
  }, [verifyingBrowser, scriptLoaded])

  useEffect(() => {
    if (verificationStep === 1) {
      const statuses = [
        'Checking browser environment...',
        'Validating challenge token...',
        'Verifying SSL connection...',
        'Finalizing secure session...'
      ]
      let idx = 0
      const interval = setInterval(() => {
        if (idx < statuses.length - 1) {
          idx++
          setSecurityStatus(statuses[idx])
        }
      }, 350)
      return () => clearInterval(interval)
    } else if (verificationStep === 2) {
      setSecurityStatus('Verification successful!')
    }
  }, [verificationStep])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setVerifyingBrowser(true)
    setVerificationStep(1)
  }

  const handleTurnstileVerified = async (token: string) => {
    try {
      // Submit credentials along with solved challenge
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
      <div className="flex min-h-screen items-center justify-center bg-[#050508] relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes drift {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(50px, -50px) scale(1.2); }
          }
          @keyframes drift-reverse {
            0%, 100% { transform: translate(0px, 0px) scale(1.2); }
            50% { transform: translate(-50px, 50px) scale(1); }
          }
          @keyframes ripple {
            0% { transform: scale(0.95); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          .animate-drift {
            animation: drift 18s ease-in-out infinite;
          }
          .animate-drift-reverse {
            animation: drift-reverse 18s ease-in-out infinite;
          }
          .animate-ripple {
            animation: ripple 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          .glow-laser {
            position: relative;
          }
          .glow-laser::before {
            content: '';
            position: absolute;
            top: 0;
            left: 10%;
            right: 10%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8), transparent);
            filter: blur(0.5px);
          }
        `}} />

        <ParticleField
          className="absolute inset-0 pointer-events-none opacity-80"
          particleColor="rgba(161, 161, 170, 0.25)"
          lineColor="rgba(99, 102, 241, 0.16)"
          count={110}
        />
        
        {/* Dynamic Animated Background Aura Glows */}
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-drift" />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none animate-drift-reverse" />

        <div className="relative z-10 w-full max-w-[450px] p-10 rounded-3xl bg-[#090a0f]/85 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05),0_0_60px_rgba(99,102,241,0.08)] backdrop-blur-2xl text-white text-center overflow-hidden glow-laser animate-[fadeIn_0.5s_ease-out]">
          <h2 className="text-3xl font-black mb-6 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-400 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)]">
            Adarsh Auth
          </h2>

          <p className="text-xl font-bold mb-1 text-slate-100">Checking your browser...</p>
          <p className="text-xs text-slate-400 mb-8 max-w-[280px] mx-auto leading-relaxed">This process is automatic. Your browser will redirect shortly.</p>

          {/* Premium Verification Box */}
          <div className="flex flex-col items-center justify-center p-8 bg-black/60 border border-white/[0.04] rounded-2xl max-w-[350px] mx-auto mb-8 text-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] relative overflow-hidden">
            {/* Scanning Line Animation */}
            {verificationStep === 1 && (
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-[pan_2s_ease-in-out_infinite]" />
            )}

            <div className="relative flex items-center justify-center mb-6">
              {verificationStep === 1 ? (
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Outer spin ring */}
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10 border-t-indigo-500 border-r-purple-500 animate-[spin_2s_linear_infinite]" />
                  {/* Inner counter-spin ring */}
                  <div className="absolute inset-1.5 rounded-full border border-cyan-500/10 border-b-cyan-400 border-l-teal-400 animate-[spin_1.2s_linear_infinite_reverse]" />
                  <ShieldCheckIcon className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
                </div>
              ) : (
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Expanding Ripple ring */}
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-ripple" />
                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.5)] text-white scale-110 transition-transform duration-300 relative z-10">
                    <svg className="w-8 h-8 text-white stroke-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <span className="text-sm font-bold tracking-wide text-slate-200 mb-1 h-5 flex items-center transition-all duration-300">
              {securityStatus}
            </span>
            <span className="text-[9px] text-indigo-400/80 font-black uppercase tracking-widest mb-4">
              Protected by Cloudflare Turnstile
            </span>

            {verificationStep === 1 && (
              <div className="flex justify-center w-full my-2 transition-all duration-300 transform scale-95 hover:scale-100">
                <div 
                  ref={turnstileContainerRef} 
                  className="rounded-xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20 bg-[#0f1015]/60 backdrop-blur-md" 
                />
              </div>
            )}
          </div>

          {verificationStep === 2 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold animate-pulse tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.1)]">
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
                  onClick={() => (window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.adarshauth.store'}/api/auth/google`)}
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
    </div>
  )
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          appearance?: 'always' | 'execute' | 'interaction-only'
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}
