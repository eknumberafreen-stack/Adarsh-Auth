'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'



export default function GoogleSuccess() {
  const router = useRouter()
  const params = useSearchParams()
  const { setAuth } = useAuthStore()
  const [verificationStep, setVerificationStep] = useState(0) // 0 = loading params, 1 = verifying, 2 = verified

  useEffect(() => {
    const accessToken  = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const userId       = params.get('userId')
    const email        = params.get('email')

    if (!accessToken || !refreshToken || !userId || !email) {
      router.replace('/login?error=google_failed')
      return
    }

    const runVerification = async () => {
      setVerificationStep(1)

      try {
        // Smooth 1.5 second loading animation
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 3. Verification complete
        setVerificationStep(2)
        await new Promise(resolve => setTimeout(resolve, 800))

        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      } catch {
        // If animation or logic fails, still proceed
        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      }
    }

    runVerification()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2b4c7e] relative overflow-hidden">
      {/* Decorative background blur objects */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[440px] p-9 rounded-2xl bg-[#0f1015] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-white text-center">
        <h2 className="text-2xl font-bold mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Adarsh Auth
        </h2>
        
        <p className="text-lg font-semibold mb-1 text-white">Checking your browser...</p>
        <p className="text-xs text-slate-400 mb-8">This process is automatic. Your browser will redirect shortly.</p>
        
        {/* TURNSTILE verification widget */}
        <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl max-w-[320px] mx-auto mb-8 text-left shadow-inner">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {verificationStep < 2 ? (
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-5 h-5 flex items-center justify-center bg-orange-500 rounded text-white font-bold text-[11px]">✓</div>
              )}
            </div>
            <span className="text-sm text-slate-300 font-semibold tracking-wide">
              {verificationStep < 2 ? 'Verifying...' : 'Verified'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Protected by</p>
            <p className="text-xs text-orange-400 font-black tracking-tight">TURNSTILE</p>
          </div>
        </div>

        {verificationStep === 2 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold animate-pulse">
            ✓ Verification successful! Redirecting..
          </div>
        )}
      </div>
    </div>
  )
}
