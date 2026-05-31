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
import { motion } from 'framer-motion'

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
    label: 'Under verification',
    desc: 'Audit staff are validating your UPI transaction reference.',
  },
  approved: {
    icon: CheckCircleIcon,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: 'Settled',
    desc: 'Transaction verified. Active plan features released.',
  },
  rejected: {
    icon: XCircleIcon,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    label: 'Declined',
    desc: 'UTR lookup matching failed or returned invalid signatures.',
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
    const dollars = cents / 100
    const inrAmount = Math.round(dollars * 83)
    return `₹${inrAmount}`
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Payments Log</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Review checkout transactions, receipts, and verification states</p>
        </div>
        <Link href="/dashboard/billing"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-black uppercase tracking-wider">
          New Checkout <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/5 bg-white/[0.01] px-5 py-16 text-center">
          <BanknotesIcon className="mx-auto h-11 w-11 text-slate-600 animate-pulse" />
          <p className="mt-4 text-sm font-bold text-white">No UPI Transactions Found</p>
          <p className="mt-2 text-xs text-slate-500 font-semibold max-w-xs mx-auto mb-4">No active or pending checkout requests were located in your logs.</p>
          <Link href="/dashboard/billing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/20">
            Select Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {payments.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status]
            const Icon = cfg.icon
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                key={p._id} 
                className={`bg-[#0a0a14]/60 border ${cfg.border} rounded-2xl p-5 shadow-xl`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl ${cfg.bg} flex-shrink-0 border border-white/[0.02]`}>
                      <Icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white">{p.planId?.displayName} Plan</p>
                        <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{cfg.desc}</p>
                      {p.adminNote && p.status === 'rejected' && (
                        <div className="text-[11px] text-red-400 mt-2.5 bg-red-500/[0.04] border border-red-500/20 rounded-xl px-3.5 py-2 font-semibold">
                          Reason: {p.adminNote}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black text-white font-mono">{formatPrice(p.amount)}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wide">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Transaction UTR:</span>
                  <span className="font-mono text-xs font-bold text-indigo-300 bg-black/40 border border-white/[0.04] px-2.5 py-1 rounded-xl">
                    {p.transactionId}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
