'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useApi } from '@/hooks/useApi'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, UserCheck, ShieldAlert, X, Filter } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function DataApprovalPage() {
  const apiFetch = useApi()
  const [requests, setRequests] = useState<any[]>([])
  const [executives, setExecutives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<'all' | 'agents' | 'other'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Review modal state
  const [selectedReq, setSelectedReq] = useState<any | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [reviewNote, setReviewNote] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchExecutives = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/users?role=Sales Executive')
      const data = await res.json()
      if (data && Array.isArray(data.users)) {
        setExecutives(data.users)
      } else if (Array.isArray(data)) {
        setExecutives(data)
      }
    } catch {
      console.warn('Failed to load sales executives')
    }
  }, [apiFetch])

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

  useEffect(() => {
    fetchRequests()
    fetchExecutives()
  }, [fetchRequests, fetchExecutives])

  const openReviewModal = (req: any, action: 'approve' | 'reject') => {
    setSelectedReq(req)
    setReviewAction(action)
    setReviewNote('')
    setAssigneeId('')
  }

  const handleConfirmReview = async () => {
    if (!selectedReq) return
    setSubmitting(true)
    try {
      const payload: any = {
        action: reviewAction,
        reviewNote: reviewNote.trim() || null
      }
      if (assigneeId) {
        payload.assignedTo = assigneeId
      }

      const res = await apiFetch(`/api/v1/data/changes/${selectedReq.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast(`Request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`)
        setSelectedReq(null)
        fetchRequests()
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to process request', false)
      }
    } catch {
      showToast('Network error', false)
    } finally {
      setSubmitting(false)
    }
  }

  const agentRequests = requests.filter(r => r.field === 'existingAgent' || r.newValue === 'Agent')
  const otherRequests = requests.filter(r => r.field !== 'existingAgent' && r.newValue !== 'Agent')

  const filteredRequests = requests.filter(r => {
    if (filterTab === 'agents' && (r.field !== 'existingAgent' && r.newValue !== 'Agent')) return false
    if (filterTab === 'other' && (r.field === 'existingAgent' || r.newValue === 'Agent')) return false
    if (statusFilter === 'pending' && r.status !== 'pending') return false
    if (statusFilter === 'reviewed' && r.status === 'pending') return false
    return true
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const pendingAgentCount = agentRequests.filter(r => r.status === 'pending').length

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <span>Data & Agent Approval Flow</span>
              {pendingAgentCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-500 text-white text-xs font-black rounded-full animate-pulse">
                  {pendingAgentCount} Agents Pending
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and approve detected agents and sensitive data modifications.</p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Pending Approvals', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'Agent Approvals', value: agentRequests.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: ShieldAlert },
            { label: 'Approved Requests', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
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

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Requests ({requests.length})
            </button>
            <button
              onClick={() => setFilterTab('agents')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'agents' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>🚨 Agent Approvals</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{agentRequests.length}</span>
            </button>
            <button
              onClick={() => setFilterTab('other')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'other' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Other Changes ({otherRequests.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-semibold uppercase">Status:</span>
            {['pending', 'reviewed', 'all'].map((st: any) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={40} className="mb-3 text-gray-200" />
              <p className="font-semibold">No requests matching current filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Requester / Date', 'Entity & Lead Details', 'Field', 'Old Value', 'New Value', 'Reason', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-5 py-3.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRequests.map(req => {
                    const isAgentTag = req.field === 'existingAgent' || req.newValue === 'Agent'
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-gray-900">{req.requester?.fullName || req.requester?.email || 'System'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(req.requestedAt).toLocaleString('en-IN')}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                            isAgentTag ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isAgentTag ? '🚨 Agent Detected / Tagged' : req.entityType}
                          </span>
                          {req.leadDetails ? (
                            <div className="mt-1">
                              <p className="text-xs font-bold text-gray-800">{req.leadDetails.clientName}</p>
                              <p className="text-[11px] font-mono text-gray-500">
                                {req.leadDetails.clientPhone && `📞 ${req.leadDetails.clientPhone}`}
                                {req.leadDetails.vehicleNo && ` • 🚗 ${req.leadDetails.vehicleNo}`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-mono mt-1">{req.entityId?.slice(0, 8)}…</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-blue-700">
                          {isAgentTag ? 'Agent Status' : req.field}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400 line-through">{req.oldValue || '(empty)'}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-green-700">{req.newValue}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 max-w-[220px]" title={req.reason}>{req.reason || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[req.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openReviewModal(req, 'approve')}
                                className="px-2.5 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-green-200"
                                title="Approve"
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button
                                onClick={() => openReviewModal(req, 'reject')}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-red-200"
                                title="Reject"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">
                              {req.reviewer?.fullName ? `By ${req.reviewer.fullName}` : 'Reviewed'}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Review Modal */}
        {selectedReq && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {reviewAction === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
                </h3>
                <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <p><span className="font-bold text-gray-700">Entity:</span> {selectedReq.entityType} ({selectedReq.entityId?.slice(0, 8)}…)</p>
                  {selectedReq.leadDetails && (
                    <p><span className="font-bold text-gray-700">Lead:</span> {selectedReq.leadDetails.clientName} ({selectedReq.leadDetails.clientPhone || selectedReq.leadDetails.vehicleNo})</p>
                  )}
                  <p><span className="font-bold text-gray-700">Change:</span> {selectedReq.field} ➔ <span className="font-bold text-green-700">{selectedReq.newValue}</span></p>
                </div>

                {reviewAction === 'approve' && (selectedReq.field === 'existingAgent' || selectedReq.newValue === 'Agent') && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      Assign to Sales Executive (Optional)
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl p-2.5 bg-white text-gray-900 focus:outline-blue-500 cursor-pointer"
                    >
                      <option value="">Keep Unassigned (Direct Managed Agent)</option>
                      {executives.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.fullName || ex.email}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">If unassigned, the agent account is handled directly by Admin.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Review Note / Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter any feedback or note..."
                    className="w-full text-sm border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReview}
                  disabled={submitting}
                  className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                    reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Processing...' : `Confirm ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
