"use client"

import React, { useState, useEffect } from 'react'
import { 
  Trophy, Medal, Award, TrendingUp, Users, RefreshCw, 
  Shield, CheckCircle2, Star, Sparkles, Filter, Calendar
} from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface LeaderboardMember {
  rank: number
  overallRank?: number
  name: string
  team: 'sales' | 'operation' | 'renewal'
  teamLabel: string
  roleTitle: string
  policies: number
  newPolicies: number
  renewals: number
}

interface LeaderboardData {
  meta: {
    dateBadge: string
    category: string
    grandTotalPolicies: number
    teams: {
      sales: { title: string; totalPolicies: number; membersCount: number }
      operation: { title: string; totalPolicies: number; membersCount: number }
      renewal: { title: string; totalPolicies: number; membersCount: number }
    }
  }
  leaderboard: {
    salesTeam: LeaderboardMember[]
    operationTeam: LeaderboardMember[]
    renewalTeam: LeaderboardMember[]
  }
  topPerformers: {
    podium: LeaderboardMember[]
    runnersUp: LeaderboardMember[]
  }
  branding: {
    company: string
    tagline: string
    statusTitle: string
    statusSubtitle: string
    quote: string
    pillars: string[]
    footerNote: string
  }
}

export default function PerformanceLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<'all' | 'new' | 'renewal'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const loadLeaderboard = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetchApi(`/api/v1/dashboard/leaderboard?category=${category}`)
      if (res && res.leaderboard) {
        setData(res)
      }
    } catch (err) {
      console.error('Failed to load performance leaderboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [category])

  const meta = data?.meta
  const sales = data?.leaderboard?.salesTeam || []
  const ops = data?.leaderboard?.operationTeam || []
  const renewals = data?.leaderboard?.renewalTeam || []
  const podium = data?.topPerformers?.podium || []
  const runnersUp = data?.topPerformers?.runnersUp || []

  return (
    <section className="mt-12 space-y-6">
      {/* SECTION HEADER & CONTROLS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>TORQUE AUTO ADVISOR</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-medium">DRIVE • INSURE • GROW TOGETHER</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>PERFORMANCE STATUS</span>
              <span className="text-amber-400 text-sm font-black px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full">
                KPI Leaderboard
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              People Performance Progress • Real-time policy issuance & weighted KPI metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Buttons */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  category === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                All Categories
              </button>
              <button
                type="button"
                onClick={() => setCategory('new')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  category === 'new'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                New Policies
              </button>
              <button
                type="button"
                onClick={() => setCategory('renewal')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  category === 'renewal'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Renewals
              </button>
            </div>

            {/* Date Badge */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-2xl text-xs font-bold text-slate-200">
              <Calendar size={14} className="text-amber-400" />
              <span>{meta?.dateBadge || 'Current Period'}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadLeaderboard(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all cursor-pointer"
              title="Refresh Leaderboard"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* TOP 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Sales Team Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black">
              <TrendingUp size={22} />
            </div>
            <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {meta?.teams?.sales?.membersCount || 0} Members
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">SALES TEAM</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl md:text-4xl font-black text-slate-900">
              {meta?.teams?.sales?.totalPolicies?.toFixed(1) ?? '82.5'}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">Policies</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">New business & conversion metrics</p>
        </div>

        {/* Operation Team Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-50 rounded-full group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-black">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-black text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              {meta?.teams?.operation?.membersCount || 0} Members
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">OPERATION TEAM</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl md:text-4xl font-black text-slate-900">
              {meta?.teams?.operation?.totalPolicies?.toFixed(1) ?? '31.5'}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">Policies</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Backoffice processing & verification</p>
        </div>

        {/* Renewal Team Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-black">
              <RefreshCw size={22} />
            </div>
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {meta?.teams?.renewal?.membersCount || 0} Members
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">RENEWAL TEAM</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl md:text-4xl font-black text-slate-900">
              {meta?.teams?.renewal?.totalPolicies?.toFixed(1) ?? '89.0'}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">Policies</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Customer retention & renewals</p>
        </div>

        {/* Grand Total Card */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg shadow-amber-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Trophy size={24} />
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Company Milestone
            </span>
          </div>
          <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">GRAND TOTAL</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl md:text-4xl font-black text-white">
              {meta?.grandTotalPolicies?.toFixed(1) ?? '203.0'}
            </span>
            <span className="text-xs font-bold text-amber-100 uppercase">Policies</span>
          </div>
          <p className="text-[11px] text-amber-100/90 mt-2 font-medium">Weighted policy score summation</p>
        </div>
      </div>

      {/* 3 TEAM BREAKDOWN COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: SALES TEAM */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={18} />
              <h3 className="font-black text-sm tracking-wide uppercase">Sales Team</h3>
            </div>
            <div className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">
              Total: {meta?.teams?.sales?.totalPolicies?.toFixed(1) ?? '82.5'}
            </div>
          </div>

          <div className="p-2 flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-right">Policies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {sales.map((member) => (
                  <tr key={member.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center">
                      <RankBadge rank={member.rank} />
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-slate-800">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{member.roleTitle}</p>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {member.policies.toFixed(1).replace(/\.0$/, '')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 2: OPERATION TEAM */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-sky-600 to-cyan-700 text-white p-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users size={18} />
              <h3 className="font-black text-sm tracking-wide uppercase">Operation Team</h3>
            </div>
            <div className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">
              Total: {meta?.teams?.operation?.totalPolicies?.toFixed(1) ?? '31.5'}
            </div>
          </div>

          <div className="p-2 flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-right">Policies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {ops.map((member) => (
                  <tr key={member.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center">
                      <RankBadge rank={member.rank} />
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-slate-800">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{member.roleTitle}</p>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {member.policies.toFixed(1).replace(/\.0$/, '')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 3: RENEWAL TEAM */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCw size={18} />
              <h3 className="font-black text-sm tracking-wide uppercase">Renewal Team</h3>
            </div>
            <div className="text-xs font-black bg-white/20 px-3 py-1 rounded-full">
              Total: {meta?.teams?.renewal?.totalPolicies?.toFixed(1) ?? '89.0'}
            </div>
          </div>

          <div className="p-2 flex-1 overflow-x-auto flex flex-col justify-between">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-right">Policies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {renewals.map((member) => (
                  <tr key={member.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center">
                      <RankBadge rank={member.rank} />
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-slate-800">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{member.roleTitle}</p>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-black text-slate-900 text-sm">
                        {member.policies.toFixed(1).replace(/\.0$/, '')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Motivational Slogan Card for Renewal Team */}
            <div className="m-3 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Sparkles size={18} />
              </div>
              <p className="text-xs font-black text-emerald-900 tracking-wide uppercase">
                Renew • Retain • Grow
              </p>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Protecting our customer family with 100% renewal commitment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS (OVERALL) & QUOTE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Podium & Top Performers */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-black text-base md:text-lg text-slate-900">TOP PERFORMERS (Overall)</h3>
                <p className="text-xs text-slate-500 font-medium">Highest individual policy achievements</p>
              </div>
            </div>
          </div>

          {/* PODIUM: Top 3 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {podium.map((p, idx) => {
              const isFirst = idx === 0
              const isSecond = idx === 1
              const isThird = idx === 2

              const bgStyle = isFirst
                ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-300 ring-2 ring-amber-400/20'
                : isSecond
                ? 'bg-gradient-to-b from-slate-50 to-white border-slate-200'
                : 'bg-gradient-to-b from-orange-50/60 to-white border-orange-200'

              const badgeColor = isFirst
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : isSecond
                ? 'bg-slate-500 text-white'
                : 'bg-amber-700 text-white'

              return (
                <div
                  key={p.name}
                  className={`p-5 rounded-2xl border text-center relative transition-all hover:scale-[1.02] ${bgStyle}`}
                >
                  <div
                    className={`w-9 h-9 mx-auto mb-2 rounded-full flex items-center justify-center font-black text-sm ${badgeColor}`}
                  >
                    {idx + 1}
                  </div>
                  <h4 className="font-black text-base text-slate-900">{p.name}</h4>
                  <div className="my-2">
                    <span className="text-2xl font-black text-slate-900">
                      {p.policies.toFixed(1).replace(/\.0$/, '')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Policies</span>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      p.team === 'sales'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : p.team === 'operation'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {p.teamLabel}
                  </span>
                </div>
              )
            })}
          </div>

          {/* RUNNERS UP (#4, #5, #6...) */}
          {runnersUp.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Runners-Up Leaderboard
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {runnersUp.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center">
                        {member.overallRank}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 text-xs">{member.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium ml-2">
                          ({member.teamLabel})
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-xs">
                      {member.policies.toFixed(1).replace(/\.0$/, '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Motivational Quote & Corporate Culture */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-6">
              <Star size={20} />
            </div>

            <blockquote className="space-y-3">
              <p className="text-xl md:text-2xl font-black tracking-tight text-white leading-snug">
                “Consistent Efforts Create Extraordinary Results”
              </p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Every policy counts towards building stronger relationships and setting new industry benchmarks.
              </p>
            </blockquote>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Drive • Insure • Grow Together</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Torque Auto Advisor KPI & Performance Intelligence System
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER PILLARS BANNER */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 px-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            <span>No Credit No Tension</span>
          </div>
          <span className="hidden md:inline text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <span>Stronger Team</span>
          </div>
          <span className="hidden md:inline text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            <span>Higher Performance</span>
          </div>
          <span className="hidden md:inline text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-500" />
            <span>Bigger Milestones</span>
          </div>
        </div>

        <div className="text-center md:text-right">
          <p className="text-[11px] font-black text-slate-900 tracking-wider uppercase">
            TORQUE AUTO ADVISOR
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            MORE THAN INSURANCE • A STRONGER TOMORROW
          </p>
        </div>
      </div>
    </section>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-[11px] flex items-center justify-center border border-amber-300 shadow-sm mx-auto">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center border border-slate-300 shadow-sm mx-auto">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-black text-[11px] flex items-center justify-center border border-orange-300 shadow-sm mx-auto">
        3
      </span>
    )
  }
  return (
    <span className="w-5 h-5 rounded-md text-slate-400 font-bold text-[10px] flex items-center justify-center mx-auto">
      {rank}
    </span>
  )
}
