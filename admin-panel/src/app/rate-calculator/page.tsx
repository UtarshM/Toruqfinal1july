"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Calculator, Calendar, Info, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getISTDateString } from '@/lib/date-format'

interface CalcTabState {
  companyId: string
  categoryId: string
  netPremium: string
  totalPremium: string
  percentage: string
  profit: string
  remarks: string
  hasRuleFound: boolean
}

const initialCalcState: CalcTabState = {
  companyId: '',
  categoryId: '',
  netPremium: '',
  totalPremium: '',
  percentage: '',
  profit: '',
  remarks: '',
  hasRuleFound: false
}

export default function RateCalculatorPage() {
  const { user } = useAuth()
  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  // Calculator Tab: Admins get all 3 tabs; other staff only get 1 calculator
  const [calcTab, setCalcTab] = useState<1 | 2 | 3>(1)

  // Independent state per calculator tab
  const [tabData, setTabData] = useState<Record<1 | 2 | 3, CalcTabState>>({
    1: { ...initialCalcState },
    2: { ...initialCalcState },
    3: { ...initialCalcState }
  })

  // Current active tab (non-admin is always tab 1)
  const activeTab: 1 | 2 | 3 = isAdmin ? calcTab : 1
  const current = tabData[activeTab]

  const updateCurrent = (patch: Partial<CalcTabState>) => {
    setTabData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...patch
      }
    }))
  }

  // Lists from DB
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  const today = getISTDateString(0)

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
    if (!newCompanyId) {
      updateCurrent({
        companyId: '',
        categoryId: '',
        percentage: '',
        profit: '',
        remarks: '',
        hasRuleFound: false
      })
      return
    }

    let matchedCategoryId = ''
    const selectedComp = companies.find(c => c.id === newCompanyId)
    if (selectedComp) {
      const matchingCategoryByName = categories.find(
        cat => cat.name.trim().toLowerCase() === selectedComp.name.trim().toLowerCase()
      )
      if (matchingCategoryByName) {
        matchedCategoryId = matchingCategoryByName.id
      } else {
        const compRel = relationships.find(r => r.companyId === newCompanyId)
        if (compRel && compRel.categoryId) {
          matchedCategoryId = compRel.categoryId
        }
      }
    }

    updateCurrent({
      companyId: newCompanyId,
      categoryId: matchedCategoryId
    })
  }

  // Lookup relationship percentage, profit, and remarks when company/category changes
  useEffect(() => {
    const lookupRelationship = async () => {
      if (current.companyId) {
        try {
          const catParam = current.categoryId ? `&categoryId=${current.categoryId}` : ''
          const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${current.companyId}${catParam}`)
          if (res && (res.qtr_percentage > 0 || res.qtr_profit > 0 || res.qtr_remarks)) {
            updateCurrent({
              percentage: res.qtr_percentage ? String(res.qtr_percentage) : '',
              profit: res.qtr_profit ? String(res.qtr_profit) : '',
              remarks: res.qtr_remarks || '',
              hasRuleFound: true
            })
          } else {
            updateCurrent({
              percentage: '',
              profit: '',
              remarks: '',
              hasRuleFound: false
            })
          }
        } catch (err) {
          console.error('Relationship lookup failed:', err)
          updateCurrent({
            percentage: '',
            profit: '',
            remarks: '',
            hasRuleFound: false
          })
        }
      } else {
        updateCurrent({
          percentage: '',
          profit: '',
          remarks: '',
          hasRuleFound: false
        })
      }
    }

    lookupRelationship()
  }, [current.companyId, current.categoryId, activeTab])

  // Calculation Logic — exact formula: Total Premium - (Net Premium * Percentage / 100) + Profit
  const numNet = parseFloat(current.netPremium) || 0
  const numTotal = parseFloat(current.totalPremium) || 0
  const numPct = parseFloat(current.percentage) || 0
  const numProf = parseFloat(current.profit) || 0

  const canCalculate = numNet > 0 && numTotal > 0

  // Rate = Total Premium - (Net Premium * Percentage / 100) + Profit
  const calculatedRate = canCalculate
    ? Math.round(numTotal - (numNet * (numPct / 100)) + numProf)
    : 0

  // Benefit = Total Premium - Rate
  const calculatedBenefit = canCalculate
    ? Math.round(numTotal - calculatedRate)
    : 0

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

      {/* Calculator Tab Selector — ONLY visible for Admins (Other staff have only 1 calculator) */}
      {isAdmin && (
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(tab => (
            <button
              key={tab}
              onClick={() => setCalcTab(tab as 1 | 2 | 3)}
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
      )}

      {/* Calculator Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900">
            {isAdmin ? `Rate Calculator - ${calcTab}` : 'Rate Calculator'}
          </h4>
          {current.companyId && (
            current.hasRuleFound ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                <CheckCircle2 size={14} /> {isAdmin ? `Rule Found (${current.percentage}% + ₹${current.profit})` : 'Preset Rule Applied'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                <Info size={14} /> {isAdmin ? 'No preset rule for this company (enter % and Profit manually)' : 'No preset rule configured for this company'}
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
                value={current.companyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Percentage (%) & Profit (₹) Inputs — ONLY visible for Admins */}
            {isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm font-semibold text-slate-600 shrink-0">Percentage (%)</label>
                  <input
                    type="number"
                    value={current.percentage}
                    onChange={e => updateCurrent({ percentage: e.target.value })}
                    placeholder="ex: 50"
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm font-semibold text-slate-600 shrink-0">Profit (₹)</label>
                  <input
                    type="number"
                    value={current.profit}
                    onChange={e => updateCurrent({ profit: e.target.value })}
                    placeholder="ex: 2500"
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Remarks</label>
              <input
                type="text"
                value={current.remarks}
                onChange={e => updateCurrent({ remarks: e.target.value })}
                placeholder="ex: Enter custom remarks or details"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Net Premium */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Net Premium</label>
              <input
                type="number"
                value={current.netPremium}
                onChange={e => updateCurrent({ netPremium: e.target.value })}
                min="0"
                placeholder="ex: 20000"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total Premium */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Total Premium</label>
              <input
                type="number"
                value={current.totalPremium}
                onChange={e => updateCurrent({ totalPremium: e.target.value })}
                min="0"
                placeholder="ex: 34000"
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Rate (Customer Rate) */}
            <div className="flex items-center gap-4">
              <div className="w-40 flex items-center gap-1.5 shrink-0">
                <label className="text-sm font-bold text-slate-700">
                  {isAdmin ? 'Rate' : 'Customer Rate'}
                </label>
                {isAdmin ? (
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
                ) : (
                  <div className="relative group cursor-pointer">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold">
                      i
                    </span>
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 border border-slate-700">
                      Final premium rate payable by the customer based on company guidelines.
                    </div>
                  </div>
                )}
              </div>

              <input
                type="number"
                value={canCalculate ? calculatedRate : ''}
                readOnly
                placeholder={canCalculate ? '' : (!current.hasRuleFound && !isAdmin ? 'No preset rule found for this company' : 'Enter Net Premium & Total Premium')}
                className="flex-1 bg-emerald-50 border-2 border-emerald-300 rounded-xl py-2.5 px-4 text-sm font-bold text-emerald-800 outline-none"
              />
            </div>

            {/* Benefit (Customer Savings / Total Benefit) — Visible to Sales Person & Admin */}
            <div className="flex items-center gap-4">
              <div className="w-40 flex items-center gap-1.5 shrink-0">
                <label className="text-sm font-bold text-slate-700">Benefit</label>
                <div className="relative group cursor-pointer">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-600 text-[10px] font-bold transition-colors">
                    i
                  </span>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-80 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 border border-slate-700 space-y-2.5">
                    <div className="font-bold text-blue-400 border-b border-slate-700 pb-1.5 flex items-center justify-between">
                      <span>Benefit / Discount</span>
                      <span className="text-[10px] text-slate-400 font-normal">Customer Savings</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] bg-slate-800 p-2 rounded-lg border border-slate-700">
                      Benefit = Total Premium - Customer Rate
                    </p>
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Total Premium:</span>
                        <span className="font-semibold text-white">₹{numTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Rate:</span>
                        <span className="font-semibold text-slate-300">- ₹{calculatedRate.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white">
                        <span>Total Benefit:</span>
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
                className="flex-1 bg-blue-50 border-2 border-blue-300 rounded-xl py-2.5 px-4 text-sm font-bold text-blue-800 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
