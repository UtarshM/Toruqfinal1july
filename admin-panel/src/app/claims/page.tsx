"use client"
import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  FileText, Clock, CheckCircle2, AlertCircle, Search, Plus, X, Upload,
  Download, Eye, Trash2, Car, Shield, Phone, Mail, MapPin, Building2,
  Calendar, DollarSign, Music, Film, Check, ExternalLink, RefreshCw, Filter
} from 'lucide-react'

const VEHICLE_CATEGORIES = [
  'HGV',
  'LCV',
  'LPV',
  'LMV',
  '3W PCV',
  '3W GCV',
  '2W',
  'OTHER'
]

const COVERAGE_TYPES = ['OD', 'TP']

const INSURANCE_COMPANIES = [
  'HDFC ERGO',
  'ICICI Lombard',
  'Tata AIG',
  'Bajaj Allianz',
  'Reliance General',
  'Go Digit',
  'National Insurance',
  'New India Assurance',
  'Oriental Insurance',
  'United India Insurance',
  'Kotak General',
  'Cholamandalam MS',
  'SBI General',
  'Royal Sundaram',
  'Other'
]

const INITIAL_FORM = {
  email: '',
  vehicleRegNumber: '',
  vehicleCategory: '',
  insuranceCompany: '',
  policyPdfUrl: '',
  contactPersonName: '',
  contactPersonMobile: '',
  accidentDate: '',
  accidentTime: '',
  accidentLocation: '',
  claimCoverageType: '',
  claimNumber: '',
  claimInformDocUrl: '',
  claimIntimationDocUrl: '',
  spotPhotosVideosUrl: '',
  kycDocsUrl: '',
  policyCheckFormUrl: '',
  surveyorName: '',
  surveyorMobile: '',
  garageNameAddress: '',
  garageContactName: '',
  garageContactMobile: '',
  estimatedLoss: '',
  estimatedTimeDays: '',
  status: 'filed'
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [coverageFilter, setCoverageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<any>(null)
  const [formData, setFormData] = useState<typeof INITIAL_FORM>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  // Current logged in user info for Google-form style email record
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    fetchData()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = () => {
    try {
      const stored = localStorage.getItem('torque_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.email) {
          setUserEmail(u.email)
          setFormData(prev => ({ ...prev, email: prev.email || u.email }))
        }
      }
    } catch {}
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('vehicleCategory', categoryFilter)
      if (coverageFilter !== 'all') params.append('claimCoverageType', coverageFilter)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetchApi(`/api/v1/claims?${params.toString()}`)
      setClaims(Array.isArray(res) ? res : [])
    } catch (error) {
      console.error('Failed to fetch claims:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, categoryFilter, coverageFilter, statusFilter])

  const handleFileUpload = async (field: string, file: File, maxMb: number) => {
    if (file.size > maxMb * 1024 * 1024) {
      alert(`File size exceeds maximum allowed ${maxMb} MB. Please upload a smaller file.`)
      return
    }

    setUploadingField(field)
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('folder', 'claims')

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: data
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to upload file')
      }

      const json = await res.json()
      setFormData(prev => ({ ...prev, [field]: json.url }))
    } catch (err: any) {
      alert(err.message || 'File upload failed')
    } finally {
      setUploadingField(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation for dropdowns & required fields
    if (!formData.vehicleCategory) {
      setFormError('Please select a Vehicle Category.')
      return
    }
    if (!formData.claimCoverageType) {
      setFormError('Please select OD Claim or TP Claim.')
      return
    }

    setSubmitting(true)
    try {
      await fetchApi('/api/v1/claims', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setIsModalOpen(false)
      setFormData({ ...INITIAL_FORM, email: userEmail })
      fetchData()
      alert('Claim submitted successfully!')
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (claimId: string, newStatus: string) => {
    try {
      await fetchApi('/api/v1/claims', {
        method: 'PATCH',
        body: JSON.stringify({ id: claimId, status: newStatus })
      })
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c))
    } catch (err: any) {
      alert(err.message || 'Failed to update status')
    }
  }

  const handleDelete = async (claimId: string) => {
    if (!confirm('Are you sure you want to delete this claim record?')) return
    try {
      await fetchApi(`/api/v1/claims?id=${claimId}`, { method: 'DELETE' })
      setClaims(prev => prev.filter(c => c.id !== claimId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete claim')
    }
  }

  const exportToCSV = () => {
    if (claims.length === 0) {
      alert('No claim records to export.')
      return
    }

    const headers = [
      'Claim ID',
      'Vehicle Reg Number',
      'Vehicle Category',
      'Insurance Company',
      'Contact Person',
      'Contact Mobile',
      'Email',
      'Accident Date',
      'Accident Time',
      'Accident Location',
      'Coverage (OD/TP)',
      'Claim Number',
      'Surveyor Name',
      'Surveyor Mobile',
      'Garage Name & Address',
      'Garage Contact Name',
      'Garage Contact Mobile',
      'Estimated Loss (₹)',
      'Estimated Days',
      'Status',
      'Filed Date'
    ]

    const rows = claims.map(c => [
      c.id,
      `"${c.vehicleNumber || ''}"`,
      `"${c.vehicleCategory || ''}"`,
      `"${c.insuranceCompany || ''}"`,
      `"${c.contactPersonName || c.customerName || ''}"`,
      `"${c.contactPersonMobile || ''}"`,
      `"${c.email || ''}"`,
      c.accidentDate ? new Date(c.accidentDate).toLocaleDateString('en-IN') : '',
      `"${c.accidentTime || ''}"`,
      `"${(c.accidentLocation || '').replace(/"/g, '""')}"`,
      c.claimCoverageType || c.claimType || '',
      `"${c.claimNumber || ''}"`,
      `"${c.surveyorName || ''}"`,
      `"${c.surveyorMobile || ''}"`,
      `"${(c.garageNameAddress || '').replace(/"/g, '""')}"`,
      `"${c.garageContactName || ''}"`,
      `"${c.garageContactMobile || ''}"`,
      c.estimatedLoss || c.claimAmount || 0,
      c.estimatedTimeDays || '',
      c.status || '',
      c.filedDate ? new Date(c.filedDate).toLocaleDateString('en-IN') : ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `torque_claims_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stats = {
    total: claims.length,
    pending: claims.filter(c => ['filed', 'pending', 'under_review'].includes(c.status)).length,
    approved: claims.filter(c => ['approved', 'surveyor_assigned'].includes(c.status)).length,
    settled: claims.filter(c => c.status === 'settled').length,
    rejected: claims.filter(c => c.status === 'rejected').length
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
              Torque Motor Claims
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track, intimate, survey, and settle customer vehicle accident & insurance claims.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm transition-all"
          >
            <Download size={15} />
            Export CSV
          </button>

          <button
            onClick={() => {
              setFormData({ ...INITIAL_FORM, email: userEmail })
              setFormError('')
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            NEW CLAIM FORM
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
        <StatCard label="Total Claims" count={stats.total} icon={FileText} color="blue" />
        <StatCard label="In Review / Pending" count={stats.pending} icon={Clock} color="amber" />
        <StatCard label="Approved / Active" count={stats.approved} icon={CheckCircle2} color="emerald" />
        <StatCard label="Settled & Paid" count={stats.settled} icon={DollarSign} color="indigo" />
        <StatCard label="Rejected" count={stats.rejected} icon={AlertCircle} color="rose" />
      </div>

      {/* Filter Toolbar */}
      <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search vehicle, claim no, customer, garage..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Vehicle Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={14} />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {VEHICLE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* OD / TP Filter */}
          <select
            value={coverageFilter}
            onChange={e => setCoverageFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Coverage</option>
            <option value="OD">OD (Own Damage)</option>
            <option value="TP">TP (Third Party)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="filed">Filed</option>
            <option value="under_review">Under Review</option>
            <option value="surveyor_assigned">Surveyor Assigned</option>
            <option value="approved">Approved</option>
            <option value="settled">Settled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Claims Data Table */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3.5">Claim ID / No.</th>
                <th className="px-4 py-3.5">Vehicle Details</th>
                <th className="px-4 py-3.5">Customer Contact</th>
                <th className="px-4 py-3.5">Coverage</th>
                <th className="px-4 py-3.5">Insurer & Garage</th>
                <th className="px-4 py-3.5">Estimated Loss</th>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Docs</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <span>Loading claims data...</span>
                    </div>
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-gray-300" />
                      <p className="font-semibold text-gray-600">No claims found</p>
                      <p className="text-xs text-gray-400">Click &quot;NEW CLAIM FORM&quot; above to register your first motor claim.</p>
                    </div>
                  </td>
                </tr>
              ) : claims.map((c) => {
                const docCount = [
                  c.policyPdfUrl,
                  c.claimInformDocUrl,
                  c.claimIntimationDocUrl,
                  c.spotPhotosVideosUrl,
                  c.kycDocsUrl,
                  c.policyCheckFormUrl
                ].filter(Boolean).length

                return (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">
                        {c.claimNumber || `#${c.id.slice(0, 8).toUpperCase()}`}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {c.filedDate ? new Date(c.filedDate).toLocaleDateString('en-IN') : 'Recently'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-blue-700 tracking-wide font-mono">
                        {c.vehicleNumber || '—'}
                      </div>
                      {c.vehicleCategory && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mt-0.5">
                          {c.vehicleCategory}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900">
                        {c.contactPersonName || c.customerName || '—'}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Phone size={11} className="text-gray-400" />
                        {c.contactPersonMobile || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        (c.claimCoverageType || c.claimType) === 'OD'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}>
                        {c.claimCoverageType || c.claimType || 'OD'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-800 truncate max-w-[140px]" title={c.insuranceCompany || ''}>
                        {c.insuranceCompany || '—'}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[140px]" title={c.garageNameAddress || ''}>
                        {c.garageNameAddress || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      ₹{parseFloat(c.estimatedLoss || c.claimAmount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3.5 text-gray-600 font-medium">
                      {c.estimatedTimeDays ? `${c.estimatedTimeDays} Days` : '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={c.status}
                        onChange={e => handleStatusChange(c.id, e.target.value)}
                        className={`text-[11px] font-bold uppercase rounded-lg px-2 py-1 outline-none border cursor-pointer ${
                          c.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          c.status === 'settled' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          c.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          c.status === 'surveyor_assigned' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="filed">Filed</option>
                        <option value="under_review">Under Review</option>
                        <option value="surveyor_assigned">Surveyor Assigned</option>
                        <option value="approved">Approved</option>
                        <option value="settled">Settled</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        docCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {docCount} files
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedClaim(c)
                            setIsViewModalOpen(true)
                          }}
                          title="View all 24 claim details"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Delete Claim"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NEW CLAIM FORM MODAL (24 Fields matching Google Form Spec & Screenshots)  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            {/* Form Top Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
              >
                <X size={20} />
              </button>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold tracking-wider uppercase mb-1">
                Google Form Format Integration
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">NEW CLAIM FORM</h2>
              <p className="text-xs text-blue-100 mt-1">
                The name, email address and documents associated with your Torque account will be recorded when you submit this form.
              </p>
              <div className="mt-3 text-xs text-rose-200 font-medium">
                * Indicates required question
              </div>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 1. Respondent Email Banner */}
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Record <span className="font-semibold text-blue-700">{formData.email || userEmail || 'um18218@gmail.com'}</span> as the email to be included with my response
                </p>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="um18218@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 2. Vehicle & Policy Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Car size={16} className="text-blue-600" />
                  Vehicle & Policy Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* VEHICLE REG NUMBER */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      VEHICLE REG NUMBER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.vehicleRegNumber}
                      onChange={e => setFormData({ ...formData, vehicleRegNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. GJ01WC7944"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-wider outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>

                  {/* VEHICLE CATEGORY (Exact dropdown from screenshot 1) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      VEHICLE CATEGORY <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicleCategory}
                      onChange={e => setFormData({ ...formData, vehicleCategory: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose</option>
                      {VEHICLE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">This is a required question</p>
                  </div>

                  {/* INSURANCE COMPANY */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      INSURANCE COMPANY <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.insuranceCompany}
                      onChange={e => setFormData({ ...formData, insuranceCompany: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose insurance company...</option>
                      {INSURANCE_COMPANIES.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  {/* POLICY PDF (Upload 1 supported file. Max 10 MB.) */}
                  <div>
                    <FileUploadField
                      label="POLICY PDF"
                      required
                      fileUrl={formData.policyPdfUrl}
                      uploading={uploadingField === 'policyPdfUrl'}
                      maxMb={10}
                      helpText="Upload 1 supported file. Max 10 MB."
                      onUpload={file => handleFileUpload('policyPdfUrl', file, 10)}
                      onRemove={() => setFormData({ ...formData, policyPdfUrl: '' })}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Customer Side Contact Person */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Phone size={16} className="text-indigo-600" />
                  Customer Side Contact
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      CUSTOMER SIDE CONTACT PERSON NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.contactPersonName}
                      onChange={e => setFormData({ ...formData, contactPersonName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      CUSTOMER SIDE CONTACT PERSON MOBILE NUMBER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.contactPersonMobile}
                      onChange={e => setFormData({ ...formData, contactPersonMobile: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Incident & Claim Intimation */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-amber-600" />
                  Accident & Claim Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ACCIDENT DATE */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ACCIDENT DATE <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.accidentDate}
                      onChange={e => setFormData({ ...formData, accidentDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* ACCIDENT TIME */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ACCIDENT TIME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="time"
                      value={formData.accidentTime}
                      onChange={e => setFormData({ ...formData, accidentTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* OD CLAIM OR TP CLAIM (Exact dropdown from screenshot 2) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      OD CLAIM OR TP CLAIM <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.claimCoverageType}
                      onChange={e => setFormData({ ...formData, claimCoverageType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose</option>
                      {COVERAGE_TYPES.map(cov => (
                        <option key={cov} value={cov}>{cov}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">This is a required question</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ACCIDENT LOCATION NAME */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ACCIDENT LOCATION NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.accidentLocation}
                      onChange={e => setFormData({ ...formData, accidentLocation: e.target.value })}
                      placeholder="e.g. Near SG Highway, Ahmedabad"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* CLAIM NUMBER */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      CLAIM NUMBER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.claimNumber}
                      onChange={e => setFormData({ ...formData, claimNumber: e.target.value })}
                      placeholder="Intimation / Claim ID"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Call Recordings & Uploads */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Upload size={16} className="text-emerald-600" />
                  Call Recordings & Documentation Uploads
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CLAIM INFORM CALL RECORDING OF CUSTOMER OR SIGNED LETTER */}
                  <FileUploadField
                    label="CLAIM INFORM CALL RECORDING OF CUSTOMER OR SIGNED LETTER"
                    required
                    fileUrl={formData.claimInformDocUrl}
                    uploading={uploadingField === 'claimInformDocUrl'}
                    maxMb={10}
                    helpText="Upload 1 supported file. Max 10 MB."
                    onUpload={file => handleFileUpload('claimInformDocUrl', file, 10)}
                    onRemove={() => setFormData({ ...formData, claimInformDocUrl: '' })}
                  />

                  {/* CLAIM INTIMATION CALL RECORDING */}
                  <FileUploadField
                    label="CLAIM INTIMATION CALL RECORDING"
                    required
                    fileUrl={formData.claimIntimationDocUrl}
                    uploading={uploadingField === 'claimIntimationDocUrl'}
                    maxMb={10}
                    helpText="Upload 1 supported file. Max 10 MB."
                    onUpload={file => handleFileUpload('claimIntimationDocUrl', file, 10)}
                    onRemove={() => setFormData({ ...formData, claimIntimationDocUrl: '' })}
                  />

                  {/* SPOT PHOTOS AND VIDEOS (Max 100 MB) */}
                  <div className="md:col-span-2">
                    <FileUploadField
                      label="SPOT PHOTOS AND VIDEOS"
                      required
                      fileUrl={formData.spotPhotosVideosUrl}
                      uploading={uploadingField === 'spotPhotosVideosUrl'}
                      maxMb={100}
                      helpText="Upload 1 supported file. Max 100 MB."
                      onUpload={file => handleFileUpload('spotPhotosVideosUrl', file, 100)}
                      onRemove={() => setFormData({ ...formData, spotPhotosVideosUrl: '' })}
                    />
                  </div>

                  {/* RC, MPARIVAHAN SCREENSHOT, DL, KYC etc Docs. */}
                  <FileUploadField
                    label="RC, MPARIVAHAN SCREENSHOT, DL, KYC etc Docs."
                    required
                    fileUrl={formData.kycDocsUrl}
                    uploading={uploadingField === 'kycDocsUrl'}
                    maxMb={10}
                    helpText="Upload 1 supported file. Max 10 MB."
                    onUpload={file => handleFileUpload('kycDocsUrl', file, 10)}
                    onRemove={() => setFormData({ ...formData, kycDocsUrl: '' })}
                  />

                  {/* POLICY CHECK FORM */}
                  <FileUploadField
                    label="POLICY CHECK FORM"
                    required
                    fileUrl={formData.policyCheckFormUrl}
                    uploading={uploadingField === 'policyCheckFormUrl'}
                    maxMb={10}
                    helpText="Upload 1 supported file. Max 10 MB."
                    onUpload={file => handleFileUpload('policyCheckFormUrl', file, 10)}
                    onRemove={() => setFormData({ ...formData, policyCheckFormUrl: '' })}
                  />
                </div>
              </div>

              {/* 6. Surveyor & Garage Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-purple-600" />
                  Surveyor & Garage Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SURVEYOR NAME */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      SURVEYOR NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.surveyorName}
                      onChange={e => setFormData({ ...formData, surveyorName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* SURVEYOR MOBILE NUMBER */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      SURVEYOR MOBILE NUMBER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.surveyorMobile}
                      onChange={e => setFormData({ ...formData, surveyorMobile: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* GARAGE NAME AND ADDRESS */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      GARAGE NAME AND ADDRESS <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formData.garageNameAddress}
                      onChange={e => setFormData({ ...formData, garageNameAddress: e.target.value })}
                      placeholder="Workshop name and full address"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* GARAGE CONTACT PERSON NAME */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      GARAGE CONTACT PERSON NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.garageContactName}
                      onChange={e => setFormData({ ...formData, garageContactName: e.target.value })}
                      placeholder="Workshop contact person"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* GARAGE CONTACT PERSON MOBILE NUMBER */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      GARAGE CONTACT PERSON MOBILE NUMBER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.garageContactMobile}
                      onChange={e => setFormData({ ...formData, garageContactMobile: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Estimation & Turnaround Time */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  Loss Assessment & Turnaround Time
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ESTIMATED LOSS IN Rs. */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ESTIMATED LOSS IN Rs. <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        value={formData.estimatedLoss}
                        onChange={e => setFormData({ ...formData, estimatedLoss: e.target.value })}
                        placeholder="e.g. 45000"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* ESTIMATED TIME (IN DAYS) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ESTIMATED TIME (IN DAYS) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.estimatedTimeDays}
                      onChange={e => setFormData({ ...formData, estimatedTimeDays: e.target.value })}
                      placeholder="e.g. 7"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Submission Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!uploadingField}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Submitting Claim...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Submit Claim Form
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW CLAIM DETAILS DRAWER / MODAL (Inspect All 24 Fields + Document Links)*/}
      {/* ========================================================================= */}
      {isViewModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Claim Details</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {selectedClaim.claimNumber || selectedClaim.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registered: {selectedClaim.filedDate ? new Date(selectedClaim.filedDate).toLocaleString('en-IN') : '—'}
                </p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Vehicle & Insurance Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Car size={15} className="text-blue-600" /> Vehicle & Insurance
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DetailItem label="Vehicle Reg Number" value={selectedClaim.vehicleNumber} highlight />
                  <DetailItem label="Vehicle Category" value={selectedClaim.vehicleCategory} />
                  <DetailItem label="Insurance Company" value={selectedClaim.insuranceCompany} />
                  <DetailItem label="Coverage (OD/TP)" value={selectedClaim.claimCoverageType || selectedClaim.claimType} />
                </div>
              </div>

              {/* Customer & Incident Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Phone size={15} className="text-indigo-600" /> Customer & Incident
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailItem label="Contact Person Name" value={selectedClaim.contactPersonName || selectedClaim.customerName} />
                  <DetailItem label="Contact Mobile" value={selectedClaim.contactPersonMobile} />
                  <DetailItem label="Respondent Email" value={selectedClaim.email} />
                  <DetailItem label="Accident Date" value={selectedClaim.accidentDate ? new Date(selectedClaim.accidentDate).toLocaleDateString('en-IN') : '—'} />
                  <DetailItem label="Accident Time" value={selectedClaim.accidentTime} />
                  <DetailItem label="Accident Location" value={selectedClaim.accidentLocation} />
                </div>
              </div>

              {/* Surveyor & Garage Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Building2 size={15} className="text-purple-600" /> Surveyor & Garage Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailItem label="Surveyor Name" value={selectedClaim.surveyorName} />
                  <DetailItem label="Surveyor Mobile" value={selectedClaim.surveyorMobile} />
                  <DetailItem label="Garage Contact Person" value={selectedClaim.garageContactName} />
                  <DetailItem label="Garage Contact Mobile" value={selectedClaim.garageContactMobile} />
                  <div className="col-span-2">
                    <DetailItem label="Garage Name & Address" value={selectedClaim.garageNameAddress} />
                  </div>
                </div>
              </div>

              {/* Loss & Assessment Card */}
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200">
                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-emerald-600" /> Loss & Timeline
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailItem label="Estimated Loss" value={`₹${parseFloat(selectedClaim.estimatedLoss || selectedClaim.claimAmount || 0).toLocaleString('en-IN')}`} highlight />
                  <DetailItem label="Estimated Time (Days)" value={selectedClaim.estimatedTimeDays ? `${selectedClaim.estimatedTimeDays} Days` : '—'} />
                  <DetailItem label="Processing Status" value={selectedClaim.status?.toUpperCase()} />
                </div>
              </div>

              {/* Uploaded Documents & Media Attachments */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-600" /> Uploaded Documents & Media
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <DocViewLink label="POLICY PDF" url={selectedClaim.policyPdfUrl} />
                  <DocViewLink label="CLAIM INFORM CALL RECORDING / LETTER" url={selectedClaim.claimInformDocUrl} />
                  <DocViewLink label="CLAIM INTIMATION CALL RECORDING" url={selectedClaim.claimIntimationDocUrl} />
                  <DocViewLink label="SPOT PHOTOS AND VIDEOS" url={selectedClaim.spotPhotosVideosUrl} isMedia />
                  <DocViewLink label="RC, MPARIVAHAN, DL, KYC DOCS" url={selectedClaim.kycDocsUrl} />
                  <DocViewLink label="POLICY CHECK FORM" url={selectedClaim.policyCheckFormUrl} />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents & Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, count, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200'
  }

  return (
    <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-1">{count}</p>
      </div>
      <div className={`p-3 rounded-xl border ${colors[color] || colors.blue}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

function DetailItem({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-400 uppercase">{label}</div>
      <div className={`mt-0.5 text-xs ${highlight ? 'font-bold text-blue-700 font-mono' : 'font-semibold text-gray-800'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

function DocViewLink({ label, url, isMedia }: { label: string; url?: string; isMedia?: boolean }) {
  if (!url) {
    return (
      <div className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between opacity-50">
        <span className="text-[11px] font-semibold text-gray-400 uppercase">{label}</span>
        <span className="text-[10px] text-gray-400 italic">Not Uploaded</span>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-3 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all group"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {isMedia ? <Film size={14} className="text-purple-600 flex-shrink-0" /> : <FileText size={14} className="text-blue-600 flex-shrink-0" />}
        <span className="text-[11px] font-bold text-gray-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
        View <ExternalLink size={12} />
      </div>
    </a>
  )
}

interface FileUploadFieldProps {
  label: string
  required?: boolean
  fileUrl?: string
  uploading: boolean
  maxMb: number
  helpText: string
  onUpload: (file: File) => void
  onRemove: () => void
}

function FileUploadField({
  label,
  required,
  fileUrl,
  uploading,
  maxMb,
  helpText,
  onUpload,
  onRemove
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {fileUrl ? (
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 truncate">
              File uploaded successfully
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Preview <ExternalLink size={11} />
            </a>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 bg-gray-50 border-2 border-dashed rounded-xl cursor-pointer hover:bg-blue-50/30 hover:border-blue-400 transition-all flex items-center justify-between ${
            uploading ? 'border-blue-400 bg-blue-50/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500">
              {uploading ? (
                <RefreshCw size={14} className="animate-spin text-blue-600" />
              ) : (
                <Upload size={14} />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">
                {uploading ? 'Uploading file...' : 'Choose file to upload'}
              </p>
              <p className="text-[10px] text-gray-400">{helpText}</p>
            </div>
          </div>
          <button
            type="button"
            className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 shadow-sm"
          >
            Browse
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
            }}
          />
        </div>
      )}
    </div>
  )
}
