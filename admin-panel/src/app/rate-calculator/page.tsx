"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { 
  Calculator, Check, Clipboard, MessageCircle, Printer, RefreshCw, 
  Sparkles, Layers, ShieldAlert, ArrowRight, User, Truck, Car, FileText
} from 'lucide-react'

export default function RateCalculatorPage() {
  const { user } = useAuth()
  
  // Lists from DB
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Calculator Type Selection (Calculator 1, 2, 3, Custom)
  const [calcMode, setCalcMode] = useState<'calc1' | 'calc2' | 'calc3' | 'custom'>('calc1')

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [netPremium, setNetPremium] = useState('')
  const [totalPremium, setTotalPremium] = useState('')
  const [percentage, setPercentage] = useState<number>(0)
  const [profit, setProfit] = useState<number>(0)
  const [remarks, setRemarks] = useState('')
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoadingConfig(true)
    try {
      const [compRes, catRes, leadsRes] = await Promise.all([
        fetchApi('/api/v1/rates/companies'),
        fetchApi('/api/v1/rates/categories'),
        fetchApi('/api/v1/leads?limit=300')
      ])
      setCompanies(compRes || [])
      setCategories(catRes || [])
      setLeads(leadsRes?.leads || [])
    } catch (err) {
      console.error('Failed to load rate calculator config:', err)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Auto populate client data if lead selected
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    if (!leadId) return
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      setClientName(lead.clientName || '')
      setClientPhone(lead.clientPhone || '')
      setVehicleNo(lead.vehicleNo || '')
    }
  }

  // Lookup relationship percentage and profit when company/category changes
  useEffect(() => {
    if (isManualOverride) return

    const lookupRelationship = async () => {
      if (companyId && categoryId) {
        try {
          const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${companyId}&categoryId=${categoryId}`)
          
          // Apply multiplier adjustments based on mode
          let basePct = res.qtr_percentage || 0
          let baseProfit = res.qtr_profit || 0

          if (calcMode === 'calc2') {
            // Commercial Mode
            basePct = basePct > 0 ? basePct + 2 : 0
          } else if (calcMode === 'calc3') {
            // Special / Addon Mode
            basePct = basePct > 0 ? basePct + 5 : 0
          }

          setPercentage(basePct)
          setProfit(baseProfit)
        } catch (err) {
          console.error('Relationship lookup failed:', err)
        }
      } else {
        setPercentage(0)
        setProfit(0)
      }
    }

    lookupRelationship()
  }, [companyId, categoryId, calcMode, isManualOverride])

  // Calculation Logic (vehicle-bk formula)
  const numNet = parseFloat(netPremium) || 0
  const numTotal = parseFloat(totalPremium) || 0
  const numPct = percentage || 0
  const numProfit = profit || 0

  const hasValidInputs = numNet > 0 && numTotal > 0

  // Rate = Total Premium - (Net Premium * Percentage / 100) + Profit
  const calculatedRate = hasValidInputs 
    ? Math.round(numTotal - (numNet * (numPct / 100)) + numProfit)
    : 0

  // Benefit = Total Premium - Rate
  const calculatedBenefit = hasValidInputs
    ? Math.round(numTotal - calculatedRate)
    : 0

  // Margin = (Net Premium * % / 100) - Profit
  const calculatedMargin = hasValidInputs
    ? Math.round((numNet * (numPct / 100)) - numProfit)
    : 0

  const selectedCompany = companies.find(c => c.id === companyId)
  const selectedCategory = categories.find(c => c.id === categoryId)

  // Compiled WhatsApp Message
  const getWhatsAppText = () => {
    return `*TORQUE AUTO ADVISOR - RATE QUOTATION*\n\n` +
      `👤 Client: *${clientName || 'Valued Customer'}*\n` +
      `🚗 Vehicle: *${vehicleNo || 'N/A'}*\n` +
      `🏢 Insurance Co: *${selectedCompany?.name || 'N/A'}*\n` +
      `🏷️ Category: *${selectedCategory?.name || 'N/A'}*\n\n` +
      `-----------------------------\n` +
      `💰 Total Premium: *₹${numTotal.toLocaleString()}*\n` +
      `🔥 Special Rate Quote: *₹${calculatedRate.toLocaleString()}*\n` +
      `🎉 Total Customer Savings: *₹${calculatedBenefit.toLocaleString()}*\n` +
      `-----------------------------\n\n` +
      `Please contact us to confirm your policy renewal!`
  }

  const handleCopySummary = () => {
    navigator.clipboard.writeText(getWhatsAppText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenWhatsApp = () => {
    const phone = clientPhone.replace(/[^0-9]/g, '')
    const url = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(getWhatsAppText())}`
    window.open(url, '_blank')
  }

  const handleSaveAsQuotation = async () => {
    if (!hasValidInputs) return
    setIsSaving(true)
    try {
      await fetchApi('/api/v1/quotations', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: selectedLeadId || undefined,
          client_name: clientName,
          vehicle_no: vehicleNo,
          details: {
            company: selectedCompany?.name,
            category: selectedCategory?.name,
            net_premium: numNet,
            total_premium: numTotal,
            rate: calculatedRate,
            benefit: calculatedBenefit,
            calc_mode: calcMode,
            remarks
          }
        })
      })
      alert('Quotation saved successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to save quotation')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrintSlip = () => {
    window.print()
  }

  const handleReset = () => {
    setSelectedLeadId('')
    setClientName('')
    setClientPhone('')
    setVehicleNo('')
    setCompanyId('')
    setCategoryId('')
    setNetPremium('')
    setTotalPremium('')
    setPercentage(0)
    setProfit(0)
    setRemarks('')
  }

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Standalone Rate Calculator</h1>
          <p className="text-sm text-slate-500 mt-1">Directly calculate rates, customer benefits, and margins for any policy.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Calculator Mode Switcher Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <button
          onClick={() => { setCalcMode('calc1'); setIsManualOverride(false); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            calcMode === 'calc1' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200' 
              : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Car size={16} className={calcMode === 'calc1' ? 'text-blue-400' : 'text-blue-600'} />
            <span>Rate Calculator - 1</span>
          </div>
          <p className={`text-[10px] mt-1 ${calcMode === 'calc1' ? 'text-slate-300' : 'text-slate-400'}`}>Standard Vehicle Matrix</p>
        </button>

        <button
          onClick={() => { setCalcMode('calc2'); setIsManualOverride(false); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            calcMode === 'calc2' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200' 
              : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Truck size={16} className={calcMode === 'calc2' ? 'text-emerald-400' : 'text-emerald-600'} />
            <span>Rate Calculator - 2</span>
          </div>
          <p className={`text-[10px] mt-1 ${calcMode === 'calc2' ? 'text-slate-300' : 'text-slate-400'}`}>Commercial & Heavy GVW</p>
        </button>

        <button
          onClick={() => { setCalcMode('calc3'); setIsManualOverride(false); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            calcMode === 'calc3' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200' 
              : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Layers size={16} className={calcMode === 'calc3' ? 'text-purple-400' : 'text-purple-600'} />
            <span>Rate Calculator - 3</span>
          </div>
          <p className={`text-[10px] mt-1 ${calcMode === 'calc3' ? 'text-slate-300' : 'text-slate-400'}`}>Special / Add-on Rates</p>
        </button>

        <button
          onClick={() => { setCalcMode('custom'); setIsManualOverride(true); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            calcMode === 'custom' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200' 
              : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            <Sparkles size={16} className={calcMode === 'custom' ? 'text-amber-400' : 'text-amber-600'} />
            <span>Custom Calculator</span>
          </div>
          <p className={`text-[10px] mt-1 ${calcMode === 'custom' ? 'text-slate-300' : 'text-slate-400'}`}>Manual Overrides</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Input Form Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calculator size={16} className="text-slate-700" />
              Calculation Input Form
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 uppercase">
              {calcMode.toUpperCase()}
            </span>
          </div>

          {/* Optional Lead Picker */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Attach Existing Lead (Optional)</label>
            <select
              value={selectedLeadId}
              onChange={e => handleSelectLead(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="">-- Direct Calculation (No Lead Link) --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo || l.clientPhone})</option>
              ))}
            </select>
          </div>

          {/* Client & Vehicle Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Name</label>
              <input 
                type="text"
                placeholder="e.g. Ramesh Patel"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
              <input 
                type="text"
                placeholder="e.g. 9876543210"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Reg No.</label>
              <input 
                type="text"
                placeholder="e.g. GJ01AB1234"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Company & Category Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Insurance Company *</label>
              <select 
                required
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Category *</label>
              <select 
                required
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Premium Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Net Premium (₹) *</label>
              <input 
                type="number"
                required
                min="0"
                placeholder="e.g. 25000"
                value={netPremium}
                onChange={e => setNetPremium(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Premium (₹) *</label>
              <input 
                type="number"
                required
                min="0"
                placeholder="e.g. 29500"
                value={totalPremium}
                onChange={e => setTotalPremium(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Rate Parameters (Percentage & Profit) */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate Matrix Parameters</span>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={isManualOverride}
                  onChange={e => setIsManualOverride(e.target.checked)}
                  className="rounded border-slate-300 accent-slate-900"
                />
                Override Parameters
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Commission %</label>
                <input 
                  type="number"
                  disabled={!isManualOverride}
                  value={percentage}
                  onChange={e => setPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Profit Margin (₹)</label>
                <input 
                  type="number"
                  disabled={!isManualOverride}
                  value={profit}
                  onChange={e => setProfit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Remarks / Notes</label>
            <input 
              type="text"
              placeholder="e.g. Special NCB 50% applied or Zero dep addon"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Right Output Result & Actions Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Output Result Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate Calculation Output</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono font-bold uppercase">
                {hasValidInputs ? 'LIVE COMPUTED' : 'AWAITING INPUTS'}
              </span>
            </div>

            {/* Calculated Rate Display */}
            <div>
              <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Final Rate Quote</span>
              <div className="text-4xl font-black text-white mt-1">
                ₹{calculatedRate.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Formula: Total Premium - (Net Premium × {numPct}%) + ₹{numProfit}
              </p>
            </div>

            {/* Customer Benefit & Margin Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
                <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest">Customer Benefit</span>
                <span className="block text-xl font-black text-white mt-1">₹{calculatedBenefit.toLocaleString()}</span>
                <span className="block text-[8px] text-slate-400 mt-0.5">Total Premium - Rate</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
                <span className="block text-[9px] font-black text-blue-400 uppercase tracking-widest">Advisor Margin</span>
                <span className="block text-xl font-black text-white mt-1">₹{calculatedMargin.toLocaleString()}</span>
                <span className="block text-[8px] text-slate-400 mt-0.5">Comm. - Profit</span>
              </div>
            </div>

            {/* Breakdown summary list */}
            <div className="bg-black/30 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Net Premium</span>
                <span className="font-bold text-white">₹{numNet.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Commission Percentage</span>
                <span className="font-bold text-emerald-400">{numPct}%</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Premium (Inclusive)</span>
                <span className="font-bold text-white">₹{numTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Export & Sharing Options</h4>
            
            <button
              onClick={handleOpenWhatsApp}
              disabled={!hasValidInputs}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <MessageCircle size={16} />
              Share Quote via WhatsApp
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleCopySummary}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                <Clipboard size={14} />
                {copied ? 'Copied!' : 'Copy Summary'}
              </button>
              
              <button
                onClick={handleSaveAsQuotation}
                disabled={!hasValidInputs || isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <FileText size={14} />
                {isSaving ? 'Saving...' : 'Save Quote'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
