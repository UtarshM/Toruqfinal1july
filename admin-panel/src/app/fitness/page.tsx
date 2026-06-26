"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Briefcase, AlertTriangle, Calendar, Search, MoreHorizontal, Plus, X } from 'lucide-react'

export default function FitnessPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [newTask, setNewTask] = useState({
    lead_id: '',
    vehicle_number: '',
    test_date: new Date().toISOString().split('T')[0],
    fees: ''
  })

  useEffect(() => {
    fetchData()
    fetchLeads()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchApi('/api/v1/workflow/fitness')
      setTasks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch fitness tasks:', error)
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

  const handleLeadChange = (leadId: string) => {
    const selectedLead = leads.find(l => l.id === leadId)
    setNewTask({
      ...newTask,
      lead_id: leadId,
      vehicle_number: selectedLead?.vehicleNo || ''
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const selectedLead = leads.find(l => l.id === newTask.lead_id)
      await fetchApi('/api/v1/workflow/fitness', {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          customer_name: selectedLead?.clientName,
          fees: parseFloat(newTask.fees)
        })
      })
      setIsModalOpen(false)
      fetchData()
      alert('Fitness Task created!')
    } catch (error: any) {
      alert(error.message || 'Failed to create')
    }
  }

  const expiringSoonCount = tasks.filter(t => {
    if (!t.testDate) return false
    const diff = new Date(t.testDate).getTime() - new Date().getTime()
    return diff > 0 && diff < (7 * 24 * 60 * 60 * 1000)
  }).length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fitness Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track commercial vehicle fitness renewals.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={18} />
          New Fitness Task
        </button>
      </div>

      {expiringSoonCount > 0 && (
        <div className="mt-8 bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-900">{expiringSoonCount} Certificates Expiring Soon</h3>
              <p className="text-sm text-red-700">These vehicles need fitness inspection within the next 7 days.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-20 text-center text-gray-400">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="col-span-full p-20 text-center text-gray-400 italic bg-white rounded-3xl border border-dashed">
            No fitness tasks found.
          </div>
        ) : tasks.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Briefcase size={20} />
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                t.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
              }`}>
                {t.status}
              </span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 uppercase">{t.vehicleNumber}</h4>
            <p className="text-sm text-gray-500 font-medium mt-1">Owner: {t.customerName || t.lead?.clientName}</p>
            
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Test Date</p>
                <div className="flex items-center gap-1.5 mt-1 text-gray-900 font-bold text-sm">
                  <Calendar size={14} className="text-blue-500" />
                  {t.testDate ? new Date(t.testDate).toLocaleDateString() : 'TBD'}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fees</p>
                <p className="text-sm font-bold text-gray-900 mt-1">₹{t.fees?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">New Fitness Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead</label>
                <select required value={newTask.lead_id} onChange={e => handleLeadChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Number</label>
                <input required value={newTask.vehicle_number} onChange={e => setNewTask({...newTask, vehicle_number: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="GJ-XX-XX-XXXX" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inspection/Test Date</label>
                <input required type="date" value={newTask.test_date} onChange={e => setNewTask({...newTask, test_date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RTO Fees (INR)</label>
                <input required type="number" value={newTask.fees} onChange={e => setNewTask({...newTask, fees: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
