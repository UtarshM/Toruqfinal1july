"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Wallet, ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus, X } from 'lucide-react'

export default function FinancePage() {
  const [data, setData] = useState<any>({ items: [], summary: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    category: 'Operational',
    amount: '',
    payment_method: 'CASH',
    description: '',
    reference_number: ''
  })

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await fetchApi(`/api/v1/finance/transactions?${params.toString()}`)
      setData(res || { items: [], summary: {} })
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        })
      })
      setIsModalOpen(false)
      fetchData()
      alert('Transaction added successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to add transaction')
    }
  }

  const income = data.summary?.income || 0
  const expense = data.summary?.expense || 0
  const balance = income - expense

  const filteredTransactions = (data.items || []).filter((t: any) => 
    t.category?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.referenceNumber?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor income, expenses, and transaction history.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatCard title="Total Balance" value={`₹${balance.toLocaleString()}`} icon={<Wallet size={24} />} color="bg-white" textColor="text-gray-900" iconColor="bg-blue-50 text-blue-600" />
        <StatCard title="Monthly Income" value={`+₹${income.toLocaleString()}`} icon={<ArrowUpCircle size={24} />} color="bg-white" textColor="text-green-600" iconColor="bg-green-50 text-green-600" />
        <StatCard title="Monthly Expenses" value={`-₹${expense.toLocaleString()}`} icon={<ArrowDownCircle size={24} />} color="bg-white" textColor="text-red-600" iconColor="bg-red-50 text-red-600" />
      </div>

      {/* Transactions Table */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between gap-4">
          <h3 className="font-bold text-gray-900 whitespace-nowrap">Recent Transactions</h3>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold outline-none px-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-gray-300 text-xs">to</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold outline-none px-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading transactions...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">No transactions found.</td></tr>
              ) : filteredTransactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">#TXN-{t.id.slice(0, 6).toUpperCase()}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">{t.paymentMethod || 'CASH'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {t.category || 'Other'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${t.type === 'income' ? 'text-gray-900' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(t.date || t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Add New Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                  <select value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                    <option value="income">Income (+)</option>
                    <option value="expense">Expense (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                  <select value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                    <option>Operational</option>
                    <option>Policy Commission</option>
                    <option>Salary</option>
                    <option>Rent</option>
                    <option>Marketing</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (INR)</label>
                <input required type="number" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="₹ 0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                <select value={newTransaction.payment_method} onChange={e => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>CASH</option>
                  <option>UPI / QR</option>
                  <option>BANK TRANSFER</option>
                  <option>CHEQUE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea rows={2} value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="What is this for?" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Add Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color, textColor, iconColor }: any) {
  return (
    <div className={`${color} p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md`}>
      <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className={`text-2xl font-bold ${textColor} mt-1`}>{value}</h3>
    </div>
  )
}
