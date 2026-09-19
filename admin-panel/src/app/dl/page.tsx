"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  Search, Plus, X, Download, RefreshCw, Filter, CheckCircle2,
  Clock, IndianRupee, Phone, FileText, Calendar, Edit3, Trash2,
  ChevronRight, Car, Award
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const WORK_TYPES = [
  'NEW DL 2,4',
  'RENEW FACELESS',
  'ADD TRANS ( HEAVY LICENSE )',
  'DL RENEWAL',
  'DUPLICATE DL',
  'ADDRESS CHANGE DL',
  'OTHER'
]

const INITIAL_FORM = {
  inDate: new Date().toISOString().slice(0, 10),
  name: '',
  workType: 'NEW DL 2,4',
  amount: '',
  jama: '',
  baki: 0,
  mobileNo: '',
  remarks: '',
  status: 'pending'
}

export default function DLPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    totalAmount: 0,
    totalJama: 0,
    totalBaki: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all') // 'all', 'paid', 'baki'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<typeof INITIAL_FORM>(INITIAL_FORM)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [search, workTypeFilter, paymentFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.append('search', search.trim())
      if (workTypeFilter !== 'all') params.append('workType', workTypeFilter)
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter)

      const res = await fetchApi(`/api/v1/workflow/dl?${params.toString()}`)
      if (res && res.items) {
        setItems(res.items)
        if (res.metrics) setMetrics(res.metrics)
      } else if (Array.isArray(res)) {
        setItems(res)
      }
    } catch (err) {
      console.error('Failed to fetch DL tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle amount & jama changes with instant auto-calculation: BAKI = AMOUNT - JAMA
  const handleAmountChange = (val: string) => {
    setFormData(prev => {
      const amt = parseFloat(val) || 0
      const jm = parseFloat(prev.jama) || 0
      return {
        ...prev,
        amount: val,
        baki: Math.max(0, amt - jm)
      }
    })
  }

  const handleJamaChange = (val: string) => {
    setFormData(prev => {
      const amt = parseFloat(prev.amount) || 0
      const jm = parseFloat(val) || 0
      return {
        ...prev,
        jama: val,
        baki: Math.max(0, amt - jm)
      }
    })
  }

  const handleEditAmountChange = (val: string) => {
    setEditingItem((prev: any) => {
      if (!prev) return prev
      const amt = parseFloat(val) || 0
      const jm = parseFloat(prev.jama) || 0
      return {
        ...prev,
        amount: val,
        baki: Math.max(0, amt - jm)
      }
    })
  }

  const handleEditJamaChange = (val: string) => {
    setEditingItem((prev: any) => {
      if (!prev) return prev
      const amt = parseFloat(prev.amount) || 0
      const jm = parseFloat(val) || 0
      return {
        ...prev,
        jama: val,
        baki: Math.max(0, amt - jm)
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!formData.name.trim()) {
      setErrorMsg('Please enter customer name.')
      return
    }

    setSubmitting(true)
    try {
      await fetchApi('/api/v1/workflow/dl', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setIsModalOpen(false)
      setFormData(INITIAL_FORM)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create DL task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setSubmitting(true)
    try {
      await fetchApi('/api/v1/workflow/dl', {
        method: 'PATCH',
        body: JSON.stringify(editingItem)
      })
      setIsEditModalOpen(false)
      setEditingItem(null)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to update DL task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DL record?')) return
    try {
      await fetchApi(`/api/v1/workflow/dl?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  const exportCSV = () => {
    if (items.length === 0) {
      alert('No records to export')
      return
    }
    const headers = ['SR NO', 'IN DATE', 'NAME', 'WORK TYPE', 'AMOUNT', 'JAMA', 'BAKI', 'MOBILE NO', 'REMARKS', 'STATUS']
    const rows = items.map((item, idx) => [
      item.srNo || idx + 1,
      item.inDate ? new Date(item.inDate).toLocaleDateString('en-IN') : '',
      `"${item.name || ''}"`,
      `"${item.workType || ''}"`,
      item.amount || 0,
      item.jama || 0,
      item.baki || 0,
      `"${item.mobileNo || ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
      item.status || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encoded = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute('download', `torque_dl_register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      {/* Header & Register Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Driving License & Faceless Register</h1>
            <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full">
              DL Work (8 Columns)
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track customer driving licenses, faceless renewals, endorsements, payments, and dues.
          </p>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
            <button
              onClick={() => router.push('/rto')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
            >
              <Car size={14} />
              Vehicle RTO Work
            </button>
            <button
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-blue-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Award size={14} />
              Driving License (DL)
            </button>
          </div>

          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm transition-all"
          >
            <Download size={15} />
            Export CSV
          </button>

          <button
            onClick={() => {
              setFormData(INITIAL_FORM)
              setErrorMsg('')
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            New DL Entry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total DL Tasks</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.totalTasks}</p>
          </div>
          <div className="p-3 rounded-xl border bg-purple-50 text-purple-600 border-purple-200">
            <Award size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Work Amount</p>
            <p className="text-2xl font-black text-gray-900 mt-1">₹{metrics.totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl border bg-blue-50 text-blue-600 border-blue-200">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Received (JAMA)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹{metrics.totalJama.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl border bg-emerald-50 text-emerald-600 border-emerald-200">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Due (BAKI)</p>
            <p className={`text-2xl font-black mt-1 ${metrics.totalBaki > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              ₹{metrics.totalBaki.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 rounded-xl border bg-rose-50 text-rose-600 border-rose-200">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search Name, Mobile, Work Type, Remarks..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Work Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={14} />
            <select
              value={workTypeFilter}
              onChange={e => setWorkTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Work Types</option>
              {WORK_TYPES.map(wt => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payments</option>
            <option value="paid">Fully Paid (BAKI = 0)</option>
            <option value="baki">Pending Dues (BAKI &gt; 0)</option>
          </select>
        </div>
      </div>

      {/* 8-Column DL Work Table */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3.5">SR NO</th>
                <th className="px-4 py-3.5">IN DATE</th>
                <th className="px-4 py-3.5">NAME</th>
                <th className="px-4 py-3.5">WORK TYPE</th>
                <th className="px-4 py-3.5">AMOUNT</th>
                <th className="px-4 py-3.5">JAMA</th>
                <th className="px-4 py-3.5">BAKI</th>
                <th className="px-4 py-3.5">MOBILE NO</th>
                <th className="px-4 py-3.5">REMARKS</th>
                <th className="px-4 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <span>Loading DL records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Award size={32} className="text-gray-300" />
                      <p className="font-semibold text-gray-600">No DL tasks found</p>
                      <p className="text-xs text-gray-400">Click &quot;New DL Entry&quot; to register a driving license task.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item, idx) => {
                const bakiNum = parseFloat(item.baki || 0)
                const isPendingBaki = bakiNum > 0

                return (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-gray-400">
                      {item.srNo || idx + 1}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-gray-700 whitespace-nowrap">
                      {item.inDate ? new Date(item.inDate).toLocaleDateString('en-IN') : '—'}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      {item.name}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.workType}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      ₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-emerald-600">
                      ₹{parseFloat(item.jama || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isPendingBaki
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        ₹{bakiNum.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-gray-700">
                      {item.mobileNo ? (
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-gray-400" />
                          <span>{item.mobileNo}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-gray-600 max-w-[200px] truncate" title={item.remarks || ''}>
                      {item.remarks || '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem({
                              ...item,
                              inDate: item.inDate ? new Date(item.inDate).toISOString().slice(0, 10) : ''
                            })
                            setIsEditModalOpen(true)
                          }}
                          title="Edit DL entry"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete DL entry"
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
      {/* NEW DL ENTRY MODAL (8 Fields + Real-Time BAKI Calculation)               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">New Driving License Entry</h3>
                <p className="text-xs text-purple-100">Record customer DL / faceless application details</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 text-white transition-all">
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    IN DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.inDate}
                    onChange={e => setFormData({ ...formData, inDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    MOBILE NO
                  </label>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={e => setFormData({ ...formData, mobileNo: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  placeholder="Customer Full Name"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  WORK TYPE <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.workType}
                  onChange={e => setFormData({ ...formData, workType: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  {WORK_TYPES.map(wt => (
                    <option key={wt} value={wt}>{wt}</option>
                  ))}
                </select>
              </div>

              {/* Financial Auto-calculation Section: AMOUNT, JAMA, BAKI */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="text-[11px] font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Payment Breakdown</span>
                  <span className="text-[10px] text-purple-600 font-semibold">BAKI = AMOUNT - JAMA</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">AMOUNT (₹)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={e => handleAmountChange(e.target.value)}
                      placeholder="Total"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">JAMA (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.jama}
                      onChange={e => handleJamaChange(e.target.value)}
                      placeholder="Received"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none font-bold text-emerald-600 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">BAKI (₹)</label>
                    <input
                      readOnly
                      type="number"
                      value={formData.baki}
                      className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  REMARKS
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. PAYMENT AVE PACHI J KARVU..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save DL Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT DL ENTRY MODAL                                                       */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Edit Driving License Task</h3>
                <p className="text-xs text-slate-400">Update payment, status, or remarks</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">IN DATE</label>
                  <input
                    type="date"
                    value={editingItem.inDate || ''}
                    onChange={e => setEditingItem({ ...editingItem, inDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">MOBILE NO</label>
                  <input
                    type="tel"
                    value={editingItem.mobileNo || ''}
                    onChange={e => setEditingItem({ ...editingItem, mobileNo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">NAME</label>
                <input
                  required
                  type="text"
                  value={editingItem.name || ''}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">WORK TYPE</label>
                <select
                  value={editingItem.workType || ''}
                  onChange={e => setEditingItem({ ...editingItem, workType: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                >
                  {WORK_TYPES.map(wt => (
                    <option key={wt} value={wt}>{wt}</option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">AMOUNT (₹)</label>
                    <input
                      type="number"
                      value={editingItem.amount || 0}
                      onChange={e => handleEditAmountChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">JAMA (₹)</label>
                    <input
                      type="number"
                      value={editingItem.jama || 0}
                      onChange={e => handleEditJamaChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">BAKI (₹)</label>
                    <input
                      readOnly
                      type="number"
                      value={editingItem.baki || 0}
                      className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">STATUS</label>
                <select
                  value={editingItem.status || 'pending'}
                  onChange={e => setEditingItem({ ...editingItem, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">REMARKS</label>
                <textarea
                  rows={2}
                  value={editingItem.remarks || ''}
                  onChange={e => setEditingItem({ ...editingItem, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md"
                >
                  {submitting ? 'Updating...' : 'Update DL Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
