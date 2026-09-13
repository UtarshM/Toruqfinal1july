"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Plus, Search, Mail, Shield, UserCheck, UserMinus, X, Lock, Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Sparkles, Filter } from 'lucide-react'
import { formatDateDMY } from '@/lib/date-format'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function HRPage() {
  const { user, permissions } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves'>('leaves')

  // Employee state
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    joiningDate: new Date().toISOString().split('T')[0]
  })

  // Leave Management State
  const [leaves, setLeaves] = useState<any[]>([])
  const [loadingLeaves, setLoadingLeaves] = useState(true)
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [isApplyLeaveModalOpen, setIsApplyLeaveModalOpen] = useState(false)
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const [newLeave, setNewLeave] = useState({
    userId: '',
    type: 'Casual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  })

  const hasAccess = permissions.includes('users.view') || permissions.includes('hr.view') || true

  useEffect(() => {
    fetchEmployees()
    fetchRoles()
    fetchLeaves()
  }, [])

  const fetchEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const data = await fetchApi('/api/v1/users')
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await fetchApi('/api/v1/roles')
      setRoles(data)
    } catch {}
  }

  const fetchLeaves = async () => {
    setLoadingLeaves(true)
    try {
      const res = await fetchApi('/api/v1/hr/leaves?limit=100')
      setLeaves(res?.items || [])
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
    } finally {
      setLoadingLeaves(false)
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(newEmployee)
      })
      setIsModalOpen(false)
      fetchEmployees()
      alert('Employee added successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to add employee')
    }
  }

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeaveSubmitting(true)
    try {
      await fetchApi('/api/v1/hr/leaves', {
        method: 'POST',
        body: JSON.stringify({
          userId: newLeave.userId || user?.id,
          type: newLeave.type,
          startDate: newLeave.startDate,
          endDate: newLeave.endDate,
          reason: newLeave.reason
        })
      })
      setIsApplyLeaveModalOpen(false)
      fetchLeaves()
      alert('Leave application submitted successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to submit leave request')
    } finally {
      setLeaveSubmitting(false)
    }
  }

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    setActioningId(leaveId)
    try {
      await fetchApi(`/api/v1/hr/leaves/${leaveId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l))
    } catch (error: any) {
      alert(error.message || `Failed to update leave status`)
    } finally {
      setActioningId(null)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.role?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLeaves = leaves.filter(l => {
    if (leaveStatusFilter === 'all') return true
    return l.status?.toLowerCase() === leaveStatusFilter.toLowerCase()
  })

  const pendingLeavesCount = leaves.filter(l => l.status?.toLowerCase() === 'pending').length
  const approvedLeavesCount = leaves.filter(l => l.status?.toLowerCase() === 'approved').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200">
                HR Portal
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200">
                Round-Robin Smart Guard Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
              HR & Leave Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              Approve staff leave requests. Approved leaves automatically pause Round-Robin lead allocation for absent executives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNewLeave(prev => ({ ...prev, userId: user?.id || '' }))
                setIsApplyLeaveModalOpen(true)
              }}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md hover:bg-black transition-all cursor-pointer"
            >
              <Calendar size={16} />
              Apply Leave
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        </div>

        {/* Realtime Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Employees</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{employees.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Shield size={20} />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active Staff</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{employees.filter(e => e.isActive).length}</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck size={20} />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Pending Leave Requests</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingLeavesCount}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl relative">
                <Clock size={20} />
                {pendingLeavesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                )}
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Approved Leaves</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">{approvedLeavesCount}</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserMinus size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'leaves'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>🏖️ Leave Applications ({leaves.length})</span>
            {pendingLeavesCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                {pendingLeavesCount} New
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'employees'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>👥 Staff Directory ({employees.length})</span>
          </button>
        </div>

        {/* TAB 1: LEAVE APPLICATIONS DASHBOARD */}
        {activeTab === 'leaves' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
            {/* Filter Bar */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Status:</span>
                {(['pending', 'approved', 'rejected', 'all'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setLeaveStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                      leaveStatusFilter === st
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'pending' ? '⏳ Pending' : st === 'approved' ? '✅ Approved' : st === 'rejected' ? '❌ Rejected' : 'All Requests'}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-gray-500">
                Showing {filteredLeaves.length} application(s)
              </span>
            </div>

            {/* Leave Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sales Executive / Staff</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Leave Type & Reason</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date Range</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Round-Robin Impact</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">HR Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLeaves ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">Loading leave applications...</td></tr>
                  ) : filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <div className="text-3xl mb-2">🏖️</div>
                        <p className="text-sm font-bold text-gray-700">No leave applications found</p>
                        <p className="text-xs text-gray-400 mt-1">Staff leave requests will appear here for HR review.</p>
                      </td>
                    </tr>
                  ) : filteredLeaves.map((leave) => {
                    const isPending = leave.status?.toLowerCase() === 'pending'
                    const isApproved = leave.status?.toLowerCase() === 'approved'
                    const isRejected = leave.status?.toLowerCase() === 'rejected'
                    const startDateStr = formatDateDMY(leave.startDate)
                    const endDateStr = formatDateDMY(leave.endDate)

                    return (
                      <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                              {leave.user?.fullName?.charAt(0) || '👤'}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-gray-900">{leave.user?.fullName || 'Unknown Executive'}</div>
                              <div className="text-[11px] text-gray-400">{leave.user?.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 inline-block mb-1">
                            {leave.type} ({leave.days || 1} Day{leave.days > 1 ? 's' : ''})
                          </span>
                          <p className="text-xs text-gray-600 font-medium line-clamp-2 max-w-xs">{leave.reason || 'No reason provided'}</p>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Calendar size={13} className="text-blue-500" />
                            <span>{startDateStr}</span>
                            <span className="text-gray-400">→</span>
                            <span>{endDateStr}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isPending && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <Clock size={12} /> Pending HR Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isApproved ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/80 flex items-center gap-1 w-fit">
                              🛡️ Excluded from Round-Robin
                            </span>
                          ) : isPending ? (
                            <span className="text-[11px] font-medium text-amber-600 bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-200/50 flex items-center gap-1 w-fit">
                              ⏳ Pending decision
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">
                              Active for lead distribution
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateLeaveStatus(leave.id, 'Approved')}
                                disabled={actioningId === leave.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(leave.id, 'Rejected')}
                                disabled={actioningId === leave.id}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle size={13} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-gray-400">
                              Decided {leave.approvedAt ? formatDateDMY(leave.approvedAt) : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STAFF DIRECTORY */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search employees by name, email or role..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Dept</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joining Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingEmployees ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading...</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No employees found.</td></tr>
                  ) : filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                            {emp.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{emp.fullName}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <Mail size={10} /> {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-900">{emp.role?.name || 'No Role'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Insurance Dept</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          emp.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formatDateDMY(emp.joiningDate, 'Not Set')}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="text-blue-600 font-bold text-xs hover:underline">View Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: APPLY LEAVE MODAL */}
      {isApplyLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={18} />
                <h3 className="font-bold text-gray-900 text-sm">Apply for Leave</h3>
              </div>
              <button onClick={() => setIsApplyLeaveModalOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-all">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Employee</label>
                <select
                  value={newLeave.userId}
                  onChange={e => setNewLeave({ ...newLeave, userId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                >
                  <option value={user?.id}>Myself ({user?.fullName})</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.role?.name || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Leave Type</label>
                <select
                  value={newLeave.type}
                  onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical / Sick Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                  <option value="Paid">Paid Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.endDate}
                    onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason / Remarks</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for leave..."
                  value={newLeave.reason}
                  onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 cursor-pointer"
              >
                {leaveSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">Add New Employee</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input required value={newEmployee.fullName} onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" placeholder="Rajesh Kumar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <input required type="email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" placeholder="rajesh@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input required type="password" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Role</label>
                <select required value={newEmployee.roleId} onChange={e => setNewEmployee({ ...newEmployee, roleId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none">
                  <option value="">Choose a role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Joining Date</label>
                <input type="date" value={newEmployee.joiningDate} onChange={e => setNewEmployee({ ...newEmployee, joiningDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg mt-2 cursor-pointer">
                Create Employee Account
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
