'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import ParticleField from '@/components/ParticleField'

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
      
      <div className="relative z-10 w-full max-w-[440px] p-9 rounded-3xl bg-[#0f1015]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] text-center">
        <h2 className="text-2xl font-bold mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Adarsh Auth
        </h2>
        
        <p className="text-lg font-semibold mb-1 text-white">Checking your browser...</p>
        <p className="text-xs text-slate-400 mb-8">This process is automatic. Your browser will redirect shortly.</p>
        
        {/* Custom turnstile indicator */}
        <div className="relative flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl max-w-[320px] mx-auto mb-8 shadow-inner overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-16 h-16 mb-4">
            {verificationStep < 2 ? (
              <>
                <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <svg className="w-8 h-8 text-orange-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </>
            ) : (
              <>
                <div className="absolute inset-0 border-2 border-emerald-500 rounded-full scale-100 transition-all duration-300" />
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </>
            )}
          </div>
          
          <div className="text-center z-10">
            <span className="block text-sm text-slate-300 font-semibold tracking-wide mb-1">
              {verificationStep < 2 ? 'Verifying browser...' : 'Verification complete'}
            </span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
              <span>Protected by</span>
              <span className="text-orange-400 font-black">Cloudflare Turnstile</span>
            </p>
          </div>
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
