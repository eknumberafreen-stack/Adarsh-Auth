'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Script from 'next/script'
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowLeftIcon,
  ShieldExclamationIcon,
  QrCodeIcon,
  BanknotesIcon,
  CreditCardIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

declare global {
  interface Window {
    Cashfree: any;
  }
}

interface Plan {
  _id: string
  name: string
  displayName: string
  price: number
  features: string[]
}

export default function PayPage() {
  const params = useSearchParams()
  const router = useRouter()
  const planId = params.get('planId')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'manual'>('cashfree')
  
  // Manual UPI States
  const [transactionId, setTransactionId] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  // Cashfree Gateway States
  const [cfLoading, setCfLoading] = useState(false)
  const [estimatedINR, setEstimatedINR] = useState(0)

  const UPI_ID = 'kumarhari@fam'
  const UPI_NAME = 'Hariom Kumar'
  const CONVERSION_RATE = 83

  useEffect(() => {
    if (!planId) {
      router.replace('/dashboard/billing')
      return
    }
    loadPlan()
  }, [planId])

  const loadPlan = async () => {
    try {
      const res = await api.get('/plans')
      const plans: Plan[] = res.data.plans ?? res.data
      const found = plans.find((p) => p._id === planId)
      if (!found) {
        toast.error('Plan not found')
        router.replace('/dashboard/billing')
        return
      }
      setPlan(found)
      
      // Calculate estimated INR value (Price is in USD cents)
      const usdPrice = found.price / 100
      setEstimatedINR(Math.round(usdPrice * CONVERSION_RATE))
    } catch {
      toast.error('Failed to load plan')
    } finally {
      setLoading(false)
    }
  }

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    toast.success('UPI ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle Cashfree checkout
  const handleCashfreePay = async () => {
    if (!planId) return
    setCfLoading(true)
    try {
      const res = await api.post('/payment/cashfree/create-order', { planId })
      const { paymentSessionId, cashfreeEnv } = res.data

      if (!paymentSessionId) {
        throw new Error('No payment session received from backend')
      }

      if (!window.Cashfree) {
        throw new Error('Cashfree SDK is still loading. Please wait or refresh.')
      }

      const cashfree = window.Cashfree({
        mode: cashfreeEnv || 'sandbox',
      })

      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self',
      })
    } catch (err: any) {
      console.error('Cashfree Error:', err)
      toast.error(err.response?.data?.error || err.message || 'Failed to initiate Cashfree checkout')
    } finally {
      setCfLoading(false)
    }
  }

  // Handle Manual UPI payment submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transactionId.trim()) return toast.error('Transaction ID is required')
    if (transactionId.trim().length < 6) return toast.error('Transaction ID must be at least 6 characters')

    setSubmitting(true)
    try {
      await api.post('/payment/submit', {
        planId,
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotUrl.trim() || undefined,
      })
      setSubmitted(true)
      toast.success('Payment submitted! Admin will verify within 24 hours.')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    const dollars = cents / 100
    const inrAmount = Math.round(dollars * 83)
    return `₹${inrAmount}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
          <CheckIcon className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Payment Submitted!</h2>
        <p className="text-xs font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
          Your transaction is currently under manual audit. Verification and{' '}
          <span className="text-indigo-300 font-bold">{plan?.displayName}</span> features release will complete within 24 hours.
        </p>
        <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-2xl p-5 text-left space-y-2 max-w-md mx-auto shadow-2xl">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Audit Reference ID (UTR)</p>
          <p className="font-mono text-xs font-bold text-white break-all bg-black/40 border border-white/[0.04] p-3 rounded-xl">{transactionId.toUpperCase()}</p>
        </div>
        <div className="flex gap-3 justify-center max-w-xs mx-auto pt-2">
          <Link href="/dashboard/billing"
            className="flex-1 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.05] text-xs font-black uppercase tracking-wider text-center transition-all">
            Billing
          </Link>
          <Link href="/dashboard"
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider text-center transition-all shadow-lg shadow-indigo-900/25">
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Load Cashfree SDK */}
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
      />

      {/* Back */}
      <Link href="/dashboard/billing"
        className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Plan
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Complete Payment</h1>
        <p className="text-xs text-slate-500 font-semibold tracking-wide">Select your checkout lane to acquire system features</p>
      </div>

      {/* Plan Summary */}
      {plan && (
        <div className="card relative overflow-hidden p-6 border-indigo-500/25 bg-indigo-500/[0.02] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.03] to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-1">Selected Plan</p>
              <p className="text-lg font-black text-white tracking-tight">{plan.displayName}</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {plan.features.slice(0, 3).map((f) => (
                  <span key={f} className="text-[9px] font-bold px-2.5 py-0.5 rounded-lg bg-black/40 text-slate-400 border border-white/[0.04] uppercase tracking-wide">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-300 drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]">{formatPrice(plan.price)}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">One-Time Fee</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selector Tabs */}
      <div className="flex bg-black/40 border border-white/[0.05] rounded-2xl p-1.5 shadow-xl">
        <button
          type="button"
          onClick={() => setPaymentMethod('cashfree')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            paymentMethod === 'cashfree'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCardIcon className="w-4 h-4" />
          Instant Gateway
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('manual')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            paymentMethod === 'manual'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          Manual UPI (Verify UTR)
        </button>
      </div>

      {/* Cashfree Gateway Option */}
      {paymentMethod === 'cashfree' && (
        <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-[28px] p-6 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Instant Activation</p>
              <p className="text-sm font-bold text-white tracking-tight">Secure Cashfree Checkout Engine</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-black/35 border border-white/[0.04] rounded-2xl p-4.5 space-y-3.5 shadow-inner">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 uppercase tracking-wider">Plan Base Rate</span>
                <span className="text-white font-mono">{plan ? formatPrice(plan.price) : ''}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold border-t border-white/[0.04] pt-3.5">
                <span className="text-slate-500 uppercase tracking-wider">Checkout Total (INR)</span>
                <span className="text-indigo-300 font-black text-lg font-mono drop-shadow-[0_0_6px_rgba(99,102,241,0.2)]">₹{estimatedINR.toFixed(2)}</span>
              </div>
              <div className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wide text-right">
                1 USD = {CONVERSION_RATE} INR CONVERSION RATE
              </div>
            </div>

            <div className="bg-amber-500/[0.02] border border-amber-500/15 rounded-2xl p-4 flex items-start gap-3">
              <SparklesIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400 font-semibold leading-relaxed">
                <strong>Instant API release:</strong> System limits provision instantly on settle. The gateway integrates Google Pay, PhonePe, Paytm, Indian netbanking, UPI, and major cards.
              </div>
            </div>

            <button
              onClick={handleCashfreePay}
              disabled={cfLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
            >
              {cfLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Requesting Session...
                </>
              ) : (
                <>
                  <CreditCardIcon className="w-4 h-4" />
                  Proceed to Checkout — ₹{estimatedINR.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual UPI Option */}
      {paymentMethod === 'manual' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* UPI Scan Code */}
          <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-[28px] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                <QrCodeIcon className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Step 1</p>
                <p className="text-sm font-bold text-white tracking-tight">Scan QR code or dispatch to UPI ID</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* QR Code */}
              <div className="w-40 h-40 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 border border-white/10 shadow-2xl overflow-hidden p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=kumarhari@fam%26pn=Hariom%20Kumar%26cu=INR&bgcolor=ffffff&color=000000&margin=2`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-3.5 w-full">
                <div>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-1.5">Direct UPI target address</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/40 border border-white/[0.05] rounded-xl px-4 py-3 font-mono text-xs font-bold text-white overflow-x-auto select-all">
                      {UPI_ID}
                    </div>
                    <button
                      type="button"
                      onClick={copyUPI}
                      className="p-3 rounded-xl bg-[#0e0e18] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                    >
                      {copied ? <CheckIcon className="w-4.5 h-4.5 text-emerald-400" /> : <ClipboardDocumentIcon className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Account name</p>
                    <p className="text-xs text-slate-200 font-black mt-0.5">{UPI_NAME}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Conversion rate</p>
                    <p className="text-xs text-indigo-300 font-black mt-0.5">₹{estimatedINR} INR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit UTR Form */}
          <div className="bg-[#0a0a14]/60 border border-white/[0.04] rounded-[28px] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                <BanknotesIcon className="w-4.5 h-4.5 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Step 2</p>
                <p className="text-sm font-bold text-white tracking-tight">Record transaction parameters</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">
                  UTR reference Number / Transaction ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-white placeholder-slate-700 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500/40 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 font-semibold mt-1.5">Locate the 12-digit reference number in your UPI client receipt</p>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-2">
                  Receipt Snapshot Link <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="url"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="https://imgur.com/..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/[0.06] rounded-xl text-white placeholder-slate-700 text-xs focus:outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-red-500/[0.02] border border-red-500/25 rounded-2xl">
                <ShieldExclamationIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-red-400 uppercase tracking-wider">Verification notice</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed">
                    Submitting duplicate, fake, or invalid transaction identifiers results in automatic account blacklist. Telemetry logs are mapped manually.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !transactionId.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting Telemetries...
                  </>
                ) : (
                  'Submit reference for verification'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
