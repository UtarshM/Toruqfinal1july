"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Users, UserPlus, Mail, Phone, MapPin, MoreVertical, Search, CheckCircle, Clock, X, Eye, Edit, Trash2, ShieldCheck } from 'lucide-react'

export default function CRMPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'pending'>('all')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    kyc_status: 'pending'
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchApi('/api/v1/crm')
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/crm', {
        method: 'POST',
        body: JSON.stringify(newClient)
      })
      setIsModalOpen(false)
      setNewClient({ name: '', phone: '', email: '', address: '', kyc_status: 'pending' })
      fetchData()
      alert('Client added successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to add client')
    }
  }

  const handleToggleKyc = async (customer: any) => {
    const newStatus = customer.kycStatus === 'verified' ? 'pending' : 'verified'
    try {
      await fetchApi(`/api/v1/crm`, {
        method: 'POST',
        body: JSON.stringify({
          ...customer,
          kyc_status: newStatus,
          lead_id: customer.leadId
        })
      })
      // Update local state
      setCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, kycStatus: newStatus } : c
      ))
      setActiveMenuId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to update KYC status')
    }
  }

  const handleViewProfile = (customer: any) => {
    if (customer.leadId) {
      router.push(`/leads/${customer.leadId}`)
    } else {
      router.push(`/leads?search=${customer.phone}`)
    }
    setActiveMenuId(null)
  }

  // Apply both search and KYC filter
  const filteredCustomers = customers.filter(c => {
    const searchMatch = 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    
    if (!searchMatch) return false

    if (kycFilter === 'verified') return c.kycStatus === 'verified'
    if (kycFilter === 'pending') return c.kycStatus === 'pending'
    return true
  })

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM & Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your customer relationships and historical data.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
        >
          <UserPlus size={18} />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatCard 
          title="Total Clients" 
          value={customers.length} 
          icon={<Users className="text-blue-600" />} 
          color="bg-blue-50" 
          isActive={kycFilter === 'all'}
          onClick={() => setKycFilter('all')}
        />
        <StatCard 
          title="Verified KYC" 
          value={customers.filter(c => c.kycStatus === 'verified').length} 
          icon={<CheckCircle className="text-green-600" />} 
          color="bg-green-50"
          isActive={kycFilter === 'verified'}
          onClick={() => setKycFilter('verified')}
        />
        <StatCard 
          title="Pending KYC" 
          value={customers.filter(c => c.kycStatus === 'pending').length} 
          icon={<Clock className="text-amber-600" />} 
          color="bg-amber-50"
          isActive={kycFilter === 'pending'}
          onClick={() => setKycFilter('pending')}
        />
      </div>

      <div className="mt-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, phone or email..." 
            className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-500">No customers found.</div>
        ) : filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
            {/* 3-dot Context Menu */}
            <div className="absolute top-4 right-4" ref={activeMenuId === customer.id ? menuRef : null}>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMenuId(activeMenuId === customer.id ? null : customer.id)
                }}
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical size={20} />
              </button>

              {activeMenuId === customer.id && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button 
                    onClick={() => handleViewProfile(customer)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={16} className="text-blue-600" />
                    View Full Profile
                  </button>
                  <button 
                    onClick={() => handleToggleKyc(customer)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ShieldCheck size={16} className="text-emerald-600" />
                    {customer.kycStatus === 'verified' ? 'Set KYC Pending' : 'Mark KYC Verified'}
                  </button>
                  <hr className="border-gray-100 my-1" />
                  <button 
                    onClick={() => {
                      if (confirm(`Delete client "${customer.name}"? This cannot be undone.`)) {
                        // For now just close menu - no delete API exists
                        setActiveMenuId(null)
                        alert('Delete functionality requires backend API implementation.')
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Client
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold uppercase">
                {customer.name?.charAt(0) || '?'}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg line-clamp-1">{customer.name}</h4>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                  {customer.kycStatus === 'verified' ? 'Verified' : 'Pending KYC'}
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-gray-500">
                <Mail size={16} />
                <span className="text-sm truncate">{customer.email || 'No Email'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <Phone size={16} />
                <span className="text-sm">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <MapPin size={16} />
                <span className="text-sm truncate">{customer.address || 'No Address'}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Policies</p>
                <p className="text-sm font-bold text-gray-900">{customer.policyCount || 0}</p>
              </div>
              <button 
                onClick={() => {
                  if (customer.leadId) {
                    router.push(`/leads/${customer.leadId}`)
                  } else {
                    router.push(`/leads?search=${customer.phone}`)
                  }
                }}
                className="text-blue-600 text-sm font-bold hover:underline transition-all"
              >
                Full Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Add New Client</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input required value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input required value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Optional)</label>
                <input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                <textarea rows={2} value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-2">
                Create Client
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color, isActive, onClick }: any) {
  return (
    <div 
      className={`p-6 rounded-2xl border shadow-sm cursor-pointer transition-all ${color} ${
        isActive 
          ? 'border-blue-400 ring-2 ring-blue-200 scale-[1.02]' 
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  )
}
