'use client'
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { 
  Plus, Edit2, Trash2, ShieldAlert, Sparkles, Building, Folder, 
  ListCollapse, Save, X, RefreshCw, Search, CheckCircle2, MessageSquare,
  SlidersHorizontal, Check, AlertCircle
} from 'lucide-react'

export default function RatesSettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()

  const [activeTab, setActiveTab] = useState<'rules' | 'companies' | 'categories'>('rules')
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Mobile Form Modal Control
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  // Form States
  const [companyName, setCompanyName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [ruleForm, setRuleForm] = useState({
    id: '',
    companyId: '',
    categoryId: '',
    percentage: '',
    profit: '',
    remarks: '',
    status: '1'
  })

  // Edit target states for Companies / Categories inline renaming
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

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
        setCompanies(await compRes.json())
        setCategories(await catRes.json())
        setRules(await ruleRes.json())
      } else {
        setErrorMsg('Failed to load rates configuration data.')
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
        body: JSON.stringify({ name: companyName })
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
          ...(editingId === id && { name: editName })
        })
      })
      if (res.ok) {
        setEditingId(null)
        setEditName('')
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

  // --- Categories CRUD ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) return
    try {
      const res = await apiFetch('/api/v1/rates/categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName })
      })
      if (res.ok) {
        setCategoryName('')
        setIsMobileModalOpen(false)
        showSuccess('Category added successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to add category')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleUpdateCategory = async (id: string, newStatus?: number) => {
    try {
      const res = await apiFetch(`/api/v1/rates/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(newStatus !== undefined && { status: newStatus }),
          ...(editingId === id && { name: editName })
        })
      })
      if (res.ok) {
        setEditingId(null)
        setEditName('')
        showSuccess('Category updated successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to update category')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  // --- Rate Rules (Relationships) CRUD ---
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const { id, companyId, categoryId, percentage, profit, remarks, status } = ruleForm
    if (!companyId || !categoryId || percentage === '' || profit === '') return

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
          remarks,
          status: parseInt(status)
        })
      })

      if (res.ok) {
        setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })
        setIsMobileModalOpen(false)
        showSuccess(id ? 'Quotation rate rule updated!' : 'Quotation rate rule created!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to save rate rule')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure want to delete this quotation rate rule?')) return
    try {
      const res = await apiFetch(`/api/v1/rates/relationships/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showSuccess('Rate rule deleted successfully!')
        loadAllData()
      } else {
        setErrorMsg('Failed to delete rate rule.')
      }
    } catch {
      setErrorMsg('Network error occurred.')
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
  }

  // Search filtering
  const filteredRules = rules.filter(r => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    const compMatch = r.company?.name?.toLowerCase().includes(query)
    const catMatch = r.category?.name?.toLowerCase().includes(query)
    const remarksMatch = r.remarks?.toLowerCase().includes(query)
    return compMatch || catMatch || remarksMatch
  })

  const filteredCompanies = companies.filter(c => {
    const query = searchQuery.toLowerCase().trim()
    return !query || c.name?.toLowerCase().includes(query)
  })

  const filteredCategories = categories.filter(c => {
    const query = searchQuery.toLowerCase().trim()
    return !query || c.name?.toLowerCase().includes(query)
  })

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
            Only administrators are authorized to configure Quotation Rates, formulas, and relationship matrices.
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
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Quotation Rates</h1>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center gap-1 border border-amber-200">
                <Sparkles size={12} /> vehicle-bk matrix
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Configure company, category percentages, profit bounds, and remarks.</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => {
                setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', remarks: '', status: '1' })
                setIsMobileModalOpen(true)
              }}
              className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus size={16} />
              <span>{activeTab === 'rules' ? 'New Rate Rule' : activeTab === 'companies' ? 'Add Company' : 'Add Category'}</span>
            </button>

            <button
              onClick={loadAllData}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 bg-white shrink-0"
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
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Rate Rules</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{rules.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl hidden sm:block">
              <ListCollapse size={20} />
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

          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{categories.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl hidden sm:block">
              <Folder size={20} />
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
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-rose-100 rounded-lg"><X size={16} /></button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded-lg"><X size={16} /></button>
          </div>
        )}

        {/* Tab & Search Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-sm">
          {/* Scrollable Mobile Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'rules', label: 'Rate Rules', count: rules.length, icon: ListCollapse },
              { id: 'companies', label: 'Companies', count: companies.length, icon: Building },
              { id: 'categories', label: 'Categories', count: categories.length, icon: Folder }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any)
                  setEditingId(null)
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

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
            />
          </div>
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
                      {ruleForm.id ? 'Edit Quotation Rate' : 'New Quotation Rate'}
                    </h3>
                    {ruleForm.id && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Editing</span>
                    )}
                  </div>
                  
                  <div className="space-y-3.5">
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

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category *</label>
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
                          placeholder="ex: 50"
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
                          placeholder="ex: 4000"
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
                        placeholder="ex: This vehicle not acceptable"
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
                      <Save size={14} /> Save Rate Rule
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

              {activeTab === 'categories' && (
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide pb-3 border-b border-slate-100">
                    Add Vehicle Category
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Two Wheeler Comprehensive"
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Category
                  </button>
                </form>
              )}
            </div>

            {/* Data View Panel (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* RATE RULES TAB */}
              {activeTab === 'rules' && (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Percentage</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRules.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                              No matching quotation rate rules found.
                            </td>
                          </tr>
                        ) : (
                          filteredRules.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 text-xs font-bold text-slate-900">{r.company?.name || '—'}</td>
                              <td className="px-5 py-4 text-xs text-slate-600 font-medium">{r.category?.name || '—'}</td>
                              <td className="px-5 py-4 text-xs font-bold text-emerald-700">
                                <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                  {parseFloat(r.percentage.toString())}%
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs font-bold text-blue-700">
                                <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                                  ₹{parseFloat(r.profit.toString()).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-500 max-w-[160px] truncate" title={r.remarks || '—'}>
                                {r.remarks || '—'}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  r.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {r.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => startEditRule(r)}
                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                    title="Edit Rule"
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (md:hidden) */}
                  <div className="md:hidden space-y-3">
                    {filteredRules.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs italic border border-slate-100">
                        No matching quotation rate rules found.
                      </div>
                    ) : (
                      filteredRules.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm">{r.company?.name || '—'}</h4>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{r.category?.name || '—'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                              r.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {r.status === 1 ? 'Active' : 'Inactive'}
                            </span>
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
                      ))
                    )}
                  </div>
                </>
              )}

              {/* COMPANIES & CATEGORIES TABS */}
              {(activeTab === 'companies' || activeTab === 'categories') && (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const dataList = activeTab === 'companies' ? filteredCompanies : filteredCategories
                          if (dataList.length === 0) {
                            return (
                              <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                  No matching {activeTab} found.
                                </td>
                              </tr>
                            )
                          }
                          return dataList.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-slate-800">
                                {editingId === item.id ? (
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
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
                                  {editingId === item.id ? (
                                    <>
                                      <button
                                        onClick={() => activeTab === 'companies' ? handleUpdateCompany(item.id) : handleUpdateCategory(item.id)}
                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => { setEditingId(null); setEditName('') }}
                                        className="px-3 py-1 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingId(item.id)
                                          setEditName(item.name)
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                        title="Rename"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => activeTab === 'companies'
                                          ? handleUpdateCompany(item.id, item.status === 1 ? 2 : 1)
                                          : handleUpdateCategory(item.id, item.status === 1 ? 2 : 1)
                                        }
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                                          item.status === 1
                                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
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
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (md:hidden) */}
                  <div className="md:hidden space-y-3">
                    {(() => {
                      const dataList = activeTab === 'companies' ? filteredCompanies : filteredCategories
                      if (dataList.length === 0) {
                        return (
                          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs italic border border-slate-100">
                            No matching {activeTab} found.
                          </div>
                        )
                      }
                      return dataList.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            {editingId === item.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-slate-50 font-bold w-full mr-2"
                                autoFocus
                              />
                            ) : (
                              <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                            )}

                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                              item.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                            {editingId === item.id ? (
                              <>
                                <button
                                  onClick={() => activeTab === 'companies' ? handleUpdateCompany(item.id) : handleUpdateCategory(item.id)}
                                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                                >
                                  Save Name
                                </button>
                                <button
                                  onClick={() => { setEditingId(null); setEditName('') }}
                                  className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(item.id)
                                    setEditName(item.name)
                                  }}
                                  className="flex-1 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                                >
                                  <Edit2 size={12} /> Rename
                                </button>
                                <button
                                  onClick={() => activeTab === 'companies'
                                    ? handleUpdateCompany(item.id, item.status === 1 ? 2 : 1)
                                    : handleUpdateCategory(item.id, item.status === 1 ? 2 : 1)
                                  }
                                  className={`py-2 px-4 rounded-xl text-xs font-bold ${
                                    item.status === 1
                                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  }`}
                                >
                                  {item.status === 1 ? 'Disable' : 'Enable'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    })()}
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
                    ? (ruleForm.id ? 'Edit Rate Rule' : 'New Rate Rule')
                    : activeTab === 'companies'
                    ? 'Add Insurance Company'
                    : 'Add Vehicle Category'
                  }
                </h3>
                <button 
                  onClick={() => setIsMobileModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full"
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
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category *</label>
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
                        placeholder="ex: 50"
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
                        placeholder="ex: 4000"
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
                      placeholder="ex: This vehicle not acceptable"
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
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md"
                    >
                      Save Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileModalOpen(false)}
                      className="py-3 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wide"
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
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md"
                    >
                      Add Company
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileModalOpen(false)}
                      className="py-3 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wide"
                    >
                      Close
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'categories' && (
                <form onSubmit={handleAddCategory} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Two Wheeler Comprehensive"
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-md"
                    >
                      Add Category
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileModalOpen(false)}
                      className="py-3 px-4 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wide"
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
