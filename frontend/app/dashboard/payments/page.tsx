'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface Payment {
  _id: string
  userId: { _id: string; email: string; username: string | null }
  planId: { _id: string; name: string; displayName: string; price: number }
  amount: number
  transactionId: string
  screenshotUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
}

const STATUS_STYLE = {
  pending:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  label: 'Pending' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Approved' },
  rejected: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    label: 'Rejected' },
}

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { loadPayments() }, [filter])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/payment/admin${filter !== 'all' ? `?status=${filter}` : ''}`)
      setPayments(res.data.payments)
      setPendingCount(res.data.pendingCount)
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/payment/admin/${id}/approve`)
      toast.success('Payment approved! Plan activated.')
      loadPayments()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const reject = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal.id)
    try {
      await api.post(`/payment/admin/${rejectModal.id}/reject`, { reason: rejectReason })
      toast.success('Payment rejected')
      setRejectModal(null)
      setRejectReason('')
      loadPayments()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    const d = cents / 100
    return `$${d % 1 === 0 ? d.toFixed(0) : d.toFixed(1)}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Payment Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve UPI payment submissions</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <ClockIcon className="w-3.5 h-3.5" />
              {pendingCount} pending
            </span>
          )}
          <button onClick={loadPayments} className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-gray-400 hover:text-white transition-colors">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === s
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/20'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BanknotesIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {filter !== 'all' ? filter : ''} payments found</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['User', 'Plan', 'Amount', 'Transaction ID', 'Screenshot', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const s = STATUS_STYLE[p.status]
                  const isLoading = actionLoading === p._id
                  return (
                    <tr key={p._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-white font-medium text-xs">{p.userId?.username ? `@${p.userId.username}` : p.userId?.email}</p>
                          {p.userId?.username && <p className="text-gray-600 text-[10px]">{p.userId.email}</p>}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5">
                        <span className="text-indigo-300 font-semibold text-xs">{p.planId?.displayName}</span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-emerald-400 font-bold text-xs">
                        {formatPrice(p.amount)}
                      </td>

                      {/* Transaction ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-300 bg-white/[0.04] px-2 py-1 rounded-lg">
                          {p.transactionId}
                        </span>
                      </td>

                      {/* Screenshot */}
                      <td className="px-4 py-3.5">
                        {p.screenshotUrl ? (
                          <a href={p.screenshotUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                            View
                          </a>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
                          {p.status === 'pending' && <ClockIcon className="w-3 h-3" />}
                          {p.status === 'approved' && <CheckCircleIcon className="w-3 h-3" />}
                          {p.status === 'rejected' && <XCircleIcon className="w-3 h-3" />}
                          {s.label}
                        </span>
                        {p.adminNote && (
                          <p className="text-[10px] text-gray-600 mt-1 max-w-[120px] truncate">{p.adminNote}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        {p.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approve(p._id)}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
                            >
                              {isLoading ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectModal({ id: p._id }); setRejectReason('') }}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e0e1a] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Payment</h3>
            <p className="text-sm text-gray-400">Provide a reason for rejection (optional but recommended):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid transaction ID, payment not received..."
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-gray-300 hover:bg-white/[0.07] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
