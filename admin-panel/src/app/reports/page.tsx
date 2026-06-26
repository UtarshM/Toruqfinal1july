"use client"
import { useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { DownloadCloud, FileText, Users2, BarChart2, RefreshCw } from 'lucide-react'
import { fetchApi } from '@/lib/api'

const REPORT_TYPES = [
  {
    id: 'revenue',
    title: 'Revenue Report',
    description: 'Income, expense, and net revenue for the selected period.',
    icon: BarChart2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  {
    id: 'leads',
    title: 'Lead Report',
    description: 'All leads with status breakdown and assigned agents.',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  {
    id: 'hr',
    title: 'Employee Report',
    description: 'List of all employees, their roles, qualifications, and joining dates.',
    icon: Users2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  }
]

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [previewType, setPreviewType] = useState('')

  const download = async (type: string) => {
    const params = new URLSearchParams({ type, from, to })
    const data = await fetchApi(`/api/v1/reports?${params}`)

    // Convert to CSV
    const records = data.records || []
    if (!records.length) { alert('No data for this period.'); return }

    const headers = Object.keys(records[0])
    const rows = records.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${type}_report_${from}_${to}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const viewPreview = async (type: string) => {
    setLoading(type)
    setPreview(null)
    try {
      const params = new URLSearchParams({ type, from, to })
      const data = await fetchApi(`/api/v1/reports?${params}`)
      setPreview(data)
      setPreviewType(type)
    } catch (err: any) {
      alert(err.message || 'Failed to load preview')
    }
    setLoading(null)
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Generate and download business reports.</p>
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Select Period</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">FROM</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">TO</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPORT_TYPES.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl border ${r.border} p-6 shadow-sm`}>
              <div className={`p-3 rounded-xl ${r.bg} w-fit mb-4`}>
                <r.icon size={22} className={r.color} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{r.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{r.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => viewPreview(r.id)}
                  disabled={loading === r.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  {loading === r.id ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                  Preview
                </button>
                <button
                  onClick={() => download(r.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${r.bg} ${r.color} border ${r.border} rounded-xl text-sm font-semibold hover:opacity-80 transition-all`}
                >
                  <DownloadCloud size={14} />
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Area */}
        {preview && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 capitalize">{previewType} Report Preview</h3>
              <div className="flex gap-4 text-sm text-gray-500">
                {preview.total !== undefined && <span><strong>{preview.total}</strong> records</span>}
                {preview.total_income !== undefined && (
                  <span>Revenue: <strong className="text-green-600">₹{preview.net.toLocaleString()}</strong></span>
                )}
              </div>
            </div>
            
            {(!preview.records || preview.records.length === 0) ? (
              <div className="p-20 text-center">
                <p className="text-gray-500">No records found for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {previewType === 'leads' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicle</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Agent</th>
                        </>
                      )}
                      {previewType === 'revenue' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                        </>
                      )}
                      {previewType === 'hr' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.records.slice(0, 15).map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        {previewType === 'leads' && (
                          <>
                            <td className="px-4 py-3 text-gray-700 text-xs">{new Date(row.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs font-medium">{row.clientName}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.vehicleNo || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.assignee?.fullName || 'Unassigned'}</td>
                          </>
                        )}
                        {previewType === 'revenue' && (
                          <>
                            <td className="px-4 py-3 text-gray-700 text-xs">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`capitalize ${row.type === 'income' ? 'text-green-600' : 'text-red-600'} font-bold`}>
                                {row.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.category}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs font-bold">₹{Number(row.amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.paymentMethod}</td>
                          </>
                        )}
                        {previewType === 'hr' && (
                          <>
                            <td className="px-4 py-3 text-gray-700 text-xs font-medium">{row.fullName}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.email}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.role?.name}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">
                              <span className={`w-2 h-2 rounded-full inline-block mr-2 ${row.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                              {row.isActive ? 'Active' : 'Inactive'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.records.length > 15 && (
                  <p className="text-center py-4 text-xs text-gray-400">
                    Showing 15 of {preview.records.length} rows. Download CSV for full data.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
