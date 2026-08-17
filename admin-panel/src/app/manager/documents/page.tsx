"use client"

import React, { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  Shield, CheckCircle2, AlertCircle, Clock, Search, Eye, Download,
  Copy, Check, RefreshCw, X, MessageSquare, Send, ArrowRight,
  FileSpreadsheet, User, Phone, Car, Filter, Calendar, ExternalLink
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface PolicySubmissionItem {
  leadId: string
  clientName: string
  clientPhone: string
  vehicleNo: string
  expiryDate?: string
  leadStatus: string
  assignee?: { id: string; fullName: string; personalMobile?: string }
  submission: {
    status: 'Draft' | 'Pending_Review' | 'Approved' | 'Reverted'
    formData: any
    documents: any[]
    compiledPdfUrl?: string
    revertReason?: string
    revertedAt?: string
    submittedAt?: string
    reviewedAt?: string
    reviewedByName?: string
    salesPersonName?: string
    copyableSummary: string
  }
  updatedAt: string
}

export default function ManagerDocumentsPage() {
  const { user } = useAuth()
  const role = (user?.role?.name || (typeof user?.role === 'string' ? user.role : '')).toUpperCase()
  const isManagerOrAdmin = role.includes('MANAGER') || role.includes('ADMIN') || role.includes('SUPER')

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialSearch = searchParams?.get('search') || ''

  const [submissions, setSubmissions] = useState<PolicySubmissionItem[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, reverted: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending_Review' | 'Approved' | 'Reverted'>(initialSearch ? 'all' : 'Pending_Review')
  const [search, setSearch] = useState(initialSearch)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)

  // Modals
  const [selectedPreviewSubmission, setSelectedPreviewSubmission] = useState<PolicySubmissionItem | null>(null)
  const [approveModalLead, setApproveModalLead] = useState<PolicySubmissionItem | null>(null)
  const [visibleToSalesPerson, setVisibleToSalesPerson] = useState(true)
  const [revertModalLead, setRevertModalLead] = useState<PolicySubmissionItem | null>(null)
  const [revertReason, setRevertReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch Submissions
  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetchApi(`/api/v1/manager/submissions?${params}`)
      setSubmissions(res?.submissions || [])
      if (res?.stats) setStats(res.stats)
    } catch (err) {
      console.error('Failed to fetch manager submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubmissions()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Copy Summary Handler
  const handleCopySummary = (item: PolicySubmissionItem) => {
    navigator.clipboard.writeText(item.submission.copyableSummary)
    setCopiedId(item.leadId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Open Approve Modal
  const handleOpenApproveModal = (item: PolicySubmissionItem) => {
    setApproveModalLead(item)
    setVisibleToSalesPerson(item.submission.visibleToSalesPerson !== false)
  }

  // Confirm Approve & Push to Policy Module
  const handleConfirmApprove = async () => {
    if (!approveModalLead) return
    setActionLoading(true)
    try {
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: approveModalLead.leadId,
          action: 'APPROVE',
          visibleToSalesPerson
        })
      })
      alert(`Policy submission for ${approveModalLead.clientName} approved and created in the Policy Module!`)
      setApproveModalLead(null)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to approve submission')
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle Visibility directly on card
  const handleToggleVisibility = async (item: PolicySubmissionItem, newVisibility: boolean) => {
    try {
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: item.leadId,
          action: 'TOGGLE_VISIBILITY',
          visibleToSalesPerson: newVisibility
        })
      })
      setSubmissions(prev => prev.map(s => {
        if (s.leadId === item.leadId) {
          return {
            ...s,
            submission: {
              ...s.submission,
              visibleToSalesPerson: newVisibility
            }
          }
        }
        return s
      }))
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility')
    }
  }

  // Revert Action
  const handleConfirmRevert = async () => {
    if (!revertModalLead) return
    if (!revertReason.trim()) {
      alert('Please specify why the documents or form details are being reverted.')
      return
    }

    setActionLoading(true)
    try {
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: revertModalLead.leadId,
          action: 'REVERT',
          revertReason: revertReason.trim()
        })
      })
      alert('Policy submission reverted to sales executive. An urgent notification has been sent.')
      setRevertModalLead(null)
      setRevertReason('')
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to revert submission')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return '—'
    }
  }

  if (user && !isManagerOrAdmin) {
    return (
      <AdminLayout>
        <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
            <Shield size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Manager & Admin Access Only</h2>
          <p className="text-xs text-slate-500 font-medium">
            Policy Approvals and Document Bundle Verifications are restricted to Managers and Super Admins. Sales Executives submit policy documents from the Leads section.
          </p>
          <a
            href="/leads"
            className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all shadow-md"
          >
            Go to My Leads
          </a>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200">
                Manager Verification Central
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200">
                1-Click Copy & PDF Review
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Policy Document Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Verify consolidated single PDFs submitted by sales executives, copy WhatsApp form details, approve or revert with remarks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSubmissions()}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setStatusFilter('Pending_Review')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              statusFilter === 'Pending_Review'
                ? 'bg-amber-50/70 border-amber-300 shadow-md ring-2 ring-amber-500/30'
                : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md'
            }`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Pending Review</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{stats.pending}</h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Awaiting verification</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="animate-pulse" />
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('Approved')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              statusFilter === 'Approved'
                ? 'bg-emerald-50/70 border-emerald-300 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md'
            }`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Approved</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{stats.approved}</h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Ready for issuance</p>
            </div>
            <div className="h-12 w-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('Reverted')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              statusFilter === 'Reverted'
                ? 'bg-rose-50/70 border-rose-300 shadow-md ring-2 ring-rose-500/30'
                : 'bg-white border-slate-100 hover:border-rose-200 hover:shadow-md'
            }`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Reverted</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{stats.reverted}</h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Returned to sales person</p>
            </div>
            <div className="h-12 w-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              statusFilter === 'all'
                ? 'bg-blue-50/70 border-blue-300 shadow-md ring-2 ring-blue-500/30'
                : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
            }`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">All Submissions</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Total policy bundles</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center">
              <Shield size={24} />
            </div>
          </button>
        </div>

        {/* Search & Status Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Lead Name, Phone, Vehicle / Reg No, or Sales Person..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 bg-slate-100 p-1 rounded-xl">
            {(['Pending_Review', 'Approved', 'Reverted', 'all'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'Pending_Review' ? 'Pending Review' : st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm space-y-3">
            <RefreshCw className="animate-spin text-blue-600 mx-auto" size={36} />
            <p className="text-xs font-bold text-slate-500">Loading policy submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm space-y-3">
            <Shield className="text-slate-300 mx-auto" size={48} />
            <h3 className="text-base font-black text-slate-800">No Policy Submissions in this Queue</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When sales executives fill the policy form and submit consolidated document bundles, they will appear here for verification.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(item => {
              const sub = item.submission
              const isPending = sub.status === 'Pending_Review'
              const isApproved = sub.status === 'Approved'
              const isReverted = sub.status === 'Reverted'
              const isCopied = copiedId === item.leadId

              return (
                <div
                  key={item.leadId}
                  className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 shadow-sm hover:shadow-md space-y-4 ${
                    isPending ? 'border-amber-200 bg-amber-50/10' :
                    isApproved ? 'border-emerald-200' :
                    isReverted ? 'border-rose-200' : 'border-slate-100'
                  }`}
                >
                  {/* Top Row: Lead & Sales Executive Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                        isPending ? 'bg-amber-100 text-amber-800' :
                        isApproved ? 'bg-emerald-100 text-emerald-800' :
                        isReverted ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.clientName?.charAt(0) || 'L'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{item.clientName}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isApproved ? 'bg-emerald-500 text-white' :
                            isPending ? 'bg-amber-500 text-white animate-pulse' :
                            isReverted ? 'bg-rose-500 text-white' : 'bg-slate-600 text-white'
                          }`}>
                            {isPending ? 'Pending Review' : sub.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                          <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                            <Car size={12} className="text-slate-400" /> {sub.formData?.regNo || item.vehicleNo || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" /> {sub.formData?.mobileNo1 || item.clientPhone}
                          </span>
                          <span>
                            Sales: <strong className="text-slate-800">{sub.salesPersonName || item.assignee?.fullName || 'Direct'}</strong>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Submitted: {formatDateTime(sub.submittedAt || item.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Toggle View 25 Fields Button */}
                      <button
                        onClick={() => setExpandedLeadId(expandedLeadId === item.leadId ? null : item.leadId)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          expandedLeadId === item.leadId
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Eye size={14} />
                        <span>{expandedLeadId === item.leadId ? 'Hide 25 Fields' : 'View 25 Fields'}</span>
                      </button>

                      {/* Copy 25-Field WhatsApp text button */}
                      <button
                        onClick={() => handleCopySummary(item)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          isCopied ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-black text-white'
                        }`}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{isCopied ? 'Copied 25 Fields!' : 'Copy 25-Field Text'}</span>
                      </button>

                      <a
                        href={`/leads/${item.leadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Open Lead Profile"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Revert notice if currently reverted */}
                  {isReverted && sub.revertReason && (
                    <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-rose-900 font-bold">Revert Reason Given:</strong>
                        <p className="text-rose-700 mt-0.5 font-medium">"{sub.revertReason}"</p>
                        <span className="text-[10px] text-rose-500">Reverted at {formatDateTime(sub.revertedAt)}</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Form Data Highlights */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Policy Type</span>
                      <span className="font-bold text-slate-800 truncate block">{sub.formData?.policyType || 'nil dep'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Net Rate</span>
                      <span className="font-bold text-slate-800 truncate block">{sub.formData?.rate ? `Rs. ${sub.formData.rate}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">From Customer</span>
                      <span className="font-bold text-slate-800 truncate block">{sub.formData?.rsFromCustomer ? `Rs. ${sub.formData.rsFromCustomer}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Payment Mode</span>
                      <span className="font-bold text-slate-800 truncate block capitalize">{sub.formData?.paymentMode || 'cash'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">NCB</span>
                      <span className="font-bold text-slate-800 truncate block">{sub.formData?.ncb || 'with ncb'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Expiry Date</span>
                      <span className="font-bold text-slate-800 truncate block">{sub.formData?.expDate || '—'}</span>
                    </div>
                  </div>

                  {/* EXPANDABLE 25-FIELD FULL DETAILS SECTION */}
                  {expandedLeadId === item.leadId && (
                    <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4 border border-slate-800 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            📋 25 Policy Form Fields (Copyable WhatsApp & System Format)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySummary(item)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copied to Clipboard!' : 'Copy 25 Fields'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Monospace Copyable WhatsApp Box */}
                      <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                        {item.submission.copyableSummary}
                      </pre>

                      {/* 25-Field Grid Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Policy Type:</span> <strong className="text-slate-100">{sub.formData?.policyType || 'nil dep'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Type:</span> <strong className="text-slate-100">{sub.formData?.customerType || 'existing'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Category:</span> <strong className="text-slate-100">{sub.formData?.customerCategory || 'MVC'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Reg / Vehicle No:</span> <strong className="text-emerald-400 font-mono">{sub.formData?.regNo || item.vehicleNo || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Net Rate:</span> <strong className="text-slate-100">{sub.formData?.rate ? `Rs. ${sub.formData.rate}` : 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Rate Confirmation SS:</span> <strong className="text-slate-100">{sub.formData?.rateConfirmationSS || 'YES'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Rs From Customer:</span> <strong className="text-slate-100">{sub.formData?.rsFromCustomer ? `Rs. ${sub.formData.rsFromCustomer}` : 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Description:</span> <strong className="text-slate-100">{sub.formData?.description || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Other Works:</span> <strong className="text-slate-100">{sub.formData?.otherWorks || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Payment Mode:</span> <strong className="text-slate-100 capitalize">{sub.formData?.paymentMode || 'cash'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">NCB:</span> <strong className="text-slate-100">{sub.formData?.ncb || 'with ncb'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Expiry Date:</span> <strong className="text-slate-100">{sub.formData?.expDate || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Mobile No. 1:</span> <strong className="text-slate-100">{sub.formData?.mobileNo1 || item.clientPhone || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Mobile No. 2:</span> <strong className="text-slate-100">{sub.formData?.mobileNo2 || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">NCB Confirmation:</span> <strong className="text-slate-100">{sub.formData?.ncbConfirmation || 'Yes'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Imp Date Msg SS:</span> <strong className="text-slate-100">{sub.formData?.impDateMsgSS || 'Yes'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">HP Details:</span> <strong className="text-slate-100">{sub.formData?.hpDetails || 'as per rc'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Vehicle Photo:</span> <strong className="text-slate-100">{sub.formData?.vehiclePhoto || 'n.a.'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Body Type Matched:</span> <strong className="text-slate-100">{sub.formData?.bodyTypeMatched || 'n.a.'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Google Form Submitted:</span> <strong className="text-slate-100">{sub.formData?.googleFormSubmitted || 'YES'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">No-Jack Cover SS:</span> <strong className="text-slate-100">{sub.formData?.noJackCoverConfirmationSS || 'N.A.'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">IDV Break up:</span> <strong className="text-slate-100">{sub.formData?.idvBreakup || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">New Name:</span> <strong className="text-slate-100">{sub.formData?.newName || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Inspection Status:</span> <strong className="text-slate-100">{sub.formData?.inspectionStatus || 'Not Required'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Mparivahan RC Status:</span> <strong className="text-slate-100">{sub.formData?.mparivahanRcStatus || 'N/A'}</strong></div>
                        <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Amount & Due Date SS:</span> <strong className="text-slate-100">{sub.formData?.amountDueDateMsgSS || 'N/A'}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Attached Documents Strip & Manager Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">
                        {sub.documents?.length || 0} Attached Docs:
                      </span>
                      {(sub.documents || []).map((doc: any) => (
                        <a
                          key={doc.id || doc.category}
                          href={doc.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Eye size={10} />
                          <span className="truncate max-w-[120px]">{doc.categoryLabel || doc.category}</span>
                        </a>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => setSelectedPreviewSubmission(item)}
                        className="px-4 py-2 bg-gradient-to-r from-slate-900 to-blue-900 hover:from-black hover:to-blue-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Eye size={14} className="text-emerald-400" />
                        <span>Preview & Verify Details</span>
                      </button>

                      {sub.compiledPdfUrl && (
                        <a
                          href={sub.compiledPdfUrl}
                          download={`policy_bundle_${item.clientName}_${item.vehicleNo}.pdf`}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer"
                          title="Download Merged PDF"
                        >
                          <Download size={14} />
                        </a>
                      )}

                      {/* Approved Policy Visibility Toggle & Status Badge */}
                      {sub.status === 'Approved' && (
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 cursor-pointer hover:bg-emerald-100/70 transition-all shadow-2xs">
                          <input
                            type="checkbox"
                            checked={sub.visibleToSalesPerson !== false}
                            onChange={e => handleToggleVisibility(item, e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span>Visible to Sales Person</span>
                        </label>
                      )}

                      {/* Approve & Revert Buttons */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => setRevertModalLead(item)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <AlertCircle size={14} /> Revert
                          </button>

                          <button
                            onClick={() => handleOpenApproveModal(item)}
                            disabled={actionLoading}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Approve & Issue
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* COMPREHENSIVE SPLIT-SCREEN VERIFICATION & DETAILS PREVIEW MODAL */}
        {selectedPreviewSubmission && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-150">
              
              {/* Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-400/20">
                    <Shield size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black truncate">{selectedPreviewSubmission.clientName}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        selectedPreviewSubmission.submission.status === 'Approved' ? 'bg-emerald-500 text-white' :
                        selectedPreviewSubmission.submission.status === 'Pending_Review' ? 'bg-amber-500 text-white animate-pulse' :
                        selectedPreviewSubmission.submission.status === 'Reverted' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'
                      }`}>
                        {selectedPreviewSubmission.submission.status === 'Pending_Review' ? 'Pending Review' : selectedPreviewSubmission.submission.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Vehicle: <span className="text-emerald-400 font-mono font-bold">{selectedPreviewSubmission.submission.formData?.regNo || selectedPreviewSubmission.vehicleNo || 'N/A'}</span> • 
                      Sales Executive: <span className="text-slate-200 font-bold">{selectedPreviewSubmission.submission.salesPersonName || selectedPreviewSubmission.assignee?.fullName || 'Direct'}</span> • 
                      Phone: <span className="text-slate-200">{selectedPreviewSubmission.submission.formData?.mobileNo1 || selectedPreviewSubmission.clientPhone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopySummary(selectedPreviewSubmission)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {copiedId === selectedPreviewSubmission.leadId ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === selectedPreviewSubmission.leadId ? 'Copied 25 Fields!' : 'Copy 25-Field Text'}</span>
                  </button>

                  {selectedPreviewSubmission.submission.compiledPdfUrl && (
                    <a
                      href={selectedPreviewSubmission.submission.compiledPdfUrl}
                      download={`policy_${selectedPreviewSubmission.clientName}_${selectedPreviewSubmission.vehicleNo}.pdf`}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Download PDF</span>
                    </a>
                  )}

                  <button
                    onClick={() => setSelectedPreviewSubmission(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Split Body: 25-Field Form Details (Left) & Merged PDF Preview (Right) */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
                
                {/* Left Panel: 25-Field Policy Form Details & Copyable WhatsApp Block */}
                <div className="w-full lg:w-[45%] h-full overflow-y-auto p-4 sm:p-5 space-y-4 bg-white border-r border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <span>📋 25 Policy Form Fields</span>
                    </span>
                    <button
                      onClick={() => handleCopySummary(selectedPreviewSubmission)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} /> 1-Click Copy
                    </button>
                  </div>

                  {/* Monospace Copyable WhatsApp Format */}
                  <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800 max-h-80 overflow-y-auto">
                    {selectedPreviewSubmission.submission.copyableSummary}
                  </div>

                  {/* 25-Field Structured Grid */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field-by-Field Breakdown</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Policy Type</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.policyType || 'nil dep'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Type</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.customerType || 'existing'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Customer Category</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.customerCategory || 'MVC'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Reg No</span><strong className="text-emerald-600 font-mono">{selectedPreviewSubmission.submission.formData?.regNo || selectedPreviewSubmission.vehicleNo || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Net Rate</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.rate ? `Rs. ${selectedPreviewSubmission.submission.formData.rate}` : 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Rate Confirmation SS</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.rateConfirmationSS || 'YES'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Rs From Customer</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.rsFromCustomer ? `Rs. ${selectedPreviewSubmission.submission.formData.rsFromCustomer}` : 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Payment Mode</span><strong className="text-slate-800 capitalize">{selectedPreviewSubmission.submission.formData?.paymentMode || 'cash'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">NCB</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.ncb || 'with ncb'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Exp Date</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.expDate || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Mobile No. 1</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.mobileNo1 || selectedPreviewSubmission.clientPhone}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Mobile No. 2</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.mobileNo2 || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">NCB Confirmation</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.ncbConfirmation || 'Yes'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Imp Date Msg SS</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.impDateMsgSS || 'Yes'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">HP Details</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.hpDetails || 'as per rc'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Vehicle Photo</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.vehiclePhoto || 'n.a.'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Body Type Matched</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.bodyTypeMatched || 'n.a.'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Google Form Submitted</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.googleFormSubmitted || 'YES'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">No-Jack Cover SS</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.noJackCoverConfirmationSS || 'N.A.'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">IDV Break up</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.idvBreakup || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">New Name</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.newName || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Inspection Status</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.inspectionStatus || 'Not Required'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Mparivahan RC Status</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.mparivahanRcStatus || 'N/A'}</strong></div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Amount & Due Date SS</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.amountDueDateMsgSS || 'N/A'}</strong></div>
                      <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Description</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.description || 'N/A'}</strong></div>
                      <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"><span className="text-[9px] uppercase font-bold text-slate-400 block">Other Works</span><strong className="text-slate-800">{selectedPreviewSubmission.submission.formData?.otherWorks || 'N/A'}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Merged Document PDF Viewer */}
                <div className="w-full lg:w-[55%] h-full p-3 sm:p-4 flex flex-col bg-slate-100">
                  <div className="flex items-center justify-between pb-2 text-xs font-bold text-slate-600">
                    <span>📄 Merged Customer Documents ({selectedPreviewSubmission.submission.documents?.length || 0} Files)</span>
                    <span className="text-[11px] text-slate-400">RC, Previous Policy, PAN, Quotation, etc.</span>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-inner overflow-hidden">
                    {selectedPreviewSubmission.submission.compiledPdfUrl ? (
                      <iframe
                        src={selectedPreviewSubmission.submission.compiledPdfUrl}
                        className="w-full h-full"
                        title="Merged Policy PDF Preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2 text-slate-400">
                        <Shield size={36} className="text-slate-300" />
                        <p className="text-xs font-bold">No merged PDF compiled yet</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer Toolbar */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  Reviewing submission for <strong className="text-slate-900">{selectedPreviewSubmission.clientName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const item = selectedPreviewSubmission;
                      setSelectedPreviewSubmission(null);
                      setRevertModalLead(item);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertCircle size={14} /> Revert Submission
                  </button>

                  <button
                    onClick={() => {
                      const item = selectedPreviewSubmission;
                      setSelectedPreviewSubmission(null);
                      handleOpenApproveModal(item);
                    }}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Approve & Issue Policy
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* REVERT MODAL */}
        {revertModalLead && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 border border-slate-100 animate-in zoom-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <AlertCircle size={22} />
                  <h3 className="text-base font-black text-slate-900">Revert Policy Submission</h3>
                </div>
                <button
                  onClick={() => { setRevertModalLead(null); setRevertReason(''); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Returning policy for <strong className="text-slate-900">{revertModalLead.clientName}</strong> ({revertModalLead.vehicleNo || 'Vehicle'}).
                The sales executive ({revertModalLead.submission?.salesPersonName || 'assigned'}) will be notified immediately to collect fresh documents from the lead.
              </p>

              {/* Quick Reason Buttons */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Issue Selection
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'RC photo is blurry / unreadable',
                    'Previous policy copy is expired / missing',
                    'NCB confirmation screenshot missing',
                    'Quotation mismatch / Rate incorrect',
                    'Vehicle body type photo required',
                    'PAN Card copy missing / unverified'
                  ].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setRevertReason(preset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Specific Remarks & Instructions for Sales Person *
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain exactly what needs to be corrected or re-uploaded..."
                  value={revertReason}
                  onChange={e => setRevertReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => { setRevertModalLead(null); setRevertReason(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRevert}
                  disabled={actionLoading || !revertReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Reverting...' : 'Confirm & Send Revert Alert'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE & ISSUE POLICY MODAL */}
        {approveModalLead && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 border border-slate-100 animate-in zoom-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-600">
                  <CheckCircle2 size={24} />
                  <h3 className="text-base font-black text-slate-900">Approve & Issue to Policy Module</h3>
                </div>
                <button
                  onClick={() => setApproveModalLead(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 text-slate-600">
                <p><strong>Customer:</strong> {approveModalLead.clientName}</p>
                <p><strong>Vehicle / Reg No:</strong> <span className="font-mono text-slate-900 font-bold">{approveModalLead.submission.formData?.regNo || approveModalLead.vehicleNo || 'N/A'}</span></p>
                <p><strong>Sales Executive:</strong> {approveModalLead.submission.salesPersonName || approveModalLead.assignee?.fullName || 'Direct'}</p>
                <p><strong>Policy Type:</strong> {approveModalLead.submission.formData?.policyType || 'Motor'}</p>
              </div>

              {/* SALES VISIBILITY CHECKBOX */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleToSalesPerson}
                    onChange={e => setVisibleToSalesPerson(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Allow assigned sales person to see approved policy in their Policy Module
                    </span>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                      (Checked by default. If unchecked, only Managers & Admins can view this policy in the Policy Module).
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setApproveModalLead(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval & Issue'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
