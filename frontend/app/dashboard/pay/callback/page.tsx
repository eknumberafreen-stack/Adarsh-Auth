'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!orderId) {
      router.replace('/dashboard/billing')
      return
    }
    verifyPayment(orderId)
  }, [orderId])

  const verifyPayment = async (oid: string) => {
    setLoading(true)
    try {
      const res = await api.post('/payment/cashfree/verify-order', { orderId: oid })
      if (res.data.success) {
        setSuccess(true)
        setMessage(res.data.message || 'Your premium plan is now active!')
        toast.success('Payment verified successfully!')
      } else {
        setSuccess(false)
        setMessage(res.data.message || 'Payment verification failed or was not completed.')
      }
    } catch (err: any) {
      setSuccess(false)
      setMessage(err.response?.data?.error || 'An error occurred during verification.')
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }

  const handleRetry = () => {
    if (!orderId) return
    setRetrying(true)
    verifyPayment(orderId)
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Verifying Payment</h2>
          <p className="text-sm text-gray-500 mt-1">Please do not refresh or close this window.</p>
        </div>
        <p className="text-xs text-gray-600 font-mono">Order ID: {orderId}</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Payment Successful!</h2>
          <p className="text-sm text-gray-400 mt-2">{message}</p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex-1">
            Go to Dashboard
          </Link>
          <Link href="/dashboard/billing"
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] text-sm font-semibold transition-colors flex-1">
            View Billing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-6 animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <XCircleIcon className="w-10 h-10 text-red-400" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-white">Verification Pending</h2>
        <p className="text-sm text-gray-400 mt-2">{message}</p>
        <p className="text-xs text-gray-500 mt-1">If the transaction was completed, it may take a few moments to sync.</p>
      </div>
      <div className="pt-2 flex flex-col gap-3">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {retrying ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowPathIcon className="w-4 h-4" />
          )}
          {retrying ? 'Verifying...' : 'Re-verify Payment'}
        </button>
        <Link href="/dashboard/billing"
          className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] text-sm font-semibold transition-colors">
          Back to Billing
        </Link>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
