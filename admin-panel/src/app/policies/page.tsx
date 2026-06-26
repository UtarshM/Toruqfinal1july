"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Shield, Search, FileText, Download, Filter, Plus, X, Calendar, RefreshCw } from 'lucide-react'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Date Range State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [newPolicy, setNewPolicy] = useState({
    lead_id: '',
    policy_number: '',
    provider: '',
    type: 'Motor',
    premium_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  })
  const [leads, setLeads] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const data = await fetchApi(`/api/v1/policies?${params}`)
      setPolicies(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const data = await fetchApi('/api/v1/leads?limit=100')
      setLeads(data.leads || [])
    } catch {}
  }

  const handleIssuePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/policies', {
        method: 'POST',
        body: JSON.stringify({
          ...newPolicy,
          premium_amount: parseFloat(newPolicy.premium_amount)
        })
      })
      setIsModalOpen(false)
      fetchData()
      alert('Policy issued successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to issue policy')
    }
  }

  const exportCSV = () => {
    if (!policies.length) {
      alert('No policies found to export.')
      return
    }
    const headers = ['Policy No', 'Customer', 'Provider', 'Type', 'Premium', 'Expiry']
    const rows = policies.map(p => [
      `"${p.policyNumber}"`, `"${p.lead?.clientName || 'N/A'}"`, `"${p.provider}"`, `"${p.type}"`, p.premiumAmount, new Date(p.endDate).toLocaleDateString()
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `policies_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredPolicies = policies.filter(p => 
    p.policyNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.lead?.clientName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies & Insurance</h1>
          <p className="text-sm text-gray-500 mt-1">Manage active policies, renewals, and certificates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus size={18} />
            Issue New Policy
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Policy No or Customer..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
          <Calendar size={16} className="text-gray-400" />
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="text-xs font-semibold outline-none bg-transparent w-28"
          />
          <span className="text-gray-300">—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="text-xs font-semibold outline-none bg-transparent w-28"
          />
          {(startDate || endDate) && (
            <button onClick={() => {setStartDate(''); setEndDate('')}} className="text-gray-400 hover:text-red-500 ml-1">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Policy Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Premium</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Expiry Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading...</td></tr>
              ) : filteredPolicies.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">No policies found in this period.</td></tr>
              ) : filteredPolicies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.policyNumber}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{p.provider} • {p.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{p.lead?.clientName || 'Unknown'}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">₹{p.premiumAmount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(p.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      p.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Issue New Policy</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleIssuePolicy} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead / Client</label>
                <select required value={newPolicy.lead_id} onChange={e => setNewPolicy({...newPolicy, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.clientName || 'Unnamed Lead'} — {l.vehicleNo || 'No Vehicle No.'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy Number</label>
                <input required value={newPolicy.policy_number} onChange={e => setNewPolicy({...newPolicy, policy_number: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Insurance Provider</label>
                <input required value={newPolicy.provider} onChange={e => setNewPolicy({...newPolicy, provider: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="e.g. TATA AIG" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy Type</label>
                <select value={newPolicy.type} onChange={e => setNewPolicy({...newPolicy, type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Motor</option>
                  <option>Health</option>
                  <option>Life</option>
                  <option>Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Premium Amount</label>
                <input required type="number" value={newPolicy.premium_amount} onChange={e => setNewPolicy({...newPolicy, premium_amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                  <input type="date" required value={newPolicy.start_date} onChange={e => setNewPolicy({...newPolicy, start_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                  <input type="date" required value={newPolicy.end_date} onChange={e => setNewPolicy({...newPolicy, end_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>
              <button type="submit" className="col-span-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Issue Policy
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
