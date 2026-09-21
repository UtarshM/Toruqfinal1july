"use client"
import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { 
  Calculator, Calendar, Info, CheckCircle2, Save, RefreshCw, 
  Edit2, Trash2, Plus, X, Search, Building, TrendingUp, AlertCircle, Download
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getISTDateString, formatDateDMY } from '@/lib/date-format'

interface SubCalcState {
  companyId: string
  companyName: string
  categoryId: string
  netPremium: string
  totalPremium: string
  profit: string
  remarks: string
  hasRuleFound: boolean
}

const emptySubCalc: SubCalcState = {
  companyId: '',
  companyName: '',
  categoryId: '',
  netPremium: '',
  totalPremium: '',
  profit: '',
  remarks: '',
  hasRuleFound: false
}

interface SavedCalculationRecord {
  id: string
  date: string
  percentage: string
  calculator1: SubCalcState & { rate?: number; benefit?: number }
  calculator2: SubCalcState & { rate?: number; benefit?: number }
  calculator3: SubCalcState & { rate?: number; benefit?: number }
  createdBy?: string
  creatorName?: string
  createdAt?: string
  updatedAt?: string
}

export default function RateCalculatorPage() {
  const { user } = useAuth()
  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  const formTopRef = useRef<HTMLDivElement>(null)

  // Current active sub-calculator tab (1, 2, or 3)
  const [calcTab, setCalcTab] = useState<1 | 2 | 3>(1)

  // Record-level State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [recordDate, setRecordDate] = useState<string>(getISTDateString(0))
  // The Percentage (%) value is shared/common across all three calculators
  const [recordPercentage, setRecordPercentage] = useState<string>('')

  // Independent state per calculator tab
  const [subCalcs, setSubCalcs] = useState<Record<1 | 2 | 3, SubCalcState>>({
    1: { ...emptySubCalc },
    2: { ...emptySubCalc },
    3: { ...emptySubCalc }
  })

  // Lists from DB
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Saved records list state
  const [savedRecords, setSavedRecords] = useState<SavedCalculationRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text })
    setTimeout(() => setActionMessage(null), 4500)
  }

  useEffect(() => {
    fetchInitialData()
    fetchSavedRecords()
  }, [])

  const fetchInitialData = async () => {
    setIsLoadingConfig(true)
    try {
      const [compRes, catRes, relRes] = await Promise.all([
        fetchApi('/api/v1/rates/companies'),
        fetchApi('/api/v1/rates/categories'),
        fetchApi('/api/v1/rates/relationships')
      ])
      setCompanies(compRes || [])
      setCategories(catRes || [])
      setRelationships(relRes || [])
    } catch (err) {
      console.error('Failed to load rate calculator config:', err)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const fetchSavedRecords = async () => {
    setIsLoadingRecords(true)
    try {
      const res = await fetchApi('/api/v1/rates/calculations')
      if (res?.records) {
        setSavedRecords(res.records)
      }
    } catch (err) {
      console.error('Failed to fetch rate calculations list:', err)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  // Helper to update active sub-calculator
  const activeTab: 1 | 2 | 3 = isAdmin ? calcTab : 1
  const currentSubCalc = subCalcs[activeTab]

  const updateSubCalc = (tab: 1 | 2 | 3, patch: Partial<SubCalcState>) => {
    setSubCalcs(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        ...patch
      }
    }))
  }

  // Handle company change on a specific calculator tab
  const handleCompanyChange = async (tab: 1 | 2 | 3, newCompanyId: string) => {
    if (!newCompanyId) {
      updateSubCalc(tab, {
        companyId: '',
        companyName: '',
        categoryId: '',
        profit: '',
        remarks: '',
        hasRuleFound: false
      })
      return
    }

    const selectedComp = companies.find(c => c.id === newCompanyId)
    let matchedCategoryId = ''
    if (selectedComp) {
      const matchingCat = categories.find(
        cat => cat.name.trim().toLowerCase() === selectedComp.name.trim().toLowerCase()
      )
      if (matchingCat) {
        matchedCategoryId = matchingCat.id
      } else {
        const compRel = relationships.find(r => r.companyId === newCompanyId)
        if (compRel && compRel.categoryId) {
          matchedCategoryId = compRel.categoryId
        }
      }
    }

    updateSubCalc(tab, {
      companyId: newCompanyId,
      companyName: selectedComp?.name || '',
      categoryId: matchedCategoryId
    })

    // Preset lookup
    try {
      const catParam = matchedCategoryId ? `&categoryId=${matchedCategoryId}` : ''
      const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${newCompanyId}${catParam}`)
      if (res && (res.qtr_percentage > 0 || res.qtr_profit > 0 || res.qtr_remarks)) {
        // Automatically set preset percentage from vehicle-bk conditions
        if (res.qtr_percentage !== undefined && res.qtr_percentage !== null && (tab === 1 || !recordPercentage)) {
          setRecordPercentage(String(res.qtr_percentage))
        }
        updateSubCalc(tab, {
          profit: res.qtr_profit ? String(res.qtr_profit) : '',
          remarks: res.qtr_remarks || '',
          hasRuleFound: true
        })
      } else {
        updateSubCalc(tab, { hasRuleFound: false })
      }
    } catch (err) {
      console.error('Relationship lookup failed:', err)
    }
  }

  // Calculation formulas for any tab
  const getTabCalculations = (tab: 1 | 2 | 3) => {
    const sub = subCalcs[tab]
    const numNet = parseFloat(sub.netPremium) || 0
    const numTotal = parseFloat(sub.totalPremium) || 0
    const numPct = parseFloat(recordPercentage) || 0
    const numProf = parseFloat(sub.profit) || 0

    const canCalc = numNet > 0 && numTotal > 0
    const rate = canCalc ? Math.round(numTotal - (numNet * (numPct / 100)) + numProf) : 0
    const benefit = canCalc ? Math.round(numTotal - rate) : 0

    return { numNet, numTotal, numPct, numProf, canCalc, rate, benefit }
  }

  const currentCalc = getTabCalculations(activeTab)

  // Clear or reset entire form
  const handleResetForm = () => {
    setEditingId(null)
    setRecordDate(getISTDateString(0))
    setRecordPercentage('')
    setSubCalcs({
      1: { ...emptySubCalc },
      2: { ...emptySubCalc },
      3: { ...emptySubCalc }
    })
    setCalcTab(1)
  }

  // Save or Update Record
  const handleSaveRecord = async () => {
    // Check if at least one calculator has company or premiums filled
    const hasData = [1, 2, 3].some(t => {
      const s = subCalcs[t as 1 | 2 | 3]
      return s.companyId || s.netPremium || s.totalPremium
    })

    if (!hasData) {
      showFeedback('error', 'Please enter details for at least Rate Calculator 1 before saving.')
      return
    }

    setIsSaving(true)
    try {
      // Build payloads with pre-calculated rate & benefit
      const buildSubPayload = (t: 1 | 2 | 3) => {
        const sub = subCalcs[t]
        const { rate, benefit } = getTabCalculations(t)
        const comp = companies.find(c => c.id === sub.companyId)
        return {
          ...sub,
          companyName: comp?.name || sub.companyName || '',
          rate,
          benefit
        }
      }

      const payload = {
        id: editingId || undefined,
        date: recordDate,
        percentage: recordPercentage,
        calculator1: buildSubPayload(1),
        calculator2: buildSubPayload(2),
        calculator3: buildSubPayload(3)
      }

      const method = editingId ? 'PUT' : 'POST'
      const res = await fetchApi('/api/v1/rates/calculations', {
        method,
        body: JSON.stringify(payload)
      })

      if (res?.success) {
        showFeedback('success', editingId ? 'Rate calculator record updated successfully!' : 'New rate calculator record saved!')
        handleResetForm()
        await fetchSavedRecords()
      } else {
        showFeedback('error', res?.error || 'Failed to save rate calculation.')
      }
    } catch (err: any) {
      console.error('Error saving calculation:', err)
      showFeedback('error', err.message || 'Error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  // Load record into form for editing
  const handleEditRecord = (rec: SavedCalculationRecord) => {
    setEditingId(rec.id)
    setRecordDate(rec.date || getISTDateString(0))
    setRecordPercentage(rec.percentage !== undefined ? String(rec.percentage) : '')

    const getSubFromRec = (c: any): SubCalcState => {
      if (!c) return { ...emptySubCalc }
      return {
        companyId: c.companyId || '',
        companyName: c.companyName || '',
        categoryId: c.categoryId || '',
        netPremium: c.netPremium !== undefined ? String(c.netPremium) : '',
        totalPremium: c.totalPremium !== undefined ? String(c.totalPremium) : '',
        profit: c.profit !== undefined ? String(c.profit) : '',
        remarks: c.remarks || '',
        hasRuleFound: Boolean(c.hasRuleFound)
      }
    }

    setSubCalcs({
      1: getSubFromRec(rec.calculator1),
      2: getSubFromRec(rec.calculator2),
      3: getSubFromRec(rec.calculator3)
    })

    setCalcTab(1)

    // Scroll smoothly to form
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Delete saved record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Rate Calculator record?')) return
    try {
      const res = await fetchApi(`/api/v1/rates/calculations?id=${id}`, {
        method: 'DELETE'
      })
      if (res?.success) {
        showFeedback('success', 'Rate calculator record deleted.')
        if (editingId === id) handleResetForm()
        await fetchSavedRecords()
      } else {
        showFeedback('error', res?.error || 'Failed to delete record.')
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete record.')
    }
  }

  // Filter saved records
  const filteredRecords = savedRecords.filter(r => {
    if (!listSearch.trim()) return true
    const q = listSearch.toLowerCase()
    const matchDate = (r.date || '').toLowerCase().includes(q)
    const matchC1 = (r.calculator1?.companyName || '').toLowerCase().includes(q) || (r.calculator1?.remarks || '').toLowerCase().includes(q)
    if (!isAdmin) {
      return matchDate || matchC1
    }
    const matchC2 = (r.calculator2?.companyName || '').toLowerCase().includes(q) || (r.calculator2?.remarks || '').toLowerCase().includes(q)
    const matchC3 = (r.calculator3?.companyName || '').toLowerCase().includes(q) || (r.calculator3?.remarks || '').toLowerCase().includes(q)
    return matchDate || matchC1 || matchC2 || matchC3
  })

  return (
    <AdminLayout>
      <div ref={formTopRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator size={24} className="text-blue-600" />
            Rate Calculator
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isAdmin 
              ? 'Calculate customer rates, benefit margins, and manage saved multi-calculator comparison records.'
              : 'Calculate customer rates and view saved Rate Calculator 1 records.'}
          </p>
        </div>

        {/* Global Record Actions */}
        <div className="flex items-center gap-2">
          {editingId && (
            <button
              onClick={handleResetForm}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X size={14} /> Cancel Edit
            </button>
          )}

          <button
            onClick={handleSaveRecord}
            disabled={isSaving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={15} />
            {isSaving ? 'Saving...' : editingId ? 'Update Record' : 'Save Calculation'}
          </button>
        </div>
      </div>

      {/* Editing State Banner */}
      {editingId && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 text-xs font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Edit2 size={16} className="text-amber-600 shrink-0" />
            <span>
              {isAdmin ? (
                <>Currently editing saved record from <strong>{recordDate}</strong> (ID: <span className="font-mono text-[11px]">{editingId.slice(0, 8)}...</span>). Make changes across Calculator 1, 2, or 3 and click <strong>Update Record</strong>.</>
              ) : (
                <>Loaded saved calculation for Rate Calculator 1 from <strong>{recordDate}</strong>.</>
              )}
            </span>
          </div>
          <button
            onClick={handleResetForm}
            className="text-amber-700 hover:text-amber-900 underline text-xs cursor-pointer whitespace-nowrap"
          >
            Clear / Reset
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in ${
          actionMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Unified Calculator Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-10">
        
        {/* Record Header & Common Fields Bar */}
        <div className="bg-slate-50/80 border-b border-slate-200/80 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Sub-Calculator Tabs */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(tabNum => {
                const isActive = activeTab === tabNum
                const sub = subCalcs[tabNum as 1 | 2 | 3]
                const hasVal = sub.companyId || sub.netPremium || sub.totalPremium

                return (
                  <button
                    key={tabNum}
                    onClick={() => setCalcTab(tabNum as 1 | 2 | 3)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <span>Rate Calculator {tabNum}</span>
                    {hasVal && (
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 text-white shadow-md flex items-center gap-2">
                <Calculator size={14} className="text-blue-400" />
                <span>Rate Calculator 1</span>
              </div>
            </div>
          )}

          {/* Common Record-Level Inputs (Date & Shared Percentage) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Common Record Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" /> Date:
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={e => setRecordDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Percentage (%) - Admin Only */}
            {isAdmin && (
              <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-200/70 px-3 py-1.5 rounded-xl">
                <label className="text-xs font-black text-blue-900 flex items-center gap-1">
                  <TrendingUp size={13} className="text-blue-600" /> Shared Percentage (%):
                </label>
                <input
                  type="number"
                  value={recordPercentage}
                  onChange={e => setRecordPercentage(e.target.value)}
                  placeholder="e.g. 50"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-20 bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-black text-blue-950 text-center outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab Status Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            <span>Active Form: <strong>Rate Calculator {activeTab}</strong></span>
          </div>

          {currentSubCalc.companyId && (
            currentSubCalc.hasRuleFound ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200">
                <CheckCircle2 size={12} /> {isAdmin 
                  ? `Preset Rule Applied (${recordPercentage}% + ₹${currentSubCalc.profit || 0})`
                  : 'Policy Rule Applied'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-semibold">
                <Info size={12} /> Standard Company Values
              </span>
            )
          )}
        </div>

        {/* Tab Form Fields */}
        {isLoadingConfig ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            <RefreshCw className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
            Loading rate configuration...
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-5">
            
            {/* 1. Company Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="w-44 text-xs font-black uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1.5">
                <Building size={14} className="text-slate-400" />
                Company
              </label>
              <div className="flex-1">
                <select
                  value={currentSubCalc.companyId}
                  onChange={e => handleCompanyChange(activeTab, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Insurance Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditions & Policy Rules Banner (Same Conditions from Database) */}
            {currentSubCalc.companyId && (
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-950 shadow-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Conditions & Policy Rules
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-800 rounded-full">
                      Underwriting Guideline
                    </span>
                  </div>
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    {currentSubCalc.remarks ? currentSubCalc.remarks : 'Standard broker policy rules apply. No special restrictions.'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Profit Box — Separate per calculator: Profit 1, Profit 2, Profit 3 (ADMIN ONLY) */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200/60">
                <div className="w-44 shrink-0">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    Profit {activeTab} (₹)
                  </label>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Admin-only margin box</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={currentSubCalc.profit}
                    onChange={e => updateSubCalc(activeTab, { profit: e.target.value })}
                    placeholder={`e.g. Enter Profit for Calculator ${activeTab}`}
                    className="w-full bg-white border border-emerald-300 rounded-xl py-2.5 px-3.5 text-xs font-black text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
            )}

            {/* 3. Remarks (Admin Notes / Conditions) */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="w-44 text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">
                  Remarks / Notes
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    readOnly
                    value={currentSubCalc.remarks}
                    placeholder="Remarks"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* 4. Net Premium */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="w-44 text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">
                Net Premium
              </label>
              <div className="flex-1">
                <input
                  type="number"
                  value={currentSubCalc.netPremium}
                  onChange={e => updateSubCalc(activeTab, { netPremium: e.target.value })}
                  min="0"
                  placeholder="e.g. 20000"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* 5. Total Premium */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="w-44 text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">
                Total Premium
              </label>
              <div className="flex-1">
                <input
                  type="number"
                  value={currentSubCalc.totalPremium}
                  onChange={e => updateSubCalc(activeTab, { totalPremium: e.target.value })}
                  min="0"
                  placeholder="e.g. 34000"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* 6. Rate (Customer Rate) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="w-44 shrink-0">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  Rate
                </label>
                <span className="text-[10px] text-slate-400 font-semibold block">Payable by customer</span>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={currentCalc.canCalc ? currentCalc.rate : ''}
                  readOnly
                  placeholder={currentCalc.canCalc ? '' : 'Enter Net Premium & Total Premium'}
                  className="w-full bg-emerald-50/70 border-2 border-emerald-300 rounded-xl py-2.5 px-3.5 text-xs font-black text-emerald-900 outline-none"
                />
              </div>
            </div>

            {/* 7. Benefit (Customer Savings) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="w-44 shrink-0">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  Benefit
                </label>
                <span className="text-[10px] text-slate-400 font-semibold block">Total customer discount</span>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={currentCalc.canCalc ? currentCalc.benefit : ''}
                  readOnly
                  placeholder={currentCalc.canCalc ? '' : 'Enter Net Premium & Total Premium'}
                  className="w-full bg-blue-50/70 border-2 border-blue-300 rounded-xl py-2.5 px-3.5 text-xs font-black text-blue-900 outline-none"
                />
              </div>
            </div>

          </div>
        )}

        {/* Sub-Calculator Footer Summary */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Summary:</span>
            {isAdmin && (
              <>
                <span className="font-bold text-slate-700">
                  Shared %: <strong>{recordPercentage || '0'}%</strong>
                </span>
                <span className="text-slate-300">•</span>
              </>
            )}
            <span className="font-bold text-slate-700">
              {isAdmin ? `Calc ${activeTab} Net:` : 'Net Premium:'} <strong>₹{currentCalc.numNet.toLocaleString()}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-700">
              {isAdmin ? `Calc ${activeTab} Total:` : 'Total Premium:'} <strong>₹{currentCalc.numTotal.toLocaleString()}</strong>
            </span>
            {currentCalc.canCalc && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-black text-emerald-700">
                  Rate: <strong>₹{currentCalc.rate.toLocaleString()}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-black text-blue-700">
                  Benefit: <strong>₹{currentCalc.benefit.toLocaleString()}</strong>
                </span>
              </>
            )}
            {isAdmin && currentCalc.numProf > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-700">
                  Profit {activeTab}: <strong>₹{currentCalc.numProf.toLocaleString()}</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                updateSubCalc(activeTab, { ...emptySubCalc })
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
            >
              {isAdmin ? `Clear Tab ${activeTab}` : 'Clear Calculator'}
            </button>

            <button
              type="button"
              disabled={!currentCalc.canCalc}
              onClick={() => {
                const params = new URLSearchParams({
                  company: currentSubCalc.companyName || `Quote - Option ${activeTab}`,
                  date: formatDateDMY(recordDate),
                  netPremium: String(currentCalc.numNet),
                  totalPremium: String(currentCalc.numTotal),
                  rate: String(currentCalc.rate),
                  benefit: String(currentCalc.benefit),
                  remarks: currentSubCalc.remarks || '',
                })
                window.open(`/api/v1/rates/image?${params.toString()}`, '_blank')
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download or view watermarked quote card image"
            >
              <Download size={13} />
              <span>Quote Image</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleSaveRecord}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={13} />
                {editingId ? 'Update Record' : 'Save Record'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* RATE CALCULATOR LIST SECTION WITH EDIT OPTION FOR EVERY ENTRY */}
      {/* ========================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Rate Calculator Records</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {savedRecords.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAdmin 
                ? 'All saved calculations containing Calculator 1, Calculator 2, and Calculator 3 comparisons.'
                : 'All saved calculations for Rate Calculator 1.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                placeholder="Search by company or date..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-60"
              />
            </div>

            <button
              onClick={fetchSavedRecords}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Refresh List"
            >
              <RefreshCw size={14} className={isLoadingRecords ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isLoadingRecords ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              <RefreshCw className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
              Loading saved rate calculations...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calculator className="mx-auto text-slate-300" size={36} />
              <p className="text-sm font-bold text-slate-700">No Rate Calculator Entries Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {savedRecords.length === 0 
                  ? 'Fill in the calculator form above and click "Save Calculation" to record your first entry.'
                  : 'No saved calculations matched your search query.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">{isAdmin ? 'Date / %' : 'Date'}</th>
                    <th className="py-3.5 px-4">Rate Calculator 1</th>
                    {isAdmin && <th className="py-3.5 px-4">Rate Calculator 2</th>}
                    {isAdmin && <th className="py-3.5 px-4">Rate Calculator 3</th>}
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec, idx) => {
                    const isCurrentlyEditing = editingId === rec.id
                    const c1 = rec.calculator1 || {}
                    const c2 = rec.calculator2 || {}
                    const c3 = rec.calculator3 || {}

                    return (
                      <tr 
                        key={rec.id} 
                        className={`transition-colors ${isCurrentlyEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}
                      >
                        {/* Date & Percentage */}
                        <td className="py-4 px-4 whitespace-nowrap align-top">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 block flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {rec.date ? formatDateDMY(rec.date) : '—'}
                            </span>
                            {isAdmin && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-mono font-black text-[10px]">
                                {rec.percentage || 0}% Shared
                              </span>
                            )}
                            {isCurrentlyEditing && (
                              <span className="block text-[10px] font-black text-amber-700 uppercase tracking-wider mt-1">
                                ● {isAdmin ? 'Editing now' : 'Loaded'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Calculator 1 Summary */}
                        <td className="py-4 px-4 align-top">
                          {c1.companyId || c1.netPremium ? (
                            <div className="space-y-1 max-w-[260px]">
                              <span className="font-bold text-slate-900 block truncate">
                                {c1.companyName || 'Company 1'}
                              </span>
                              <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                                <div>Net: ₹{Number(c1.netPremium || 0).toLocaleString()}</div>
                                <div>Total: ₹{Number(c1.totalPremium || 0).toLocaleString()}</div>
                                <div className="font-black text-emerald-700">Rate: ₹{Number(c1.rate || 0).toLocaleString()}</div>
                                {isAdmin && c1.profit !== undefined && (
                                  <div className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] inline-block">
                                    Profit 1: ₹{Number(c1.profit || 0).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              {c1.remarks && (
                                <div className="mt-1 p-1.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-[10px] font-medium text-amber-950">
                                  <span className="font-black text-amber-900 uppercase tracking-wider text-[9px] block">Conditions:</span>
                                  <span>{c1.remarks}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>

                        {/* Calculator 2 Summary (Admin Only) */}
                        {isAdmin && (
                          <td className="py-4 px-4 align-top">
                            {c2.companyId || c2.netPremium ? (
                              <div className="space-y-1 max-w-[200px]">
                                <span className="font-bold text-slate-900 block truncate">
                                  {c2.companyName || 'Company 2'}
                                </span>
                                <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                                  <div>Net: ₹{Number(c2.netPremium || 0).toLocaleString()}</div>
                                  <div>Total: ₹{Number(c2.totalPremium || 0).toLocaleString()}</div>
                                  <div className="font-bold text-emerald-700">Rate: ₹{Number(c2.rate || 0).toLocaleString()}</div>
                                  {c2.profit !== undefined && (
                                    <div className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] inline-block">
                                      Profit 2: ₹{Number(c2.profit || 0).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                {c2.remarks && (
                                  <p className="text-[10px] text-slate-400 italic truncate" title={c2.remarks}>
                                    &quot;{c2.remarks}&quot;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                        )}

                        {/* Calculator 3 Summary (Admin Only) */}
                        {isAdmin && (
                          <td className="py-4 px-4 align-top">
                            {c3.companyId || c3.netPremium ? (
                              <div className="space-y-1 max-w-[200px]">
                                <span className="font-bold text-slate-900 block truncate">
                                  {c3.companyName || 'Company 3'}
                                </span>
                                <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                                  <div>Net: ₹{Number(c3.netPremium || 0).toLocaleString()}</div>
                                  <div>Total: ₹{Number(c3.totalPremium || 0).toLocaleString()}</div>
                                  <div className="font-bold text-emerald-700">Rate: ₹{Number(c3.rate || 0).toLocaleString()}</div>
                                  {c3.profit !== undefined && (
                                    <div className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] inline-block">
                                      Profit 3: ₹{Number(c3.profit || 0).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                {c3.remarks && (
                                  <p className="text-[10px] text-slate-400 italic truncate" title={c3.remarks}>
                                    &quot;{c3.remarks}&quot;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                        )}

                        {/* Actions (Edit Option for Every Entry) */}
                        <td className="py-4 px-4 text-right align-top whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Download Watermarked Image Button */}
                            {c1.rate ? (
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    company: c1.companyName || 'Calculation',
                                    date: rec.date ? formatDateDMY(rec.date) : '',
                                    netPremium: String(c1.netPremium || ''),
                                    totalPremium: String(c1.totalPremium || ''),
                                    rate: String(c1.rate || ''),
                                    benefit: String(c1.benefit || ''),
                                    remarks: c1.remarks || '',
                                  })
                                  window.open(`/api/v1/rates/image?${params.toString()}`, '_blank')
                                }}
                                className="p-2 bg-white border border-slate-200 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                                title="Download watermarked quote image"
                              >
                                <Download size={13} />
                              </button>
                            ) : null}

                            {/* Edit Action Button */}
                            <button
                              onClick={() => handleEditRecord(rec)}
                              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                isCurrentlyEditing 
                                  ? 'bg-amber-600 text-white hover:bg-amber-700' 
                                  : 'bg-white border border-slate-200 hover:bg-blue-50 text-blue-700 hover:border-blue-300'
                              }`}
                              title="Edit rate calculation"
                            >
                              <Edit2 size={13} />
                              <span>{isCurrentlyEditing ? 'Editing' : 'Edit'}</span>
                            </button>

                            {/* Delete Action Button */}
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-2 bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer shadow-2xs"
                              title="Delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
