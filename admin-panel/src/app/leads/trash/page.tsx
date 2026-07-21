'use client'
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'

export default function TrashedLeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchTrashedLeads()
  }, [])

  const fetchTrashedLeads = async () => {
    setIsLoading(true)
    try {
      const data = await fetchApi('/api/v1/leads/trash')
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch trashed leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(leads.map(l => l.id)))
  }

  const handleRestore = async () => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)
    try {
      await fetchApi('/api/v1/leads/trash', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      setSelectedIds(new Set())
      fetchTrashedLeads()
    } catch (err: any) {
      alert(err.message || 'Failed to restore leads')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)
    try {
      await fetchApi('/api/v1/leads/trash', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      setSelectedIds(new Set())
      setShowPermanentDeleteConfirm(false)
      fetchTrashedLeads()
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete leads')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trashed Leads</h1>
          <p className="text-sm text-slate-500 mt-1">Deleted leads can be restored or permanently removed.</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRestore}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Restore ({selectedIds.size})
            </button>
            <button 
              onClick={() => setShowPermanentDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-md"
            >
              <Trash2 size={14} />
              Delete Forever ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 accent-slate-900"
                  />
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Client Name</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle No</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">City</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Deleted On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-semibold">Loading trashed leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium">Trash is empty. No deleted leads found.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.has(lead.id) ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-slate-300 accent-slate-900"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-xs">{lead.clientName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{lead.clientPhone || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{lead.vehicleNo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{lead.city || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-slate-100 border-slate-200 text-slate-500">
                      {lead.status || 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {lead.deletedAt ? new Date(lead.deletedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {showPermanentDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-100">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Permanently Delete?</h2>
              <p className="text-xs text-slate-500">
                This action cannot be undone. {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} will be permanently removed from the database.
              </p>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowPermanentDeleteConfirm(false)} 
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePermanentDelete}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
