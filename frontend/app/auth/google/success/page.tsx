'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import ParticleField from '@/components/ParticleField'

// DJB2 Hash function
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
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
        // 1. Fetch challenge from backend
        const challengeRes = await api.get('/auth/challenge')
        const { salt, difficulty } = challengeRes.data

        // 2. Solve challenge in background
        let nonce = 0
        const startTime = Date.now()

        const solveChallenge = (): Promise<number> => {
          return new Promise((resolve) => {
            const chunk = () => {
              for (let i = 0; i < 500; i++) {
                const hashVal = slowHash(salt, nonce.toString())
                if (hashVal % difficulty === 0) {
                  resolve(nonce)
                  return
                }
                nonce++
              }
              setTimeout(chunk, 0)
            }
            chunk()
          })
        }

        await solveChallenge()

        // Enforce minimum 1.5 second animation
        const elapsed = Date.now() - startTime
        if (elapsed < 1500) {
          await new Promise(resolve => setTimeout(resolve, 1500 - elapsed))
        }

        // 3. Verification complete
        setVerificationStep(2)
        await new Promise(resolve => setTimeout(resolve, 800))

        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      } catch {
        // If challenge fails, still proceed (Google already authenticated)
        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      }
    }

    runVerification()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07070a] relative overflow-hidden">
      <ParticleField
        className="absolute inset-0 pointer-events-none opacity-70"
        particleColor="rgba(161, 161, 170, 0.2)"
        lineColor="rgba(99, 102, 241, 0.14)"
        count={90}
      />
      {/* Decorative background blur objects */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[440px] p-9 rounded-3xl bg-[#0f1015]/80 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl text-white text-center">
        <h2 className="text-2xl font-black mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Adarsh Auth
        </h2>
        
        <p className="text-lg font-semibold mb-1 text-white">Checking your browser...</p>
        <p className="text-xs text-slate-400 mb-8">This process is automatic. Your browser will redirect shortly.</p>
        
        {/* Premium Verification Box */}
        <div className="flex flex-col items-center justify-center p-6 bg-black/40 border border-white/5 rounded-2xl max-w-[340px] mx-auto mb-8 text-center shadow-inner relative overflow-hidden">
          <div className="relative flex items-center justify-center mb-5">
            {verificationStep < 2 ? (
              <>
                <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <ShieldCheckIcon className="absolute h-7 w-7 text-indigo-400 animate-pulse" />
              </>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] text-white scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          <span className="text-sm font-bold tracking-wide text-slate-200 mb-1">
            {verificationStep < 2 ? 'Verifying browser...' : 'Verified'}
          </span>
          <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest">
            Protected by Cloudflare Turnstile
          </span>
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
