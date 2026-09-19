"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  Search, Plus, X, Download, RefreshCw, Filter, CheckCircle2,
  Clock, IndianRupee, Phone, FileText, Calendar, Edit3, Trash2,
  ChevronRight, Car, Award, ShieldCheck
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const WORK_TYPES = [
  'INS CF TO HPT',
  'TO PERMIT',
  'TRUCK CF',
  'INS AND CF',
  'TO',
  'TO CF HPT',
  'Ownership Transfer',
  'Fitness Certificate',
  'NOC',
  'HPA / Hypothecation',
  'Re-registration',
  'OTHER'
]

const VEHICLE_TYPES = [
  'ALL',
  'TRUCK',
  'AAKHARI SAFAR',
  'CAR',
  'BIKE',
  'BUS',
  'TRACTOR',
  'AUTO',
  'OTHER'
]

const INITIAL_FORM = {
  inDate: new Date().toISOString().slice(0, 10),
  customerName: '',
  workType: 'INS CF TO HPT',
  vehicleType: '',
  vehicleNo: '',
  amount: '',
  jama: '',
  baki: 0,
  mobileNo: '',
  insuranceByTorque: 'PENDING',
  remarks: '',
  status: 'pending',
  leadId: ''
}

export default function RTOPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    totalAmount: 0,
    totalJama: 0,
    totalBaki: 0,
    insuranceDone: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('all')
  const [insuranceFilter, setInsuranceFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all') // 'all', 'paid', 'baki'
  const [leads, setLeads] = useState<any[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<typeof INITIAL_FORM>(INITIAL_FORM)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchData()
    fetchLeads()
  }, [search, workTypeFilter, insuranceFilter, paymentFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.append('search', search.trim())
      if (workTypeFilter !== 'all') params.append('workType', workTypeFilter)
      if (insuranceFilter !== 'all') params.append('insuranceByTorque', insuranceFilter)
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter)

      const res = await fetchApi(`/api/v1/workflow/rto?${params.toString()}`)
      if (res && res.items) {
        setItems(res.items)
        if (res.metrics) setMetrics(res.metrics)
      } else if (Array.isArray(res)) {
        setItems(res)
      }
    } catch (err) {
      console.error('Failed to fetch RTO tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const data = await fetchApi('/api/v1/leads?limit=100')
      setLeads(data.leads || [])
    } catch {}
  }

  // Handle lead selection in new task modal
  const handleLeadChange = (leadId: string) => {
    const selected = leads.find(l => l.id === leadId)
    if (selected) {
      setFormData(prev => ({
        ...prev,
        leadId: selected.id,
        customerName: selected.clientName || prev.customerName,
        vehicleNo: selected.vehicleNo || prev.vehicleNo,
        mobileNo: selected.contactNo || prev.mobileNo
      }))
    } else {
      setFormData(prev => ({ ...prev, leadId: '' }))
    }
  }

  // Handle real-time BAKI = AMOUNT - JAMA auto-calculation for New Task
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

  // Handle real-time BAKI = AMOUNT - JAMA auto-calculation for Edit Task
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
    if (!formData.customerName.trim() && !formData.vehicleNo.trim()) {
      setErrorMsg('Please enter customer name or vehicle number.')
      return
    }

    setSubmitting(true)
    try {
      await fetchApi('/api/v1/workflow/rto', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setIsModalOpen(false)
      setFormData(INITIAL_FORM)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create RTO task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setSubmitting(true)
    try {
      await fetchApi('/api/v1/workflow/rto', {
        method: 'PATCH',
        body: JSON.stringify(editingItem)
      })
      setIsEditModalOpen(false)
      setEditingItem(null)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to update RTO task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this RTO record?')) return
    try {
      await fetchApi(`/api/v1/workflow/rto?id=${id}`, { method: 'DELETE' })
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
    const headers = [
      'SR NO',
      'IN DATE',
      'NAME',
      'WORK TYPE',
      'VEHICLE TYPE',
      'VEHICLE NO',
      'AMOUNT',
      'JAMA',
      'BAKI',
      'MOBILE NO',
      'INSURANCE BY TORQUE',
      'REMARKS',
      'STATUS'
    ]
    const rows = items.map((item, idx) => [
      item.srNo || idx + 1,
      item.inDate ? new Date(item.inDate).toLocaleDateString('en-IN') : '',
      `"${item.name || item.customerName || ''}"`,
      `"${item.workType || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${item.vehicleNo || item.vehicleNumber || ''}"`,
      item.amount || item.fees || 0,
      item.jama || 0,
      item.baki || 0,
      `"${item.mobileNo || ''}"`,
      `"${item.insuranceByTorque || ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
      item.status || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encoded = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encoded)
    link.setAttribute('download', `torque_vehicle_rto_register_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      {/* Header & Dual Register Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Vehicle RTO & Passing Work Register</h1>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
              Vehicle Work (12 Columns)
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track vehicle transfers, CF passing, permits, HPT endorsements, payments, dues, and Torque insurance.
          </p>
        </div>

        {/* Dual Tab Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
            <button
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-blue-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Car size={14} />
              Vehicle RTO Work
            </button>
            <button
              onClick={() => router.push('/dl')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5"
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
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={() => {
              setFormData(INITIAL_FORM)
              setErrorMsg('')
              setIsModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
          >
            <Plus size={16} />
            New Vehicle RTO Task
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Tasks</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Car size={18} />
            </span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{metrics.totalTasks}</p>
          <span className="text-[11px] text-gray-400">All Vehicle RTO cases</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <IndianRupee size={18} />
            </span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            ₹{metrics.totalAmount.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-gray-400">Total service charges</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Jama</span>
            <span className="p-2 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <p className="text-2xl font-black text-green-700 mt-2">
            ₹{metrics.totalJama.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-green-600">Total received amount</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Total Baki</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Clock size={18} />
            </span>
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">
            ₹{metrics.totalBaki.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-red-400">Outstanding pending balance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Insurance Done</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={18} />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{metrics.insuranceDone}</p>
          <span className="text-[11px] text-emerald-600">Insurance by Torque Done</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer name, vehicle no, mobile, work type, or remarks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Work Type Filter */}
          <select
            value={workTypeFilter}
            onChange={e => setWorkTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Work Types</option>
            {WORK_TYPES.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {/* Insurance By Torque Filter */}
          <select
            value={insuranceFilter}
            onChange={e => setInsuranceFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Insurance By Torque: All</option>
            <option value="DONE">Done</option>
            <option value="PENDING">Pending / No</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Fully Paid (BAKI = 0)</option>
            <option value="baki">Pending Dues (BAKI &gt; 0)</option>
          </select>
        </div>
      </div>

      {/* 12-Column Table Register */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-3.5 py-3.5">SR NO</th>
                <th className="px-3.5 py-3.5">IN DATE</th>
                <th className="px-4 py-3.5">NAME</th>
                <th className="px-4 py-3.5">WORK TYPE</th>
                <th className="px-3.5 py-3.5">VEHICLE TYPE</th>
                <th className="px-3.5 py-3.5">VEHICLE NO</th>
                <th className="px-3.5 py-3.5 text-right">AMOUNT</th>
                <th className="px-3.5 py-3.5 text-right">JAMA</th>
                <th className="px-3.5 py-3.5 text-right">BAKI</th>
                <th className="px-3.5 py-3.5">MOBILE NO</th>
                <th className="px-3.5 py-3.5 text-center">INSURANCE BY TORQUE</th>
                <th className="px-4 py-3.5">REMARKS</th>
                <th className="px-3.5 py-3.5 text-center">STATUS</th>
                <th className="px-3.5 py-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Vehicle RTO tasks...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-gray-400">
                    No Vehicle RTO records found matching your filters.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const amt = Number(item.amount || item.fees || 0)
                  const jm = Number(item.jama || 0)
                  const bk = item.baki !== undefined && item.baki !== null ? Number(item.baki) : Math.max(0, amt - jm)
                  const isDoneIns = (item.insuranceByTorque || '').toUpperCase() === 'DONE'
                  const custName = item.name || item.customerName || item.lead?.clientName || '-'
                  const vehNo = item.vehicleNo || item.vehicleNumber || '-'

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* 1. SR NO */}
                      <td className="px-3.5 py-3 font-semibold text-gray-500">
                        {item.srNo || idx + 1}
                      </td>

                      {/* 2. IN DATE */}
                      <td className="px-3.5 py-3 font-medium text-gray-600">
                        {item.inDate ? new Date(item.inDate).toLocaleDateString('en-IN') : '-'}
                      </td>

                      {/* 3. NAME */}
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{custName}</span>
                        </div>
                      </td>

                      {/* 4. WORK TYPE */}
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200/80">
                          {item.workType || '-'}
                        </span>
                      </td>

                      {/* 5. VEHICLE TYPE */}
                      <td className="px-3.5 py-3 font-medium text-gray-600">
                        {item.vehicleType ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.vehicleType}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* 6. VEHICLE NO */}
                      <td className="px-3.5 py-3 font-mono font-bold text-gray-900 tracking-wider">
                        {vehNo !== '-' ? (
                          <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded text-yellow-900">
                            {vehNo}
                          </span>
                        ) : '-'}
                      </td>

                      {/* 7. AMOUNT */}
                      <td className="px-3.5 py-3 text-right font-bold text-gray-900">
                        ₹{amt.toLocaleString('en-IN')}
                      </td>

                      {/* 8. JAMA */}
                      <td className="px-3.5 py-3 text-right font-bold text-green-600">
                        ₹{jm.toLocaleString('en-IN')}
                      </td>

                      {/* 9. BAKI */}
                      <td className="px-3.5 py-3 text-right">
                        {bk > 0 ? (
                          <span className="px-2 py-0.5 rounded-md font-bold text-red-700 bg-red-50 border border-red-200">
                            ₹{bk.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md font-bold text-green-700 bg-green-50 border border-green-200">
                            ₹0 (Paid)
                          </span>
                        )}
                      </td>

                      {/* 10. MOBILE NO */}
                      <td className="px-3.5 py-3 font-medium text-gray-700">
                        {item.mobileNo ? (
                          <a
                            href={`tel:${item.mobileNo}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Phone size={12} className="text-gray-400" />
                            {item.mobileNo}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* 11. INSURANCE BY TORQUE */}
                      <td className="px-3.5 py-3 text-center">
                        {isDoneIns ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                            <ShieldCheck size={12} />
                            DONE
                          </span>
                        ) : item.insuranceByTorque ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                            {item.insuranceByTorque}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* 12. REMARKS */}
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={item.remarks || ''}>
                        {item.remarks || <span className="text-gray-400">-</span>}
                      </td>

                      {/* STATUS */}
                      <td className="px-3.5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status || 'pending'}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem({
                                ...item,
                                name: item.name || item.customerName || '',
                                vehicleNo: item.vehicleNo || item.vehicleNumber || '',
                                amount: item.amount || item.fees || 0,
                                jama: item.jama || 0,
                                baki: item.baki !== undefined && item.baki !== null ? item.baki : Math.max(0, amt - jm),
                                inDate: item.inDate ? new Date(item.inDate).toISOString().slice(0, 10) : ''
                              })
                              setIsEditModalOpen(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit task"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Delete task"
                          >
                            <Trash2 size={15} />
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

      {/* CREATE TASK MODAL (12 Fields with real-time BAKI auto-calculation) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="font-bold text-gray-900 text-base">New Vehicle RTO Task</h3>
                <p className="text-xs text-gray-500">Add entry to Vehicle RTO & Passing register</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200/60 rounded-full transition-all text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Optional Lead Selector to auto-populate */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Link Existing CRM Lead (Optional)
                </label>
                <select
                  value={formData.leadId}
                  onChange={e => handleLeadChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Lead Linked (Manual Entry) --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} ({l.vehicleNo || 'No vehicle'}) - {l.contactNo || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IN DATE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    IN DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.inDate}
                    onChange={e => setFormData({ ...formData, inDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* NAME */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    CUSTOMER NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IKBAL IBRAHIM KHOKHAR"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                {/* WORK TYPE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    WORK TYPE *
                  </label>
                  <input
                    list="workTypesList"
                    type="text"
                    required
                    placeholder="e.g. INS CF TO HPT"
                    value={formData.workType}
                    onChange={e => setFormData({ ...formData, workType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="workTypesList">
                    {WORK_TYPES.map(w => <option key={w} value={w} />)}
                  </datalist>
                </div>

                {/* VEHICLE TYPE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    VEHICLE TYPE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRUCK, AAKHARI SAFAR, CAR"
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* VEHICLE NO */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    VEHICLE NUMBER *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ36T0767"
                    value={formData.vehicleNo}
                    onChange={e => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* MOBILE NO */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    MOBILE NO
                  </label>
                  <input
                    type="tel"
                    placeholder="10 digit phone number"
                    value={formData.mobileNo}
                    onChange={e => setFormData({ ...formData, mobileNo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* PAYMENT CALCULATION ROW: AMOUNT - JAMA = BAKI */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Payment Details (Auto-Calculated Baki = Amount - Jama)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      AMOUNT (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.amount}
                      onChange={e => handleAmountChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      JAMA / PAID (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.jama}
                      onChange={e => handleJamaChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-green-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      BAKI / DUE (₹)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={formData.baki}
                      className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-700 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INSURANCE BY TORQUE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    INSURANCE BY TORQUE
                  </label>
                  <select
                    value={formData.insuranceByTorque}
                    onChange={e => setFormData({ ...formData, insuranceByTorque: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="DONE">DONE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                {/* TASK STATUS */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    TASK STATUS
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* REMARKS */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  REMARKS IF ANY
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. INSU DONE / PAYMENT AVE PACHI J KARVU / WORK HAS BEEN DONE ON SAME DAY"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Edit Vehicle RTO Task</h3>
                <p className="text-xs text-gray-500">Update record details & payment amounts</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-200/60 rounded-full transition-all text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IN DATE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    IN DATE
                  </label>
                  <input
                    type="date"
                    value={editingItem.inDate || ''}
                    onChange={e => setEditingItem({ ...editingItem, inDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* NAME */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    CUSTOMER NAME
                  </label>
                  <input
                    type="text"
                    value={editingItem.customerName || editingItem.name || ''}
                    onChange={e => setEditingItem({ ...editingItem, customerName: e.target.value, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                {/* WORK TYPE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    WORK TYPE
                  </label>
                  <input
                    list="workTypesListEdit"
                    type="text"
                    value={editingItem.workType || ''}
                    onChange={e => setEditingItem({ ...editingItem, workType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="workTypesListEdit">
                    {WORK_TYPES.map(w => <option key={w} value={w} />)}
                  </datalist>
                </div>

                {/* VEHICLE TYPE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    VEHICLE TYPE
                  </label>
                  <input
                    type="text"
                    value={editingItem.vehicleType || ''}
                    onChange={e => setEditingItem({ ...editingItem, vehicleType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* VEHICLE NO */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    VEHICLE NUMBER
                  </label>
                  <input
                    type="text"
                    value={editingItem.vehicleNo || editingItem.vehicleNumber || ''}
                    onChange={e => setEditingItem({ ...editingItem, vehicleNo: e.target.value.toUpperCase(), vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* MOBILE NO */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    MOBILE NO
                  </label>
                  <input
                    type="tel"
                    value={editingItem.mobileNo || ''}
                    onChange={e => setEditingItem({ ...editingItem, mobileNo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* PAYMENT CALCULATION ROW: AMOUNT - JAMA = BAKI */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Payment Details (Auto-Calculated Baki = Amount - Jama)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      AMOUNT (₹)
                    </label>
                    <input
                      type="number"
                      value={editingItem.amount || editingItem.fees || 0}
                      onChange={e => handleEditAmountChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      JAMA / PAID (₹)
                    </label>
                    <input
                      type="number"
                      value={editingItem.jama || 0}
                      onChange={e => handleEditJamaChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-green-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      BAKI / DUE (₹)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={editingItem.baki || 0}
                      className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-700 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INSURANCE BY TORQUE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    INSURANCE BY TORQUE
                  </label>
                  <select
                    value={editingItem.insuranceByTorque || 'PENDING'}
                    onChange={e => setEditingItem({ ...editingItem, insuranceByTorque: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="DONE">DONE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                {/* TASK STATUS */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    TASK STATUS
                  </label>
                  <select
                    value={editingItem.status || 'pending'}
                    onChange={e => setEditingItem({ ...editingItem, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* REMARKS */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  REMARKS IF ANY
                </label>
                <textarea
                  rows={2}
                  value={editingItem.remarks || ''}
                  onChange={e => setEditingItem({ ...editingItem, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
