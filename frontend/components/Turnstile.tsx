'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

export default function Turnstile({ onVerify, onError, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAADgoaqh4zbu9o-tW'

  useEffect(() => {
    // 1. Ensure the Cloudflare Turnstile API script is loaded
    let script = document.getElementById('cloudflare-turnstile-script') as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = 'cloudflare-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => setScriptLoaded(true)
      document.body.appendChild(script)
    } else {
      setScriptLoaded(true)
    }

    // 2. Poll for turnstile object availability once script is loaded
    let interval: NodeJS.Timeout
    const initialize = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token)
            },
            'error-callback': () => {
              if (onError) onError()
            },
            'expired-callback': () => {
              if (onExpire) onExpire()
            },
            theme: 'dark',
            appearance: 'always',
          })
          widgetIdRef.current = id
        } catch (err) {
          console.error('Failed to render Turnstile:', err)
        }
      }
    }

    if (window.turnstile) {
      initialize()
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          initialize()
        }
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        } catch (e) {
          // ignore cleanup errors on unmount
        }
      }
    }
  }, [siteKey, onVerify, onError, onExpire, scriptLoaded])

  return (
    <div className="flex justify-center w-full my-2 transition-all duration-300 transform scale-95 hover:scale-100">
      <div 
        ref={containerRef} 
        className="rounded-xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20 bg-[#0f1015]/60 backdrop-blur-md" 
      />
    </div>
  )
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          appearance?: 'always' | 'execute' | 'interaction-only'
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}
