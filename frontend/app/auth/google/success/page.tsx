'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function GoogleSuccess() {
  const router = useRouter()
  const params = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const accessToken  = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const userId       = params.get('userId')
    const email        = params.get('email')

    if (accessToken && refreshToken && userId && email) {
      setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
      router.replace('/dashboard')
    } else {
      router.replace('/login?error=google_failed')
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
        <p className="text-gray-400">Signing you in with Google...</p>
      </div>
    </div>
  )
}
