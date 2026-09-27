'use client'
import React, { useState, useEffect, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { 
  Plus, Edit2, Trash2, ShieldAlert, Sparkles, Building, 
  ListCollapse, Save, X, RefreshCw, Search, CheckCircle2, MessageSquare,
  SlidersHorizontal, Check, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown, Percent
} from 'lucide-react'

interface InlineEditState {
  id: string
  field: 'percentage' | 'profit' | 'remarks'
  value: string
}

export default function QuotationRelationshipPage() {
  const { user, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()

  const [activeTab, setActiveTab] = useState<'rules' | 'companies'>('rules')
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all')
  const [selectedPercentageFilter, setSelectedPercentageFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Sorting State
  const [sortField, setSortField] = useState<string>('company')
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // Multi-Select Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Inline Single-Field Edit State
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null)
  const [inlineSaving, setInlineSaving] = useState(false)

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Mobile Form Modal Control
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  // Form States
  const [companyName, setCompanyName] = useState('')
  const [ruleForm, setRuleForm] = useState({
    id: '',
    companyId: '',
    categoryId: '',
    percentage: '',
    profit: '',
    remarks: '',
    status: '1'
  })

  // Edit target states for Companies inline renaming
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')

  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadAllData()
    }
  }, [authLoading, user])

  const loadAllData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [compRes, catRes, ruleRes] = await Promise.all([
        apiFetch('/api/v1/rates/companies'),
        apiFetch('/api/v1/rates/categories'),
        apiFetch('/api/v1/rates/relationships')
      ])

      if (compRes.ok && catRes.ok && ruleRes.ok) {
        const comps = await compRes.json()
        const cats = await catRes.json()
        const rls = await ruleRes.json()
        setCompanies(Array.isArray(comps) ? comps : [])
        setCategories(Array.isArray(cats) ? cats : [])
        setRules(Array.isArray(rls) ? rls : [])
      } else {
        setErrorMsg('Failed to load quotation relationship data.')
      }
    } catch {
      setErrorMsg('Network error fetching configuration.')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // --- Companies CRUD ---
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) return
    try {
      const res = await apiFetch('/api/v1/rates/companies', {
        method: 'POST',
        body: JSON.stringify({ name: companyName.trim() })
      })
      if (res.ok) {
        setCompanyName('')
        setIsMobileModalOpen(false)
        showSuccess('Company added successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to add company')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleUpdateCompany = async (id: string, newStatus?: number) => {
    try {
      const res = await apiFetch(`/api/v1/rates/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(newStatus !== undefined && { status: newStatus }),
          ...(editingCompanyId === id && { name: editCompanyName.trim() })
        })
      })
      if (res.ok) {
        setEditingCompanyId(null)
        setEditCompanyName('')
        showSuccess('Company updated successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to update company')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  // --- Rate Rules (Quotation Relationships) Full Save ---
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const { id, companyId, categoryId, percentage, profit, remarks, status } = ruleForm
    if (!companyId) {
      setErrorMsg('Please select an insurance company.')
      return
    }
    if (!categoryId) {
      setErrorMsg('Please select a vehicle category.')
      return
    }
    if (percentage === '' || isNaN(parseFloat(percentage))) {
      setErrorMsg('Please enter a valid percentage.')
      return
    }
    if (profit === '' || isNaN(parseFloat(profit))) {
      setErrorMsg('Please enter a valid profit amount.')
      return
    }

    try {
      const url = id ? `/api/v1/rates/relationships/${id}` : '/api/v1/rates/relationships'
      const method = id ? 'PATCH' : 'POST'

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          companyId,
          categoryId,
          percentage: parseFloat(percentage),
          profit: parseFloat(profit),
          remarks: remarks.trim() || undefined,
          status: parseInt(status)
        })
      })

      if (res.ok) {
        setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })
        setIsMobileModalOpen(false)
        showSuccess(id ? 'Quotation relationship rule updated!' : 'New quotation relationship rule created!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to save quotation relationship rule')
      }
    } catch {
      setErrorMsg('Network error occurred while saving.')
    }
  }

  // --- Single-Field Inline Edit Save ---
  const handleSaveInlineField = async () => {
    if (!inlineEdit) return
    const { id, field, value } = inlineEdit
    setInlineSaving(true)
    setErrorMsg('')
    try {
      const payload: any = {}
      if (field === 'percentage') {
        const p = parseFloat(value)
        if (isNaN(p) || p < 0 || p > 100) {
          setErrorMsg('Percentage must be between 0 and 100%')
          setInlineSaving(false)
          return
        }
        payload.percentage = p
      } else if (field === 'profit') {
        const pr = parseFloat(value)
        if (isNaN(pr) || pr < 0) {
          setErrorMsg('Profit must be a valid number >= 0')
          setInlineSaving(false)
          return
        }
        payload.profit = pr
      } else if (field === 'remarks') {
        payload.remarks = value.trim()
      }

      const res = await apiFetch(`/api/v1/rates/relationships/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showSuccess(`Updated ${field} successfully!`)
        setInlineEdit(null)
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || `Failed to update ${field}`)
      }
    } catch {
      setErrorMsg('Network error while updating field.')
    } finally {
      setInlineSaving(false)
    }
  }

  // Quick toggle status
  const handleToggleStatus = async (r: any) => {
    const nextStatus = r.status === 1 ? 2 : 1
    try {
      const res = await apiFetch(`/api/v1/rates/relationships/${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      })
      if (res.ok) {
        showSuccess(`Rule set to ${nextStatus === 1 ? 'Active' : 'Inactive'}!`)
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to update status')
      }
    } catch {
      setErrorMsg('Network error updating status.')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation relationship rule?')) return
    try {
      const res = await apiFetch(`/api/v1/rates/relationships/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showSuccess('Quotation relationship rule deleted successfully!')
        setSelectedIds(prev => prev.filter(item => item !== id))
        loadAllData()
      } else {
        setErrorMsg('Failed to delete quotation relationship rule.')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  // --- Bulk Deletion ---
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected quotation relationship rules?`)) return

    setIsBulkDeleting(true)
    setErrorMsg('')
    try {
      const res = await apiFetch('/api/v1/rates/relationships', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selectedIds })
      })

      if (res.ok) {
        showSuccess(`Deleted ${selectedIds.length} quotation relationship rules successfully!`)
        setSelectedIds([])
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to bulk delete rules')
      }
    } catch {
      setErrorMsg('Network error during bulk delete.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const startEditRule = (r: any) => {
    setRuleForm({
      id: r.id,
      companyId: r.companyId,
      categoryId: r.categoryId,
      percentage: r.percentage?.toString() || '',
      profit: r.profit?.toString() || '',
      remarks: r.remarks || '',
      status: r.status?.toString() || '1'
    })
    setIsMobileModalOpen(true)
    // Scroll to form if on desktop
    window.scrollTo({ top: 120, behavior: 'smooth' })
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

  // Unique percentages for dedicated percentage filter
  const uniquePercentages = useMemo(() => {
    const set = new Set<string>()
    rules.forEach(r => {
      if (r.percentage !== undefined && r.percentage !== null) {
        set.add(String(parseFloat(r.percentage.toString())))
      }
    })
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b))
  }, [rules])

  // Filtered & Sorted Rules
  const processedRules = useMemo(() => {
    return rules.filter(r => {
      // Search Query
      const query = searchQuery.toLowerCase().trim()
      if (query) {
        const comp = r.company?.name?.toLowerCase() || ''
        const cat = r.category?.name?.toLowerCase() || ''
        const rem = r.remarks?.toLowerCase() || ''
        const pct = r.percentage?.toString() || ''
        const prof = r.profit?.toString() || ''
        if (!comp.includes(query) && !cat.includes(query) && !rem.includes(query) && !pct.includes(query) && !prof.includes(query)) {
          return false
        }
      }

      // Company Filter
      if (selectedCompanyFilter !== 'all' && r.companyId !== selectedCompanyFilter) {
        return false
      }

      // Dedicated Percentage Filter
      if (selectedPercentageFilter !== 'all') {
        const itemPct = parseFloat(r.percentage?.toString() || '0')
        const targetPct = parseFloat(selectedPercentageFilter)
        if (itemPct !== targetPct) return false
      }

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        const targetStatus = selectedStatusFilter === 'active' ? 1 : 2
        if (r.status !== targetStatus) return false
      }

      return true
    }).sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      if (sortField === 'company') {
        valA = a.company?.name || ''
        valB = b.company?.name || ''
      } else if (sortField === 'category') {
        valA = a.category?.name || ''
        valB = b.category?.name || ''
      } else if (sortField === 'percentage') {
        valA = parseFloat(a.percentage?.toString() || '0')
        valB = parseFloat(b.percentage?.toString() || '0')
      } else if (sortField === 'profit') {
        valA = parseFloat(a.profit?.toString() || '0')
        valB = parseFloat(b.profit?.toString() || '0')
      } else if (sortField === 'status') {
        valA = a.status || 0
        valB = b.status || 0
      } else {
        valA = a.createdAt || ''
        valB = b.createdAt || ''
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortAsc ? valA - valB : valB - valA
    })
  }, [rules, searchQuery, selectedCompanyFilter, selectedPercentageFilter, selectedStatusFilter, sortField, sortAsc])

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

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return !query ? companies : companies.filter(c => c.name?.toLowerCase().includes(query))
  }, [companies, searchQuery])

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
            Only administrators are authorized to configure Quotation Relationships, vehicle rules, and rates.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Quotation Relationship</h1>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center gap-1 border border-amber-200">
                <Sparkles size={12} /> Matrix Rules
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Configure company-category percentages, profit margins, and vehicle relationship conditions.</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => {
                setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })
                setIsMobileModalOpen(true)
              }}
              className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>{activeTab === 'rules' ? 'New Relationship' : 'Add Company'}</span>
            </button>

            <button
              onClick={loadAllData}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 bg-white shrink-0 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Stat Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Relationships</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{rules.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl hidden sm:block">
              <ListCollapse size={20} />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{categories.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl hidden sm:block">
              <Sparkles size={20} />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Companies</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{companies.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl hidden sm:block">
              <Building size={20} />
            </div>
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

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-4 z-30 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-lg">
                {selectedIds.length} Selected
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 hidden sm:block">
                Quotation relationship rules selected for batch deletion
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
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isBulkDeleting ? 'Deleting...' : 'Delete Selected'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation & Advanced Filter Toolbar */}
        <div className="space-y-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tab Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'rules', label: 'Quotation Relationships', count: rules.length, icon: ListCollapse },
                { id: 'companies', label: 'Insurance Companies', count: companies.length, icon: Building }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id as any)
                    setEditingCompanyId(null)
                    setSelectedIds([])
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <t.icon size={14} />
                  <span>{t.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeTab === t.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Universal Search Box */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'rules' ? 'company, category, remarks...' : 'companies...'}`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
              />
            </div>
          </div>

          {/* Dedicated Filter Pills Bar (For Rules Tab) */}
          {activeTab === 'rules' && (
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

              {/* Dedicated Percentage (%) Filter */}
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
          )}
        </div>

        {/* Content Layout */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl min-h-[350px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Desktop Form Panel (lg:col-span-4) */}
            <div className="hidden lg:block lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
              {activeTab === 'rules' && (
                <form onSubmit={handleSaveRule} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                      {ruleForm.id ? 'Edit Relationship' : 'New Relationship'}
                    </h3>
                    {ruleForm.id && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Editing</span>
                    )}
                  </div>
                  
                  <div className="space-y-3.5">
                    {/* Company Dropdown */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Company *</label>
                      <select
                        required
                        value={ruleForm.companyId}
                        onChange={e => setRuleForm({ ...ruleForm, companyId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vehicle Category *</label>
                      <select
                        required
                        value={ruleForm.categoryId}
                        onChange={e => setRuleForm({ ...ruleForm, categoryId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
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
                          value={ruleForm.percentage}
                          onChange={e => setRuleForm({ ...ruleForm, percentage: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Profit (In Rs) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="e.g. 4000"
                          value={ruleForm.profit}
                          onChange={e => setRuleForm({ ...ruleForm, profit: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Discount 85%, All models"
                        value={ruleForm.remarks}
                        onChange={e => setRuleForm({ ...ruleForm, remarks: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                      <select
                        value={ruleForm.status}
                        onChange={e => setRuleForm({ ...ruleForm, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save size={14} /> {ruleForm.id ? 'Update Rule' : 'Save Rule'}
                    </button>
                    {ruleForm.id && (
                      <button
                        type="button"
                        onClick={() => setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })}
                        className="py-3 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 uppercase tracking-wide cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'companies' && (
                <form onSubmit={handleAddCompany} className="space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide pb-3 border-b border-slate-100">
                    Add Insurance Company
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC ERGO"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Company
                  </button>
                </form>
              )}
            </div>

            {/* Data View Panel (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* QUOTATION RELATIONSHIPS TAB */}
              {activeTab === 'rules' && (
                <>
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

                            {/* Company Sort */}
                            <th 
                              onClick={() => toggleSort('company')}
                              className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                            >
                              <div className="flex items-center gap-1">
                                <span>Company</span>
                                {sortField === 'company' ? (
                                  sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                                ) : <ArrowUpDown size={12} className="text-slate-300" />}
                              </div>
                            </th>

                            {/* Category Sort */}
                            <th 
                              onClick={() => toggleSort('category')}
                              className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                            >
                              <div className="flex items-center gap-1">
                                <span>Category</span>
                                {sortField === 'category' ? (
                                  sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                                ) : <ArrowUpDown size={12} className="text-slate-300" />}
                              </div>
                            </th>

                            {/* Percentage Sort */}
                            <th 
                              onClick={() => toggleSort('percentage')}
                              className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                            >
                              <div className="flex items-center gap-1">
                                <span>Percentage (%)</span>
                                {sortField === 'percentage' ? (
                                  sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                                ) : <ArrowUpDown size={12} className="text-slate-300" />}
                              </div>
                            </th>

                            {/* Profit Sort */}
                            <th 
                              onClick={() => toggleSort('profit')}
                              className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                            >
                              <div className="flex items-center gap-1">
                                <span>Profit (₹)</span>
                                {sortField === 'profit' ? (
                                  sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                                ) : <ArrowUpDown size={12} className="text-slate-300" />}
                              </div>
                            </th>

                            {/* Remarks */}
                            <th className="px-4 py-3.5">
                              <span>Remarks</span>
                            </th>

                            {/* Status Sort */}
                            <th 
                              onClick={() => toggleSort('status')}
                              className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                            >
                              <div className="flex items-center gap-1">
                                <span>Status</span>
                                {sortField === 'status' ? (
                                  sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                                ) : <ArrowUpDown size={12} className="text-slate-300" />}
                              </div>
                            </th>

                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs">
                          {processedRules.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                No matching quotation relationship rules found.
                              </td>
                            </tr>
                          ) : (
                            processedRules.map(r => {
                              const isSelected = selectedIds.includes(r.id)
                              return (
                                <tr key={r.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
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
                                    {r.company?.name || '—'}
                                  </td>

                                  {/* Category Name */}
                                  <td className="px-4 py-3 text-slate-600 font-semibold max-w-[200px] truncate" title={r.category?.name || '—'}>
                                    {r.category?.name || '—'}
                                  </td>

                                  {/* Percentage (%) with Inline Pencil Edit */}
                                  <td className="px-4 py-3 font-bold text-emerald-700">
                                    {inlineEdit && inlineEdit.id === r.id && inlineEdit.field === 'percentage' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          value={inlineEdit.value}
                                          onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                          onKeyDown={e => { if (e.key === 'Enter') handleSaveInlineField(); if (e.key === 'Escape') setInlineEdit(null); }}
                                          className="w-16 px-1.5 py-0.5 border border-emerald-400 rounded bg-white text-xs font-bold outline-none"
                                          autoFocus
                                        />
                                        <button
                                          onClick={handleSaveInlineField}
                                          disabled={inlineSaving}
                                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                          title="Save Percentage"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          onClick={() => setInlineEdit(null)}
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="group flex items-center gap-1.5">
                                        <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                          {parseFloat(r.percentage.toString())}%
                                        </span>
                                        <button
                                          onClick={() => setInlineEdit({ id: r.id, field: 'percentage', value: String(parseFloat(r.percentage.toString())) })}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 rounded transition-all cursor-pointer"
                                          title="Edit percentage"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Profit (₹) with Inline Pencil Edit */}
                                  <td className="px-4 py-3 font-bold text-blue-700">
                                    {inlineEdit && inlineEdit.id === r.id && inlineEdit.field === 'profit' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={inlineEdit.value}
                                          onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                          onKeyDown={e => { if (e.key === 'Enter') handleSaveInlineField(); if (e.key === 'Escape') setInlineEdit(null); }}
                                          className="w-20 px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs font-bold outline-none"
                                          autoFocus
                                        />
                                        <button
                                          onClick={handleSaveInlineField}
                                          disabled={inlineSaving}
                                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                                          title="Save Profit"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          onClick={() => setInlineEdit(null)}
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="group flex items-center gap-1.5">
                                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                                          ₹{parseFloat(r.profit.toString()).toLocaleString()}
                                        </span>
                                        <button
                                          onClick={() => setInlineEdit({ id: r.id, field: 'profit', value: String(parseFloat(r.profit.toString())) })}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-700 rounded transition-all cursor-pointer"
                                          title="Edit profit"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Remarks with Inline Pencil Edit */}
                                  <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                                    {inlineEdit && inlineEdit.id === r.id && inlineEdit.field === 'remarks' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={inlineEdit.value}
                                          onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                          onKeyDown={e => { if (e.key === 'Enter') handleSaveInlineField(); if (e.key === 'Escape') setInlineEdit(null); }}
                                          className="w-40 px-1.5 py-0.5 border border-slate-300 rounded bg-white text-xs outline-none"
                                          autoFocus
                                        />
                                        <button
                                          onClick={handleSaveInlineField}
                                          disabled={inlineSaving}
                                          className="p-1 bg-slate-800 hover:bg-black text-white rounded cursor-pointer"
                                          title="Save Remark"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button
                                          onClick={() => setInlineEdit(null)}
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="group flex items-center justify-between gap-1">
                                        <span className="truncate italic" title={r.remarks || '—'}>
                                          {r.remarks || '—'}
                                        </span>
                                        <button
                                          onClick={() => setInlineEdit({ id: r.id, field: 'remarks', value: r.remarks || '' })}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-all shrink-0 cursor-pointer"
                                          title="Edit remark"
                                        >
                                          <Edit2 size={11} />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => handleToggleStatus(r)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                                        r.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                      }`}
                                      title="Click to toggle status"
                                    >
                                      {r.status === 1 ? 'Active' : 'Inactive'}
                                    </button>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => startEditRule(r)}
                                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                        title="Edit Entire Rule"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRule(r.id)}
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
                    {processedRules.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs italic border border-slate-100">
                        No matching quotation relationship rules found.
                      </div>
                    ) : (
                      processedRules.map(r => {
                        const isSelected = selectedIds.includes(r.id)
                        return (
                          <div key={r.id} className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRow(r.id)}
                                  className="rounded border-slate-300 text-blue-600"
                                />
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-sm">{r.company?.name || '—'}</h4>
                                  <p className="text-[11px] text-slate-500 font-semibold">{r.category?.name || '—'}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleStatus(r)}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                  r.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {r.status === 1 ? 'Active' : 'Inactive'}
                              </button>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex-1 bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase">Percentage</p>
                                <p className="text-sm font-black text-emerald-800 mt-0.5">{parseFloat(r.percentage.toString())}%</p>
                              </div>

                              <div className="flex-1 bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-center">
                                <p className="text-[9px] font-bold text-blue-600 uppercase">Profit Bound</p>
                                <p className="text-sm font-black text-blue-800 mt-0.5">₹{parseFloat(r.profit.toString()).toLocaleString()}</p>
                              </div>
                            </div>

                            {r.remarks && (
                              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                                <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                <span className="italic">{r.remarks}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                              <button
                                onClick={() => startEditRule(r)}
                                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRule(r.id)}
                                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}

              {/* COMPANIES TAB */}
              {activeTab === 'companies' && (
                <>
                  <div className="hidden md:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                              No matching insurance companies found.
                            </td>
                          </tr>
                        ) : (
                          filteredCompanies.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-slate-800">
                                {editingCompanyId === item.id ? (
                                  <input
                                    type="text"
                                    value={editCompanyName}
                                    onChange={e => setEditCompanyName(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-slate-50 font-bold"
                                    autoFocus
                                  />
                                ) : (
                                  item.name
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  item.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {item.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {editingCompanyId === item.id ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateCompany(item.id)}
                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => { setEditingCompanyId(null); setEditCompanyName('') }}
                                        className="px-3 py-1 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => { setEditingCompanyId(item.id); setEditCompanyName(item.name) }}
                                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                        title="Rename"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleUpdateCompany(item.id, item.status === 1 ? 2 : 1)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                          item.status === 1 
                                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' 
                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                        }`}
                                      >
                                        {item.status === 1 ? 'Disable' : 'Enable'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {filteredCompanies.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 inline-block ${
                            item.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingCompanyId(item.id); setEditCompanyName(item.name); setIsMobileModalOpen(true); }}
                            className="p-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleUpdateCompany(item.id, item.status === 1 ? 2 : 1)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                              item.status === 1 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}
                          >
                            {item.status === 1 ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>

          </div>
        )}

        {/* Mobile Form Modal / Sheet (lg:hidden) */}
        {isMobileModalOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {activeTab === 'rules'
                    ? (ruleForm.id ? 'Edit Quotation Relationship' : 'New Quotation Relationship')
                    : 'Add Insurance Company'
                  }
                </h3>
                <button 
                  onClick={() => setIsMobileModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {activeTab === 'rules' && (
                <form onSubmit={handleSaveRule} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Company *</label>
                    <select
                      required
                      value={ruleForm.companyId}
                      onChange={e => setRuleForm({ ...ruleForm, companyId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vehicle Category *</label>
                    <select
                      required
                      value={ruleForm.categoryId}
                      onChange={e => setRuleForm({ ...ruleForm, categoryId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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
                        value={ruleForm.percentage}
                        onChange={e => setRuleForm({ ...ruleForm, percentage: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Profit (In Rs) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="e.g. 4000"
                        value={ruleForm.profit}
                        onChange={e => setRuleForm({ ...ruleForm, profit: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Remarks (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Discount 85%, All models"
                      value={ruleForm.remarks}
                      onChange={e => setRuleForm({ ...ruleForm, remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                    <select
                      value={ruleForm.status}
                      onChange={e => setRuleForm({ ...ruleForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="1">Active</option>
                      <option value="2">Inactive</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      {ruleForm.id ? 'Update Rule' : 'Save Rule'}
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
              )}

              {activeTab === 'companies' && (
                <form onSubmit={handleAddCompany} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC ERGO"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      Add Company
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
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
