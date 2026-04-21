'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import {
  HomeIcon,
  CubeIcon,
  KeyIcon,
  UsersIcon,
  ClockIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// ── Subtle Particles ──────────────────────────────────────────
function DashboardParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number }
    const pts: P[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1 + 0.3,
      alpha: Math.random() * 0.2 + 0.05,
    }))

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W; canvas.height = H
    }
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - d / 110)})`
            ctx.lineWidth = 0.4
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`
        ctx.fill()
        p.x += p.vx; p.y += p.vy
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-30" />
}

// ── Navigation ────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuthStore()

  const isOwner = user?.email === (process.env.NEXT_PUBLIC_OWNER_EMAIL || 'donumberafreen@gmail.com')

  const navigation = [
    { name: 'Dashboard',   href: '/dashboard',              icon: HomeIcon },
    { name: 'Manage Apps', href: '/dashboard/applications', icon: CubeIcon },
    { name: 'Licenses',    href: '/dashboard/licenses',     icon: KeyIcon },
    { name: 'Users',       href: '/dashboard/users',        icon: UsersIcon },
    { name: 'Sessions',    href: '/dashboard/sessions',     icon: ClockIcon },
    { name: 'Billing',     href: '/dashboard/billing',      icon: CreditCardIcon },
    ...(isOwner ? [{ name: 'Developers', href: '/dashboard/developers', icon: UserGroupIcon }] : []),
    { name: 'Settings',    href: '/dashboard/settings',     icon: Cog6ToothIcon },
  ]

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    logout()
    toast.success('Logged out')
    router.push('/login')
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex bg-[#060609] text-white relative">
      <DashboardParticles />

      {/* Subtle glow */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[400px] bg-indigo-600/4 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-[#09090e]/90 backdrop-blur-xl border-r border-white/[0.05] flex flex-col fixed h-full z-20">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Adarsh Auth</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-3 border-t border-white/[0.05] space-y-1">
          <div className="px-3 py-2 rounded-lg">
            <p className="text-xs text-gray-600">Logged in as</p>
            <p className="text-xs text-gray-300 font-medium truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all w-full text-sm"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 ml-56 flex flex-col min-h-screen relative z-10">

        {/* Topbar */}
        <header className="h-12 bg-[#09090e]/80 backdrop-blur-xl border-b border-white/[0.05] flex items-center px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Dashboard</span>
            {pathname !== '/dashboard' && (
              <>
                <span>/</span>
                <span className="text-gray-300 capitalize">
                  {pathname.split('/').pop()}
                </span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-300 leading-none">{user?.email?.split('@')[0]}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] px-6 py-3">
          <p className="text-xs text-gray-700 text-center">
            Adarsh Auth · Developed by <span className="text-gray-500">Adarsh Cheats</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
