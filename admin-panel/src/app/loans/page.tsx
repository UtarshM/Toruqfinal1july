"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Landmark, FileCheck, ArrowRight, User as UserIcon, Clock, Plus, X, FileSpreadsheet } from 'lucide-react'
import { formatDateDMY } from '@/lib/date-format'

// Status Badge Component matching the user screenshot
export function LoanStatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toUpperCase()

  if (normalized === 'ONLY INQUIRY') {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide bg-[#E5E7EB] text-[#1F2937] shadow-sm whitespace-nowrap">
        ONLY INQUIRY
      </span>
    )
  }

  if (normalized === 'TRIED BUT NOT DONE') {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide bg-[#E5E7EB] text-[#1F2937] shadow-sm whitespace-nowrap">
        TRIED BUT NOT DONE
      </span>
    )
  }

  if (normalized === 'COMPLETED') {
    return (
      <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-[#156F3F] text-[#D1FADF] shadow-sm whitespace-nowrap">
        COMPLETED
      </span>
    )
  }

  if (normalized === 'REJECT' || normalized === 'REJECTED') {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-[#A30D11] text-white shadow-sm whitespace-nowrap">
        REJECT
      </span>
    )
  }

  if (normalized === 'DISBURSED' || normalized === 'APPROVED') {
    return (
      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
        {status}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700">
      {status}
    </span>
  )
}

const LOAN_STATUS_OPTIONS = [
  'ONLY INQUIRY',
  'TRIED BUT NOT DONE',
  'COMPLETED',
  'REJECT',
  'Applied',
  'Processing',
  'Approved',
  'Disbursed'
]

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [newLoan, setNewLoan] = useState({
    lead_id: '',
    amount: '',
    loan_type: 'Vehicle Loan',
    bank_name: '',
    status: 'ONLY INQUIRY',
    conversionStatus: 'ONLY INQUIRY'
  })

  useEffect(() => {
    fetchLoans()
    fetchLeads()
  }, [])

  const fetchLoans = async () => {
    setIsLoading(true)
    try {
      const data = await fetchApi('/api/v1/finance/loans')
      setLoans(Array.isArray(data) ? data : [])
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const selectedLead = leads.find(l => l.id === newLoan.lead_id)
      await fetchApi('/api/v1/finance/loans', {
        method: 'POST',
        body: JSON.stringify({
          ...newLoan,
          customer_name: selectedLead?.clientName || 'Direct Customer',
          amount: parseFloat(newLoan.amount),
          conversionStatus: newLoan.status
        })
      })
      setIsModalOpen(false)
      setNewLoan({
        lead_id: '',
        amount: '',
        loan_type: 'Vehicle Loan',
        bank_name: '',
        status: 'ONLY INQUIRY',
        conversionStatus: 'ONLY INQUIRY'
      })
      fetchLoans()
      alert('Loan application created!')
    } catch (error: any) {
      alert(error.message || 'Failed to create')
    }
  }

  const handleUpdateStatus = async (id: string, updates: any) => {
    try {
      await fetchApi('/api/v1/finance/loans', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates })
      })
      fetchLoans()
    } catch (error) {
      alert('Failed to update loan')
    }
  }

  return (
    <AdminLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loans & Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vehicle and personal loan applications.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/loans/inquiries"
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-blue-600" />
            Loan Inquiries
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            New Loan Application
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-gray-200 pb-2">
        <Link
          href="/loans/inquiries"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <FileSpreadsheet size={16} />
          Loan Inquiries (Spreadsheet)
        </Link>
        <Link
          href="/loans"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
        >
          <Landmark size={16} />
          Loan Applications (Board)
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-900">Active Applications</h3>
            <span className="text-xs font-semibold text-gray-500">{loans.length} Applications</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-gray-400">Loading loans...</div>
          ) : loans.length === 0 ? (
            <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 italic">
              No loan applications found. You can add one or check Loan Inquiries.
            </div>
          ) : loans.map((loan) => {
            const currentStatus = loan.conversionStatus || loan.status || 'ONLY INQUIRY'
            return (
              <div key={loan.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{loan.customerName}</h4>
                    <p className="text-xs text-gray-500 font-medium">
                      {loan.loanType || 'Vehicle Loan'} · ₹{parseFloat(loan.amount).toLocaleString('en-IN')}
                      {loan.bankName && ` · ${loan.bankName}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <select 
                        value={currentStatus}
                        onChange={(e) => handleUpdateStatus(loan.id, { conversionStatus: e.target.value, status: e.target.value })}
                        className="text-xs font-bold uppercase bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        {LOAN_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>

                      <LoanStatusBadge status={currentStatus} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {formatDateDMY(loan.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Info Cards */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
            <h4 className="font-bold text-lg">Loan Lifecycle</h4>
            <p className="text-blue-100 text-sm mt-1">Track conversions from application to disbursement.</p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-xs">
                <span>Only Inquiry</span>
                <span className="font-bold">{loans.filter(l => (l.conversionStatus || l.status) === 'ONLY INQUIRY').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tried But Not Done</span>
                <span className="font-bold">{loans.filter(l => (l.conversionStatus || l.status) === 'TRIED BUT NOT DONE').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Completed / Disbursed</span>
                <span className="font-bold">{loans.filter(l => ['COMPLETED', 'Disbursed'].includes(l.conversionStatus || l.status)).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>In Process / Applied</span>
                <span className="font-bold">{loans.filter(l => ['Applied', 'Processing', 'Approved'].includes(l.conversionStatus || l.status)).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Rejected</span>
                <span className="font-bold">{loans.filter(l => ['REJECT', 'Rejected'].includes(l.conversionStatus || l.status)).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-4">Partner Banks</h4>
            <div className="space-y-3">
              {['HDFC Bank', 'ICICI Bank', 'SBI Finance', 'Axis Bank', 'Kotak Mahindra Prime', 'Cholamandalam'].map((bank) => (
                <div key={bank} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                      <Landmark size={15} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{bank}</span>
                  </div>
                  <FileCheck size={15} className="text-green-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">New Loan Application</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead</label>
                <select required value={newLoan.lead_id} onChange={e => setNewLoan({...newLoan, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo})</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Status (Dropdown) *</label>
                  <LoanStatusBadge status={newLoan.status} />
                </div>
                <select 
                  value={newLoan.status} 
                  onChange={e => setNewLoan({...newLoan, status: e.target.value, conversionStatus: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-sm"
                >
                  {LOAN_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loan Type</label>
                <select value={newLoan.loan_type} onChange={e => setNewLoan({...newLoan, loan_type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm">
                  <option>Vehicle Loan</option>
                  <option>Personal Loan</option>
                  <option>Business Loan</option>
                  <option>Refinance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loan Amount (INR)</label>
                <input required type="number" value={newLoan.amount} onChange={e => setNewLoan({...newLoan, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-semibold" placeholder="₹ Amount" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preferred Bank</label>
                <input value={newLoan.bank_name} onChange={e => setNewLoan({...newLoan, bank_name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="e.g. HDFC Bank" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2 text-sm">
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
