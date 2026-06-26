"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Users, UserPlus, Mail, Phone, MapPin, MoreVertical, Search, CheckCircle, Clock, X } from 'lucide-react'

export default function CRMPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

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
        <StatCard title="Total Clients" value={customers.length} icon={<Users className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Verified KYC" value={customers.filter(c => c.kycStatus === 'verified').length} icon={<CheckCircle className="text-green-600" />} color="bg-green-50" />
        <StatCard title="Pending KYC" value={customers.filter(c => c.kycStatus === 'pending').length} icon={<Clock className="text-amber-600" />} color="bg-amber-50" />
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
            <button className="absolute top-4 right-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical size={20} />
            </button>
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

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border border-gray-100 shadow-sm ${color}`}>
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
