"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Calculator, Calendar, Info, CheckCircle2, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function RateCalculatorPage() {
  const { user } = useAuth()
  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  // Lists from DB
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Calculator Tab (1, 2, 3)
  const [calcTab, setCalcTab] = useState<1 | 2 | 3>(1)

  // Form State
  const [companyId, setCompanyId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [netPremium, setNetPremium] = useState('')
  const [totalPremium, setTotalPremium] = useState('')
  const [percentage, setPercentage] = useState<string>('')
  const [profit, setProfit] = useState<string>('')
  const [remarks, setRemarks] = useState('')
  const [hasRuleFound, setHasRuleFound] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchInitialData()
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

  // Auto-match category when company changes if category not set or mismatch
  const handleCompanyChange = (newCompanyId: string) => {
    setCompanyId(newCompanyId)
    if (!newCompanyId) return

    const selectedComp = companies.find(c => c.id === newCompanyId)
    if (selectedComp) {
      // Find matching category by name or by relationship
      const matchingCategoryByName = categories.find(
        cat => cat.name.trim().toLowerCase() === selectedComp.name.trim().toLowerCase()
      )
      if (matchingCategoryByName) {
        setCategoryId(matchingCategoryByName.id)
        return
      }

      // Check if there is a relationship for this company
      const compRel = relationships.find(r => r.companyId === newCompanyId)
      if (compRel && compRel.categoryId) {
        setCategoryId(compRel.categoryId)
      }
    }
  }

  // Lookup relationship percentage, profit, and remarks when company/category/tab changes
  useEffect(() => {
    const lookupRelationship = async () => {
      if (companyId && categoryId) {
        try {
          const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${companyId}&categoryId=${categoryId}&calc=${calcTab}`)
          if (res && (res.qtr_percentage > 0 || res.qtr_profit > 0 || res.qtr_remarks)) {
            setPercentage(res.qtr_percentage ? String(res.qtr_percentage) : '')
            setProfit(res.qtr_profit ? String(res.qtr_profit) : '')
            setRemarks(res.qtr_remarks || '')
            setHasRuleFound(true)
          } else {
            setPercentage('')
            setProfit('')
            setRemarks('')
            setHasRuleFound(false)
          }
        } catch (err) {
          console.error('Relationship lookup failed:', err)
          setPercentage('')
          setProfit('')
          setRemarks('')
          setHasRuleFound(false)
        }
      } else {
        setPercentage('')
        setProfit('')
        setRemarks('')
        setHasRuleFound(false)
      }
    }

    lookupRelationship()
  }, [companyId, categoryId, calcTab])

  // Calculation Logic — exact formula: Total Premium - (Net Premium * Percentage / 100) + Profit
  const numNet = parseFloat(netPremium) || 0
  const numTotal = parseFloat(totalPremium) || 0
  const numPct = parseFloat(percentage) || 0
  const numProf = parseFloat(profit) || 0

  const canCalculate = numNet > 0 && numTotal > 0

  // Rate = Total Premium - (Net Premium * Percentage / 100) + Profit
  const calculatedRate = canCalculate
    ? Math.round(numTotal - (numNet * (numPct / 100)) + numProf)
    : 0

  // Benefit = Total Premium - Rate
  const calculatedBenefit = canCalculate
    ? Math.round(numTotal - calculatedRate)
    : 0

  // Reset form when tab changes
  const switchTab = (tab: 1 | 2 | 3) => {
    setCalcTab(tab)
    setNetPremium('')
    setTotalPremium('')
  }

  // Categories that have configured rules for the selected company
  const validCategoryIdsForCompany = new Set(
    relationships.filter(r => r.companyId === companyId).map(r => r.categoryId)
  )

  if (user && !isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Only administrators are authorized to access the Rate Calculator and view internal profit/benefit margins.
          </p>
          <a
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator size={24} className="text-blue-600" />
            Rate Calculator
          </h2>
          <p className="text-sm text-slate-500 mt-1">You are here: Dashboard → Rate Calculator</p>
        </div>
      </div>

      {/* Calculator Tab Selector */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab as 1 | 2 | 3)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              calcTab === tab
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Rate Calculator - {tab}
          </button>
        ))}
      </div>

      {/* Calculator Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Rate Calculator - {calcTab}</h4>
          {companyId && categoryId && (
            hasRuleFound ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                <CheckCircle2 size={14} /> Rule Found ({percentage}% + ₹{profit})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                <Info size={14} /> No preset rule for this pair (enter % and Profit manually)
              </span>
            )
          )}
        </div>

        {isLoadingConfig ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading configuration...</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Date */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Date</label>
              <div className="flex-1 relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={today}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Company */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Company</label>
              <select
                value={companyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(c => {
                  const hasRule = validCategoryIdsForCompany.has(c.id)
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {hasRule ? ' (Rule Configured)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Percentage (%) & Profit (₹) Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <label className="w-32 text-sm font-semibold text-slate-600 shrink-0">Percentage (%)</label>
                <input
                  type="number"
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  placeholder="ex: 50"
                  className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="w-32 text-sm font-semibold text-slate-600 shrink-0">Profit (₹)</label>
                <input
                  type="number"
                  value={profit}
                  onChange={e => setProfit(e.target.value)}
                  placeholder="ex: 2500"
                  className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Remarks (interactive / editable) */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="ex: Enter custom remarks or details"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Net Premium */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Net Premium</label>
              <input
                type="number"
                value={netPremium}
                onChange={e => setNetPremium(e.target.value)}
                min="0"
                placeholder="ex: 30000"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total Premium */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Total Premium</label>
              <input
                type="number"
                value={totalPremium}
                onChange={e => setTotalPremium(e.target.value)}
                min="0"
                placeholder="ex: 34000"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Rate (readonly, auto-calculated with Info tooltip) */}
            <div className="flex items-center gap-4">
              <div className="w-40 flex items-center gap-1.5 shrink-0">
                <label className="text-sm font-semibold text-slate-600">Rate</label>
                <div className="relative group cursor-pointer">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-600 text-[10px] font-bold transition-colors">
                    i
                  </span>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-80 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 border border-slate-700 space-y-2.5">
                    <div className="font-bold text-emerald-400 border-b border-slate-700 pb-1.5 flex items-center justify-between">
                      <span>Rate Calculation Formula</span>
                      <span className="text-[10px] text-slate-400 font-normal">Step-by-step</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] bg-slate-800 p-2 rounded-lg border border-slate-700">
                      Rate = Total Premium - (Net Premium × % / 100) + Profit
                    </p>
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Net Premium:</span>
                        <span className="font-semibold text-white">₹{numNet.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount ({numPct}%):</span>
                        <span className="font-semibold text-emerald-300">- ₹{(numNet * (numPct / 100)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Profit Added:</span>
                        <span className="font-semibold text-emerald-300">+ ₹{numProf.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white">
                        <span>Calculated Rate:</span>
                        <span className="text-emerald-400">₹{calculatedRate.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <input
                type="number"
                value={canCalculate ? calculatedRate : ''}
                readOnly
                placeholder={canCalculate ? '' : 'Enter Net Premium & Total Premium'}
                className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-bold text-emerald-700 outline-none"
              />
            </div>

            {/* Benefit (readonly, auto-calculated with Info tooltip) */}
            <div className="flex items-center gap-4">
              <div className="w-40 flex items-center gap-1.5 shrink-0">
                <label className="text-sm font-semibold text-slate-600">Benefit</label>
                <div className="relative group cursor-pointer">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-600 text-[10px] font-bold transition-colors">
                    i
                  </span>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-80 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 border border-slate-700 space-y-2.5">
                    <div className="font-bold text-blue-400 border-b border-slate-700 pb-1.5 flex items-center justify-between">
                      <span>Benefit Calculation Formula</span>
                      <span className="text-[10px] text-slate-400 font-normal">Step-by-step</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] bg-slate-800 p-2 rounded-lg border border-slate-700">
                      Benefit = Total Premium - Rate
                    </p>
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Total Premium:</span>
                        <span className="font-semibold text-white">₹{numTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calculated Rate:</span>
                        <span className="font-semibold text-slate-300">- ₹{calculatedRate.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white">
                        <span>Net Benefit:</span>
                        <span className="text-blue-400">₹{calculatedBenefit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <input
                type="number"
                value={canCalculate ? calculatedBenefit : ''}
                readOnly
                placeholder={canCalculate ? '' : 'Enter Net Premium & Total Premium'}
                className="flex-1 bg-blue-50 border border-blue-200 rounded-xl py-2.5 px-4 text-sm font-bold text-blue-700 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

