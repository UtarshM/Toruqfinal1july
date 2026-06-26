"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Plus, Edit2, Trash2, GripVertical, Check, X } from 'lucide-react'

export default function ResponsesPage() {
  const [responses, setResponses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    fetchResponses()
  }, [])

  const fetchResponses = async () => {
    setIsLoading(true)
    try {
      const data = await fetchApi('/api/v1/settings/responses')
      setResponses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch responses:', error)
      setResponses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    const text = prompt("Enter new response (Gujarati):")
    if (!text) return
    
    try {
      await fetchApi('/api/v1/settings/responses', {
        method: 'POST',
        body: JSON.stringify({ text, isActive: true, requiresFollowUp: false })
      })
      fetchResponses()
    } catch (error) {
      alert("Failed to add response")
    }
  }

  const handleSave = async (id: string) => {
    try {
      await fetchApi(`/api/v1/settings/responses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      })
      setIsEditing(null)
      fetchResponses()
    } catch (error) {
      alert("Failed to update response")
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetchApi(`/api/v1/settings/responses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentStatus })
      })
      fetchResponses()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this response?")) return
    try {
      await fetchApi(`/api/v1/settings/responses/${id}`, { method: 'DELETE' })
      fetchResponses()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Responses Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the fixed Gujarati responses for the employee app.</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add Response
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Text (Gujarati)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Requires Follow-up</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : responses.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  {isEditing === r.id ? (
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={editForm.text} 
                      onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{r.text}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isEditing === r.id ? (
                    <input 
                      type="checkbox" 
                      checked={editForm.requiresFollowUp} 
                      onChange={(e) => setEditForm({...editForm, requiresFollowUp: e.target.checked})}
                    />
                  ) : (
                    r.requiresFollowUp ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-gray-300" />
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleActive(r.id, r.isActive)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {r.isActive ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing === r.id ? (
                      <>
                        <button onClick={() => handleSave(r.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                        <button onClick={() => setIsEditing(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setIsEditing(r.id); setEditForm(r); }} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
