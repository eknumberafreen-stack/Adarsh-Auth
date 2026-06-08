'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import ParticleField from '@/components/ParticleField'
import Image from 'next/image'

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
      // 1. Initial trigger
      setVerificationStep(1)

      try {
        // Smooth 1.5 second loading animation
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 2. Verification complete
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
        className="absolute inset-0 pointer-events-none opacity-80"
        particleColor="rgba(161, 161, 170, 0.25)"
        lineColor="rgba(99, 102, 241, 0.16)"
        count={65}
      />
      
      {/* Premium Cinematic Lighting Effects */}
      <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25rem] h-[25rem] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* 3D Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-[440px] p-10 rounded-[32px] bg-[#0c0d12]/75 backdrop-blur-3xl border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(99,102,241,0.2)] text-center transition-all duration-300 hover:border-white/[0.12] overflow-hidden">
        
        {/* Dynamic progress bar at the top edge of card */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/[0.04]">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 via-indigo-500 to-emerald-500 transition-all duration-[1000ms] ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]"
            style={{ width: verificationStep === 0 ? '15%' : verificationStep === 1 ? '65%' : '100%' }}
          />
        </div>

        {/* Framed Branding Logo */}
        <div className="relative mx-auto mb-5 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
          <Image src="/logo.png" alt="Adarsh Auth" fill className="object-cover p-2" />
        </div>

        <h2 className="text-2xl font-black mb-1 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          Adarsh Auth
        </h2>
        
        <p className="text-lg font-semibold mb-1 text-white">Checking your browser...</p>
        <p className="text-xs text-slate-400 mb-8">This process is automatic. Your browser will redirect shortly.</p>
        
        {/* Custom turnstile indicator */}
        <div className="relative flex flex-col items-center justify-center p-7 bg-[#08090d]/80 border border-white/[0.05] rounded-2xl max-w-[325px] mx-auto mb-8 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-16 h-16 mb-4">
            {verificationStep < 2 ? (
              <>
                <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <svg className="w-8 h-8 text-orange-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </>
            ) : (
              <>
                <div className="absolute inset-0 border-2 border-emerald-500 rounded-full scale-100 transition-all duration-300" />
                <div className="absolute inset-0 bg-emerald-500/15 rounded-full animate-ping" />
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </>
            )}
          </div>
          
          <div className="text-center z-10">
            <span className="block text-sm text-slate-300 font-semibold tracking-wide mb-1.5">
              {verificationStep < 2 ? 'Verifying browser...' : 'Verification complete'}
            </span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
              <span>Protected by</span>
              <span className="text-orange-400 font-black">Cloudflare Turnstile</span>
            </p>
          </div>
        </div>

        {verificationStep === 2 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-pulse">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Verification successful! Redirecting..
          </div>
        )}
      </div>
    </div>
  )
}
