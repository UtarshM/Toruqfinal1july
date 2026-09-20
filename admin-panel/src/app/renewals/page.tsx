"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, XCircle, Search,
  Download, RefreshCw, MessageSquare, Phone, UserCheck, Shield,
  Car, FileText, ArrowUpRight, Filter, ChevronRight
} from 'lucide-react'
import { formatDateDMY, getISTDateString } from '@/lib/date-format'

interface RenewalItem {
  id: string
  leadId: string | null
  policyId: string | null
  vehicleNo: string | null
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  policyNumber: string | null
  provider: string | null
  policyType: string | null
  premiumAmount: number | null
  policyStartDate: string | null
  policyEndDate: string
  renewalStatus: 'Active' | 'Renewed' | 'Refused' | 'Lost'
  assignedTo: string | null
  assignee?: { id: string; fullName: string; email: string } | null
  lead?: { id: string; clientName: string; status: string } | null
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<RenewalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | '7days' | '30days' | 'renewed' | 'refused'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchRenewals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '300')
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await fetchApi(`/api/v1/renewals?${params.toString()}`)
      if (res && res.renewals) {
        setRenewals(res.renewals)
      } else if (Array.isArray(res)) {
        setRenewals(res)
      }
    } catch (err) {
      console.error('Failed to fetch renewals:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchRenewals()
  }, [fetchRenewals])

  const nowMs = new Date().setHours(0, 0, 0, 0)

  // Metrics & categorization
  const metrics = useMemo(() => {
    let overdueCount = 0
    let expiring7Count = 0
    let expiring30Count = 0
    let renewedCount = 0
    let refusedCount = 0
    let activeCount = 0

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    for (const r of renewals) {
      if (r.renewalStatus === 'Renewed') {
        renewedCount++
        continue
      }
      if (r.renewalStatus === 'Refused') {
        refusedCount++
        continue
      }
      activeCount++

      const endMs = new Date(r.policyEndDate).setHours(0, 0, 0, 0)
      const diff = endMs - nowMs

      if (diff <= 0) {
        overdueCount++
      } else if (diff <= sevenDaysMs) {
        expiring7Count++
      } else if (diff <= thirtyDaysMs) {
        expiring30Count++
      }
    }

    return {
      total: renewals.length,
      activeCount,
      overdueCount,
      expiring7Count,
      expiring30Count,
      renewedCount,
      refusedCount,
    }
  }, [renewals, nowMs])

  // Filtered List
  const filteredRenewals = useMemo(() => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    return renewals.filter(r => {
      if (activeTab === 'renewed') return r.renewalStatus === 'Renewed'
      if (activeTab === 'refused') return r.renewalStatus === 'Refused'

      // For time-based filters, only show Active renewals
      if (r.renewalStatus !== 'Active') return false

      const endMs = new Date(r.policyEndDate).setHours(0, 0, 0, 0)
      const diff = endMs - nowMs

      if (activeTab === 'overdue') return diff <= 0
      if (activeTab === '7days') return diff > 0 && diff <= sevenDaysMs
      if (activeTab === '30days') return diff > 0 && diff <= thirtyDaysMs
      return true
    })
  }, [renewals, activeTab, nowMs])

  const handleUpdateStatus = async (id: string, status: 'Renewed' | 'Refused' | 'Active') => {
    try {
      await fetchApi(`/api/v1/renewals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ renewalStatus: status })
      })
      fetchRenewals()
    } catch (err: any) {
      alert(err.message || 'Failed to update renewal status')
    }
  }

  const exportCSV = () => {
    if (filteredRenewals.length === 0) {
      alert('No renewals to export')
      return
    }
    const headers = ['Vehicle No', 'Client Name', 'Phone', 'Provider', 'Policy No', 'Expiry Date', 'Status', 'Assigned To', 'Premium']
    const rows = filteredRenewals.map(r => [
      r.vehicleNo || '',
      r.clientName,
      r.clientPhone || '',
      r.provider || '',
      r.policyNumber || '',
      formatDateDMY(r.policyEndDate),
      r.renewalStatus,
      r.assignee?.fullName || 'Unassigned',
      r.premiumAmount || 0,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `renewals_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Calendar className="text-red-600" size={26} />
              Policy Renewals & Reminders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track upcoming and overdue vehicle insurance renewals matching legacy ren_rem_view.
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
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Renewals</p>
            <p className="text-xl font-bold text-gray-900 mt-1 font-mono">{metrics.activeCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">{metrics.total} lifetime policies</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Overdue / Today</p>
            <p className="text-xl font-bold text-red-700 mt-1 font-mono">{metrics.overdueCount}</p>
            <p className="text-xs text-red-600 mt-0.5">Immediate action required</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Due in 7 Days</p>
            <p className="text-xl font-bold text-amber-700 mt-1 font-mono">{metrics.expiring7Count}</p>
            <p className="text-xs text-amber-600 mt-0.5">Follow-up needed</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Due in 30 Days</p>
            <p className="text-xl font-bold text-blue-700 mt-1 font-mono">{metrics.expiring30Count}</p>
            <p className="text-xs text-blue-600 mt-0.5">Upcoming pipeline</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Renewed</p>
            <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">{metrics.renewedCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Successfully renewed</p>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {[
              { key: 'all', label: 'All Active' },
              { key: 'overdue', label: `Overdue (${metrics.overdueCount})` },
              { key: '7days', label: `Due 7 Days (${metrics.expiring7Count})` },
              { key: '30days', label: `Due 30 Days (${metrics.expiring30Count})` },
              { key: 'renewed', label: `Renewed (${metrics.renewedCount})` },
              { key: 'refused', label: `Refused (${metrics.refusedCount})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search vehicle, client, policy..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Renewals Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Vehicle & Client</th>
                  <th className="py-3 px-4">Policy / Insurer</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-red-600" />
                      Loading renewal records...
                    </td>
                  </tr>
                ) : filteredRenewals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      No renewal records match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRenewals.map(r => {
                    const endMs = new Date(r.policyEndDate).setHours(0, 0, 0, 0)
                    const diffDays = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))
                    const isOverdue = diffDays <= 0 && r.renewalStatus === 'Active'

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold font-mono text-gray-900 text-sm">
                            {r.vehicleNo || 'NO VEHICLE NO'}
                          </div>
                          <div className="text-gray-600 font-medium text-xs mt-0.5">
                            {r.clientName}
                          </div>
                          {r.clientPhone && (
                            <div className="text-gray-400 text-[11px] flex items-center gap-1 mt-0.5">
                              <Phone size={11} /> {r.clientPhone}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{r.provider || 'Insurer'}</div>
                          <div className="text-gray-500 text-[11px] font-mono mt-0.5">
                            {r.policyNumber || r.policyType || 'Policy'}
                          </div>
                          {r.premiumAmount && (
                            <div className="text-gray-700 font-mono font-bold text-[11px] mt-0.5">
                              ₹{Number(r.premiumAmount).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">
                            {formatDateDMY(r.policyEndDate)}
                          </div>
                          {r.renewalStatus === 'Active' && (
                            <div className="mt-0.5">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-red-100 text-red-700 rounded text-[10px] font-black uppercase">
                                  <AlertTriangle size={10} /> Overdue ({Math.abs(diffDays)}d)
                                </span>
                              ) : diffDays <= 7 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                                  {diffDays} days left
                                </span>
                              ) : (
                                <span className="text-gray-500 text-[11px]">
                                  In {diffDays} days
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                            <UserCheck size={13} className="text-gray-400" />
                            {r.assignee?.fullName || 'Unassigned'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {r.renewalStatus === 'Renewed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase">
                              <CheckCircle2 size={11} /> Renewed
                            </span>
                          ) : r.renewalStatus === 'Refused' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold uppercase">
                              <XCircle size={11} /> Refused
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold uppercase">
                              <Clock size={11} /> Active
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Direct Reminder */}
                            {r.clientPhone && (
                              <a
                                href={`https://wa.me/91${r.clientPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                                  `Dear ${r.clientName}, your vehicle insurance (${r.vehicleNo || 'vehicle'}) is due for renewal on ${formatDateDMY(
                                    r.policyEndDate
                                  )}. Please contact Torque Auto Advisor to renew and ensure zero lapse in protection.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Send WhatsApp Renewal Reminder"
                              >
                                <MessageSquare size={15} />
                              </a>
                            )}

                            {r.renewalStatus === 'Active' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(r.id, 'Renewed')}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                                  title="Mark as successfully renewed"
                                >
                                  Renew
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(r.id, 'Refused')}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                                  title="Mark as refused (recycles lead back to sales pool)"
                                >
                                  Refuse
                                </button>
                              </>
                            )}
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
      </div>
    </AdminLayout>
  )
}
