'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  FingerPrintIcon, 
  KeyIcon, 
  LockClosedIcon, 
  ShieldCheckIcon,
  CpuChipIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
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

  const [verifyingBrowser, setVerifyingBrowser] = useState(false)
  const [verificationStep, setVerificationStep] = useState(0) // 0 = idle, 1 = verifying, 2 = verified
  const [securityStatus, setSecurityStatus] = useState('Checking browser environment...')
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

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
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    setVerifyingBrowser(true)
    setVerificationStep(1)
  }

  const handleTurnstileVerified = async (token: string) => {
    try {
      const trimmedUsername = username.trim()
      const payload: { email: string; password: string; username?: string; turnstileToken: string } = { 
        email, 
        password,
        turnstileToken: token
      }
      if (trimmedUsername !== '' && isValidUsername(trimmedUsername)) {
        payload.username = trimmedUsername
      }
      const response = await api.post('/auth/register', payload)
      const { user, accessToken, refreshToken } = response.data

      // Verification successful!
      setVerificationStep(2)
      await new Promise(resolve => setTimeout(resolve, 800)) // Wait for the user to read the message

      setAuth({ id: user.id, email, username: user.username ?? null }, accessToken, refreshToken)
      toast.success('Account created')
      router.push('/dashboard')
    } catch (error: any) {
      setVerifyingBrowser(false)
      setVerificationStep(0)
      const errorMsg = error.response?.data?.details?.[0] || error.response?.data?.error || 'Registration failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500']
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']

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

        {/* Main Luxury Glass Card */}
        <div className="relative z-10 w-full max-w-[480px] p-8 sm:p-10 rounded-[2.25rem] bg-[#090b14]/85 border border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12),0_0_80px_rgba(99,102,241,0.12)] backdrop-blur-3xl text-white text-center overflow-hidden transition-all duration-500">
          
          {/* Top Metallic Perimeter Light Edge */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/80 via-purple-400/80 to-transparent" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-indigo-500/30 blur-xl pointer-events-none" />

          {/* Brand Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] mb-6">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${verificationStep === 2 ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${verificationStep === 2 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">
              {verificationStep === 2 ? 'Zero-Trust Authenticated' : 'Security Checkpoint'}
            </span>
          </div>

          {/* Hero Logo & Title */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <div className="w-full h-full bg-[#090b14] rounded-2xl flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Adarsh Auth
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-[320px] mx-auto leading-relaxed">
            Verifying browser environment & security credentials before granting console access.
          </p>

          {/* Hologram Scanner Box */}
          <div className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#0b0e1b]/90 to-[#070810]/95 border border-white/[0.06] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_12px_36px_rgba(0,0,0,0.4)] mb-6 overflow-hidden">
            
            {/* Laser Scanline */}
            {verificationStep < 2 && (
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 animate-[scanline_2.4s_ease-in-out_infinite]" />
            )}

            {/* Central Holographic Rings */}
            <div className="relative flex items-center justify-center mb-6 pt-2">
              {verificationStep < 2 ? (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-indigo-500/20 border-t-indigo-500 border-r-purple-500 animate-[spin_3s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-cyan-400/30 animate-[spin_6s_linear_infinite_reverse]" />
                  <div className="absolute inset-4 rounded-full border border-purple-500/30 border-b-cyan-400 border-l-indigo-400 animate-[spin_1.5s_linear_infinite]" />
                  
                  <div className="relative z-10 w-11 h-11 rounded-full bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                    <LockClosedIcon className="w-5 h-5 text-indigo-300 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-pulse" />
                  <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-105 transition-transform duration-300">
                    <div className="w-full h-full bg-[#07130f] rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Status Line */}
            <div className="flex flex-col items-center justify-center gap-1.5 mb-5">
              <span className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
                {verificationStep < 2 && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
                {securityStatus}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-300/80 font-mono tracking-wider">
                <CpuChipIcon className="w-3.5 h-3.5" />
                <span>TLS 1.3 • AES-256 ENCRYPTION</span>
              </div>
            </div>

            {/* Turnstile Container */}
            {verificationStep === 1 && (
              <div className="flex justify-center w-full my-2 transition-all duration-300 transform scale-95 hover:scale-100">
                <div 
                  ref={turnstileContainerRef} 
                  className="rounded-xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20 bg-[#0f1015]/60 backdrop-blur-md" 
                />
              </div>
            )}
          </div>

          {/* Bottom Trust Telemetry Badges */}
          <div className="grid grid-cols-3 gap-2 text-left mb-6">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Engine</p>
              <p className="text-[11px] font-semibold text-slate-300 truncate">Turnstile</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Protocol</p>
              <p className="text-[11px] font-semibold text-slate-300 truncate">Zero-Trust</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Latency</p>
              <p className="text-[11px] font-semibold text-emerald-400 truncate">&lt; 15ms</p>
            </div>
          </div>

          {/* Bottom Action / Status Pill */}
          {verificationStep === 2 ? (
            <div className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
              <span>Authenticated successfully — Redirecting to console...</span>
            </div>
          ) : (
            <div className="py-2.5 px-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[11px] font-medium text-slate-400 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Protected by Cloudflare Anti-DDoS & Turnstile</span>
            </div>
          )}
        </div>
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
