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
    const d = cents / 100
    return `$${d % 1 === 0 ? d.toFixed(0) : d.toFixed(1)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckIcon className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Payment Submitted!</h2>
        <p className="text-gray-400">
          Your payment is under review. Admin will verify and activate your{' '}
          <span className="text-indigo-300 font-semibold">{plan?.displayName}</span> plan within 24 hours.
        </p>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-left space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Transaction ID</p>
          <p className="font-mono text-sm text-white">{transactionId.toUpperCase()}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/billing"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            View Billing
          </Link>
          <Link href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] text-sm font-medium transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Load Cashfree SDK */}
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
      />

      {/* Back */}
      <Link href="/dashboard/billing"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Billing
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Complete Payment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a payment method to unlock premium features</p>
      </div>

      {/* Plan Summary */}
      {plan && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Selected Plan</p>
            <p className="text-lg font-bold text-white">{plan.displayName}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {plan.features.slice(0, 3).map((f) => (
                <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.06]">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-indigo-300">{formatPrice(plan.price)}</p>
            <p className="text-xs text-gray-500 mt-0.5">one-time</p>
          </div>
        </div>
      )}

      {/* Payment Method Selector Tabs */}
      <div className="flex bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
        <button
          type="button"
          onClick={() => setPaymentMethod('cashfree')}
          className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            paymentMethod === 'cashfree'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <CreditCardIcon className="w-4 h-4" />
          Instant Gateway (Card/UPI/Netbanking)
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('manual')}
          className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            paymentMethod === 'manual'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          Manual UPI Verification
        </button>
      </div>

      {/* Cashfree Gateway Option */}
      {paymentMethod === 'cashfree' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.04]">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Automated Payment</p>
              <p className="text-sm font-semibold text-white">Secure Checkout by Cashfree</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan Base Price</span>
                <span className="text-white font-medium">{plan ? formatPrice(plan.price) : ''}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/[0.04] pt-3">
                <span className="text-gray-400">Estimated INR Amount</span>
                <span className="text-indigo-300 font-bold text-base">₹{estimatedINR.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-gray-500 text-right mt-1">
                Converted at 1 USD = {CONVERSION_RATE} INR
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 flex items-start gap-3">
              <SparklesIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-400 leading-relaxed">
                <strong>Instant Activation:</strong> Your premium limits will be updated immediately upon successful payment. Cashfree supports local Indian payment methods including Google Pay, PhonePe, Paytm, credit/debit cards, and netbanking.
              </div>
            </div>

            <button
              onClick={handleCashfreePay}
              disabled={cfLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {cfLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initiating Checkout...
                </>
              ) : (
                <>
                  <CreditCardIcon className="w-4 h-4" />
                  Pay ₹{estimatedINR.toFixed(2)} with Cashfree
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual UPI Option */}
      {paymentMethod === 'manual' && (
        <div className="space-y-5 animate-fadeIn">
          {/* UPI Scan Code */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.04]">
                <QrCodeIcon className="w-4 h-4 text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Step 1</p>
                <p className="text-sm font-semibold text-white">Scan QR or Pay via UPI ID</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center">
              {/* QR Code */}
              <div className="w-44 h-44 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 border-4 border-white/10 shadow-xl shadow-indigo-500/10 overflow-hidden p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=kumarhari@fam%26pn=Hariom%20Kumar%26cu=INR&bgcolor=ffffff&color=000000&margin=2`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">UPI ID</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 font-mono text-xs sm:text-sm text-white overflow-x-auto">
                      {UPI_ID}
                    </div>
                    <button
                      type="button"
                      onClick={copyUPI}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">UPI Name</p>
                  <p className="text-sm text-gray-300 font-medium">{UPI_NAME}</p>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                  <p className="text-xs text-amber-400 font-medium">
                    💡 Pay exactly <span className="font-bold">{plan ? formatPrice(plan.price) : ''}</span> or ₹{estimatedINR.toFixed(2)} to avoid validation delays
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit UTR Form */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.04]">
                <BanknotesIcon className="w-4 h-4 text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Step 2</p>
                <p className="text-sm font-semibold text-white">Enter Transaction Details</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Transaction ID / UTR Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-indigo-500/50 transition-all"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Find this in your UPI app under payment history</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Screenshot URL <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="url"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="https://imgur.com/your-screenshot"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <p className="text-xs text-gray-600 mt-1">Upload to imgur.com or any image host and paste the link</p>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
                <ShieldExclamationIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Important Warning</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitting a fake, invalid, or duplicate transaction ID will result in an <strong className="text-red-400">account ban</strong>. All payments are manually verified.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !transactionId.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  '✅ I Have Paid — Submit'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
