"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  Shield, CheckCircle2, AlertCircle, Clock, Search, Eye, Download,
  Copy, Check, RefreshCw, X, MessageSquare, Send, ArrowRight,
  FileSpreadsheet, User, Phone, Car, Filter, Calendar, ExternalLink,
  Upload, FileText, Sparkles, DollarSign, CreditCard
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
    status: 'Draft' | 'Pending_Review' | 'Documents_Approved' | 'Policy_Issued' | 'Reverted'
    formData: any
    documents: any[]
    compiledPdfUrl?: string
    issuedPolicyPdfUrl?: string
    revertReason?: string
    revertedAt?: string
    submittedAt?: string
    reviewedAt?: string
    reviewedByName?: string
    documentsApprovedAt?: string
    issuedAt?: string
    salesPersonName?: string
    visibleToSalesPerson?: boolean
    policyId?: string
    policyNumber?: string
    history?: any[]
    copyableSummary: string
    [key: string]: any
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
  const [stats, setStats] = useState({ total: 0, pending: 0, docsApproved: 0, policyIssued: 0, reverted: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending_Review' | 'Documents_Approved' | 'Policy_Issued' | 'Reverted'>(
    initialSearch ? 'all' : 'Pending_Review'
  )
  const [search, setSearch] = useState(initialSearch)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)

  // Document Approval Modal State
  const [approveModalLead, setApproveModalLead] = useState<PolicySubmissionItem | null>(null)
  const [visibleToSalesPerson, setVisibleToSalesPerson] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Revert Modal State
  const [revertModalLead, setRevertModalLead] = useState<PolicySubmissionItem | null>(null)
  const [revertReason, setRevertReason] = useState('')

  // Upload Issued Policy Modal State
  const [uploadPolicyModalLead, setUploadPolicyModalLead] = useState<PolicySubmissionItem | null>(null)
  const [policyForm, setPolicyForm] = useState({
    policyNumber: '',
    provider: 'Torque Insurance',
    policyType: 'Nil Dep',
    totalPremium: '',
    paidAmount: '',
    pendingAmount: '',
    paymentMode: 'UPI',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
  })
  const [policyFile, setPolicyFile] = useState<File | null>(null)
  const [isUploadingPolicy, setIsUploadingPolicy] = useState(false)
  const policyFileInputRef = useRef<HTMLInputElement | null>(null)

  // Preview Modal State
  const [selectedPreviewSubmission, setSelectedPreviewSubmission] = useState<PolicySubmissionItem | null>(null)

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

  // 1. Approve Documents (Only)
  const handleOpenApproveModal = (item: PolicySubmissionItem) => {
    setApproveModalLead(item)
    setVisibleToSalesPerson(item.submission.visibleToSalesPerson !== false)
  }

  const handleConfirmApproveDocuments = async () => {
    if (!approveModalLead) return
    setActionLoading(true)
    try {
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: approveModalLead.leadId,
          action: 'APPROVE_DOCS',
          visibleToSalesPerson
        })
      })
      alert('Documents approved successfully! You can now download the merged 7-doc bundle and upload the issued policy PDF once received from the insurer.')
      setApproveModalLead(null)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to approve documents')
    } finally {
      setActionLoading(false)
    }
  }

  // 2. Open Upload Issued Policy Modal
  const handleOpenUploadPolicyModal = (item: PolicySubmissionItem) => {
    setUploadPolicyModalLead(item)
    const formData = item.submission.formData || {}
    const rawPrem = formData.rsFromCustomer || formData.rate || ''
    const rawPaid = formData.paidAmount || rawPrem

    setPolicyForm({
      policyNumber: formData.policyNumber || `POL-${(formData.regNo || item.vehicleNo || 'NA').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      provider: formData.provider || formData.policyType || 'ICICI Lombard',
      policyType: formData.policyType || 'Nil Dep',
      totalPremium: rawPrem ? String(rawPrem) : '',
      paidAmount: rawPaid ? String(rawPaid) : '',
      pendingAmount: rawPrem && rawPaid ? String(Math.max(0, parseFloat(rawPrem) - parseFloat(rawPaid))) : '0',
      paymentMode: formData.paymentMode || 'UPI',
      startDate: new Date().toISOString().split('T')[0],
      endDate: formData.expDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
    })
    setPolicyFile(null)
  }

  // Submit Upload Issued Policy
  const handleSubmitIssuedPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadPolicyModalLead) return

    if (!policyFile && !uploadPolicyModalLead.submission.issuedPolicyPdfUrl) {
      alert('Please select and upload the Issued Policy PDF file.')
      return
    }

    setIsUploadingPolicy(true)
    try {
      let uploadedPdfUrl = uploadPolicyModalLead.submission.issuedPolicyPdfUrl || ''

      // 1. Upload Policy PDF file if provided
      if (policyFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', policyFile)

        const uploadRes = await fetch(`/api/v1/leads/${uploadPolicyModalLead.leadId}/policy-submission/upload-issued-policy`, {
          method: 'POST',
          body: uploadFormData
        })

        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload policy PDF')
        }
        uploadedPdfUrl = uploadData.url
      }

      // 2. Submit to manager submissions API
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: uploadPolicyModalLead.leadId,
          action: 'UPLOAD_POLICY',
          policyNumber: policyForm.policyNumber,
          provider: policyForm.provider,
          policyType: policyForm.policyType,
          issuedPolicyPdfUrl: uploadedPdfUrl,
          totalPremium: parseFloat(policyForm.totalPremium) || 0,
          paidAmount: parseFloat(policyForm.paidAmount) || 0,
          pendingAmount: parseFloat(policyForm.pendingAmount) || 0,
          paymentMode: policyForm.paymentMode,
          startDate: policyForm.startDate,
          endDate: policyForm.endDate
        })
      })

      alert('Policy successfully issued and live! Scraped to the monthly master sheet and 1-year renewal pipeline.')
      setUploadPolicyModalLead(null)
      setPolicyFile(null)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to upload and issue policy')
    } finally {
      setIsUploadingPolicy(false)
    }
  }

  // 3. Revert Action
  const handleConfirmRevert = async () => {
    if (!revertModalLead) return
    if (!revertReason.trim()) {
      alert('Please specify why the documents are being reverted.')
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
      alert('Policy submission reverted to sales executive.')
      setRevertModalLead(null)
      setRevertReason('')
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to revert submission')
    } finally {
      setActionLoading(false)
    }
  }

  // Master Sheet Export Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState<'month' | 'range' | 'single' | 'all'>('month')
  const [exportMonth, setExportMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [exportStartDate, setExportStartDate] = useState<string>('')
  const [exportEndDate, setExportEndDate] = useState<string>('')
  const [exportSingleDate, setExportSingleDate] = useState<string>('')
  const [isExportingSheet, setIsExportingSheet] = useState(false)

  // Download Master Sheet with flexible parameters
  const handleExecuteExportSheet = async () => {
    setIsExportingSheet(true)
    try {
      const params = new URLSearchParams()
      if (exportMode === 'month') {
        params.append('month', exportMonth || new Date().toISOString().slice(0, 7))
      } else if (exportMode === 'range') {
        if (exportStartDate) params.append('startDate', exportStartDate)
        if (exportEndDate) params.append('endDate', exportEndDate)
      } else if (exportMode === 'single') {
        if (exportSingleDate) params.append('date', exportSingleDate)
      } else if (exportMode === 'all') {
        params.append('month', 'all')
      }

      const res = await fetchApi(`/api/v1/manager/monthly-sheet?${params.toString()}`)
      if (res?.sheetUrl) {
        window.open(res.sheetUrl, '_blank')
        setShowExportModal(false)
      } else {
        alert('No policy records found for the selected time range.')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate master sheet.')
    } finally {
      setIsExportingSheet(false)
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
            Policy Approvals and Document Bundle Verifications are restricted to Managers and Admins.
          </p>
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
                Automated Monthly Master Scraper
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Document Approvals & Policy Issuance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Review verified 7-doc bundles, approve documents for company issuance, and upload final policy PDFs to trigger finance & renewal archives.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              title="Download consolidated Excel sheet with all policy records and document links for any selected date, time range, or month"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Download Master Sheet</span>
            </button>

            <button
              onClick={fetchSubmissions}
              disabled={loading}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh submissions"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Stats Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            onClick={() => setStatusFilter('Pending_Review')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'Pending_Review'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'Pending_Review' ? 'text-amber-100' : 'text-slate-400'}`}>
                1. Review Docs
              </span>
              <Clock size={16} className={statusFilter === 'Pending_Review' ? 'text-white' : 'text-amber-500'} />
            </div>
            <p className="text-2xl font-black mt-1">{stats.pending}</p>
            <p className={`text-[10px] font-bold ${statusFilter === 'Pending_Review' ? 'text-amber-100' : 'text-slate-400'}`}>
              Pending Document Review
            </p>
          </button>

          <button
            onClick={() => setStatusFilter('Documents_Approved')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'Documents_Approved'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'Documents_Approved' ? 'text-blue-100' : 'text-slate-400'}`}>
                2. Upload Policy
              </span>
              <Upload size={16} className={statusFilter === 'Documents_Approved' ? 'text-white' : 'text-blue-500'} />
            </div>
            <p className="text-2xl font-black mt-1">{stats.docsApproved}</p>
            <p className={`text-[10px] font-bold ${statusFilter === 'Documents_Approved' ? 'text-blue-100' : 'text-slate-400'}`}>
              Docs Approved (Awaiting Policy PDF)
            </p>
          </button>

          <button
            onClick={() => setStatusFilter('Policy_Issued')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'Policy_Issued'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'Policy_Issued' ? 'text-emerald-100' : 'text-slate-400'}`}>
                3. Issued & Live
              </span>
              <CheckCircle2 size={16} className={statusFilter === 'Policy_Issued' ? 'text-white' : 'text-emerald-500'} />
            </div>
            <p className="text-2xl font-black mt-1">{stats.policyIssued}</p>
            <p className={`text-[10px] font-bold ${statusFilter === 'Policy_Issued' ? 'text-emerald-100' : 'text-slate-400'}`}>
              Policies Issued & Archived
            </p>
          </button>

          <button
            onClick={() => setStatusFilter('Reverted')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'Reverted'
                ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20'
                : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'Reverted' ? 'text-rose-100' : 'text-slate-400'}`}>
                Reverted
              </span>
              <AlertCircle size={16} className={statusFilter === 'Reverted' ? 'text-white' : 'text-rose-500'} />
            </div>
            <p className="text-2xl font-black mt-1">{stats.reverted}</p>
            <p className={`text-[10px] font-bold ${statusFilter === 'Reverted' ? 'text-rose-100' : 'text-slate-400'}`}>
              Changes Requested
            </p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by client name, vehicle plate, phone, or sales person..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Show All ({stats.total})
            </button>
          )}
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 font-medium shadow-sm">
              <RefreshCw size={20} className="animate-spin text-blue-600 mx-auto mb-2" />
              <span>Loading policy approval records...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 italic shadow-sm">
              No submissions found for the selected filter.
            </div>
          ) : (
            submissions.map(item => {
              const sub = item.submission
              const isPending = sub.status === 'Pending_Review'
              const isDocsApproved = sub.status === 'Documents_Approved' || (sub.status as any) === 'Approved'
              const isPolicyIssued = sub.status === 'Policy_Issued'
              const isReverted = sub.status === 'Reverted'
              const isExpanded = expandedLeadId === item.leadId

              return (
                <div
                  key={item.leadId}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-sm ${
                    isPending
                      ? 'border-amber-200/80 bg-amber-50/10'
                      : isDocsApproved
                      ? 'border-blue-200/80 bg-blue-50/10'
                      : isPolicyIssued
                      ? 'border-emerald-200/80 bg-emerald-50/10'
                      : 'border-slate-200/70'
                  }`}
                >
                  {/* Card Main Row */}
                  <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Client & Vehicle details */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : isDocsApproved
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : isPolicyIssued
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isPending
                            ? '1. Review Documents'
                            : isDocsApproved
                            ? '2. Docs Approved (Upload Policy)'
                            : isPolicyIssued
                            ? '3. Policy Issued & Live'
                            : 'Reverted'}
                        </span>

                        {item.vehicleNo && (
                          <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            {item.vehicleNo}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-bold">
                          Updated: {formatDateTime(item.updatedAt)}
                        </span>
                      </div>

                      <div onClick={() => setExpandedLeadId(isExpanded ? null : item.leadId)} className="cursor-pointer select-none">
                        <h3 className="text-lg font-black text-slate-900 hover:text-blue-600 transition-colors">{item.clientName}</h3>
                        <p className="text-xs font-mono font-bold text-slate-500">{item.clientPhone}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>Executive: <strong className="text-slate-900">{item.assignee?.fullName || 'Unassigned'}</strong></span>
                        </div>
                        {sub.documents && (() => {
                          const uniqueCats = new Set((sub.documents || []).map((d: any) => d.category))
                          return (
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <FileText size={13} />
                              <span>{uniqueCats.size} / 7 Documents Uploaded</span>
                            </div>
                          )
                        })()}
                        {sub.formData?.rsFromCustomer && (
                          <div className="flex items-center gap-1.5 text-slate-900">
                            <DollarSign size={13} className="text-emerald-600" />
                            <span>Premium: <strong>₹{Number(sub.formData.rsFromCustomer).toLocaleString()}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Copy WhatsApp Summary */}
                      <button
                        onClick={() => handleCopySummary(item)}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Copy structured form data for WhatsApp"
                      >
                        {copiedId === item.leadId ? (
                          <>
                            <Check size={14} className="text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Form Data</span>
                          </>
                        )}
                      </button>

                      {/* Download/Preview 7-Doc Merged PDF */}
                      {sub.compiledPdfUrl && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={sub.compiledPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Preview merged 7-document customer PDF"
                          >
                            <Eye size={14} />
                            <span>Preview PDF</span>
                          </a>
                          <a
                            href={sub.compiledPdfUrl}
                            download={`docs_bundle_${item.clientName}_${item.vehicleNo}.pdf`}
                            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 shadow-sm cursor-pointer"
                            title="Download merged 7-document customer PDF"
                          >
                            <Download size={14} />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      )}

                      {/* Download Issued Policy PDF if already uploaded */}
                      {sub.issuedPolicyPdfUrl && (
                        <a
                          href={sub.issuedPolicyPdfUrl}
                          download={`issued_policy_${item.clientName}_${item.vehicleNo}.pdf`}
                          className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200 shadow-sm"
                          title="Download final issued policy copy"
                        >
                          <Download size={14} />
                          <span>Policy PDF</span>
                        </a>
                      )}

                      {/* Step 1 Action: Approve Documents (Only) */}
                      {isPending && (
                        <button
                          onClick={() => handleOpenApproveModal(item)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={15} />
                          <span>Approve Docs</span>
                        </button>
                      )}

                      {/* Step 2 Action: Upload Issued Policy PDF (Creates Policy) */}
                      {(isDocsApproved || isPolicyIssued) && (
                        <button
                          onClick={() => handleOpenUploadPolicyModal(item)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                            isDocsApproved
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 animate-pulse'
                              : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
                          }`}
                          title="Upload issued policy PDF received from insurer"
                        >
                          <Upload size={14} />
                          <span>{isPolicyIssued ? 'Update Policy PDF' : 'Upload Issued Policy'}</span>
                        </button>
                      )}

                      {/* Revert Button */}
                      {(isPending || isDocsApproved) && (
                        <button
                          onClick={() => { setRevertModalLead(item); setRevertReason(''); }}
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200 cursor-pointer"
                          title="Request changes from sales executive"
                        >
                          Revert
                        </button>
                      )}

                      {/* Toggle Expand View */}
                      <button
                        onClick={() => setExpandedLeadId(isExpanded ? null : item.leadId)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-all"
                        title="Toggle full details"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Document & Form Details */}
                  {isExpanded && (
                    <div className="p-6 bg-slate-50/80 border-t border-slate-100 space-y-6">
                      {/* Documents Grid */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                          Uploaded Document Files ({sub.documents?.length || 0})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {sub.documents?.map((doc: any, idx: number) => (
                            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">
                                  {doc.category || 'Document'}
                                </span>
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 truncate">{doc.fileName}</p>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                  <Eye size={11} />
                                  <span>Inspect File</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Structured WhatsApp summary preview */}
                      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                        {sub.copyableSummary}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* MODAL 1: APPROVE DOCUMENTS */}
      {approveModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>

            <h3 className="text-lg font-black text-center text-slate-900">
              Approve Documents for {approveModalLead.clientName}?
            </h3>
            <p className="text-xs text-center text-slate-500 mt-2">
              Vehicle: <span className="font-mono font-bold text-slate-800">{approveModalLead.vehicleNo}</span>. This approves all 7 verified documents. You can download the bundle and share it with the insurer.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToSalesPerson}
                  onChange={e => setVisibleToSalesPerson(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  Allow Sales Executive ({approveModalLead.assignee?.fullName || 'Sales'}) to view approved status
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApproveModalLead(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmApproveDocuments}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Approve Documents</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD ISSUED POLICY PDF */}
      {uploadPolicyModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">Upload Issued Policy PDF</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {uploadPolicyModalLead.clientName} • <span className="font-mono font-bold text-slate-800">{uploadPolicyModalLead.vehicleNo}</span>
                </p>
              </div>
              <button onClick={() => setUploadPolicyModalLead(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitIssuedPolicy} className="space-y-4">
              {/* File Uploader */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Issued Policy PDF Copy *
                </label>
                <div
                  onClick={() => policyFileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 p-4 rounded-2xl text-center cursor-pointer transition-colors"
                >
                  <input
                    type="file"
                    ref={policyFileInputRef}
                    accept="application/pdf"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setPolicyFile(e.target.files[0])
                      }
                    }}
                    className="hidden"
                  />
                  <Upload size={24} className="mx-auto text-blue-600 mb-1" />
                  <p className="text-xs font-bold text-slate-800">
                    {policyFile ? policyFile.name : (uploadPolicyModalLead.submission.issuedPolicyPdfUrl ? 'Replace current Policy PDF' : 'Click to select Policy PDF file')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supported format: PDF up to 25MB</p>
                </div>
              </div>

              {/* Policy Number & Provider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Policy Number *</label>
                  <input
                    type="text"
                    required
                    value={policyForm.policyNumber}
                    onChange={e => setPolicyForm({ ...policyForm, policyNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    required
                    value={policyForm.provider}
                    onChange={e => setPolicyForm({ ...policyForm, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Premium, Paid, Pending */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Total Premium (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={policyForm.totalPremium}
                    onChange={e => {
                      const tot = parseFloat(e.target.value) || 0
                      const paid = parseFloat(policyForm.paidAmount) || 0
                      setPolicyForm({
                        ...policyForm,
                        totalPremium: e.target.value,
                        pendingAmount: String(Math.max(0, tot - paid))
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={policyForm.paidAmount}
                    onChange={e => {
                      const paid = parseFloat(e.target.value) || 0
                      const tot = parseFloat(policyForm.totalPremium) || 0
                      setPolicyForm({
                        ...policyForm,
                        paidAmount: e.target.value,
                        pendingAmount: String(Math.max(0, tot - paid))
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-rose-600 uppercase mb-1">Pending Due (₹)</label>
                  <input
                    type="number"
                    step="any"
                    readOnly
                    value={policyForm.pendingAmount}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-rose-700 outline-none"
                  />
                </div>
              </div>

              {/* Start Date & 1-Year Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Policy Issue Date</label>
                  <input
                    type="date"
                    required
                    value={policyForm.startDate}
                    onChange={e => {
                      const start = new Date(e.target.value)
                      const end = new Date(start.getTime() + 365 * 24 * 3600 * 1000)
                      setPolicyForm({
                        ...policyForm,
                        startDate: e.target.value,
                        endDate: end.toISOString().split('T')[0]
                      })
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-600 uppercase mb-1">1-Year Expiry (Renewal)</label>
                  <input
                    type="date"
                    required
                    value={policyForm.endDate}
                    onChange={e => setPolicyForm({ ...policyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  disabled={isUploadingPolicy}
                  onClick={() => setUploadPolicyModalLead(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPolicy}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPolicy ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving & Scraping...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm & Issue Policy</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVERT */}
      {revertModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Revert Submission</h3>
              <button onClick={() => setRevertModalLead(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Return documents for <strong className="text-slate-900">{revertModalLead.clientName}</strong> ({revertModalLead.vehicleNo}) to the sales executive for corrections.
              </p>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Reason for Reversion *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. RC book photo is blurred, please re-upload clear image..."
                  value={revertReason}
                  onChange={e => setRevertReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRevertModalLead(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmRevert}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {actionLoading ? 'Reverting...' : 'Confirm Revert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DOWNLOAD MASTER POLICY SHEET (DATE, TIME & MONTH PICKER) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Export Master Policy Sheet</h3>
                  <p className="text-xs text-slate-500">Download Excel archive with all policy metadata & direct document links</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setExportMode('month')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  exportMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                By Month
              </button>
              <button
                type="button"
                onClick={() => setExportMode('range')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  exportMode === 'range' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Date & Time
              </button>
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  exportMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setExportMode('all')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  exportMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Mode 1: By Month */}
            {exportMode === 'month' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Target Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={exportMonth}
                    onChange={e => setExportMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExportMonth(new Date().toISOString().slice(0, 7))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all"
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setMonth(d.getMonth() - 1)
                      setExportMonth(d.toISOString().slice(0, 7))
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all"
                  >
                    Previous Month
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Custom Date & Time Range */}
            {exportMode === 'range' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  Specify start and end dates with exact time stamps for precise filtering:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      From Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      To Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: Single Specific Date */}
            {exportMode === 'single' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  Download all policies issued on a single specific day (00:00 to 23:59):
                </p>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Select Specific Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={exportSingleDate}
                    onChange={e => setExportSingleDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Mode 4: All Time */}
            {exportMode === 'all' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <Shield size={24} className="mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">Complete Historical Archive</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Downloads all active policy records created in the system since launch.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                disabled={isExportingSheet}
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExportingSheet}
                onClick={handleExecuteExportSheet}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isExportingSheet ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download Excel Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
