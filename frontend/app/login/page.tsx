'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, LockClosedIcon, BoltIcon } from '@heroicons/react/24/outline'

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const particles = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.08,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath(); ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5; ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke()
          }
        }
      }
      particles.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`; ctx.fill()
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export default function Login() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = response.data
      setAuth(user, accessToken, refreshToken)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex bg-[#04040e] overflow-hidden">
      <ParticleCanvas />

      {/* Ambient glows */}
      <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14">
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10">
              <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Adarsh Auth</p>
              <p className="text-red-400 text-[10px] font-bold tracking-widest uppercase">Adarsh Cheats</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-300 font-medium">Enterprise-grade Security Platform</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-4">
            Secure Auth<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Infrastructure
            </span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            Military-grade encryption protecting your applications with real-time threat detection and zero-trust architecture.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                icon: <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />,
                title: 'Zero-Trust Security',
                desc: 'Every request verified with HMAC SHA-256 signatures',
              },
              {
                icon: <LockClosedIcon className="w-5 h-5 text-violet-400" />,
                title: 'AES-256 Encryption',
                desc: 'End-to-end encrypted sessions with anti-replay protection',
              },
              {
                icon: <BoltIcon className="w-5 h-5 text-purple-400" />,
                title: 'Real-time Monitoring',
                desc: 'Live session tracking with instant IP ban & HWID lock',
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all">
                <div className="p-2 bg-white/[0.04] rounded-lg flex-shrink-0">{f.icon}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex items-center gap-8">
          {[
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<50ms', label: 'Auth Latency' },
            { value: '256-bit', label: 'Encryption' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-lg">{s.value}</p>
              <p className="text-gray-600 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Vertical separator */}
        <div className="hidden lg:block absolute left-0 top-[10%] h-[80%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <div className="relative z-10 w-full max-w-[400px]">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 mx-auto mb-3">
              <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover" />
            </div>
            <h1 className="text-2xl font-black text-white">Adarsh Auth</h1>
            <p className="text-red-400 text-[10px] font-bold tracking-widest uppercase mt-1">Adarsh Cheats</p>
          </div>

          {/* Card */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            <div className="p-8">
              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                    <LockClosedIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Secure Login</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                <p className="text-gray-500 text-sm mt-1">Sign in to your secure dashboard</p>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://adarsh-auth.up.railway.app'}/api/auth/google`}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-sm font-medium text-gray-200 transition-all duration-200 mb-5 group"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-gray-600">OR</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-700 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-700 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 mt-1"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating...</>
                  ) : (
                    <><LockClosedIcon className="w-4 h-4" />Sign In Securely</>
                  )}
                </button>
              </form>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 mt-5 pt-5 border-t border-white/[0.05]">
                {[
                  { icon: '🔒', text: 'SSL Secured' },
                  { icon: '🛡️', text: 'HMAC Verified' },
                  { icon: '⚡', text: 'Anti-Replay' },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1">
                    <span className="text-xs">{b.icon}</span>
                    <span className="text-[10px] text-gray-600 font-medium">{b.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center text-sm">
                <span className="text-gray-600">No account? </span>
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Create one free</Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-700 mt-4">
            🔐 256-bit encrypted · Zero-trust architecture · SOC2 ready
          </p>
        </div>
      </div>
    </div>
  )
}
