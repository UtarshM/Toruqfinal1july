"use client"
import React, { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { Car, CheckCircle, Clock, Search, IndianRupee, Plus, X, Edit3 } from 'lucide-react'
import { fetchApi } from '@/lib/api'

export default function RTOPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [newTask, setNewTask] = useState({
    lead_id: '',
    work_type: 'Ownership Transfer',
    vehicle_number: '',
    fees: '',
    rto_office: ''
  })
  const [editingTask, setEditingTask] = useState<any>(null)

  useEffect(() => {
    fetchTasks()
    fetchLeads()
  }, [])

  const fetchTasks = async () => {
    try {
      const data = await fetchApi('/api/v1/workflow/rto')
      setTasks(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
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
      await fetchApi('/api/v1/workflow/rto', {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          customer_name: selectedLead?.clientName,
          fees: parseFloat(newTask.fees)
        })
      })
      setIsModalOpen(false)
      fetchTasks()
      alert('RTO Task created!')
    } catch (error: any) {
      alert(error.message || 'Failed to create')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/workflow/rto', {
        method: 'PATCH',
        body: JSON.stringify({ 
          id: editingTask.id, 
          status: editingTask.status,
          paymentStatus: editingTask.paymentStatus,
          workType: editingTask.workType,
          fees: parseFloat(editingTask.fees)
        })
      })
      setIsUpdateModalOpen(false)
      fetchTasks()
      alert('Task updated successfully!')
    } catch (error) {
      alert('Failed to update task')
    }
  }

  const handleUpdateStatus = async (id: string, updates: any) => {
    try {
      await fetchApi('/api/v1/workflow/rto', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates })
      })
      fetchTasks()
    } catch (error) {
      alert('Failed to update status')
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RTO Work Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track vehicle transfers, NOCs, and registration updates.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
        >
          <Plus size={18} />
          New RTO Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatCard label="Pending Tasks" count={tasks.filter(t => t.status === 'pending').length} icon={Clock} color="text-orange-500" />
        <StatCard label="Payment Due" count={tasks.filter(t => t.paymentStatus === 'Pending').length} icon={IndianRupee} color="text-blue-500" />
        <StatCard label="Completed" count={tasks.filter(t => t.status === 'completed').length} icon={CheckCircle} color="text-green-500" />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Active RTO Tasks</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Vehicle No..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Vehicle No</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Service Type</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading...</td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">No tasks found.</td></tr>
            ) : tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-gray-900 uppercase">{task.vehicleNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.workType}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-sm">
                    <span className={`font-bold ${task.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                      {task.paymentStatus}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">₹{task.fees || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    task.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-4">
                    {task.paymentStatus !== 'Paid' && (
                      <button 
                        onClick={() => handleUpdateStatus(task.id, { paymentStatus: 'Paid', paymentDate: new Date() })}
                        className="text-green-600 hover:text-green-700 text-xs font-bold"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setEditingTask(task)
                        setIsUpdateModalOpen(true)
                      }}
                      className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">New RTO Task</h3>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Type</label>
                <select value={newTask.work_type} onChange={e => setNewTask({...newTask, work_type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Ownership Transfer</option>
                  <option>NOC Certificate</option>
                  <option>Address Change</option>
                  <option>Duplicate RC</option>
                  <option>HP Addition/Removal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Number</label>
                <input required value={newTask.vehicle_number} onChange={e => setNewTask({...newTask, vehicle_number: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="GJ-XX-XX-XXXX" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Fees (INR)</label>
                <input required type="number" value={newTask.fees} onChange={e => setNewTask({...newTask, fees: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RTO Office (Optional)</label>
                <input value={newTask.rto_office} onChange={e => setNewTask({...newTask, rto_office: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Update Task Modal */}
      {isUpdateModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Update RTO Task</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Number</label>
                <input disabled value={editingTask.vehicleNumber} className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Type</label>
                <select value={editingTask.workType} onChange={e => setEditingTask({...editingTask, workType: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Ownership Transfer</option>
                  <option>NOC Certificate</option>
                  <option>Address Change</option>
                  <option>Duplicate RC</option>
                  <option>HP Addition/Removal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Status</label>
                <select value={editingTask.status} onChange={e => setEditingTask({...editingTask, status: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                <select value={editingTask.paymentStatus} onChange={e => setEditingTask({...editingTask, paymentStatus: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Fees (INR)</label>
                <input required type="number" value={editingTask.fees} onChange={e => setEditingTask({...editingTask, fees: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Update Task Details
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ label, count, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <Icon className={color} size={20} />
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mt-2">{count}</h3>
    </div>
  )
}
