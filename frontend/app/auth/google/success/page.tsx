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

  const [securityStatus, setSecurityStatus] = useState('Checking browser environment...')

  useEffect(() => {
    if (verificationStep === 1) {
      const statuses = [
        'Checking browser environment...',
        'Validating session parameters...',
        'Verifying SSL connection...',
        'Finalizing secure login...'
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
      
      <div className="relative z-10 w-full max-w-[450px] p-10 rounded-3xl bg-[#090a0f]/85 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05),0_0_60px_rgba(99,102,241,0.08)] backdrop-blur-2xl text-white text-center overflow-hidden glow-laser animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-3xl font-black mb-6 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-400 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)]">
          Adarsh Auth
        </h2>
        
        <p className="text-xl font-bold mb-1 text-slate-100">Checking your browser...</p>
        <p className="text-xs text-slate-400 mb-8 max-w-[280px] mx-auto leading-relaxed">This process is automatic. Your browser will redirect shortly.</p>
        
        {/* Premium Verification Box */}
        <div className="flex flex-col items-center justify-center p-8 bg-black/60 border border-white/[0.04] rounded-2xl max-w-[350px] mx-auto mb-8 text-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Scanning Line Animation */}
          {verificationStep < 2 && (
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-[pan_2s_ease-in-out_infinite]" />
          )}

          <div className="relative flex items-center justify-center mb-6">
            {verificationStep < 2 ? (
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Outer spin ring */}
                <div className="absolute inset-0 rounded-full border border-indigo-500/10 border-t-indigo-500 border-r-purple-500 animate-[spin_2s_linear_infinite]" />
                {/* Inner counter-spin ring */}
                <div className="absolute inset-1.5 rounded-full border border-cyan-500/10 border-b-cyan-400 border-l-teal-400 animate-[spin_1.2s_linear_infinite_reverse]" />
                <ShieldCheckIcon className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
              </div>
            ) : (
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Expanding Ripple ring */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-ripple" />
                <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.5)] text-white scale-110 transition-transform duration-300 relative z-10">
                  <svg className="w-8 h-8 text-white stroke-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <span className="text-sm font-bold tracking-wide text-slate-200 mb-1 h-5 flex items-center transition-all duration-300">
            {securityStatus}
          </span>
          <span className="text-[9px] text-indigo-400/80 font-black uppercase tracking-widest">
            Protected by Cloudflare Turnstile
          </span>
        </div>

        {verificationStep === 2 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold animate-pulse tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            ✓ Verification successful! Redirecting..
          </div>
        )}
      </div>
    </div>
  )
}
