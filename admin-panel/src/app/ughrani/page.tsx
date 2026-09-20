"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  BookOpen, Users, DollarSign, Search, Plus, Download,
  CheckCircle2, Clock, AlertCircle, RefreshCw, X, Printer,
  Phone, Car, UserCheck, Calendar, ArrowRight, TrendingUp
} from 'lucide-react'
import { formatDateDMY, getISTDateString } from '@/lib/date-format'
import MoneyReceiptModal, { ReceiptData } from '@/components/pdf/MoneyReceiptModal'

interface UghraniBook {
  id: string
  bookName: string
  description: string | null
  createdAt: string
  assignmentsCount: number
  totalDue: number
  totalCollected: number
  pendingBalance: number
}

interface UghraniAssignment {
  id: string
  bookId: string
  bookName: string
  agentId: string | null
  agentName: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  vehicleNo: string | null
  amountDue: number
  collectedAmount: number
  pendingAmount: number
  status: 'pending' | 'partially_collected' | 'collected'
  collectedDate: string | null
  remarks: string | null
  createdAt: string
}

export default function UghraniPage() {
  const [activeTab, setActiveTab] = useState<'assignments' | 'books'>('assignments')
  const [loading, setLoading] = useState(true)

  // Data
  const [books, setBooks] = useState<UghraniBook[]>([])
  const [assignments, setAssignments] = useState<UghraniAssignment[]>([])
  const [agents, setAgents] = useState<{ id: string; fullName: string }[]>([])

  // Filters
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_collected' | 'collected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    totalDue: 0,
    totalCollected: 0,
    totalPending: 0,
    pendingCount: 0,
    partialCount: 0,
    collectedCount: 0,
  })

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [newBookName, setNewBookName] = useState('')
  const [newBookDesc, setNewBookDesc] = useState('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    bookId: '',
    agentId: '',
    customerName: '',
    customerPhone: '',
    vehicleNo: '',
    amountDue: '',
    remarks: '',
  })

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<UghraniAssignment | null>(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectDate, setCollectDate] = useState(getISTDateString(0))
  const [collectRemarks, setCollectRemarks] = useState('')

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // Fetch Users / Agents once
  useEffect(() => {
    fetchApi('/api/v1/users?limit=100').then((res: any) => {
      const uList = res.users || (Array.isArray(res) ? res : [])
      setAgents(uList.map((u: any) => ({ id: u.id, fullName: u.fullName || u.email })))
    }).catch(() => {})
  }, [])

  // Fetch Books
  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetchApi('/api/v1/ughrani/books')
      if (Array.isArray(res)) setBooks(res)
    } catch (err) {
      console.error('Failed to fetch books:', err)
    }
  }, [])

  // Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('paged', 'true')
      params.append('limit', '300')
      if (selectedBookFilter !== 'all') params.append('book_id', selectedBookFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await fetchApi(`/api/v1/ughrani/assignments?${params.toString()}`)
      if (res && res.assignments) {
        setAssignments(res.assignments)
        if (res.summary) setSummary(res.summary)
      } else if (Array.isArray(res)) {
        setAssignments(res)
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBookFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchBooks()
    fetchAssignments()
  }, [fetchBooks, fetchAssignments])

  // Create Book
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBookName.trim()) return
    try {
      await fetchApi('/api/v1/ughrani/books', {
        method: 'POST',
        body: JSON.stringify({ book_name: newBookName.trim(), description: newBookDesc.trim() || null })
      })
      setIsBookModalOpen(false)
      setNewBookName('')
      setNewBookDesc('')
      fetchBooks()
    } catch (err: any) {
      alert(err.message || 'Failed to create book')
    }
  }

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(newAssignment.amountDue)
    if (!newAssignment.bookId || isNaN(amt) || amt <= 0) {
      alert('Please select a collection book and enter a valid positive amount due.')
      return
    }

    try {
      await fetchApi('/api/v1/ughrani/assignments', {
        method: 'POST',
        body: JSON.stringify({
          book_id: newAssignment.bookId,
          agent_id: newAssignment.agentId || null,
          customer_name: newAssignment.customerName.trim() || 'Customer',
          customer_phone: newAssignment.customerPhone.trim() || null,
          vehicle_no: newAssignment.vehicleNo.trim().toUpperCase() || null,
          amount_due: amt,
          remarks: newAssignment.remarks.trim() || null,
        })
      })

      setIsAssignModalOpen(false)
      setNewAssignment({
        bookId: '',
        agentId: '',
        customerName: '',
        customerPhone: '',
        vehicleNo: '',
        amountDue: '',
        remarks: '',
      })
      fetchAssignments()
      fetchBooks()
    } catch (err: any) {
      alert(err.message || 'Failed to record assignment')
    }
  }

  // Open Log Collection Modal
  const openCollectModal = (asg: UghraniAssignment) => {
    setSelectedAssignment(asg)
    setCollectAmount(String(asg.pendingAmount))
    setCollectDate(getISTDateString(0))
    setCollectRemarks('')
    setIsCollectModalOpen(true)
  }

  // Submit Collection
  const submitCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssignment) return
    const amt = parseFloat(collectAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a positive collection amount')
      return
    }

    const totalCollected = selectedAssignment.collectedAmount + amt
    const isFull = totalCollected >= selectedAssignment.amountDue
    const newStatus = isFull ? 'collected' : 'partially_collected'

    try {
      await fetchApi(`/api/v1/ughrani/assignments/${selectedAssignment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          collected_amount: totalCollected,
          status: newStatus,
          collected_date: collectDate,
          remarks: collectRemarks.trim() || selectedAssignment.remarks,
        })
      })

      setIsCollectModalOpen(false)
      
      // Auto prompt to print receipt for customer!
      setReceiptData({
        receiptNo: `UGH-${selectedAssignment.id.slice(0, 6).toUpperCase()}`,
        date: collectDate,
        clientName: selectedAssignment.customerName,
        clientPhone: selectedAssignment.customerPhone,
        vehicleNo: selectedAssignment.vehicleNo,
        amount: amt,
        paymentMethod: 'CASH / RECOVERY',
        referenceNumber: `Book: ${selectedAssignment.bookName}`,
        description: `Debt Collection / Ughrani recovery payment (Balance: ₹${Math.max(0, selectedAssignment.amountDue - totalCollected).toLocaleString('en-IN')})`,
      })
      setIsReceiptOpen(true)

      setSelectedAssignment(null)
      fetchAssignments()
      fetchBooks()
    } catch (err: any) {
      alert(err.message || 'Failed to record payment')
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this debt assignment?')) return
    try {
      await fetchApi(`/api/v1/ughrani/assignments/${id}`, { method: 'DELETE' })
      fetchAssignments()
      fetchBooks()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  const exportCSV = () => {
    if (assignments.length === 0) {
      alert('No data to export')
      return
    }
    const headers = ['Book', 'Customer', 'Phone', 'Vehicle', 'Agent', 'Amount Due', 'Collected', 'Pending', 'Status', 'Last Collected Date']
    const rows = assignments.map(a => [
      a.bookName,
      a.customerName,
      a.customerPhone || '',
      a.vehicleNo || '',
      a.agentName,
      a.amountDue,
      a.collectedAmount,
      a.pendingAmount,
      a.status.toUpperCase(),
      a.collectedDate ? formatDateDMY(a.collectedDate) : ''
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ughrani_recovery_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const recoveryRate = summary.totalDue > 0
    ? ((summary.totalCollected / summary.totalDue) * 100).toFixed(1)
    : '0.0'

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="text-red-600" size={26} />
              Ughrani & Debt Recovery
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Field collection books, agent debt assignments, and overdue balance tracking matching legacy system.
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
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={15} />
              New Book
            </button>
            <button
              onClick={() => {
                if (books.length === 0) {
                  alert('Please create at least one collection book first.')
                  setIsBookModalOpen(true)
                  return
                }
                setNewAssignment(prev => ({ ...prev, bookId: books[0].id }))
                setIsAssignModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} />
              Assign Debt
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Invoiced Debt</p>
            <p className="text-xl font-bold text-gray-900 mt-1 font-mono">₹{summary.totalDue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{summary.totalAssignments} accounts assigned</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Recovered</p>
            <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">₹{summary.totalCollected.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{summary.collectedCount} fully settled</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Pending Balance</p>
            <p className="text-xl font-bold text-red-700 mt-1 font-mono">₹{summary.totalPending.toLocaleString('en-IN')}</p>
            <p className="text-xs text-red-600 mt-0.5">{summary.pendingCount + summary.partialCount} pending recovery</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Recovery Efficiency</p>
            <p className="text-xl font-bold text-blue-700 mt-1 font-mono">{recoveryRate}%</p>
            <p className="text-xs text-blue-600 mt-0.5">{books.length} active collection books</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-bold">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Assignments & Collections ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'books'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Collection Books ({books.length})
          </button>
        </div>

        {activeTab === 'assignments' ? (
          <>
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {/* Book filter dropdown */}
                <select
                  value={selectedBookFilter}
                  onChange={e => setSelectedBookFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-hidden"
                >
                  <option value="all">All Collection Books</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.bookName}</option>
                  ))}
                </select>

                {/* Status Tabs */}
                {(['all', 'pending', 'partially_collected', 'collected'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'all' ? 'All' : st.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search customer, vehicle, book..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {/* Assignments Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Customer / Vehicle</th>
                      <th className="py-3 px-4">Book & Agent</th>
                      <th className="py-3 px-4">Amount Due</th>
                      <th className="py-3 px-4">Collected</th>
                      <th className="py-3 px-4">Pending Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-red-600" />
                          Loading assignments...
                        </td>
                      </tr>
                    ) : assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          No recovery assignments found. Click &quot;Assign Debt&quot; to assign a balance to a book.
                        </td>
                      </tr>
                    ) : (
                      assignments.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 text-sm">{a.customerName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {a.customerPhone && (
                                <span className="text-gray-500 text-[11px] flex items-center gap-0.5">
                                  <Phone size={11} /> {a.customerPhone}
                                </span>
                              )}
                              {a.vehicleNo && (
                                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.2 rounded text-gray-700 font-bold">
                                  {a.vehicleNo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800">{a.bookName}</div>
                            <div className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-1">
                              <UserCheck size={11} className="text-gray-400" />
                              {a.agentName}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 text-sm">
                            ₹{a.amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                            ₹{a.collectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-red-600 text-sm">
                            ₹{a.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            {a.status === 'collected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase">
                                <CheckCircle2 size={11} /> Collected
                              </span>
                            ) : a.status === 'partially_collected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold uppercase">
                                <Clock size={11} /> Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase">
                                <AlertCircle size={11} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {a.status !== 'collected' && (
                                <button
                                  onClick={() => openCollectModal(a)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                                >
                                  Collect
                                </button>
                              )}
                              {a.collectedAmount > 0 && (
                                <button
                                  onClick={() => {
                                    setReceiptData({
                                      receiptNo: `UGH-${a.id.slice(0, 6).toUpperCase()}`,
                                      date: a.collectedDate || a.createdAt,
                                      clientName: a.customerName,
                                      clientPhone: a.customerPhone,
                                      vehicleNo: a.vehicleNo,
                                      amount: a.collectedAmount,
                                      paymentMethod: 'CASH / RECOVERY',
                                      referenceNumber: `Book: ${a.bookName}`,
                                      description: `Payment towards recovery debt. Remaining: ₹${a.pendingAmount.toLocaleString('en-IN')}`,
                                    })
                                    setIsReceiptOpen(true)
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                                  title="Print receipt voucher"
                                >
                                  <Printer size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Delete"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Collection Books Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {books.map(b => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">{b.bookName}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {b.assignmentsCount} Accounts
                    </span>
                  </div>
                  {b.description && (
                    <p className="text-xs text-gray-500 mt-1">{b.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Due:</span>
                      <span className="font-mono font-bold text-gray-900">₹{b.totalDue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Collected:</span>
                      <span className="font-mono font-bold text-emerald-700">₹{b.totalCollected.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pending Balance:</span>
                      <span className="font-mono font-bold text-red-600">₹{b.pendingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Created: {formatDateDMY(b.createdAt)}</span>
                  <button
                    onClick={() => {
                      setSelectedBookFilter(b.id)
                      setActiveTab('assignments')
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    View Accounts <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Collection Book */}
        {isBookModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <BookOpen size={17} className="text-red-600" />
                  Create Collection Book
                </h3>
                <button onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateBook} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Book Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. October North Zone Recovery"
                    value={newBookName}
                    onChange={e => setNewBookName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes or collection area..."
                    value={newBookDesc}
                    onChange={e => setNewBookDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Create Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Debt */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Plus size={17} className="text-red-600" />
                  Assign Debt to Collection Book
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateAssignment} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Collection Book *</label>
                  <select
                    required
                    value={newAssignment.bookId}
                    onChange={e => setNewAssignment({ ...newAssignment, bookId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  >
                    <option value="">Select Book</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>{b.bookName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assign Field Agent</label>
                  <select
                    value={newAssignment.agentId}
                    onChange={e => setNewAssignment({ ...newAssignment, agentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Customer Name"
                      value={newAssignment.customerName}
                      onChange={e => setNewAssignment({ ...newAssignment, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={newAssignment.customerPhone}
                      onChange={e => setNewAssignment({ ...newAssignment, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Vehicle No</label>
                    <input
                      type="text"
                      placeholder="GJ01AB1234"
                      value={newAssignment.vehicleNo}
                      onChange={e => setNewAssignment({ ...newAssignment, vehicleNo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 font-mono uppercase border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Amount Due (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="5000"
                      value={newAssignment.amountDue}
                      onChange={e => setNewAssignment({ ...newAssignment, amountDue: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Reference policy or recovery note..."
                    value={newAssignment.remarks}
                    onChange={e => setNewAssignment({ ...newAssignment, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Save Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Payment / Collection */}
        {isCollectModalOpen && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
                <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <DollarSign size={17} className="text-emerald-600" />
                  Record Collection Payment
                </h3>
                <button onClick={() => setIsCollectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={submitCollection} className="p-6 space-y-4 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <p className="font-bold text-gray-900">{selectedAssignment.customerName}</p>
                  <p className="text-gray-500 mt-0.5">Total Due: ₹{selectedAssignment.amountDue.toLocaleString('en-IN')}</p>
                  <p className="text-red-600 font-semibold">Remaining Pending: ₹{selectedAssignment.pendingAmount.toLocaleString('en-IN')}</p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Collection Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={selectedAssignment.pendingAmount}
                    value={collectAmount}
                    onChange={e => setCollectAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden text-base font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Collection Date *</label>
                  <input
                    type="date"
                    required
                    value={collectDate}
                    onChange={e => setCollectDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Note / Mode</label>
                  <input
                    type="text"
                    placeholder="e.g. Cash collected by field executive"
                    value={collectRemarks}
                    onChange={e => setCollectRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCollectModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Confirm & Print Receipt
                  </button>
                </div>
              </form>
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
