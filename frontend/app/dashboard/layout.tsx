'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import {
  HomeIcon,
  CubeIcon,
  KeyIcon,
  UsersIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Manage Apps', href: '/dashboard/applications', icon: CubeIcon },
  { name: 'Licenses', href: '/dashboard/licenses', icon: KeyIcon },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Sessions', href: '/dashboard/sessions', icon: ClockIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    logout()
    toast.success('Logged out')
    router.push('/login')
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex bg-dark-bg">
      {/* Sidebar */}
      <div className="w-60 bg-dark-card border-r border-dark-border flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="p-5 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Adarsh Auth</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-dark-hover hover:text-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="p-3 border-t border-dark-border space-y-1">
          <div className="px-3 py-2 rounded-lg bg-dark-bg border border-dark-border">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full text-sm font-medium"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="h-14 bg-dark-card border-b border-dark-border flex items-center px-6 gap-4 sticky top-0 z-10">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400 mt-0.5">Developer</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
