"use client"
import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { formatDateDMY } from '@/lib/date-format'
import {
  FileSpreadsheet, Plus, Search, Filter, Download, Phone,
  MessageCircle, Edit3, Trash2, X, Check, Clock,
  Calendar, IndianRupee, Landmark, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, ChevronRight, Car, RefreshCw
} from 'lucide-react'

// Status Badge Component matching the user screenshot
export function LoanStatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toUpperCase()

  if (normalized === 'ONLY INQUIRY') {
    return (
      <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[#E5E7EB] text-[#1F2937] shadow-sm whitespace-nowrap">
        ONLY INQUIRY
      </span>
    )
  }

  if (normalized === 'TRIED BUT NOT DONE') {
    return (
      <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[#E5E7EB] text-[#1F2937] shadow-sm whitespace-nowrap">
        TRIED BUT NOT DONE
      </span>
    )
  }

  if (normalized === 'COMPLETED') {
    return (
      <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide bg-[#156F3F] text-[#D1FADF] shadow-sm whitespace-nowrap">
        COMPLETED
      </span>
    )
  }

  if (normalized === 'REJECT' || normalized === 'REJECTED') {
    return (
      <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide bg-[#A30D11] text-white shadow-sm whitespace-nowrap">
        REJECT
      </span>
    )
  }

  // Fallback for previous legacy statuses (Applied, Processing, Approved, Disbursed)
  return (
    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
      {status}
    </span>
  )
}

const STATUS_OPTIONS = [
  'ONLY INQUIRY',
  'TRIED BUT NOT DONE',
  'COMPLETED',
  'REJECT'
]

const CATEGORY_OPTIONS = [
  'PRIVATE USED',
  'COMMERCIAL',
  'TWO WHEELER',
  'NEW CAR',
  'USED CAR',
  'REFINANCE',
  'PERSONAL LOAN'
]

const COMMON_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Kotak Mahindra Prime',
  'Axis Bank',
  'Cholamandalam Finance',
  'Mahindra Finance',
  'Tata Capital',
  'AU Small Finance Bank',
  'Federal Bank'
]

const COMMON_REASONS = [
  'CALL NOT ANSWERING',
  'CUSTOMER NOT INTERESTED',
  'CIBIL SCORE LOW',
  'HIGH INTEREST RATE',
  'DOCUMENTS NOT AVAILABLE',
  'LOAN ALREADY TAKEN ELSEWHERE',
  'VEHICLE DEAL CANCELLED',
  'INSUFFICIENT INCOME / DBR HIGH'
]

export default function LoanInquiriesPage() {
  const [inquiries, setInquiries] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    onlyInquiry: 0,
    triedNotDone: 0,
    completed: 0,
    reject: 0,
    totalSanctioned: 0,
    totalPayout: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingInquiry, setEditingInquiry] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const initialFormData = {
    inwardDate: new Date().toISOString().split('T')[0],
    customerName: '',
    mobileNo: '',
    vehicleNumber: '',
    category: 'PRIVATE USED',
    leadBy: '',
    requiredAmount: '',
    status: 'ONLY INQUIRY',
    reasonForNotDone: '',
    bankNbfc: '',
    sanctionedAmount: '',
    disbursedDate: '',
    noOfDays: '',
    payoutPercent: '',
    payoutAmount: '',
    remarksIfAny: ''
  }

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    fetchInquiries()
  }, [statusFilter])

  const fetchInquiries = async () => {
    setIsLoading(true)
    try {
      let url = `/api/v1/finance/loans/inquiries?status=${encodeURIComponent(statusFilter)}`
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }
      const data = await fetchApi(url)
      setInquiries(data.inquiries || [])
      if (data.metrics) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to fetch loan inquiries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchInquiries()
  }

  // Auto-calculate Days and Payout on form change
  const handleFormChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value }

    // If inwardDate or disbursedDate changed, calculate days
    if ((field === 'inwardDate' || field === 'disbursedDate') && updated.inwardDate && updated.disbursedDate) {
      const d1 = new Date(updated.inwardDate)
      const d2 = new Date(updated.disbursedDate)
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffDays = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
        updated.noOfDays = String(diffDays)
      }
    }

    // If sanctionedAmount or payoutPercent changed, calculate payoutAmount
    if ((field === 'sanctionedAmount' || field === 'payoutPercent') && updated.sanctionedAmount && updated.payoutPercent) {
      const sAmt = parseFloat(updated.sanctionedAmount)
      const pPct = parseFloat(updated.payoutPercent)
      if (!isNaN(sAmt) && !isNaN(pPct)) {
        updated.payoutAmount = String(Math.round(((sAmt * pPct) / 100) * 100) / 100)
      }
    }

    setFormData(updated)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerName.trim()) {
      alert('Please enter customer name.')
      return
    }

    setIsSubmitting(true)
    try {
      await fetchApi('/api/v1/finance/loans/inquiries', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setIsNewModalOpen(false)
      setFormData(initialFormData)
      fetchInquiries()
    } catch (error: any) {
      alert(error.message || 'Failed to create loan inquiry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInquiry || !formData.customerName.trim()) return

    setIsSubmitting(true)
    try {
      await fetchApi('/api/v1/finance/loans/inquiries', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editingInquiry.id,
          ...formData
        })
      })
      setEditingInquiry(null)
      setFormData(initialFormData)
      fetchInquiries()
    } catch (error: any) {
      alert(error.message || 'Failed to update inquiry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInlineStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetchApi('/api/v1/finance/loans/inquiries', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: newStatus })
      })
      fetchInquiries()
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await fetchApi(`/api/v1/finance/loans/inquiries?id=${deletingId}`, {
        method: 'DELETE'
      })
      setDeletingId(null)
      fetchInquiries()
    } catch (error: any) {
      alert(error.message || 'Failed to delete inquiry')
    }
  }

  const openEditModal = (item: any) => {
    setEditingInquiry(item)
    setFormData({
      inwardDate: item.inwardDate ? new Date(item.inwardDate).toISOString().split('T')[0] : '',
      customerName: item.customerName || '',
      mobileNo: item.mobileNo || '',
      vehicleNumber: item.vehicleNumber || '',
      category: item.category || 'PRIVATE USED',
      leadBy: item.leadBy || '',
      requiredAmount: item.requiredAmount != null ? String(item.requiredAmount) : '',
      status: item.status || 'ONLY INQUIRY',
      reasonForNotDone: item.reasonForNotDone || '',
      bankNbfc: item.bankNbfc || '',
      sanctionedAmount: item.sanctionedAmount != null ? String(item.sanctionedAmount) : '',
      disbursedDate: item.disbursedDate ? new Date(item.disbursedDate).toISOString().split('T')[0] : '',
      noOfDays: item.noOfDays != null ? String(item.noOfDays) : '',
      payoutPercent: item.payoutPercent != null ? String(item.payoutPercent) : '',
      payoutAmount: item.payoutAmount != null ? String(item.payoutAmount) : '',
      remarksIfAny: item.remarksIfAny || ''
    })
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (inquiries.length === 0) {
      alert('No inquiries to export')
      return
    }

    const headers = [
      'SR NO', 'INWARD DATE', 'CUSTOMER NAME', 'MOBILE NO', 'VEHICLE NUMBER',
      'CATEGORY', 'LEAD BY', 'REQUIRED AMOUNT', 'STATUS', 'REASON FOR NOT DONE',
      'BANK/NBFC (IF DONE)', 'SANCTIONED AMOUNT', 'DISBURSED DATE', 'NO. OF DAYS',
      'PAYOUT %', 'PAYOUT AMOUNT', 'REMARKS IF ANY'
    ]

    const rows = inquiries.map((item, idx) => [
      item.srNo || idx + 1,
      item.inwardDate ? formatDateDMY(item.inwardDate) : '',
      `"${(item.customerName || '').replace(/"/g, '""')}"`,
      `"${item.mobileNo || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.category || ''}"`,
      `"${(item.leadBy || '').replace(/"/g, '""')}"`,
      item.requiredAmount || '',
      `"${item.status || ''}"`,
      `"${(item.reasonForNotDone || '').replace(/"/g, '""')}"`,
      `"${(item.bankNbfc || '').replace(/"/g, '""')}"`,
      item.sanctionedAmount || '',
      item.disbursedDate ? formatDateDMY(item.disbursedDate) : '',
      item.noOfDays != null ? item.noOfDays : '',
      item.payoutPercent != null ? `${item.payoutPercent}%` : '',
      item.payoutAmount || '',
      `"${(item.remarksIfAny || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Loan_Inquiries_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loan Inquiries</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              {metrics.total} Total
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Capture inward loan leads, follow-ups, banking sanctions, disbursals, and payout calculations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => {
              setFormData(initialFormData)
              setIsNewModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            New Loan Inquiry
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-gray-200 pb-2">
        <Link
          href="/loans/inquiries"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
        >
          <FileSpreadsheet size={16} />
          Loan Inquiries (Spreadsheet)
        </Link>
        <Link
          href="/loans"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <Landmark size={16} />
          Loan Applications (Board)
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
        {/* Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>All Inquiries</span>
            <FileSpreadsheet size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{metrics.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Total registered leads</p>
        </div>

        {/* ONLY INQUIRY */}
        <div
          onClick={() => setStatusFilter('ONLY INQUIRY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ONLY INQUIRY'
              ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>ONLY INQUIRY</span>
            <Clock size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-800 mt-2">{metrics.onlyInquiry}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Fresh / Under initial query</p>
        </div>

        {/* TRIED BUT NOT DONE */}
        <div
          onClick={() => setStatusFilter('TRIED BUT NOT DONE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'TRIED BUT NOT DONE'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>TRIED BUT NOT DONE</span>
            <AlertCircle size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{metrics.triedNotDone}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Follow-up needed</p>
        </div>

        {/* COMPLETED */}
        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>COMPLETED</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#156F3F] mt-2">{metrics.completed}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            Payout: ₹{metrics.totalPayout.toLocaleString('en-IN')}
          </p>
        </div>

        {/* REJECT */}
        <div
          onClick={() => setStatusFilter('REJECT')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'REJECT'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-red-800">
            <span>REJECT</span>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-[#A30D11] mt-2">{metrics.reject}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Cancelled or rejected</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-6 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, vehicle, mobile, lead by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Status:</span>
          {['all', ...STATUS_OPTIONS].map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === opt
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          ))}
          <button
            onClick={() => fetchInquiries()}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Spreadsheet Data Table */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px] whitespace-nowrap">
                <th className="py-3 px-3 w-12 text-center">SR NO</th>
                <th className="py-3 px-3">INWARD DATE</th>
                <th className="py-3 px-4">CUSTOMER NAME</th>
                <th className="py-3 px-3">MOBILE NO</th>
                <th className="py-3 px-3">VEHICLE NUMBER</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">LEAD BY</th>
                <th className="py-3 px-3">REQUIRED AMOUNT</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4">REASON FOR NOT DONE</th>
                <th className="py-3 px-3">BANK/NBFC (IF DONE)</th>
                <th className="py-3 px-3">SANCTIONED AMOUNT</th>
                <th className="py-3 px-3">DISBURSED DATE</th>
                <th className="py-3 px-2 text-center">NO. OF DAYS</th>
                <th className="py-3 px-2 text-center">PAYOUT %</th>
                <th className="py-3 px-3">PAYOUT AMOUNT</th>
                <th className="py-3 px-4">REMARKS IF ANY</th>
                <th className="py-3 px-3 text-right sticky right-0 bg-gray-50/95">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={18} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <span>Loading loan inquiries...</span>
                    </div>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet size={36} className="text-gray-300" />
                      <span className="font-semibold text-gray-600">No loan inquiries found</span>
                      <p className="text-xs text-gray-400">Click &quot;New Loan Inquiry&quot; to add your first record</p>
                    </div>
                  </td>
                </tr>
              ) : (
                inquiries.map((item, index) => {
                  const displaySrNo = item.srNo || index + 1
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* SR NO */}
                      <td className="py-3 px-3 text-center font-bold text-gray-500">
                        {displaySrNo}
                      </td>

                      {/* INWARD DATE */}
                      <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                        {item.inwardDate ? formatDateDMY(item.inwardDate) : '-'}
                      </td>

                      {/* CUSTOMER NAME */}
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {item.customerName}
                      </td>

                      {/* MOBILE NO */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.mobileNo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-gray-700">{item.mobileNo}</span>
                            <a
                              href={`tel:${item.mobileNo}`}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Call"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/91${item.mobileNo.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* VEHICLE NUMBER */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.vehicleNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-50 text-amber-900 border border-amber-200">
                            {item.vehicleNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-gray-600 font-medium">
                          {item.category || 'PRIVATE USED'}
                        </span>
                      </td>

                      {/* LEAD BY */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-800">
                          {item.leadBy || '-'}
                        </span>
                      </td>

                      {/* REQUIRED AMOUNT */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-gray-900">
                        {item.requiredAmount != null ? (
                          item.requiredAmount < 100 ? (
                            `₹${item.requiredAmount} Lakhs`
                          ) : (
                            `₹${Number(item.requiredAmount).toLocaleString('en-IN')}`
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* STATUS (Dropdown Pill) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={item.status || 'ONLY INQUIRY'}
                            onChange={(e) => handleInlineStatusChange(item.id, e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <LoanStatusBadge status={item.status || 'ONLY INQUIRY'} />
                        </div>
                      </td>

                      {/* REASON FOR NOT DONE */}
                      <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate" title={item.reasonForNotDone || ''}>
                        {item.reasonForNotDone || '-'}
                      </td>

                      {/* BANK/NBFC (IF DONE) */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-800">
                        {item.bankNbfc ? (
                          <span className="inline-flex items-center gap-1">
                            <Landmark size={12} className="text-blue-600" />
                            {item.bankNbfc}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* SANCTIONED AMOUNT */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-emerald-700">
                        {item.sanctionedAmount != null ? (
                          `₹${Number(item.sanctionedAmount).toLocaleString('en-IN')}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* DISBURSED DATE */}
                      <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                        {item.disbursedDate ? formatDateDMY(item.disbursedDate) : '-'}
                      </td>

                      {/* NO. OF DAYS */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {item.noOfDays != null ? (
                          <span className="font-semibold text-gray-700">{item.noOfDays} d</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* PAYOUT % */}
                      <td className="py-3 px-2 text-center whitespace-nowrap font-semibold text-blue-700">
                        {item.payoutPercent != null ? `${item.payoutPercent}%` : '-'}
                      </td>

                      {/* PAYOUT AMOUNT */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-emerald-800">
                        {item.payoutAmount != null ? (
                          `₹${Number(item.payoutAmount).toLocaleString('en-IN')}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* REMARKS IF ANY */}
                      <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate" title={item.remarksIfAny || ''}>
                        {item.remarksIfAny || '-'}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/40">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit Inquiry"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {(isNewModalOpen || editingInquiry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingInquiry ? 'Edit Loan Inquiry' : 'New Loan Inquiry'}
                  </h3>
                  <p className="text-xs text-gray-500">All columns from standard banking inward format</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNewModalOpen(false)
                  setEditingInquiry(null)
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-all text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={editingInquiry ? handleUpdate : handleCreate} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {/* Section 1: Customer & Vehicle Info */}
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2.5">1. Customer & Vehicle Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">INWARD DATE *</label>
                    <input
                      type="date"
                      required
                      value={formData.inwardDate}
                      onChange={(e) => handleFormChange('inwardDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">CUSTOMER NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIKAS TOYTA"
                      value={formData.customerName}
                      onChange={(e) => handleFormChange('customerName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MOBILE NO</label>
                    <input
                      type="tel"
                      placeholder="10-digit number e.g. 9510819589"
                      value={formData.mobileNo}
                      onChange={(e) => handleFormChange('mobileNo', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">VEHICLE NUMBER</label>
                    <input
                      type="text"
                      placeholder="e.g. GJ01WC7944"
                      value={formData.vehicleNumber}
                      onChange={(e) => handleFormChange('vehicleNumber', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">CATEGORY</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">LEAD BY</label>
                    <input
                      type="text"
                      placeholder="e.g. MITTAL MADAM"
                      value={formData.leadBy}
                      onChange={(e) => handleFormChange('leadBy', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Loan Requirements & Status */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2.5">2. Loan Status & Requirements</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">REQUIRED AMOUNT (₹ or Lakhs)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3 or 300000"
                      value={formData.requiredAmount}
                      onChange={(e) => handleFormChange('requiredAmount', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">STATUS (DROPDOWN) *</label>
                      <LoanStatusBadge status={formData.status} />
                    </div>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      REASON FOR NOT DONE {formData.status !== 'COMPLETED' && <span className="text-amber-600 font-normal">(if inquiry / rejected / tried)</span>}
                    </label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="e.g. CALL NOT ANSWERING, CIBIL LOW..."
                        value={formData.reasonForNotDone}
                        onChange={(e) => handleFormChange('reasonForNotDone', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Quick presets:</span>
                        {COMMON_REASONS.slice(0, 4).map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => handleFormChange('reasonForNotDone', r)}
                            className="px-2 py-0.5 rounded text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Disbursal & Payout (Active when Completed / Approved) */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2.5">3. Banking Disbursal & Payout Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">BANK/NBFC (IF DONE)</label>
                    <input
                      type="text"
                      list="banks-list"
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankNbfc}
                      onChange={(e) => handleFormChange('bankNbfc', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <datalist id="banks-list">
                      {COMMON_BANKS.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">SANCTIONED AMOUNT (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 280000"
                      value={formData.sanctionedAmount}
                      onChange={(e) => handleFormChange('sanctionedAmount', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">DISBURSED DATE</label>
                    <input
                      type="date"
                      value={formData.disbursedDate}
                      onChange={(e) => handleFormChange('disbursedDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      NO. OF DAYS <span className="text-gray-400 font-normal">(Auto-calculated)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Calculated turnaround days"
                      value={formData.noOfDays}
                      onChange={(e) => handleFormChange('noOfDays', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PAYOUT %</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.5"
                      value={formData.payoutPercent}
                      onChange={(e) => handleFormChange('payoutPercent', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PAYOUT AMOUNT (₹) <span className="text-gray-400 font-normal">(Auto-calculated)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Sanctioned × % / 100"
                      value={formData.payoutAmount}
                      onChange={(e) => handleFormChange('payoutAmount', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">REMARKS IF ANY</label>
                    <textarea
                      rows={2}
                      placeholder="Internal remarks, documentation status, follow up notes..."
                      value={formData.remarksIfAny}
                      onChange={(e) => handleFormChange('remarksIfAny', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false)
                    setEditingInquiry(null)
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingInquiry ? (
                    'Save Changes'
                  ) : (
                    'Create Inquiry'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Delete Loan Inquiry?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete this inquiry record? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
