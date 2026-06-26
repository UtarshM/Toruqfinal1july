"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Calendar, Clock, Bell, User, CheckCircle2, ChevronRight, Plus, X } from 'lucide-react'

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [newFollowup, setNewFollowup] = useState({
    lead_id: '',
    type: 'call',
    scheduled_at: new Date().toISOString().slice(0, 16),
    notes: ''
  })

  useEffect(() => {
    fetchData()
    fetchLeads()
  }, [filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchApi(`/api/v1/follow-ups?status=${filter}`)
      setFollowups(data)
    } catch (error) {
      console.error(error)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const selectedLead = leads.find(l => l.id === newFollowup.lead_id)
      await fetchApi('/api/v1/follow-ups', {
        method: 'POST',
        body: JSON.stringify({
          ...newFollowup,
          lead_name: selectedLead?.clientName
        })
      })
      setIsModalOpen(false)
      fetchData()
      alert('Follow-up scheduled!')
    } catch (error: any) {
      alert(error.message || 'Failed to schedule')
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups & Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule and monitor client callbacks and reminders.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={18} />
          Schedule Follow-up
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Filters</h3>
            <div className="space-y-2">
              {['pending', 'completed', 'all'].map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all capitalize ${
                    filter === f ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="p-20 text-center text-gray-400">Loading...</div>
          ) : followups.length === 0 ? (
            <div className="p-20 text-center text-gray-400 italic bg-white rounded-2xl border border-dashed">
              No follow-ups found.
            </div>
          ) : followups.map((f) => (
            <div key={f.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <User size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-gray-900 text-lg">{f.leadName || f.lead?.clientName}</h4>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest">{f.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 font-medium italic">"{f.notes || 'No notes'}"</p>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                      <Clock size={14} className="text-blue-500" />
                      {new Date(f.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                      <Calendar size={14} className="text-blue-500" />
                      {new Date(f.scheduledAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {f.status === 'pending' && (
                  <button className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors">
                    <CheckCircle2 size={20} />
                  </button>
                )}
                <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Schedule Follow-up</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead</label>
                <select required value={newFollowup.lead_id} onChange={e => setNewFollowup({...newFollowup, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select value={newFollowup.type} onChange={e => setNewFollowup({...newFollowup, type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="call">Phone Call</option>
                  <option value="visit">Physical Visit</option>
                  <option value="whatsapp">WhatsApp Message</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schedule At</label>
                <input required type="datetime-local" value={newFollowup.scheduled_at} onChange={e => setNewFollowup({...newFollowup, scheduled_at: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes / Instructions</label>
                <textarea rows={3} value={newFollowup.notes} onChange={e => setNewFollowup({...newFollowup, notes: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="What needs to be discussed?" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Schedule Task
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
