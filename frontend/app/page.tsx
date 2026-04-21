'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

// ── Particle Canvas ───────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    const PARTICLE_COUNT = 80

    type Particle = {
      x: number; y: number
      vx: number; vy: number
      r: number; alpha: number
    }

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      r:     Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`
        ctx.fill()

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  if (!mounted) return (
    <div className="min-h-screen bg-[#050508]" />
  )
  if (isAuthenticated) return null

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden relative">
      <ParticleCanvas />

      {/* Glow blobs */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-700/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-purple-700/8 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">AdarshAuth</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#languages" className="hover:text-white transition-colors">SDKs</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg transition-all font-medium shadow-lg shadow-indigo-500/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-44 pb-32 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Adarsh Auth v1.0 — Now Live
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          Your software.
          <br />
          <span className="bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
            Your rules. Your server.
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Self-hosted authentication built for software developers.
          License management, hardware locking, real-time Discord logs
          and full session control — all on your own infrastructure.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="bg-white text-black font-semibold px-8 py-3.5 rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-xl">
            Create Free Account
          </Link>
          <Link href="/login" className="bg-white/5 border border-white/10 text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors text-sm backdrop-blur-sm">
            Sign In →
          </Link>
        </div>

        {/* Floating badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {['HMAC SHA256', 'Anti-Replay', 'HWID Lock', 'Rate Limiting', 'IP Ban', 'Discord Logs'].map(tag => (
            <span key={tag} className="bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full text-xs text-gray-400 backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 py-16 px-6 border-y border-white/[0.05]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 'HWID',  label: 'Hardware Locked' },
            { value: 'HMAC',  label: 'SHA-256 Signed' },
            { value: '5+',    label: 'Language SDKs' },
            { value: '100%',  label: 'Self Hosted' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for cheat devs</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Everything you need to lock, manage and monitor your software — hosted on your own server.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '🔐', title: 'Uncrackable Login', desc: 'Every request is HMAC-SHA256 signed with timestamp + nonce. Replay attacks are blocked at the middleware level.' },
              { icon: '💻', title: 'HWID Locking', desc: 'Users are bound to their hardware ID on first login. Anyone trying to share their account gets blocked instantly.' },
              { icon: '🔑', title: 'License Keys', desc: 'Generate keys with custom expiry — daily, weekly, monthly or lifetime. Revoke or blacklist any key instantly.' },
              { icon: '📊', title: 'Live Dashboard', desc: 'See active sessions, total users, license usage and banned accounts in real time from your admin panel.' },
              { icon: '📣', title: 'Discord Webhooks', desc: 'Get notified on Discord for every login, registration, failed attempt, ban or HWID mismatch — instantly.' },
              { icon: '🛡️', title: 'IP Ban & Rate Limit', desc: 'Auto-ban suspicious IPs, limit requests per endpoint, and detect anomalies like brute force automatically.' },
            ].map((f) => (
              <div key={f.title} className="group bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Languages ── */}
      <section id="languages" className="relative z-10 py-24 px-6 border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Works with your language</h2>
            <p className="text-gray-400">Same API, same security across every SDK. Drop it in and go.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { lang: 'C#',     color: 'bg-purple-600/15 border-purple-500/25 text-purple-300 hover:border-purple-400/50' },
              { lang: 'C++',    color: 'bg-blue-600/15 border-blue-500/25 text-blue-300 hover:border-blue-400/50' },
              { lang: 'Python', color: 'bg-yellow-600/15 border-yellow-500/25 text-yellow-300 hover:border-yellow-400/50' },
              { lang: 'Java',   color: 'bg-orange-600/15 border-orange-500/25 text-orange-300 hover:border-orange-400/50' },
              
            ].map((l) => (
              <div key={l.lang} className={`border rounded-xl p-4 text-center font-bold text-lg transition-all duration-200 cursor-default ${l.color}`}>
                {l.lang}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-10 md:p-16 text-center backdrop-blur-sm">
            <div className="text-5xl mb-6">🛡️</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your server. Your data. Always.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Adarsh Auth runs entirely on your own machine — no third party ever touches your data.
              Every request is HMAC-signed, nonce-protected and rate-limited.
              Redis blocks replay attacks in real time. You stay in full control.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {['HMAC-SHA256', 'Anti-Replay', 'HWID Lock', 'IP Banning', 'Rate Limiting', 'Session Heartbeat'].map(tag => (
                <span key={tag} className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-gray-300">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Start free. Upgrade when you need more. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-gray-500 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Perfect to get started</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {['10 Applications', '500 Users / App', '100 Licenses / App', '5,000 API Calls / Day', 'HWID Locking', 'IP Ban & Rate Limiting'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-medium py-3 rounded-lg transition-all text-sm">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-indigo-600/15 to-purple-600/10 border border-indigo-500/40 rounded-2xl p-8 flex flex-col shadow-xl shadow-indigo-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">Most Popular</span>
              </div>
              <div className="mb-6">
                <p className="text-xs text-indigo-400 uppercase tracking-widest mb-2">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">$19</span>
                  <span className="text-gray-400 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">For growing projects</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {['50 Applications', '5,000 Users / App', '1,000 Licenses / App', '50,000 API Calls / Day', 'Discord Webhooks', 'HWID Locking', 'Priority Support'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-200">
                    <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:support@example.com" className="block text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg transition-all text-sm shadow-lg shadow-indigo-500/20">
                Contact to Upgrade
              </a>
            </div>

            {/* Enterprise */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Enterprise</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">$99</span>
                  <span className="text-gray-500 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Unlimited everything</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {['Unlimited Applications', 'Unlimited Users / App', 'Unlimited Licenses / App', 'Unlimited API Calls', 'Discord Webhooks', 'HWID Locking', 'Priority Support', 'Custom Integrations'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:support@example.com" className="block text-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-medium py-3 rounded-lg transition-all text-sm">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take full control?</h2>
          <p className="text-gray-400 mb-8">Host your own auth server. Keep your data private. No subscriptions, no limits, no middleman.</p>
          <Link href="/register" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-10 py-4 rounded-lg transition-all shadow-xl shadow-indigo-500/20">
            Create Your Account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-gray-400 font-medium">AdarshAuth</span>
          </div>
          <span>© 2026 AdarshAuth · Developed by Adarsh Cheats</span>
        </div>
      </footer>
    </div>
  )
}
