'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

interface Payment {
  _id: string
  planId: { name: string; displayName: string; price: number }
  amount: number
  transactionId: string
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  pending: {
    icon: ClockIcon,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    label: 'Under Review',
    desc: 'Admin will verify your payment within 24 hours',
  },
  approved: {
    icon: CheckCircleIcon,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: 'Approved',
    desc: 'Your plan has been activated',
  },
  rejected: {
    icon: XCircleIcon,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    label: 'Rejected',
    desc: 'Payment was not verified',
  },
}

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/payment/my')
      .then((res) => setPayments(res.data.payments))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [])

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    const d = cents / 100
    return `$${d % 1 === 0 ? d.toFixed(0) : d.toFixed(1)}`
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your payment submissions</p>
        </div>
        <Link href="/dashboard/billing"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors text-sm font-medium">
          Upgrade Plan <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <BanknotesIcon className="w-10 h-10 mx-auto text-gray-600" />
          <p className="text-gray-500">No payment submissions yet</p>
          <Link href="/dashboard/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            View Plans
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const cfg = STATUS_CONFIG[p.status]
            const Icon = cfg.icon
            return (
              <div key={p._id} className={`bg-white/[0.02] border ${cfg.border} rounded-2xl p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${cfg.bg} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{p.planId?.displayName} Plan</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                      {p.adminNote && p.status === 'rejected' && (
                        <p className="text-xs text-red-400 mt-1.5 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-1.5">
                          Reason: {p.adminNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-white">{formatPrice(p.amount)}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
                  <span className="text-xs text-gray-600">UTR:</span>
                  <span className="font-mono text-xs text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded-lg">
                    {p.transactionId}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
