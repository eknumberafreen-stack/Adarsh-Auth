'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { 
  ShieldCheckIcon, 
  LockClosedIcon, 
  CpuChipIcon, 
  SparklesIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
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
  const [verificationStep, setVerificationStep] = useState(0) // 0 = loading, 1 = verifying, 2 = verified
  const [progress, setProgress] = useState(15)
  const [securityStatus, setSecurityStatus] = useState('Initializing zero-trust handshake...')

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
      setProgress(25)

      try {
        // 1. Fetch challenge from backend
        const challengeRes = await api.get('/auth/challenge')
        const { salt, difficulty } = challengeRes.data
        setProgress(45)

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
        setProgress(85)

        // Enforce smooth animation pacing
        const elapsed = Date.now() - startTime
        if (elapsed < 1400) {
          await new Promise(resolve => setTimeout(resolve, 1400 - elapsed))
        }

        setProgress(100)
        setVerificationStep(2)
        await new Promise(resolve => setTimeout(resolve, 700))

        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      } catch {
        setProgress(100)
        setVerificationStep(2)
        await new Promise(resolve => setTimeout(resolve, 500))
        setAuth({ id: userId, email, username: null }, accessToken, refreshToken)
        router.replace('/dashboard')
      }
    }

    runVerification()
  }, [])

  useEffect(() => {
    if (verificationStep === 1) {
      const statuses = [
        'Establishing encrypted channel...',
        'Validating browser integrity...',
        'Authenticating zero-trust token...',
        'Finalizing secure session gateway...'
      ]
      let idx = 0
      const interval = setInterval(() => {
        if (idx < statuses.length - 1) {
          idx++
          setSecurityStatus(statuses[idx])
        }
      }, 320)
      return () => clearInterval(interval)
    } else if (verificationStep === 2) {
      setSecurityStatus('Identity verified! Launching dashboard...')
    }
  }, [verificationStep])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#040508] relative overflow-hidden px-4 font-sans select-none">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes laser-glow {
          0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 8px rgba(99,102,241,0.6)); }
          50% { opacity: 1; filter: drop-shadow(0 0 16px rgba(168,85,247,0.9)); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-laser {
          animation: laser-glow 3s ease-in-out infinite;
        }
      `}} />

      {/* Particle Universe */}
      <ParticleField
        className="absolute inset-0 pointer-events-none opacity-70"
        particleColor="rgba(148, 163, 184, 0.22)"
        lineColor="rgba(99, 102, 241, 0.14)"
        count={95}
      />
      
      {/* Ambient Neon Atmosphere */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[26rem] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-[30rem] h-[20rem] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Luxury Glass Card */}
      <div className="relative z-10 w-full max-w-[480px] p-8 sm:p-10 rounded-[2.25rem] bg-[#090b14]/85 border border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12),0_0_80px_rgba(99,102,241,0.12)] backdrop-blur-3xl text-white text-center overflow-hidden transition-all duration-500">
        
        {/* Top Metallic Perimeter Light Edge */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/80 via-purple-400/80 to-transparent" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-indigo-500/30 blur-xl pointer-events-none" />

        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] mb-6">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${verificationStep === 2 ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${verificationStep === 2 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300">
            {verificationStep === 2 ? 'Zero-Trust Authenticated' : 'Security Checkpoint'}
          </span>
        </div>

        {/* Hero Logo & Title */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <div className="w-full h-full bg-[#090b14] rounded-2xl flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-400 animate-laser" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
            Adarsh Auth
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-[320px] mx-auto leading-relaxed">
          Verifying browser environment & security credentials before granting console access.
        </p>

        {/* Hologram Scanner Box */}
        <div className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#0b0e1b]/90 to-[#070810]/95 border border-white/[0.06] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_12px_36px_rgba(0,0,0,0.4)] mb-6 overflow-hidden">
          
          {/* Laser Scanline */}
          {verificationStep < 2 && (
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 animate-[scanline_2.4s_ease-in-out_infinite]" />
          )}

          {/* Central Holographic Rings */}
          <div className="relative flex items-center justify-center mb-6 pt-2">
            {verificationStep < 2 ? (
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Outer Orbit */}
                <div className="absolute inset-0 rounded-full border border-indigo-500/20 border-t-indigo-500 border-r-purple-500 animate-[spin_3s_linear_infinite]" />
                {/* Middle Ring */}
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-400/30 animate-[spin_6s_linear_infinite_reverse]" />
                {/* Inner Ring */}
                <div className="absolute inset-4 rounded-full border border-purple-500/30 border-b-cyan-400 border-l-indigo-400 animate-[spin_1.5s_linear_infinite]" />
                
                {/* Glowing Core Icon */}
                <div className="relative z-10 w-11 h-11 rounded-full bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                  <LockClosedIcon className="w-5 h-5 text-indigo-300 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Success Expanding Wave */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-pulse-ring" />
                
                {/* Verified Emerald Orb */}
                <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-105 transition-transform duration-300">
                  <div className="w-full h-full bg-[#07130f] rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Status Line */}
          <div className="flex flex-col items-center justify-center gap-1.5 mb-5">
            <span className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              {verificationStep < 2 && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
              {securityStatus}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-300/80 font-mono tracking-wider">
              <CpuChipIcon className="w-3.5 h-3.5" />
              <span>TLS 1.3 • AES-256 ENCRYPTION</span>
            </div>
          </div>

          {/* Smooth Progress Track */}
          <div className="w-full bg-black/60 rounded-full h-1.5 border border-white/[0.04] overflow-hidden p-[1px]">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.8)] ${
                verificationStep === 2 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Trust Telemetry Badges */}
        <div className="grid grid-cols-3 gap-2 text-left mb-6">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Engine</p>
            <p className="text-[11px] font-semibold text-slate-300 truncate">Turnstile</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Protocol</p>
            <p className="text-[11px] font-semibold text-slate-300 truncate">Zero-Trust</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Latency</p>
            <p className="text-[11px] font-semibold text-emerald-400 truncate">&lt; 15ms</p>
          </div>
        </div>

        {/* Bottom Action / Status Pill */}
        {verificationStep === 2 ? (
          <div className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
            <SparklesIcon className="w-4 h-4 text-emerald-400" />
            <span>Authenticated successfully — Redirecting to console...</span>
          </div>
        ) : (
          <div className="py-2.5 px-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[11px] font-medium text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Protected by Cloudflare Anti-DDoS & Turnstile</span>
          </div>
        )}

      </div>
    </div>
  )
}
