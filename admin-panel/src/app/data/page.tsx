'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useApi } from '@/hooks/useApi'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function DataApprovalPage() {
  const apiFetch = useApi()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/data/changes')
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      showToast('Failed to load data change requests', false)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    const note = prompt(`Optional note for ${action}:`)
    try {
      const res = await apiFetch(`/api/v1/data/changes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reviewNote: note }),
      })
      if (res.ok) {
        showToast(`Request ${action}d successfully`)
        fetchRequests()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to process request', false)
      }
    } catch {
      showToast('Network error', false)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const reviewed = requests.filter(r => r.status !== 'pending')

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Approval Flow</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and approve sensitive data modification requests.</p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
            { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-700">All Requests</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={40} className="mb-3 text-gray-200" />
              <p className="font-semibold">No data change requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Requester', 'Entity', 'Field', 'Old Value', 'New Value', 'Reason', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900">{req.requester?.fullName || '—'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(req.requestedAt).toLocaleString('en-IN')}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">
                          {req.entityType}
                        </span>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">{req.entityId?.slice(0, 8)}…</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-blue-700">{req.field}</td>
                      <td className="px-5 py-4 text-sm text-gray-400 line-through">{req.oldValue || '(empty)'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-green-700">{req.newValue}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 max-w-[150px] truncate" title={req.reason}>{req.reason || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[req.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReview(req.id, 'approve')}
                              className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleReview(req.id, 'reject')}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            {req.reviewer?.fullName ? `By ${req.reviewer.fullName}` : 'Reviewed'}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
