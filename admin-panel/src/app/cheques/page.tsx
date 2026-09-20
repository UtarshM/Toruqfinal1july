"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  CreditCard, Search, Plus, Download, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, ArrowUpRight, X, Printer, ShieldAlert,
  Building2, User, Car, Filter, Calendar
} from 'lucide-react'
import { formatDateDMY, getISTDateString } from '@/lib/date-format'
import MoneyReceiptModal, { ReceiptData } from '@/components/pdf/MoneyReceiptModal'

interface ChequeItem {
  id: string
  bankName: string
  chequeNo: string
  amount: number
  receivedDate: string
  depositDate: string | null
  clearanceDate: string | null
  status: 'received' | 'deposited' | 'cleared' | 'bounced'
  bounceReason: string | null
  customerId: string | null
  customerName: string | null
  vehicleNo: string | null
  remarks: string | null
  createdAt: string
}

export default function ChequesPage() {
  const [cheques, setCheques] = useState<ChequeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'deposited' | 'cleared' | 'bounced'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Summary KPIs
  const [summary, setSummary] = useState({
    totalCheques: 0,
    totalAmount: 0,
    receivedCount: 0,
    receivedAmount: 0,
    depositedCount: 0,
    depositedAmount: 0,
    clearedCount: 0,
    clearedAmount: 0,
    bouncedCount: 0,
    bouncedAmount: 0,
  })

  // Add Cheque Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newCheque, setNewCheque] = useState({
    bankName: '',
    chequeNo: '',
    amount: '',
    receivedDate: getISTDateString(0),
    customerName: '',
    vehicleNo: '',
    remarks: '',
  })

  // Bounce Modal
  const [isBounceModalOpen, setIsBounceModalOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<ChequeItem | null>(null)
  const [bounceReason, setBounceReason] = useState('')

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const fetchCheques = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('paged', 'true')
      params.append('limit', '250')
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await fetchApi(`/api/v1/cheques?${params.toString()}`)
      if (res && res.cheques) {
        setCheques(res.cheques)
        if (res.summary) setSummary(res.summary)
      } else if (Array.isArray(res)) {
        setCheques(res)
      }
    } catch (err) {
      console.error('Failed to fetch cheques:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchCheques()
  }, [fetchCheques])

  const handleCreateCheque = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newCheque.amount)
    if (!newCheque.bankName.trim() || !newCheque.chequeNo.trim() || isNaN(amt) || amt <= 0) {
      alert('Please fill Bank Name, Cheque Number and valid positive amount.')
      return
    }

    setIsSubmitting(true)
    try {
      await fetchApi('/api/v1/cheques', {
        method: 'POST',
        body: JSON.stringify({
          bankName: newCheque.bankName.trim(),
          chequeNo: newCheque.chequeNo.trim(),
          amount: amt,
          receivedDate: newCheque.receivedDate,
          customerName: newCheque.customerName.trim() || null,
          vehicleNo: newCheque.vehicleNo.trim() || null,
          remarks: newCheque.remarks.trim() || null,
        })
      })

      setIsAddModalOpen(false)
      setNewCheque({
        bankName: '',
        chequeNo: '',
        amount: '',
        receivedDate: getISTDateString(0),
        customerName: '',
        vehicleNo: '',
        remarks: '',
      })
      fetchCheques()
    } catch (err: any) {
      alert(err.message || 'Failed to save cheque.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeposit = async (cheque: ChequeItem) => {
    if (!confirm(`Mark cheque #${cheque.chequeNo} as DEPOSITED?`)) return
    try {
      await fetchApi(`/api/v1/cheques/${cheque.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'deposited',
          depositDate: getISTDateString(0),
        })
      })
      fetchCheques()
    } catch (err: any) {
      alert(err.message || 'Failed to update cheque')
    }
  }

  const handleClear = async (cheque: ChequeItem) => {
    if (!confirm(`Confirm cheque #${cheque.chequeNo} has CLEARED?`)) return
    try {
      await fetchApi(`/api/v1/cheques/${cheque.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cleared',
          clearanceDate: getISTDateString(0),
        })
      })
      fetchCheques()
    } catch (err: any) {
      alert(err.message || 'Failed to update cheque')
    }
  }

  const handleOpenBounce = (cheque: ChequeItem) => {
    setSelectedCheque(cheque)
    setBounceReason('Insufficient Funds')
    setIsBounceModalOpen(true)
  }

  const submitBounce = async () => {
    if (!selectedCheque) return
    if (!bounceReason.trim()) {
      alert('Please enter bounce reason')
      return
    }

    try {
      await fetchApi(`/api/v1/cheques/${selectedCheque.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'bounced',
          bounceReason: bounceReason.trim(),
        })
      })
      setIsBounceModalOpen(false)
      setSelectedCheque(null)
      fetchCheques()
    } catch (err: any) {
      alert(err.message || 'Failed to record bounce')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cheque record?')) return
    try {
      await fetchApi(`/api/v1/cheques/${id}`, { method: 'DELETE' })
      fetchCheques()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  const openReceipt = (c: ChequeItem) => {
    setReceiptData({
      receiptNo: `CHQ-${c.chequeNo}`,
      date: c.receivedDate,
      clientName: c.customerName || 'Valued Customer',
      vehicleNo: c.vehicleNo,
      amount: c.amount,
      paymentMethod: 'CHEQUE',
      referenceNumber: `${c.bankName} #${c.chequeNo}`,
      description: `Cheque Payment towards Insurance / Services (${c.status.toUpperCase()})`,
    })
    setIsReceiptOpen(true)
  }

  const exportCSV = () => {
    if (cheques.length === 0) {
      alert('No cheques to export')
      return
    }
    const headers = ['Cheque No', 'Bank', 'Amount', 'Status', 'Received Date', 'Deposit Date', 'Clearance Date', 'Customer', 'Vehicle No', 'Bounce Reason']
    const rows = cheques.map(c => [
      c.chequeNo,
      c.bankName,
      c.amount,
      c.status.toUpperCase(),
      formatDateDMY(c.receivedDate),
      c.depositDate ? formatDateDMY(c.depositDate) : '',
      c.clearanceDate ? formatDateDMY(c.clearanceDate) : '',
      c.customerName || '',
      c.vehicleNo || '',
      c.bounceReason || '',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cheques_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <CreditCard className="text-red-600" size={26} />
              Cheque Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track received, deposited, cleared, and bounced cheques with legacy ledger accuracy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              Add Cheque
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Cheques</p>
            <p className="text-xl font-bold text-gray-900 mt-1 font-mono">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary.totalCheques} total cheques</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Received (Pending)</p>
            <p className="text-xl font-bold text-amber-700 mt-1 font-mono">₹{summary.receivedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-amber-600 mt-0.5">{summary.receivedCount} to deposit</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">In Clearing</p>
            <p className="text-xl font-bold text-blue-700 mt-1 font-mono">₹{summary.depositedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-blue-600 mt-0.5">{summary.depositedCount} deposited</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cleared</p>
            <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">₹{summary.clearedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{summary.clearedCount} settled</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Bounced</p>
            <p className="text-xl font-bold text-red-700 mt-1 font-mono">₹{summary.bouncedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-red-600 mt-0.5">{summary.bouncedCount} bounced</p>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {(['all', 'received', 'deposited', 'cleared', 'bounced'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'all' ? 'All Cheques' : tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search cheque, bank, customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Cheques Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Cheque Details</th>
                  <th className="py-3 px-4">Customer & Vehicle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-red-600" />
                      Loading cheques...
                    </td>
                  </tr>
                ) : cheques.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No cheques found in this category.
                    </td>
                  </tr>
                ) : (
                  cheques.map(c => {
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 font-mono text-sm">#{c.chequeNo}</div>
                          <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={13} />
                            {c.bankName}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{c.customerName || 'N/A'}</div>
                          {c.vehicleNo && (
                            <div className="text-gray-500 font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {c.vehicleNo}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold font-mono text-gray-900 text-sm">
                            ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-gray-600 space-y-0.5">
                          <div>Received: <span className="font-medium text-gray-800">{formatDateDMY(c.receivedDate)}</span></div>
                          {c.depositDate && <div>Deposited: <span className="font-medium text-gray-800">{formatDateDMY(c.depositDate)}</span></div>}
                          {c.clearanceDate && <div>Cleared: <span className="font-medium text-emerald-700">{formatDateDMY(c.clearanceDate)}</span></div>}
                        </td>
                        <td className="py-3 px-4">
                          {c.status === 'received' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold text-[10px] uppercase">
                              <Clock size={12} /> Received
                            </span>
                          )}
                          {c.status === 'deposited' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-[10px] uppercase">
                              <ArrowUpRight size={12} /> Deposited
                            </span>
                          )}
                          {c.status === 'cleared' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[10px] uppercase">
                              <CheckCircle2 size={12} /> Cleared
                            </span>
                          )}
                          {c.status === 'bounced' && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-[10px] uppercase">
                                <AlertTriangle size={12} /> Bounced
                              </span>
                              {c.bounceReason && (
                                <p className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={c.bounceReason}>
                                  Reason: {c.bounceReason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'received' && (
                              <button
                                onClick={() => handleDeposit(c)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                title="Mark as deposited in bank"
                              >
                                Deposit
                              </button>
                            )}
                            {c.status === 'deposited' && (
                              <>
                                <button
                                  onClick={() => handleClear(c)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                  title="Mark as cleared"
                                >
                                  Clear
                                </button>
                                <button
                                  onClick={() => handleOpenBounce(c)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] rounded-lg transition-all cursor-pointer"
                                  title="Mark as bounced"
                                >
                                  Bounce
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openReceipt(c)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                              title="Print money receipt voucher"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete cheque"
                            >
                              <X size={15} />
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

        {/* Add Cheque Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Plus size={18} className="text-red-600" />
                  Add Inward Cheque
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateCheque} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    value={newCheque.bankName}
                    onChange={e => setNewCheque({ ...newCheque, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Cheque Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 004521"
                      value={newCheque.chequeNo}
                      onChange={e => setNewCheque({ ...newCheque, chequeNo: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 15000"
                      value={newCheque.amount}
                      onChange={e => setNewCheque({ ...newCheque, amount: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Received Date</label>
                    <input
                      type="date"
                      value={newCheque.receivedDate}
                      onChange={e => setNewCheque({ ...newCheque, receivedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      placeholder="e.g. GJ01AB1234"
                      value={newCheque.vehicleNo}
                      onChange={e => setNewCheque({ ...newCheque, vehicleNo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 font-mono uppercase border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Customer / Payer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={newCheque.customerName}
                    onChange={e => setNewCheque({ ...newCheque, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Notes or policy reference..."
                    value={newCheque.remarks}
                    onChange={e => setNewCheque({ ...newCheque, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Cheque'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bounce Reason Modal */}
        {isBounceModalOpen && selectedCheque && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
                <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-600" />
                  Mark Cheque as Bounced
                </h3>
                <button onClick={() => setIsBounceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs">
                <p className="text-gray-600">
                  Record dishonour for cheque <span className="font-bold font-mono">#{selectedCheque.chequeNo}</span> for ₹{selectedCheque.amount.toLocaleString('en-IN')}.
                </p>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reason for Bounce *</label>
                  <select
                    value={bounceReason}
                    onChange={e => setBounceReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  >
                    <option value="Insufficient Funds">Insufficient Funds</option>
                    <option value="Signature Mismatch">Signature Mismatch</option>
                    <option value="Payment Stopped by Drawer">Payment Stopped by Drawer</option>
                    <option value="Account Closed">Account Closed</option>
                    <option value="Refer to Drawer">Refer to Drawer</option>
                    <option value="Post-dated / Stale Cheque">Post-dated / Stale Cheque</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setIsBounceModalOpen(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl text-gray-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitBounce}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                  >
                    Confirm Bounce
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Money Receipt Modal */}
        <MoneyReceiptModal
          isOpen={isReceiptOpen}
          data={receiptData}
          onClose={() => setIsReceiptOpen(false)}
        />
      </div>
    </AdminLayout>
  )
}
