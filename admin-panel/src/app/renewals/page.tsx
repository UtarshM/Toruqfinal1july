'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import {
  RefreshCw, Search, X, CalendarDays, Users, UserCheck, Check,
  FileText, ChevronLeft, ChevronRight, Filter, AlertCircle, CheckCircle
} from 'lucide-react'

const MONTH_NAMES = ['All Months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PendingRenewal: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Renewed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Refused: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  RemovedToLeads: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function RenewalsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const roleUpper = (typeof (user?.role as any) === 'object' ? (user?.role as any)?.name : user?.role)?.toUpperCase() || ''
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')

  const [renewals, setRenewals] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState(0)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  // Auto-assign modal
  const [showAutoAssign, setShowAutoAssign] = useState(false)
  const [autoAssignMonth, setAutoAssignMonth] = useState(0)
  const [autoAssignYear, setAutoAssignYear] = useState(new Date().getFullYear())
  const [availableExecs, setAvailableExecs] = useState<any[]>([])
  const [selectedExecIds, setSelectedExecIds] = useState<string[]>([])
  const [execsLoading, setExecsLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<any>(null)

  const fetchRenewals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (statusFilter) params.set('status', statusFilter)
      if (monthFilter > 0) {
        params.set('month', String(monthFilter))
        params.set('year', String(yearFilter))
      }
      if (search.trim()) params.set('search', search.trim())

      const res = await fetchApi(`/api/v1/renewals?${params.toString()}`)
      setRenewals(res?.renewals || [])
      setStats(res?.stats || {})
      setTotal(res?.total || 0)
    } catch (err) {
      console.error('Failed to fetch renewals:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, monthFilter, yearFilter, search])

  useEffect(() => { fetchRenewals() }, [fetchRenewals])

  const fetchExecsForAutoAssign = async (month: number, year: number) => {
    setExecsLoading(true)
    try {
      const res = await fetchApi(`/api/v1/leads/available-executives?month=${month}&year=${year}`)
      setAvailableExecs(res?.executives || [])
      const available = (res?.executives || []).filter((e: any) => !e.isOnExtendedLeave)
      setSelectedExecIds(available.map((e: any) => e.id))
    } catch (err) {
      console.error('Failed to fetch executives:', err)
    } finally {
      setExecsLoading(false)
    }
  }

  const handleAutoAssign = async () => {
    if (!autoAssignMonth || selectedExecIds.length === 0) return
    setAssigning(true)
    setAssignResult(null)
    try {
      const res = await fetchApi('/api/v1/renewals/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: autoAssignMonth,
          year: autoAssignYear,
          salesExecutiveIds: selectedExecIds
        })
      })
      setAssignResult(res)
      if (res?.success) fetchRenewals()
    } catch (err: any) {
      setAssignResult({ error: err.message || 'Auto-assignment failed' })
    } finally {
      setAssigning(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetchApi(`/api/v1/renewals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewalStatus: newStatus })
      })
      fetchRenewals()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const formatDate = (d: string | Date | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' }
  }

  const totalPages = Math.ceil(total / 50) || 1

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200">
                Renewal Lifecycle
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Renewals CSV
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Track policy renewals, assign to renewal personnel, and manage the lifecycle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchRenewals()}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => { setShowAutoAssign(!showAutoAssign); if (!showAutoAssign && autoAssignMonth > 0) fetchExecsForAutoAssign(autoAssignMonth, autoAssignYear) }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Users size={15} />
                <span>Auto-Assign Renewals</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: '', label: 'All', count: Object.values(stats).reduce((s, v) => s + v, 0), color: 'blue' },
            { key: 'Active', label: 'Active', count: stats.Active || 0, color: 'blue' },
            { key: 'PendingRenewal', label: 'Pending', count: stats.PendingRenewal || 0, color: 'amber' },
            { key: 'Renewed', label: 'Renewed', count: stats.Renewed || 0, color: 'emerald' },
            { key: 'Refused', label: 'Refused', count: stats.Refused || 0, color: 'rose' }
          ].map(s => (
            <button
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setPage(1) }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                statusFilter === s.key
                  ? `bg-${s.color}-50 border-${s.color}-300 ring-2 ring-${s.color}-500/20`
                  : 'bg-white border-slate-100 hover:shadow-sm'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{s.label}</p>
              <h2 className="text-xl font-black text-slate-900 mt-1">{s.count}</h2>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, phone, vehicle, policy..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={monthFilter}
              onChange={e => { setMonthFilter(Number(e.target.value)); setPage(1) }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={e => { setYearFilter(Number(e.target.value)); setPage(1) }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-Assign Panel */}
        {showAutoAssign && isAdmin && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-5 rounded-2xl border border-indigo-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              Auto-Assign Renewals to Sales Executives
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={autoAssignMonth}
                onChange={e => { setAutoAssignMonth(Number(e.target.value)); if (Number(e.target.value) > 0) fetchExecsForAutoAssign(Number(e.target.value), autoAssignYear) }}
                className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value={0}>Select Month</option>
                {MONTH_NAMES.slice(1).map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
              <select
                value={autoAssignYear}
                onChange={e => setAutoAssignYear(Number(e.target.value))}
                className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {autoAssignMonth > 0 && (
              <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
                {execsLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <RefreshCw size={14} className="animate-spin text-indigo-500" />
                    <span className="text-xs font-bold text-slate-500">Loading executives...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableExecs.map(exec => {
                      const isSelected = selectedExecIds.includes(exec.id)
                      return (
                        <button
                          key={exec.id}
                          onClick={() => setSelectedExecIds(prev => isSelected ? prev.filter(id => id !== exec.id) : [...prev, exec.id])}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-black ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {exec.fullName}
                            </span>
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center text-white ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            {exec.isOnExtendedLeave ? '⚠️ Extended Leave' : exec.isCurrentlyOnLeave ? '🕐 On Leave' : '✅ Available'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">
                    {selectedExecIds.length} executives selected
                  </span>
                  <button
                    onClick={handleAutoAssign}
                    disabled={assigning || selectedExecIds.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {assigning ? <><RefreshCw size={14} className="animate-spin" /> Assigning...</> : <><Users size={14} /> Auto-Assign</>}
                  </button>
                </div>

                {assignResult && (
                  <div className={`p-4 rounded-xl border ${assignResult.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    {assignResult.error ? (
                      <p className="text-xs font-bold">❌ {assignResult.error}</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-black">✅ {assignResult.message}</p>
                        {assignResult.distribution && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {assignResult.distribution.map((d: any) => (
                              <div key={d.id} className="bg-white p-2 rounded-lg text-xs">
                                <span className="font-black text-slate-800">{d.name}</span>
                                <span className="text-emerald-600 font-bold ml-1">→ {d.renewalsAssigned}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Renewals Table */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
            <RefreshCw className="animate-spin text-slate-400 mx-auto" size={32} />
            <p className="text-xs font-bold text-slate-500 mt-3">Loading renewals...</p>
          </div>
        ) : renewals.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
            <FileText className="text-slate-300 mx-auto" size={48} />
            <h3 className="text-base font-black text-slate-800 mt-3">No Renewals Found</h3>
            <p className="text-xs text-slate-400 mt-1">No renewals match your current filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 text-[11px] font-black uppercase tracking-wider">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Policy #</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Status</th>
                    {isAdmin && <th className="px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renewals.map((r, idx) => {
                    const sc = STATUS_COLORS[r.renewalStatus] || STATUS_COLORS.Active
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono">{(page - 1) * 50 + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{r.clientName}</div>
                          <div className="text-[10px] text-slate-500">{r.clientPhone || '—'}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">{r.vehicleNo || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{r.policyNumber || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{r.provider || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800">{formatDate(r.policyEndDate)}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.assignee?.fullName || <span className="text-slate-400 italic">Unassigned</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${sc.bg} ${sc.text} border ${sc.border}`}>
                            {r.renewalStatus}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {r.renewalStatus !== 'Renewed' && (
                                <button
                                  onClick={() => handleStatusChange(r.id, 'Renewed')}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100 cursor-pointer border border-emerald-200"
                                >
                                  Renewed
                                </button>
                              )}
                              {r.renewalStatus !== 'Refused' && (
                                <button
                                  onClick={() => handleStatusChange(r.id, 'Refused')}
                                  className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg hover:bg-rose-100 cursor-pointer border border-rose-200"
                                >
                                  Refused
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                <span>Page {page} of {totalPages} ({total} records)</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
