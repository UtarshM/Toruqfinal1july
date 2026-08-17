"use client"

import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  RefreshCw, Calendar, Clock, AlertTriangle, CheckCircle2,
  Search, Filter, Download, Phone, MessageCircle, Shield,
  User, Car, ArrowUpRight, FileText, ChevronRight, X, Edit3, Sparkles
} from 'lucide-react'

interface RenewalItem {
  id: string
  policyNumber: string
  provider: string
  type: string
  premiumAmount: number
  issueDate: string
  expiryDate: string | null
  daysRemaining: number
  urgencyCategory: string
  renewalStatus: string
  renewalNotes: string
  renewalFollowUpDate: string | null
  leadId: string | null
  clientName: string
  clientPhone: string
  clientEmail: string
  vehicleNo: string
  gvw: string
  salesPersonName: string
  salesPersonId: string | null
  compiledPdfUrl: string | null
  documentsCount: number
}

const RENEWAL_STAGES = [
  'Pending Contact',
  'Follow-up In Progress',
  'Quotation Sent',
  'Renewed',
  'Lost'
]

export default function RenewalsPage() {
  const { user } = useAuth()
  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toUpperCase()
  const isManagerOrAdmin = roleName.includes('MANAGER') || roleName.includes('ADMIN') || roleName.includes('SUPER')

  const [renewals, setRenewals] = useState<RenewalItem[]>([])
  const [summary, setSummary] = useState<any>({
    totalRenewals: 0,
    expiringThisMonth: 0,
    expiring30Days: 0,
    overdueCount: 0,
    renewedCount: 0,
    totalVolume: 0
  })
  const [loading, setLoading] = useState(true)

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Notes Modal State
  const [notesTarget, setNotesTarget] = useState<RenewalItem | null>(null)
  const [modalNotes, setModalNotes] = useState('')
  const [modalFollowUpDate, setModalFollowUpDate] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const fetchRenewals = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMonth) params.append('month', selectedMonth)
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetchApi(`/api/v1/renewals?${params.toString()}`)
      setRenewals(res?.items || [])
      if (res?.summary) setSummary(res.summary)
    } catch (err) {
      console.error('Failed to fetch renewals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRenewals()
  }, [selectedMonth, urgencyFilter, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRenewals()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Update Status directly from row
  const handleUpdateStatus = async (item: RenewalItem, newStatus: string) => {
    try {
      await fetchApi('/api/v1/renewals', {
        method: 'PATCH',
        body: JSON.stringify({
          leadId: item.leadId,
          renewalStatus: newStatus
        })
      })

      // Update state locally
      setRenewals(prev => prev.map(r => r.id === item.id ? { ...r, renewalStatus: newStatus } : r))
      if (newStatus === 'Renewed') {
        setSummary((prev: any) => ({ ...prev, renewedCount: prev.renewedCount + 1 }))
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update renewal status')
    }
  }

  // Open Notes Modal
  const handleOpenNotesModal = (item: RenewalItem) => {
    setNotesTarget(item)
    setModalNotes(item.renewalNotes || '')
    setModalFollowUpDate(item.renewalFollowUpDate || '')
  }

  // Save Notes
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notesTarget || !notesTarget.leadId) return

    setIsSavingNotes(true)
    try {
      await fetchApi('/api/v1/renewals', {
        method: 'PATCH',
        body: JSON.stringify({
          leadId: notesTarget.leadId,
          renewalNotes: modalNotes,
          renewalFollowUpDate: modalFollowUpDate
        })
      })

      setRenewals(prev => prev.map(r => r.id === notesTarget.id ? {
        ...r,
        renewalNotes: modalNotes,
        renewalFollowUpDate: modalFollowUpDate
      } : r))

      setNotesTarget(null)
    } catch (err: any) {
      alert(err.message || 'Failed to save renewal notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // WhatsApp 1-Click Reminder
  const handleSendWhatsApp = (item: RenewalItem) => {
    if (!item.clientPhone) return
    const cleanPhone = item.clientPhone.replace(/\D/g, '')
    const expiryStr = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'soon'
    const msg = `Hi ${item.clientName},\n\nThis is a renewal reminder from *Torque Auto Advisor* regarding your vehicle *${item.vehicleNo}* (Policy: ${item.policyNumber}).\n\nYour 1-year policy is expiring on *${expiryStr}*. We have your verified records archived and can renew your policy with maximum NCB discount!\n\nPlease let us know if you'd like us to share the renewal quotes.\n\nBest regards,\n${item.salesPersonName} | Torque Auto Advisor`

    const url = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Export Monthly Renewal List to CSV
  const exportMonthlyCSV = () => {
    if (!renewals.length) {
      alert('No renewal records found to export.')
      return
    }

    const headers = [
      'Policy Number', 'Client Name', 'Client Phone', 'Vehicle Number', 'GVW',
      'Insurance Provider', 'Policy Type', 'Previous Premium (INR)', 'Policy Issue Date',
      '1-Year Expiry Date', 'Days Until Expiry', 'Renewal Status', 'Sales Executive', 'Renewal Notes'
    ]

    const rows = renewals.map(r => [
      `"${r.policyNumber}"`,
      `"${r.clientName}"`,
      `"${r.clientPhone}"`,
      `"${r.vehicleNo}"`,
      `"${r.gvw || ''}"`,
      `"${r.provider}"`,
      `"${r.type}"`,
      r.premiumAmount,
      r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '',
      r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '',
      r.daysRemaining,
      `"${r.renewalStatus}"`,
      `"${r.salesPersonName}"`,
      `"${(r.renewalNotes || '').replace(/"/g, '""')}"`
    ].join(','))

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `torque_renewals_${selectedMonth || 'all_active_cohorts'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200">
              1-Year Lifecycle Pipeline
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200">
              Permanent 7-Doc Archive
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Policy Renewals Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Track 1-year approved policies due for renewal, sorted with soonest expiry first. Access all archived documents instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportMonthlyCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <Download size={15} />
            <span>Export Monthly Renewals (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
        <StatCard
          title="Total Renewal Pool"
          value={summary.totalRenewals}
          subtitle={`₹${(summary.totalVolume || 0).toLocaleString()} Volume`}
          icon={<Shield size={20} className="text-blue-600" />}
          badgeColor="bg-blue-50"
        />
        <StatCard
          title="Expiring This Month"
          value={summary.expiringThisMonth}
          subtitle="Target for this month"
          icon={<Calendar size={20} className="text-indigo-600" />}
          badgeColor="bg-indigo-50"
        />
        <StatCard
          title="Urgent (< 30 Days)"
          value={summary.expiring30Days}
          subtitle="Critical follow-up queue"
          icon={<Clock size={20} className="text-amber-600" />}
          badgeColor="bg-amber-50"
        />
        <StatCard
          title="Overdue / Expired"
          value={summary.overdueCount}
          subtitle="Lapsed / Immediate action"
          icon={<AlertTriangle size={20} className="text-rose-600" />}
          badgeColor="bg-rose-50"
        />
        <StatCard
          title="Successfully Renewed"
          value={summary.renewedCount}
          subtitle="Converted renewals"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          badgeColor="bg-emerald-50"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by Client, Vehicle No, Policy No, Phone, Sales Executive..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Quick Filter Buttons & Month Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-bold outline-none bg-transparent cursor-pointer text-slate-700"
              title="Filter by Expiry Month (e.g. August 2027)"
            />
            {selectedMonth && (
              <button onClick={() => setSelectedMonth('')} className="text-slate-400 hover:text-rose-500">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Urgency Filter Dropdown */}
          <select
            value={urgencyFilter}
            onChange={e => setUrgencyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer text-slate-700"
          >
            <option value="all">All Urgencies</option>
            <option value="30days">Expiring &lt; 30 Days ({summary.expiring30Days})</option>
            <option value="60days">Expiring &lt; 60 Days</option>
            <option value="overdue">Overdue / Expired ({summary.overdueCount})</option>
            <option value="renewed">Renewed ({summary.renewedCount})</option>
          </select>

          {/* Renewal Stage Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer text-slate-700"
          >
            <option value="all">All Stages</option>
            {RENEWAL_STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => fetchRenewals()}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Renewals"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Renewals Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Client & Vehicle</th>
                <th className="px-6 py-4">Policy & Previous Premium</th>
                <th className="px-6 py-4">1-Year Expiry & Urgency</th>
                <th className="px-6 py-4">Sales Executive</th>
                <th className="px-6 py-4">Renewal Stage</th>
                <th className="px-6 py-4 text-center">1-Year Docs & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Loading renewal queue...</span>
                    </div>
                  </td>
                </tr>
              ) : renewals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                    No policies found in this renewal cohort matching criteria.
                  </td>
                </tr>
              ) : renewals.map((item) => {
                const isOverdue = item.daysRemaining < 0
                const isUrgent = item.daysRemaining >= 0 && item.daysRemaining <= 30

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                    {/* Client & Vehicle */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black text-slate-900 text-sm">{item.clientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.vehicleNo && (
                            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {item.vehicleNo}
                            </span>
                          )}
                          {item.gvw && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              GVW: {item.gvw}
                            </span>
                          )}
                        </div>
                        {item.clientPhone && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <a
                              href={`tel:${item.clientPhone}`}
                              className="text-[11px] font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Phone size={11} />
                              <span>{item.clientPhone}</span>
                            </a>
                            <button
                              onClick={() => handleSendWhatsApp(item)}
                              className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded transition-colors"
                              title="Send 1-Click WhatsApp Renewal Reminder"
                            >
                              <MessageCircle size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Policy & Premium */}
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-slate-800">{item.policyNumber}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {item.provider} • {item.type}
                      </p>
                      <p className="text-xs font-black text-slate-900 mt-1">
                        ₹{item.premiumAmount.toLocaleString()}
                      </p>
                    </td>

                    {/* Expiry & Urgency Countdown */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                        <div className="mt-1">
                          {item.renewalStatus === 'Renewed' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Renewed
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                              <AlertTriangle size={10} />
                              <span>Expired {Math.abs(item.daysRemaining)}d ago</span>
                            </span>
                          ) : isUrgent ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                              <Clock size={10} />
                              <span>Expires in {item.daysRemaining} days</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-600 w-max inline-block">
                              In {item.daysRemaining} days
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sales Executive */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <User size={13} className="text-slate-400" />
                        <span>{item.salesPersonName}</span>
                      </div>
                    </td>

                    {/* Renewal Stage */}
                    <td className="px-6 py-4">
                      <select
                        value={item.renewalStatus}
                        onChange={e => handleUpdateStatus(item, e.target.value)}
                        className={`text-xs font-black rounded-xl px-2.5 py-1.5 outline-none cursor-pointer border ${
                          item.renewalStatus === 'Renewed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.renewalStatus === 'Quotation Sent'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.renewalStatus === 'Follow-up In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.renewalStatus === 'Lost'
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {RENEWAL_STAGES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      {item.renewalNotes && (
                        <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-xs">
                          "{item.renewalNotes}"
                        </p>
                      )}
                    </td>

                    {/* Actions: 1-Year 7-Doc Download, Renewal Quote, Notes */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Download 1-Year Merged 7-Doc Bundle */}
                        {item.compiledPdfUrl ? (
                          <a
                            href={item.compiledPdfUrl}
                            download={`renewal_docs_${item.clientName}_${item.vehicleNo}.pdf`}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all border border-emerald-200"
                            title="Download 1-Year Merged 7-Document Bundle (RC Book, NCB Proof, PAN, Quotation)"
                          >
                            <Download size={14} />
                          </a>
                        ) : (
                          <span
                            className="p-2 bg-slate-50 text-slate-300 rounded-xl border border-slate-100"
                            title="No previous compiled PDF found"
                          >
                            <FileText size={14} />
                          </span>
                        )}

                        {/* WhatsApp Reminder */}
                        <button
                          onClick={() => handleSendWhatsApp(item)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm cursor-pointer"
                          title="WhatsApp Renewal Reminder"
                        >
                          <MessageCircle size={14} />
                        </button>

                        {/* Create Renewal Quotation */}
                        <Link
                          href={`/rate-calculator?leadId=${item.leadId || ''}&vehicleNo=${encodeURIComponent(item.vehicleNo || '')}&clientName=${encodeURIComponent(item.clientName || '')}`}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm"
                          title="Create Renewal Quotation"
                        >
                          <Sparkles size={14} />
                        </Link>

                        {/* Notes / Follow-up */}
                        <button
                          onClick={() => handleOpenNotesModal(item)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                          title="Add Renewal Notes & Follow-up"
                        >
                          <Edit3 size={14} />
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

      {/* RENEWAL NOTES MODAL */}
      {notesTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">Renewal Activity & Notes</h3>
                <p className="text-xs text-slate-500 mt-0.5">{notesTarget.clientName} • {notesTarget.vehicleNo}</p>
              </div>
              <button
                onClick={() => setNotesTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Follow-up Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={modalFollowUpDate}
                  onChange={e => setModalFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Conversation Remarks / Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Client requested 20% discount quote, will call back on Thursday..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNotesTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNotes}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Remarks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ title, value, subtitle, icon, badgeColor }: any) {
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
