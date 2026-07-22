"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Calculator, Calendar } from 'lucide-react'

export default function RateCalculatorPage() {
  // Lists from DB
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Calculator Tab (1, 2, 3)
  const [calcTab, setCalcTab] = useState<1 | 2 | 3>(1)

  // Form State
  const [companyId, setCompanyId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [netPremium, setNetPremium] = useState('')
  const [totalPremium, setTotalPremium] = useState('')
  const [percentage, setPercentage] = useState<number>(0)
  const [profit, setProfit] = useState<number>(0)
  const [remarks, setRemarks] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoadingConfig(true)
    try {
      const [compRes, catRes] = await Promise.all([
        fetchApi('/api/v1/rates/companies'),
        fetchApi('/api/v1/rates/categories')
      ])
      setCompanies(compRes || [])
      setCategories(catRes || [])
    } catch (err) {
      console.error('Failed to load rate calculator config:', err)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Lookup relationship percentage and profit when company/category/tab changes
  useEffect(() => {
    const lookupRelationship = async () => {
      if (companyId && categoryId) {
        try {
          const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${companyId}&categoryId=${categoryId}&calc=${calcTab}`)
          setPercentage(res.qtr_percentage || 0)
          setProfit(res.qtr_profit || 0)
          setRemarks(res.qtr_remarks || '')
        } catch (err) {
          console.error('Relationship lookup failed:', err)
          setPercentage(0)
          setProfit(0)
          setRemarks('')
        }
      } else {
        setPercentage(0)
        setProfit(0)
        setRemarks('')
      }
    }

    lookupRelationship()
  }, [companyId, categoryId, calcTab])

  // Calculation Logic — exact formula from vehicle-bk
  const numNet = parseFloat(netPremium) || 0
  const numTotal = parseFloat(totalPremium) || 0

  const hasValidInputs = percentage > 0 && profit > 0 && numNet > 0 && numTotal > 0

  // Rate = Total Premium - (Net Premium * Percentage / 100) + Profit
  const calculatedRate = hasValidInputs
    ? Math.round(numTotal - (numNet * (percentage / 100)) + profit)
    : 0

  // Benefit = Total Premium - Rate
  const calculatedBenefit = hasValidInputs
    ? Math.round(numTotal - calculatedRate)
    : 0

  // Reset form when tab changes
  const switchTab = (tab: 1 | 2 | 3) => {
    setCalcTab(tab)
    setNetPremium('')
    setTotalPremium('')
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
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="font-bold text-slate-900">Rate Calculator</h4>
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
                onChange={e => setCompanyId(e.target.value)}
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
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Remarks (readonly, from DB lookup) */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Remarks</label>
              <input
                type="text"
                value={remarks}
                readOnly
                placeholder="ex: Remarks"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 outline-none"
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

            {/* Rate (readonly, auto-calculated) */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Rate</label>
              <input
                type="number"
                value={calculatedRate || ''}
                readOnly
                className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 text-sm font-bold text-emerald-700 outline-none"
              />
            </div>

            {/* Benefit (readonly, auto-calculated) */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm font-semibold text-slate-600 shrink-0">Benefit</label>
              <input
                type="number"
                value={calculatedBenefit || ''}
                readOnly
                className="flex-1 bg-blue-50 border border-blue-200 rounded-xl py-2.5 px-4 text-sm font-bold text-blue-700 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
