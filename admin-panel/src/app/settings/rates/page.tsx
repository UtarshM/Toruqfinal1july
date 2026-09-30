'use client'
import React, { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { fetchApi } from '@/lib/api'
import { 
  Plus, Trash2, ShieldAlert, Sparkles, Building, 
  ListCollapse, Save, X, RefreshCw, Search, CheckCircle2, MessageSquare,
  SlidersHorizontal, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown, Percent,
  RotateCcw, Check, Sparkle
} from 'lucide-react'

interface Rule {
  id: string
  companyId?: string
  categoryId?: string
  percentage: number | string
  profit: number | string
  remarks?: string | null
  status: number
  company?: { id: string; name: string }
  category?: { id: string; name: string }
  createdAt?: string
  updatedAt?: string
}

interface PendingUpdate {
  percentage?: string | number
  profit?: string | number
  remarks?: string
  status?: number
}

interface PendingCreate {
  tempId: string
  companyName: string
  percentage: string | number
  profit: string | number
  remarks?: string
  status: number
}

export default function QuotationRelationshipPage() {
  const { user, isLoading: authLoading } = useAuth()

  // Baseline Data loaded from server / cache
  const [rules, setRules] = useState<Rule[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Local changes tracking (Batch Mode)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingUpdate>>({})
  const [pendingCreates, setPendingCreates] = useState<PendingCreate[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())

  // Loading & Network States
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingBatch, setIsSavingBatch] = useState(false)

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all')
  const [selectedPercentageFilter, setSelectedPercentageFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Sorting State
  const [sortField, setSortField] = useState<string>('company')
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // Multi-Select Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Quick Add / Mobile Form State
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newPercentage, setNewPercentage] = useState('')
  const [newProfit, setNewProfit] = useState('')
  const [newRemarks, setNewRemarks] = useState('')
  const [newStatus, setNewStatus] = useState('1')

  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toUpperCase()
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'torqueautoadvisor@gmail.com'
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER') || isSuperAdminEmail

  // 1. Instant 0ms Load from Local Cache on Mount
  useEffect(() => {
    try {
      const cachedRules = localStorage.getItem('toque_cached_rate_relationships')
      const cachedComps = localStorage.getItem('toque_cached_rate_companies')
      if (cachedRules) {
        const parsed = JSON.parse(cachedRules)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed)
          setLoading(false)
        }
      }
      if (cachedComps) {
        const parsedComps = JSON.parse(cachedComps)
        if (Array.isArray(parsedComps)) {
          setCompanies(parsedComps)
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e)
    }
  }, [])

  // 2. Background Revalidation when Auth is ready
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadAllData(true)
    }
  }, [authLoading, user, isAdmin])

  const loadAllData = async (silent = false) => {
    if (!silent && rules.length === 0) setLoading(true)
    setIsRefreshing(true)
    setErrorMsg('')
    try {
      const [comps, cats, rls] = await Promise.all([
        fetchApi('/api/v1/rates/companies').catch(() => []),
        fetchApi('/api/v1/rates/categories').catch(() => []),
        fetchApi('/api/v1/rates/relationships').catch(() => [])
      ])

      if (Array.isArray(comps)) {
        setCompanies(comps)
        try { localStorage.setItem('toque_cached_rate_companies', JSON.stringify(comps)) } catch {}
      }
      if (Array.isArray(cats)) setCategories(cats)
      if (Array.isArray(rls)) {
        setRules(rls)
        try { localStorage.setItem('toque_cached_rate_relationships', JSON.stringify(rls)) } catch {}
      }
    } catch (err: any) {
      console.error('Quotation relationship load error:', err)
      if (rules.length === 0) {
        setErrorMsg(err.message || 'Failed to load quotation relationship data.')
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // --- Inline Field Update Handler (0ms instant local change) ---
  const updatePendingField = (id: string, field: 'percentage' | 'profit' | 'remarks' | 'status', value: any) => {
    setPendingUpdates(prev => {
      const current = prev[id] || {}
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value
        }
      }
    })
  }

  // Revert a single row's pending edits
  const revertRowEdits = (id: string) => {
    setPendingUpdates(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Stage a row for deletion (queued for batch save or instant)
  const stageDeleteRow = (id: string) => {
    setPendingDeletes(prev => new Set(prev).add(id))
    // Also remove from pending updates if present
    setPendingUpdates(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSelectedIds(prev => prev.filter(i => i !== id))
  }

  const unstageDeleteRow = (id: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // --- Add New Relationship (Direct Company Entry) ---
  const handleAddNewRule = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCompany = newCompanyName.trim()
    if (!trimmedCompany) {
      setErrorMsg('Please enter an insurance company name.')
      return
    }
    if (newPercentage === '' || isNaN(parseFloat(newPercentage))) {
      setErrorMsg('Please enter a valid percentage.')
      return
    }
    if (newProfit === '' || isNaN(parseFloat(newProfit))) {
      setErrorMsg('Please enter a valid profit amount.')
      return
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newCreateItem: PendingCreate = {
      tempId,
      companyName: trimmedCompany,
      percentage: newPercentage,
      profit: newProfit,
      remarks: newRemarks.trim() || undefined,
      status: parseInt(newStatus)
    }

    setPendingCreates(prev => [newCreateItem, ...prev])
    setNewCompanyName('')
    setNewPercentage('')
    setNewProfit('')
    setNewRemarks('')
    setNewStatus('1')
    setIsMobileModalOpen(false)
    showSuccess(`Added "${trimmedCompany}" to list. Click "Save All Changes" to persist.`)
  }

  const removePendingCreate = (tempId: string) => {
    setPendingCreates(prev => prev.filter(c => c.tempId !== tempId))
  }

  // --- Bulk Deletion of Selected Rows ---
  const handleBulkStageDelete = () => {
    if (selectedIds.length === 0) return
    setPendingDeletes(prev => {
      const next = new Set(prev)
      selectedIds.forEach(id => next.add(id))
      return next
    })
    setSelectedIds([])
  }

  // --- Discard All Changes ---
  const handleDiscardAllChanges = () => {
    if (!confirm('Are you sure you want to discard all unsaved changes?')) return
    setPendingUpdates({})
    setPendingCreates([])
    setPendingDeletes(new Set())
    setSelectedIds([])
    showSuccess('All unsaved changes discarded.')
  }

  // --- Save All Changes (One Single Network Request) ---
  const handleSaveAllChanges = async () => {
    const updateCount = Object.keys(pendingUpdates).length
    const createCount = pendingCreates.length
    const deleteCount = pendingDeletes.size
    const totalChanges = updateCount + createCount + deleteCount

    if (totalChanges === 0) return

    setIsSavingBatch(true)
    setErrorMsg('')

    try {
      const updates = Object.entries(pendingUpdates).map(([id, changes]) => ({
        id,
        ...changes
      }))

      const creates = pendingCreates.map(c => ({
        companyName: c.companyName,
        percentage: c.percentage,
        profit: c.profit,
        remarks: c.remarks,
        status: c.status
      }))

      const deletes = Array.from(pendingDeletes)

      const res = await fetchApi('/api/v1/rates/relationships/batch', {
        method: 'POST',
        body: JSON.stringify({ updates, creates, deletes })
      })

      if (res.relationships && Array.isArray(res.relationships)) {
        setRules(res.relationships)
        try { localStorage.setItem('toque_cached_rate_relationships', JSON.stringify(res.relationships)) } catch {}
      }
      if (res.companies && Array.isArray(res.companies)) {
        setCompanies(res.companies)
        try { localStorage.setItem('toque_cached_rate_companies', JSON.stringify(res.companies)) } catch {}
      }

      // Reset pending state
      setPendingUpdates({})
      setPendingCreates([])
      setPendingDeletes(new Set())
      setSelectedIds([])

      showSuccess(`Successfully saved all ${totalChanges} change(s) in one go!`)
    } catch (err: any) {
      console.error('Batch save error:', err)
      setErrorMsg(err.message || 'Failed to save changes. Please try again.')
    } finally {
      setIsSavingBatch(false)
    }
  }

  // Sorting Handler
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Unique percentages for filter dropdown
  const uniquePercentages = useMemo(() => {
    const set = new Set<string>()
    rules.forEach(r => {
      if (r.percentage !== undefined && r.percentage !== null) {
        set.add(String(parseFloat(r.percentage.toString())))
      }
    })
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b))
  }, [rules])

  // Filtered & Sorted Rules (combined with local effective values)
  const processedRules = useMemo(() => {
    return rules
      .filter(r => {
        // Hide deleted rows from view
        if (pendingDeletes.has(r.id)) return false

        const changes = pendingUpdates[r.id]
        const effectivePercentage = changes?.percentage !== undefined ? changes.percentage : r.percentage
        const effectiveProfit = changes?.profit !== undefined ? changes.profit : r.profit
        const effectiveRemarks = changes?.remarks !== undefined ? changes.remarks : (r.remarks || '')
        const effectiveStatus = changes?.status !== undefined ? changes.status : r.status

        // Search Query
        const query = searchQuery.toLowerCase().trim()
        if (query) {
          const comp = r.company?.name?.toLowerCase() || ''
          const cat = r.category?.name?.toLowerCase() || ''
          const rem = String(effectiveRemarks).toLowerCase()
          const pct = String(effectivePercentage)
          const prof = String(effectiveProfit)
          if (!comp.includes(query) && !cat.includes(query) && !rem.includes(query) && !pct.includes(query) && !prof.includes(query)) {
            return false
          }
        }

        // Company Filter
        if (selectedCompanyFilter !== 'all' && r.companyId !== selectedCompanyFilter && r.company?.name !== selectedCompanyFilter) {
          return false
        }

        // Percentage Filter
        if (selectedPercentageFilter !== 'all') {
          const itemPct = parseFloat(String(effectivePercentage) || '0')
          const targetPct = parseFloat(selectedPercentageFilter)
          if (itemPct !== targetPct) return false
        }

        // Status Filter
        if (selectedStatusFilter !== 'all') {
          const targetStatus = selectedStatusFilter === 'active' ? 1 : 2
          if (effectiveStatus !== targetStatus) return false
        }

        return true
      })
      .sort((a, b) => {
        const changesA = pendingUpdates[a.id]
        const changesB = pendingUpdates[b.id]

        let valA: any = ''
        let valB: any = ''

        if (sortField === 'company') {
          valA = a.company?.name || ''
          valB = b.company?.name || ''
        } else if (sortField === 'percentage') {
          valA = parseFloat(String(changesA?.percentage !== undefined ? changesA.percentage : a.percentage) || '0')
          valB = parseFloat(String(changesB?.percentage !== undefined ? changesB.percentage : b.percentage) || '0')
        } else if (sortField === 'profit') {
          valA = parseFloat(String(changesA?.profit !== undefined ? changesA.profit : a.profit) || '0')
          valB = parseFloat(String(changesB?.profit !== undefined ? changesB.profit : b.profit) || '0')
        } else if (sortField === 'status') {
          valA = changesA?.status !== undefined ? changesA.status : a.status
          valB = changesB?.status !== undefined ? changesB.status : b.status
        } else {
          valA = a.createdAt || ''
          valB = b.createdAt || ''
        }

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortAsc ? valA - valB : valB - valA
      })
  }, [rules, pendingUpdates, pendingDeletes, searchQuery, selectedCompanyFilter, selectedPercentageFilter, selectedStatusFilter, sortField, sortAsc])

  // Unsaved changes count
  const unsavedCount = Object.keys(pendingUpdates).length + pendingCreates.length + pendingDeletes.size

  // Select all / deselect all
  const isAllSelected = processedRules.length > 0 && processedRules.every(r => selectedIds.includes(r.id))
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(processedRules.map(r => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4" />
        <p className="text-slate-400 font-bold text-xs tracking-wider animate-pulse uppercase">Authenticating...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white border border-rose-100 rounded-3xl text-center space-y-4 shadow-xl shadow-rose-50 animate-in zoom-in duration-300">
          <div className="w-16 h-16 mx-auto bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Only administrators are authorized to configure Quotation Relationships and rates.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-28">
        
        {/* Datalist for Direct Company Autocomplete */}
        <datalist id="company-suggestions">
          {companies.map(c => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Quotation Relationships</h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center gap-1 border border-emerald-200">
                <Sparkles size={12} /> Instant Edit Mode
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Directly type company names, edit rates inline, and save all changes in one go with zero screen freezing.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {unsavedCount > 0 && (
              <button
                onClick={handleSaveAllChanges}
                disabled={isSavingBatch}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSavingBatch ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Save All ({unsavedCount})</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileModalOpen(true)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Company</span>
            </button>

            <button
              onClick={() => loadAllData(false)}
              disabled={isRefreshing}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 bg-white shrink-0 cursor-pointer disabled:opacity-50"
              title="Refresh Data from Server"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer"><X size={16} /></button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded-lg cursor-pointer"><X size={16} /></button>
          </div>
        )}

        {/* Floating Bulk Action Bar (For multi-select deletion) */}
        {selectedIds.length > 0 && (
          <div className="sticky top-4 z-30 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                {selectedIds.length} Selected
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 hidden sm:block">
                Marked for bulk deletion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Deselect All
              </button>
              <button
                onClick={handleBulkStageDelete}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}

        {/* Deleted rows notification with Undo */}
        {pendingDeletes.size > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <Trash2 size={14} className="text-amber-600" />
              <span>{pendingDeletes.size} rule(s) queued for deletion. Click "Save All Changes" to finalize or undo below.</span>
            </div>
            <button
              onClick={() => setPendingDeletes(new Set())}
              className="text-amber-900 underline hover:no-underline font-bold cursor-pointer"
            >
              Undo All Deletions
            </button>
          </div>
        )}

        {/* Desktop Quick Add Bar (Direct Company Entry) */}
        <div className="hidden lg:block bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm">
          <form onSubmit={handleAddNewRule} className="flex items-end gap-3 flex-wrap">
            {/* Direct Company Name Input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Direct Company Name *
              </label>
              <input
                type="text"
                list="company-suggestions"
                required
                placeholder="Type or select company (e.g. Chola, HDFC)..."
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Percentage Input */}
            <div className="w-28">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Percentage (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                placeholder="e.g. 50"
                value={newPercentage}
                onChange={e => setNewPercentage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Profit Input */}
            <div className="w-32">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Profit (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="e.g. 4000"
                value={newProfit}
                onChange={e => setNewProfit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Remarks Input */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Discount 85%, All models"
                value={newRemarks}
                onChange={e => setNewRemarks(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Status Select */}
            <div className="w-28">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Status
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>

            {/* Add Button */}
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={15} /> Add to List
            </button>
          </form>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="space-y-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                Total Relationships: <strong className="text-slate-900">{processedRules.length}</strong>
              </span>
              {unsavedCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full uppercase tracking-wider animate-pulse">
                  {unsavedCount} Unsaved
                </span>
              )}
            </div>

            {/* Universal Search Box */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company, remarks, % or profit..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
              />
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mr-1">
              <SlidersHorizontal size={13} /> Filters:
            </span>

            {/* Company Filter */}
            <select
              value={selectedCompanyFilter}
              onChange={e => setSelectedCompanyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Percentage (%) Filter */}
            <div className="flex items-center gap-1 bg-emerald-50/60 border border-emerald-200/80 rounded-xl px-2.5 py-1.5">
              <Percent size={13} className="text-emerald-700" />
              <select
                value={selectedPercentageFilter}
                onChange={e => setSelectedPercentageFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-800 outline-none cursor-pointer"
              >
                <option value="all">All % Values</option>
                {uniquePercentages.map(pct => (
                  <option key={pct} value={pct}>{pct}%</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(selectedCompanyFilter !== 'all' || selectedPercentageFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCompanyFilter('all')
                  setSelectedPercentageFilter('all')
                  setSelectedStatusFilter('all')
                  setSearchQuery('')
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Content Layout */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl min-h-[350px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      {/* Checkbox column */}
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={e => handleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>

                      {/* Company Name */}
                      <th 
                        onClick={() => toggleSort('company')}
                        className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Company Name</span>
                          {sortField === 'company' ? (
                            sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : <ArrowUpDown size={12} className="text-slate-300" />}
                        </div>
                      </th>

                      {/* Percentage Input Column */}
                      <th 
                        onClick={() => toggleSort('percentage')}
                        className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none w-36"
                      >
                        <div className="flex items-center gap-1">
                          <span>Percentage (%)</span>
                          {sortField === 'percentage' ? (
                            sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : <ArrowUpDown size={12} className="text-slate-300" />}
                        </div>
                      </th>

                      {/* Profit Input Column */}
                      <th 
                        onClick={() => toggleSort('profit')}
                        className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none w-36"
                      >
                        <div className="flex items-center gap-1">
                          <span>Profit (₹)</span>
                          {sortField === 'profit' ? (
                            sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : <ArrowUpDown size={12} className="text-slate-300" />}
                        </div>
                      </th>

                      {/* Remarks Column */}
                      <th className="px-4 py-3.5">
                        <span>Remarks</span>
                      </th>

                      {/* Status Column */}
                      <th 
                        onClick={() => toggleSort('status')}
                        className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none w-28 text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Status</span>
                          {sortField === 'status' ? (
                            sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : <ArrowUpDown size={12} className="text-slate-300" />}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    
                    {/* 1. Staged Newly Added Rows (pendingCreates) */}
                    {pendingCreates.map(createItem => (
                      <tr key={createItem.tempId} className="bg-indigo-50/40 border-l-4 border-indigo-500 animate-in fade-in">
                        <td className="px-4 py-3 text-center">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-ping" />
                        </td>
                        <td className="px-4 py-3 font-extrabold text-indigo-950 flex items-center gap-2">
                          <span>{createItem.companyName}</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">
                            New Staged
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={createItem.percentage}
                              onChange={e => {
                                const val = e.target.value
                                setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, percentage: val } : c))
                              }}
                              className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-indigo-300 bg-white text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="font-bold text-indigo-700">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-indigo-700">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={createItem.profit}
                              onChange={e => {
                                const val = e.target.value
                                setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, profit: val } : c))
                              }}
                              className="w-24 px-2 py-1 text-xs font-bold rounded-lg border border-indigo-300 bg-white text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={createItem.remarks || ''}
                            placeholder="e.g. Special rate"
                            onChange={e => {
                              const val = e.target.value
                              setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, remarks: val } : c))
                            }}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-indigo-200 bg-white text-slate-800 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, status: c.status === 1 ? 2 : 1 } : c))
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                              createItem.status === 1 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : 'bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {createItem.status === 1 ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removePendingCreate(createItem.tempId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Remove staged row"
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* 2. Existing Rules Rows with Direct Inline Editable Inputs */}
                    {processedRules.length === 0 && pendingCreates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                          No matching quotation relationship rules found.
                        </td>
                      </tr>
                    ) : (
                      processedRules.map(r => {
                        const isSelected = selectedIds.includes(r.id)
                        const changes = pendingUpdates[r.id]
                        const isModified = Boolean(changes)

                        const effectivePercentage = changes?.percentage !== undefined ? changes.percentage : (r.percentage ?? '')
                        const effectiveProfit = changes?.profit !== undefined ? changes.profit : (r.profit ?? '')
                        const effectiveRemarks = changes?.remarks !== undefined ? changes.remarks : (r.remarks || '')
                        const effectiveStatus = changes?.status !== undefined ? changes.status : r.status

                        return (
                          <tr 
                            key={r.id} 
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isModified ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''
                            } ${isSelected ? 'bg-blue-50/40' : ''}`}
                          >
                            {/* Row Checkbox */}
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(r.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Company Name */}
                            <td className="px-4 py-3 font-extrabold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{r.company?.name || '—'}</span>
                                {isModified && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Unsaved edit" />
                                )}
                              </div>
                            </td>

                            {/* Direct Inline Percentage (%) Input */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={effectivePercentage}
                                  onChange={e => updatePendingField(r.id, 'percentage', e.target.value)}
                                  className={`w-20 px-2 py-1 text-xs font-bold rounded-lg border transition-all outline-none ${
                                    isModified && changes?.percentage !== undefined
                                      ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                                      : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                  }`}
                                />
                                <span className="font-bold text-slate-400">%</span>
                              </div>
                            </td>

                            {/* Direct Inline Profit (₹) Input */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={effectiveProfit}
                                  onChange={e => updatePendingField(r.id, 'profit', e.target.value)}
                                  className={`w-24 px-2 py-1 text-xs font-bold rounded-lg border transition-all outline-none ${
                                    isModified && changes?.profit !== undefined
                                      ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                                      : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Direct Inline Remarks Input */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={effectiveRemarks}
                                placeholder="Add remarks..."
                                onChange={e => updatePendingField(r.id, 'remarks', e.target.value)}
                                className={`w-full px-2 py-1 text-xs rounded-lg border transition-all outline-none ${
                                  isModified && changes?.remarks !== undefined
                                    ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                                    : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500'
                                }`}
                              />
                            </td>

                            {/* One-Click Status Toggle Pill */}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => updatePendingField(r.id, 'status', effectiveStatus === 1 ? 2 : 1)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                  effectiveStatus === 1
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Click to toggle status"
                              >
                                {effectiveStatus === 1 ? 'Active' : 'Inactive'}
                              </button>
                            </td>

                            {/* Actions Column */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {isModified && (
                                  <button
                                    onClick={() => revertRowEdits(r.id)}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-all cursor-pointer"
                                    title="Revert row changes"
                                  >
                                    <RotateCcw size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => stageDeleteRow(r.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Rule"
                                >
                                  <Trash2 size={13} />
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

            {/* Mobile Cards View (md:hidden) */}
            <div className="md:hidden space-y-3">
              {/* Mobile Staged Creates */}
              {pendingCreates.map(createItem => (
                <div key={createItem.tempId} className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-indigo-950 text-sm">{createItem.companyName}</h4>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase inline-block mt-0.5">
                        New Staged
                      </span>
                    </div>
                    <button
                      onClick={() => removePendingCreate(createItem.tempId)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-indigo-800 uppercase">Rate %</label>
                      <input
                        type="number"
                        value={createItem.percentage}
                        onChange={e => {
                          const val = e.target.value
                          setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, percentage: val } : c))
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-indigo-800 uppercase">Profit ₹</label>
                      <input
                        type="number"
                        value={createItem.profit}
                        onChange={e => {
                          const val = e.target.value
                          setPendingCreates(prev => prev.map(c => c.tempId === createItem.tempId ? { ...c, profit: val } : c))
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile Existing Rules Cards */}
              {processedRules.length === 0 && pendingCreates.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs italic border border-slate-100">
                  No matching quotation relationship rules found.
                </div>
              ) : (
                processedRules.map(r => {
                  const changes = pendingUpdates[r.id]
                  const isModified = Boolean(changes)
                  const effectivePercentage = changes?.percentage !== undefined ? changes.percentage : (r.percentage ?? '')
                  const effectiveProfit = changes?.profit !== undefined ? changes.profit : (r.profit ?? '')
                  const effectiveRemarks = changes?.remarks !== undefined ? changes.remarks : (r.remarks || '')
                  const effectiveStatus = changes?.status !== undefined ? changes.status : r.status

                  return (
                    <div 
                      key={r.id} 
                      className={`bg-white p-4 rounded-2xl border shadow-sm space-y-3 transition-all ${
                        isModified ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r.id)}
                            onChange={() => handleToggleSelectRow(r.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <h4 className="font-extrabold text-slate-900 text-sm">{r.company?.name || '—'}</h4>
                          {isModified && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-black uppercase">
                              Modified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updatePendingField(r.id, 'status', effectiveStatus === 1 ? 2 : 1)}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              effectiveStatus === 1 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {effectiveStatus === 1 ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => stageDeleteRow(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Percentage (%)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={effectivePercentage}
                              onChange={e => updatePendingField(r.id, 'percentage', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-800"
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Profit Bound (₹)</label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={effectiveProfit}
                              onChange={e => updatePendingField(r.id, 'profit', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-800"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={effectiveRemarks}
                          placeholder="Remarks..."
                          onChange={e => updatePendingField(r.id, 'remarks', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700"
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {/* Sticky Floating Save Changes Bar */}
        {unsavedCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-4 animate-in slide-in-from-bottom duration-300 max-w-[95vw]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="text-left">
                <p className="text-xs sm:text-sm font-extrabold text-amber-300 leading-tight">
                  {unsavedCount} Unsaved Change{unsavedCount > 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Save all changes together in one single transaction
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDiscardAllChanges}
                disabled={isSavingBatch}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAllChanges}
                disabled={isSavingBatch}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-50"
              >
                {isSavingBatch ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save All Changes ({unsavedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Quick Add Modal Sheet (lg:hidden) */}
        {isMobileModalOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Add Quotation Relationship
                </h3>
                <button 
                  onClick={() => setIsMobileModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddNewRule} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Direct Company Name *
                  </label>
                  <input
                    type="text"
                    list="company-suggestions"
                    required
                    placeholder="Type or select company (e.g. Chola, HDFC)..."
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Type any company name. New companies are created automatically.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Percentage (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      placeholder="e.g. 50"
                      value={newPercentage}
                      onChange={e => setNewPercentage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Profit (In Rs) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="e.g. 4000"
                      value={newProfit}
                      onChange={e => setNewProfit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Discount 85%, All models"
                    value={newRemarks}
                    onChange={e => setNewRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="1">Active</option>
                    <option value="2">Inactive</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md cursor-pointer"
                  >
                    Add to List
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileModalOpen(false)}
                    className="py-3 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
