"use client"

import React, { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  BookOpen, Sparkles, Truck, Car, MapPin, ExternalLink, Search, AlertTriangle, CheckCircle2
} from 'lucide-react'
import {
  GVW_BRACKETS,
  GCV_RULES,
  PCV_RULES,
  TP_GCV_RATES,
  TP_LMV_RATES,
  TP_2W_RATES,
  RTO_LIST,
  POLICY_DOWNLOAD_LINKS,
  LMV_ADDON_DICTIONARY,
  SPECIAL_OPERATIONAL_RULES,
  recommendBestInsurers,
} from '@/lib/quotationGuideData'

type GuideTab = 'finder' | 'gcv' | 'pcv_lmv' | 'tp_rto' | 'links'

export default function QuotationGuidePage() {
  const [activeTab, setActiveTab] = useState<GuideTab>('finder')
  const [searchQuery, setSearchQuery] = useState('')

  // Smart Finder state
  const [vehicleType, setVehicleType] = useState<'GCV' | 'PCV' | 'LMV' | '3W' | 'TRACTOR' | 'BIKE'>('GCV')
  const [gvwBracket, setGvwBracket] = useState<string>('0-2500')
  const [policyType, setPolicyType] = useState<'ALL' | 'NORMAL' | 'NIL_DEP' | 'TP'>('ALL')
  const [rtoInput, setRtoInput] = useState<string>('')
  const [isTanker, setIsTanker] = useState(false)
  const [isWaterMilk, setIsWaterMilk] = useState(false)

  // GCV Filters
  const [gcvFilterBracket, setGcvFilterBracket] = useState<string>('ALL')
  const [gcvFilterPolicy, setGcvFilterPolicy] = useState<'ALL' | 'NORMAL' | 'NIL_DEP'>('ALL')

  const recommendation = useMemo(() => {
    return recommendBestInsurers({
      vehicleType,
      gvwBracket,
      policyType,
      rtoCode: rtoInput.trim().toUpperCase(),
      isTanker,
      isWaterMilk,
    })
  }, [vehicleType, gvwBracket, policyType, rtoInput, isTanker, isWaterMilk])

  const filteredGcvRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return GCV_RULES.filter((r) => {
      if (gcvFilterBracket !== 'ALL' && r.gvw !== gcvFilterBracket) return false
      if (gcvFilterPolicy !== 'ALL' && r.policyType !== gcvFilterPolicy && r.policyType !== 'ALL') return false
      if (!q) return true
      return (
        r.company.toLowerCase().includes(q) ||
        r.gvw.toLowerCase().includes(q) ||
        r.declinedRto.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q) ||
        r.quoteFrom.toLowerCase().includes(q)
      )
    })
  }, [gcvFilterBracket, gcvFilterPolicy, searchQuery])

  const filteredRtos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return RTO_LIST
    return RTO_LIST.filter(
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quotation Guide</h1>
              <p className="text-xs font-medium text-slate-500">
                Underwriting rules, GVW matrix, declined RTOs, TP rates &amp; insurer portal links (Available to All Staff)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
            All Roles Access
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'finder', label: 'Smart Insurer Finder', icon: Sparkles },
            { key: 'gcv', label: 'GCV Rules Matrix', icon: Truck },
            { key: 'pcv_lmv', label: 'PCV & LMV Guide', icon: Car },
            { key: 'tp_rto', label: 'TP Rates & RTOs', icon: MapPin },
            { key: 'links', label: 'Policy Portal Links', icon: ExternalLink },
          ].map((t) => {
            const Icon = t.icon
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key as GuideTab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Search Input for GCV & RTO tabs */}
        {(activeTab === 'gcv' || activeTab === 'tp_rto') && (
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'gcv'
                  ? 'Search company, GVW, declined RTO (e.g. GJ03), or remarks...'
                  : 'Search RTO code (e.g. GJ-03) or city name...'
              }
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-600"
            />
          </div>
        )}

        {/* TAB 1: SMART FINDER */}
        {activeTab === 'finder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-black text-slate-900">Vehicle &amp; Cover Details</h2>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">Vehicle Segment</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['GCV', 'PCV', 'LMV', '3W', 'TRACTOR', 'BIKE'] as const).map((vt) => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => setVehicleType(vt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                        vehicleType === vt
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {vt}
                    </button>
                  ))}
                </div>
              </div>

              {vehicleType === 'GCV' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">GVW Bracket</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GVW_BRACKETS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setGvwBracket(b.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                          gvwBracket === b.id
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">Policy Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'NORMAL', label: 'Normal' },
                    { id: 'NIL_DEP', label: 'Nil Dep' },
                    { id: 'TP', label: 'Only TP' },
                  ].map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPolicyType(pt.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                        policyType === pt.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">RTO Code (Optional)</label>
                <input
                  type="text"
                  value={rtoInput}
                  onChange={(e) => setRtoInput(e.target.value.toUpperCase())}
                  placeholder="e.g. GJ03, GJ01, GJ12"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={isTanker} onChange={(e) => setIsTanker(e.target.checked)} />
                  Hazardous Tanker
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={isWaterMilk} onChange={(e) => setIsWaterMilk(e.target.checked)} />
                  Water / Milk
                </label>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {recommendation.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  {recommendation.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-bold text-amber-900">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {recommendation.topPick && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400">
                      ★ Top Recommended Insurer (#1)
                    </span>
                    <span className="text-xs font-bold text-blue-300">{recommendation.topPick.groupCode}</span>
                  </div>
                  <div className="text-2xl font-black">{recommendation.topPick.company}</div>
                  <div className="text-xs text-slate-300 font-semibold">
                    Quote From: {recommendation.topPick.quoteFrom || 'Standard'} • Inspection: {recommendation.topPick.inspection || 'Check'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-200">
                    <div>PA Cover: <span className="font-bold">{recommendation.topPick.paCover || 'As per rule'}</span></div>
                    {recommendation.topPick.discount && <div>Discount Guide: <span className="font-bold">{recommendation.topPick.discount}</span></div>}
                    {recommendation.topPick.modelAndRto && <div className="sm:col-span-2">Model / RTO: <span className="font-bold">{recommendation.topPick.modelAndRto}</span></div>}
                    {recommendation.topPick.remarks && <div className="sm:col-span-2 text-amber-300 font-semibold">Note: {recommendation.topPick.remarks}</div>}
                  </div>
                </div>
              )}

              {recommendation.alternatives.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Backup Choices</h3>
                  {recommendation.alternatives.map((alt, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">#{alt.rank} {alt.company}</span>
                        <span className="text-[11px] font-bold text-blue-700">{alt.quoteFrom}</span>
                      </div>
                      {alt.remarks && <p className="text-xs text-slate-600">{alt.remarks}</p>}
                      {alt.warningAlert && <p className="text-xs font-bold text-rose-600">⚠ {alt.warningAlert}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Special Operational Rules</h3>
                {SPECIAL_OPERATIONAL_RULES.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-blue-700" />
                      {rule.title}
                    </div>
                    <p className="text-xs text-slate-700">{rule.detail}</p>
                    <p className="text-xs font-semibold text-blue-800">{rule.gujarati}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GCV MATRIX */}
        {activeTab === 'gcv' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setGcvFilterBracket('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                  gcvFilterBracket === 'ALL' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                All GVW
              </button>
              {GVW_BRACKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setGcvFilterBracket(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                    gcvFilterBracket === b.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {b.id}
                </button>
              ))}
              {(['ALL', 'NORMAL', 'NIL_DEP'] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setGcvFilterPolicy(pt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                    gcvFilterPolicy === pt ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGcvRules.map((r, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-700 text-white rounded text-[11px] font-black">#{r.choice}</span>
                      <span className="text-sm font-black text-slate-900">{r.company}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[11px] font-bold">{r.gvw}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    Type: {r.policyType} • Quote From: {r.quoteFrom || '—'} • Inspection: {r.inspection || '—'}
                  </div>
                  {r.declinedRto && <div className="text-xs font-bold text-rose-600">Declined: {r.declinedRto}</div>}
                  {r.modelAndRto && <div className="text-xs text-slate-700">Model/RTO: {r.modelAndRto}</div>}
                  {r.remarks && <div className="text-xs text-slate-700">Remarks: {r.remarks}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PCV & LMV */}
        {activeTab === 'pcv_lmv' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">PCV Rules (Taxi, Bus, Auto, School Bus)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PCV_RULES.map((p, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">#{p.choice} {p.company}</span>
                      <span className="text-[11px] font-bold text-blue-700">{p.quoteFrom}</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line">{p.category}</p>
                    <p className="text-[11px] font-semibold text-slate-600">Inspection: {p.inspection || '—'} • Discount: {p.discount || '—'}</p>
                    {p.declined && <p className="text-[11px] font-bold text-rose-600">Declined: {p.declined}</p>}
                    {p.remarks && <p className="text-[11px] text-slate-600">{p.remarks}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">LMV Add-on Dictionary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {LMV_ADDON_DICTIONARY.map((a, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-xs font-black text-slate-900">{a.addon} ({a.shortForm})</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Tata: {a.tata} • Digit: {a.digit} • ICICI: {a.icici} • SBI: {a.sbi} • HDFC: {a.hdfc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TP & RTOs */}
        {activeTab === 'tp_rto' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-black text-slate-900">TP GCV Rates</h2>
                {TP_GCV_RATES.map((t, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-slate-900">{t.gvw}</span>
                      <span className="text-emerald-700">Std TP: ₹{t.premium}</span>
                    </div>
                    <div className="text-xs font-bold text-blue-700">{t.company}</div>
                    <div className="text-xs text-slate-700 whitespace-pre-line">{t.rate}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <h2 className="text-sm font-black text-slate-900">TP LMV &amp; 2-Wheeler Rates</h2>
                {TP_LMV_RATES.map((l, i) => (
                  <div key={`lmv-${i}`} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-700 font-medium">{l.segment ? `${l.segment} — ` : ''}{l.plan}</span>
                    <span className="font-black text-blue-700">₹{l.rate}</span>
                  </div>
                ))}
                {TP_2W_RATES.map((b, i) => (
                  <div key={`2w-${i}`} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-700 font-medium">{b.category} ({b.company})</span>
                    <span className="font-black text-blue-700">₹{b.rate}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 h-fit">
              <h2 className="text-sm font-black text-slate-900">Gujarat RTO Codes ({filteredRtos.length})</h2>
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {filteredRtos.map((r) => (
                  <div key={r.code} className="flex items-center gap-3 py-2 text-xs">
                    <span className="font-black text-blue-700 w-16">{r.code}</span>
                    <span className="font-semibold text-slate-800">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PORTAL LINKS */}
        {activeTab === 'links' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {POLICY_DOWNLOAD_LINKS.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                <div className="text-sm font-black text-slate-900">{item.company}</div>
                {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.link1 && item.link1.startsWith('http') && (
                    <a
                      href={item.link1}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={12} /> Open Portal
                    </a>
                  )}
                  {item.link2 && item.link2.startsWith('http') ? (
                    <a
                      href={item.link2}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={12} /> Portal 2
                    </a>
                  ) : item.link2 ? (
                    <span className="text-xs text-slate-500 font-medium">Secondary: {item.link2}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
