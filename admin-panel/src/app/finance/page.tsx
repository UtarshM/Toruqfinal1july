"use client"

import React, { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus, X,
  Download, Calendar, RefreshCw, CheckCircle2, Clock, AlertCircle,
  FileText, Shield, User, Phone, Car, DollarSign, CreditCard, ChevronRight
} from 'lucide-react'

interface PolicyReceivableItem {
  id: string
  policyNumber: string
  provider: string
  type: string
  totalPremium: number
  paidAmount: number
  pendingAmount: number
  paymentStatus: 'Paid' | 'Partial' | 'Pending'
  paymentMode: string
  issueDate: string
  expiryDate: string | null
  leadId: string | null
  clientName: string
  clientPhone: string
  vehicleNo: string
  salesPersonName: string
  salesPersonId: string | null
  compiledPdfUrl: string | null
  documentsCount: number
  transactions: any[]
}

export default function FinancePage() {
  const { user } = useAuth()
  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toUpperCase()
  const isManagerOrAdmin = roleName.includes('MANAGER') || roleName.includes('ADMIN') || roleName.includes('SUPER') || roleName.includes('ACCOUNTANT')

  const [activeTab, setActiveTab] = useState<'receivables' | 'ledger'>('receivables')

  // Tab 1: Receivables State
  const [receivables, setReceivables] = useState<PolicyReceivableItem[]>([])
  const [receivablesSummary, setReceivablesSummary] = useState<any>({
    totalPolicies: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    totalPending: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0,
    collectionRate: '100.0'
  })
  const [receivablesLoading, setReceivablesLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'Paid' | 'Partial' | 'Pending'>('all')
  const [searchReceivables, setSearchReceivables] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Payment Recording Modal State
  const [paymentModalPolicy, setPaymentModalPolicy] = useState<PolicyReceivableItem | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    referenceNumber: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Tab 2: General Ledger State
  const [ledgerData, setLedgerData] = useState<any>({ items: [], summary: {} })
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [searchLedger, setSearchLedger] = useState('')
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false)
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    category: 'Operational',
    amount: '',
    payment_method: 'CASH',
    description: '',
    reference_number: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Fetch Receivables Data
  const fetchReceivables = async () => {
    setReceivablesLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMonth) params.append('month', selectedMonth)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (paymentStatusFilter !== 'all') params.append('paymentStatus', paymentStatusFilter)
      if (searchReceivables.trim()) params.append('search', searchReceivables.trim())

      const res = await fetchApi(`/api/v1/finance/receivables?${params.toString()}`)
      setReceivables(res?.items || [])
      if (res?.summary) setReceivablesSummary(res.summary)
    } catch (err) {
      console.error('Failed to fetch policy receivables:', err)
    } finally {
      setReceivablesLoading(false)
    }
  }

  // Fetch Ledger Data
  const fetchLedger = async () => {
    setLedgerLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await fetchApi(`/api/v1/finance/transactions?${params.toString()}`)
      setLedgerData(res || { items: [], summary: {} })
    } catch (err) {
      console.error('Failed to fetch ledger transactions:', err)
    } finally {
      setLedgerLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'receivables') {
      fetchReceivables()
    } else {
      fetchLedger()
    }
  }, [activeTab, selectedMonth, paymentStatusFilter, startDate, endDate])

  // Debounced search for receivables
  useEffect(() => {
    if (activeTab !== 'receivables') return
    const timer = setTimeout(() => {
      fetchReceivables()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchReceivables])

  // Open Payment Modal
  const handleOpenPaymentModal = (item: PolicyReceivableItem) => {
    setPaymentModalPolicy(item)
    setPaymentForm({
      amount: item.pendingAmount > 0 ? String(item.pendingAmount) : '',
      paymentMethod: 'UPI',
      referenceNumber: '',
      description: `Installment for Policy ${item.policyNumber} (${item.clientName})`,
      date: new Date().toISOString().split('T')[0]
    })
  }

  // Submit Payment Collection
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalPolicy || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return

    setIsSubmittingPayment(true)
    try {
      await fetchApi('/api/v1/finance/receivables', {
        method: 'POST',
        body: JSON.stringify({
          policyId: paymentModalPolicy.id,
          leadId: paymentModalPolicy.leadId,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber,
          description: paymentForm.description,
          date: paymentForm.date
        })
      })

      setPaymentModalPolicy(null)
      fetchReceivables()
      fetchLedger()
      alert('Payment collected and ledger entry updated successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Submit General Ledger Transaction
  const handleCreateLedgerTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        })
      })
      setIsLedgerModalOpen(false)
      fetchLedger()
      fetchReceivables()
      alert('Transaction added to ledger successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to add transaction')
    }
  }

  // Export Monthly Receivables & Policy Report to CSV
  const exportMonthlyCSV = () => {
    if (!receivables.length) {
      alert('No policy finance records found for export.')
      return
    }

    const headers = [
      'Policy Number', 'Client Name', 'Phone Number', 'Vehicle Plate', 'Sales Person',
      'Insurance Provider', 'Policy Type', 'Total Premium (INR)', 'Paid Amount (INR)', 
      'Pending Balance (INR)', 'Payment Status', 'Payment Mode', 'Issue Date', 'Expiry Date (1-Year)'
    ]

    const rows = receivables.map(r => [
      `"${r.policyNumber}"`,
      `"${r.clientName}"`,
      `"${r.clientPhone}"`,
      `"${r.vehicleNo}"`,
      `"${r.salesPersonName}"`,
      `"${r.provider}"`,
      `"${r.type}"`,
      r.totalPremium,
      r.paidAmount,
      r.pendingAmount,
      `"${r.paymentStatus}"`,
      `"${r.paymentMode}"`,
      r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '',
      r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : ''
    ].join(','))

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `finance_policy_receivables_${selectedMonth || 'all_records'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ledgerIncome = ledgerData.summary?.income || 0
  const ledgerExpense = ledgerData.summary?.expense || 0
  const ledgerBalance = ledgerIncome - ledgerExpense

  const filteredLedgerTransactions = (ledgerData.items || []).filter((t: any) => 
    t.category?.toLowerCase().includes(searchLedger.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchLedger.toLowerCase()) ||
    t.referenceNumber?.toLowerCase().includes(searchLedger.toLowerCase())
  )

  return (
    <AdminLayout>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200">
              Finance & Ledger Core
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200">
              1-Year Renewal Tracking
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Financial Management & Collections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Track policy payment splits (Total / Paid / Pending), monthly cohorts, and the 1-year renewal pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'receivables' ? (
            <button
              onClick={exportMonthlyCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <Download size={15} />
              <span>Export Monthly CSV</span>
            </button>
          ) : (
            <button
              onClick={() => setIsLedgerModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-8 flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('receivables')}
          className={`px-5 py-3 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'receivables'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard size={16} />
          <span>Policy Receivables & Collections</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
            {receivablesSummary.totalPolicies || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-5 py-3 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wallet size={16} />
          <span>General Ledger & Expenses</span>
        </button>
      </div>

      {/* TAB 1: POLICY RECEIVABLES & COLLECTIONS */}
      {activeTab === 'receivables' && (
        <div className="space-y-6 mt-6">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              title="Total Invoiced Premium"
              value={`₹${receivablesSummary.totalInvoiced.toLocaleString()}`}
              subtitle={`${receivablesSummary.totalPolicies} Total Policies`}
              icon={<Shield className="text-blue-600" size={20} />}
              badgeColor="bg-blue-50 text-blue-700"
            />
            <StatBox
              title="Total Collected (Paid)"
              value={`+₹${receivablesSummary.totalCollected.toLocaleString()}`}
              subtitle={`${receivablesSummary.paidCount} Fully Paid Policies`}
              icon={<ArrowUpCircle className="text-emerald-600" size={20} />}
              badgeColor="bg-emerald-50 text-emerald-700"
            />
            <StatBox
              title="Pending Receivables"
              value={`-₹${receivablesSummary.totalPending.toLocaleString()}`}
              subtitle={`${receivablesSummary.partialCount + receivablesSummary.pendingCount} Pending / Partial`}
              icon={<AlertCircle className="text-rose-600" size={20} />}
              badgeColor="bg-rose-50 text-rose-700"
            />
            <StatBox
              title="Collection Efficiency"
              value={`${receivablesSummary.collectionRate}%`}
              subtitle="Collected vs Invoiced"
              icon={<Wallet className="text-indigo-600" size={20} />}
              badgeColor="bg-indigo-50 text-indigo-700"
            />
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Policy No, Client, Vehicle Plate, Phone, or Sales Person..."
                value={searchReceivables}
                onChange={e => setSearchReceivables(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar size={15} className="text-slate-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate(''); }}
                  className="text-xs font-bold outline-none bg-transparent cursor-pointer text-slate-700"
                  title="Filter by policy issuance month"
                />
                {selectedMonth && (
                  <button onClick={() => setSelectedMonth('')} className="text-slate-400 hover:text-rose-500">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={paymentStatusFilter}
                onChange={e => setPaymentStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer text-slate-700"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Paid">Paid in Full ({receivablesSummary.paidCount})</option>
                <option value="Partial">Partial / Installment ({receivablesSummary.partialCount})</option>
                <option value="Pending">Pending / Unpaid ({receivablesSummary.pendingCount})</option>
              </select>

              <button
                onClick={() => fetchReceivables()}
                disabled={receivablesLoading}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Receivables"
              >
                <RefreshCw size={14} className={receivablesLoading ? 'animate-spin text-blue-600' : ''} />
              </button>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Policy & Client</th>
                    <th className="px-6 py-4">Sales Executive</th>
                    <th className="px-6 py-4">Total Premium</th>
                    <th className="px-6 py-4">Paid Amount</th>
                    <th className="px-6 py-4">Pending Balance</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4">1-Yr Expiry (Renewal)</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivablesLoading ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-blue-600" />
                          <span>Loading policy receivables...</span>
                        </div>
                      </td>
                    </tr>
                  ) : receivables.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 italic">
                        No policy finance records found matching criteria.
                      </td>
                    </tr>
                  ) : receivables.map((item) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                              <Shield size={18} />
                            </div>
                            <div>
                              <p className="font-mono font-bold text-slate-900">{item.policyNumber}</p>
                              <p className="font-bold text-slate-700">{item.clientName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.vehicleNo && (
                                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {item.vehicleNo}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  {item.provider} • {item.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <User size={13} className="text-slate-400" />
                            <span>{item.salesPersonName}</span>
                          </div>
                          {item.clientPhone && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.clientPhone}</p>
                          )}
                        </td>

                        <td className="px-6 py-4 font-black text-slate-900 text-sm">
                          ₹{item.totalPremium.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 font-bold text-emerald-700">
                          ₹{item.paidAmount.toLocaleString()}
                          <span className="block text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                            via {item.paymentMode}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`font-black text-sm ${item.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            ₹{item.pendingAmount.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block ${
                            item.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.paymentStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.paymentStatus}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {item.expiryDate ? (
                            <div>
                              <p className="font-bold text-slate-800">{new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <p className="text-[10px] text-blue-600 font-bold">1-Year Term</p>
                            </div>
                          ) : 'N/A'}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Record Payment Button */}
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleOpenPaymentModal(item)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                  item.pendingAmount > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Record an installment or payment receipt"
                              >
                                <DollarSign size={13} />
                                <span>{item.pendingAmount > 0 ? 'Collect' : 'Add Txn'}</span>
                              </button>
                            )}

                            {/* Download 7-Doc Merged PDF Bundle */}
                            {item.compiledPdfUrl && (
                              <a
                                href={item.compiledPdfUrl}
                                download={`policy_bundle_${item.clientName}_${item.vehicleNo}.pdf`}
                                className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-all border border-blue-200"
                                title="Download 7-Document Merged PDF for 1-Year Renewal"
                              >
                                <Download size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER & OPERATIONAL EXPENSES */}
      {activeTab === 'ledger' && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Net Balance" value={`₹${ledgerBalance.toLocaleString()}`} icon={<Wallet size={24} />} color="bg-white" textColor="text-slate-900" iconColor="bg-blue-50 text-blue-600" />
            <StatCard title="Monthly Income" value={`+₹${ledgerIncome.toLocaleString()}`} icon={<ArrowUpCircle size={24} />} color="bg-white" textColor="text-emerald-600" iconColor="bg-emerald-50 text-emerald-600" />
            <StatCard title="Monthly Expenses" value={`-₹${ledgerExpense.toLocaleString()}`} icon={<ArrowDownCircle size={24} />} color="bg-white" textColor="text-rose-600" iconColor="bg-rose-50 text-rose-600" />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-black text-slate-900">Ledger Transactions</h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search ledger entries..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchLedger}
                  onChange={e => setSearchLedger(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Transaction / Category</th>
                    <th className="px-6 py-4">Description / Reference</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerLoading ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-400">Loading ledger...</td></tr>
                  ) : filteredLedgerTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">No transactions found.</td></tr>
                  ) : filteredLedgerTransactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {t.type === 'income' ? (
                            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><ArrowUpCircle size={15} /></span>
                          ) : (
                            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600"><ArrowDownCircle size={15} /></span>
                          )}
                          <span className="font-bold text-slate-800">{t.category || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{t.description || '—'}</p>
                        {t.referenceNumber && <span className="font-mono text-[10px] text-slate-400">Ref: {t.referenceNumber}</span>}
                      </td>
                      <td className="px-6 py-4 font-black">
                        <span className={t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                          {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECORD INSTALLMENT PAYMENT MODAL */}
      {paymentModalPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">Record Payment Installment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Policy: <span className="font-mono font-bold text-slate-800">{paymentModalPolicy.policyNumber}</span> • {paymentModalPolicy.clientName}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalPolicy(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Premium</span>
                <p className="font-black text-slate-800 text-xs mt-0.5">₹{paymentModalPolicy.totalPremium.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Already Paid</span>
                <p className="font-black text-emerald-700 text-xs mt-0.5">₹{paymentModalPolicy.paidAmount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase">Pending Due</span>
                <p className="font-black text-rose-700 text-xs mt-0.5">₹{paymentModalPolicy.pendingAmount.toLocaleString()}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Enter amount collected..."
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="UPI">UPI / Google Pay / PhonePe</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking / NEFT / IMPS</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Reference / UTR / Cheque Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # or Bank Txn ID..."
                  value={paymentForm.referenceNumber}
                  onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd installment collected by Sales Executive..."
                  value={paymentForm.description}
                  onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalPolicy(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirm Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD GENERAL TRANSACTION MODAL */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-base">Add Ledger Transaction</h3>
              <button onClick={() => setIsLedgerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLedgerTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Transaction Type</label>
                <select
                  value={newTransaction.type}
                  onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="expense">Expense (Payout / Cost)</option>
                  <option value="income">Income (Collection / Revenue)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Supplies, RTO Fees, Commission, Rent..."
                  value={newTransaction.category}
                  onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newTransaction.amount}
                  onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={newTransaction.payment_method}
                  onChange={e => setNewTransaction({ ...newTransaction, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online / UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black shadow-md"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatBox({ title, value, subtitle, icon, badgeColor }: any) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${badgeColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{value}</h3>
        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, textColor, iconColor }: any) {
  return (
    <div className={`p-6 rounded-3xl border border-slate-100 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className={`text-2xl font-black mt-1 ${textColor}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-2xl ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
