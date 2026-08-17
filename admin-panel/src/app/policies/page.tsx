"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { 
  Shield, Search, FileText, Download, Filter, Plus, X, Calendar, 
  RefreshCw, Eye, CheckCircle2, User, Trash2, AlertTriangle, Check
} from 'lucide-react'

export default function PoliciesPage() {
  const { user } = useAuth()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toUpperCase()
  const isManagerOrAdmin = roleName.includes('MANAGER') || roleName.includes('ADMIN') || roleName.includes('SUPER')

  // Bulk Selection & Deletion State (Manager & Admin only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; name?: string; count?: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Date Range State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [newPolicy, setNewPolicy] = useState({
    lead_id: '',
    policy_number: '',
    provider: '',
    type: 'Motor',
    premium_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  })
  const [leads, setLeads] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchLeads()
    }
  }, [isManagerOrAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const data = await fetchApi(`/api/v1/policies?${params}`)
      setPolicies(Array.isArray(data) ? data : [])
      // Clear selection on refresh
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to fetch policies:', error)
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

  const handleIssuePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/policies', {
        method: 'POST',
        body: JSON.stringify({
          ...newPolicy,
          premium_amount: parseFloat(newPolicy.premium_amount)
        })
      })
      setIsModalOpen(false)
      fetchData()
      alert('Policy issued successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to issue policy')
    }
  }

  // Toggle Visibility for Sales Person
  const handleToggleSalesVisibility = async (policy: any, newVisibility: boolean) => {
    if (!policy.lead?.id) return
    try {
      await fetchApi('/api/v1/manager/submissions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: policy.lead.id,
          action: 'TOGGLE_VISIBILITY',
          visibleToSalesPerson: newVisibility
        })
      })
      setPolicies(prev => prev.map(p => p.id === policy.id ? { ...p, visibleToSalesPerson: newVisibility } : p))
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility')
    }
  }

  const filteredPolicies = policies.filter(p => 
    p.policyNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.lead?.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.lead?.vehicleNo?.toLowerCase().includes(search.toLowerCase()) ||
    p.salesPersonName?.toLowerCase().includes(search.toLowerCase())
  )

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (filteredPolicies.length === 0) return
    const allSelected = filteredPolicies.every(p => selectedIds.has(p.id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPolicies.map(p => p.id)))
    }
  }

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Delete Prompt Handlers (Manager & Admin only)
  const promptBulkDelete = () => {
    if (selectedIds.size === 0) return
    setDeleteTarget({ count: selectedIds.size })
    setShowDeleteModal(true)
  }

  const promptSingleDelete = (policy: any) => {
    setDeleteTarget({ id: policy.id, name: policy.policyNumber, count: 1 })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const idsToDelete = deleteTarget.id ? [deleteTarget.id] : Array.from(selectedIds)
      
      const res = await fetchApi('/api/v1/policies', {
        method: 'DELETE',
        body: JSON.stringify({ ids: idsToDelete })
      })

      setShowDeleteModal(false)
      setDeleteTarget(null)
      setSelectedIds(new Set())
      await fetchData()
      alert(res.message || 'Policy record(s) deleted successfully.')
    } catch (err: any) {
      alert(err.message || 'Failed to delete policy records.')
    } finally {
      setIsDeleting(false)
    }
  }

  const exportCSV = () => {
    if (!policies.length) {
      alert('No policies found to export.')
      return
    }
    const headers = ['Policy No', 'Customer', 'Vehicle No', 'Sales Person', 'Provider', 'Type', 'Premium', 'Expiry']
    const rows = policies.map(p => [
      `"${p.policyNumber}"`, 
      `"${p.lead?.clientName || 'N/A'}"`, 
      `"${p.lead?.vehicleNo || 'N/A'}"`, 
      `"${p.salesPersonName || 'Direct'}"`, 
      `"${p.provider}"`, 
      `"${p.type}"`, 
      p.premiumAmount, 
      new Date(p.endDate).toLocaleDateString()
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `policies_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isAllSelected = filteredPolicies.length > 0 && filteredPolicies.every(p => selectedIds.has(p.id))
  const isPartiallySelected = selectedIds.size > 0 && !isAllSelected

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies & Insurance</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManagerOrAdmin 
              ? 'Manage active approved policies, team submissions, and issuance.'
              : 'View approved policies assigned to your portfolio.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk Delete Button for Manager & Admin */}
          {isManagerOrAdmin && selectedIds.size > 0 && (
            <button
              onClick={promptBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer animate-in fade-in"
            >
              <Trash2 size={16} />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <Download size={16} />
            Export
          </button>
          
          {/* Issue New Policy only visible to Admin / Manager */}
          {isManagerOrAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md cursor-pointer"
            >
              <Plus size={18} />
              Issue New Policy
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Policy No, Customer, Vehicle Plate, or Sales Person..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
          <Calendar size={16} className="text-gray-400" />
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="text-xs font-semibold outline-none bg-transparent w-28 cursor-pointer"
          />
          <span className="text-gray-300">—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="text-xs font-semibold outline-none bg-transparent w-28 cursor-pointer"
          />
          {(startDate || endDate) && (
            <button onClick={() => {setStartDate(''); setEndDate('')}} className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Items Counter Banner */}
      {isManagerOrAdmin && selectedIds.size > 0 && (
        <div className="mt-4 flex items-center justify-between bg-blue-50/80 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>{selectedIds.size} policy item(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-blue-700 hover:text-blue-900 underline cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50 text-xs font-bold text-gray-500 uppercase">
                {/* Select All Checkbox Header for Manager & Admin */}
                {isManagerOrAdmin && (
                  <th className="px-4 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isPartiallySelected
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title={isAllSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                )}
                <th className="px-6 py-4">Policy Info</th>
                <th className="px-6 py-4">Customer & Vehicle</th>
                {isManagerOrAdmin && <th className="px-6 py-4">Sales Executive</th>}
                <th className="px-6 py-4">Premium</th>
                <th className="px-6 py-4">Expiry Date</th>
                {isManagerOrAdmin && <th className="px-6 py-4">Sales Visibility</th>}
                <th className="px-6 py-4">Status & Docs</th>
                {isManagerOrAdmin && <th className="px-4 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={isManagerOrAdmin ? 9 : 5} className="p-10 text-center text-gray-400 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Loading policies...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={isManagerOrAdmin ? 9 : 5} className="p-10 text-center text-gray-400 italic">
                    No policies found matching criteria.
                  </td>
                </tr>
              ) : filteredPolicies.map((p) => {
                const isSelected = selectedIds.has(p.id)
                return (
                  <tr 
                    key={p.id} 
                    className={`transition-colors text-sm ${isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}
                  >
                    {/* Row Select Checkbox for Manager & Admin */}
                    {isManagerOrAdmin && (
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(p.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <Shield size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 font-mono text-xs">{p.policyNumber}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">{p.provider} • {p.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{p.lead?.clientName || 'Unknown'}</p>
                      {p.lead?.vehicleNo && (
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-0.5 inline-block">
                          {p.lead.vehicleNo}
                        </span>
                      )}
                    </td>
                    {isManagerOrAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <User size={13} className="text-slate-400" />
                          <span>{p.salesPersonName || 'Direct'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 font-bold text-gray-900">₹{Number(p.premiumAmount)?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                      {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}
                    </td>
                    
                    {/* Manager/Admin Sales Visibility Checkbox */}
                    {isManagerOrAdmin && (
                      <td className="px-6 py-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={p.visibleToSalesPerson !== false}
                            onChange={e => handleToggleSalesVisibility(p, e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                          <span className={p.visibleToSalesPerson !== false ? 'text-emerald-700' : 'text-slate-400'}>
                            {p.visibleToSalesPerson !== false ? 'Visible' : 'Hidden'}
                          </span>
                        </label>
                      </td>
                    )}

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {p.status}
                        </span>
                        {p.compiledPdfUrl && (
                          <a
                            href={p.compiledPdfUrl}
                            download={`policy_${p.lead?.clientName || 'customer'}.pdf`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Download Merged Customer PDF"
                          >
                            <Download size={13} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Single Row Actions for Manager & Admin */}
                    {isManagerOrAdmin && (
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => promptSingleDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete policy record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            
            <h3 className="text-lg font-black text-center text-slate-900">
              {deleteTarget.count && deleteTarget.count > 1 
                ? `Delete ${deleteTarget.count} Policies?` 
                : `Delete Policy ${deleteTarget.name || ''}?`}
            </h3>
            
            <p className="text-xs text-center text-slate-500 mt-2">
              Are you sure you want to delete {deleteTarget.count && deleteTarget.count > 1 ? `these ${deleteTarget.count} policies` : 'this policy'}? This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Issue New Policy</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleIssuePolicy} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead / Client</label>
                <select required value={newPolicy.lead_id} onChange={e => setNewPolicy({...newPolicy, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.clientName || 'Unnamed Lead'} — {l.vehicleNo || 'No Vehicle No.'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy Number</label>
                <input required value={newPolicy.policy_number} onChange={e => setNewPolicy({...newPolicy, policy_number: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Insurance Provider</label>
                <input required value={newPolicy.provider} onChange={e => setNewPolicy({...newPolicy, provider: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="e.g. TATA AIG" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy Type</label>
                <select value={newPolicy.type} onChange={e => setNewPolicy({...newPolicy, type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Motor</option>
                  <option>Health</option>
                  <option>Life</option>
                  <option>Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Premium Amount</label>
                <input required type="number" value={newPolicy.premium_amount} onChange={e => setNewPolicy({...newPolicy, premium_amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                  <input type="date" required value={newPolicy.start_date} onChange={e => setNewPolicy({...newPolicy, start_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                  <input type="date" required value={newPolicy.end_date} onChange={e => setNewPolicy({...newPolicy, end_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>
              <button type="submit" className="col-span-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Issue Policy
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
