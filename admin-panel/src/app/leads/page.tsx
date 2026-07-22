"use client"
import React, { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  Search, Filter, Plus, Upload, CheckCircle, 
  AlertCircle, Users, Calendar, RefreshCw, Phone, MessageCircle, 
  X, Check, Clipboard, ChevronRight, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown
} from 'lucide-react'

// Premium WhatsApp Message Templates
const WHATSAPP_TEMPLATES = [
  {
    id: 'renewal',
    name: 'Standard Renewal Notice',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nThis is a renewal reminder from *Torque Auto Advisor* regarding your vehicle *${vehicle}*. Your policy is scheduled to expire on *${expiry || 'N/A'}*.\n\nPlease share your current policy copy so we can calculate the best quotes for you!\n\nBest regards,\nTorque Team`
  },
  {
    id: 'callback',
    name: 'Out of Reach / Callback Request',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nWe tried calling you regarding your vehicle *${vehicle}* renewal copy but couldn't get in touch. \n\nPlease let us know a suitable time to call you back, or share your details here!\n\nThanks,\nTorque Team`
  },
  {
    id: 'docs',
    name: 'Document Collection Request',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nRegarding your auto insurance quote for vehicle *${vehicle}*, could you please share a photo/PDF of your:\n1. Previous Insurance Policy\n2. RC Book (Front & Back)\n\nThis will help us apply all applicable discounts (No Claim Bonus, etc.) for your new quote.\n\nThank you!`
  }
]

export default function LeadsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const role = (user?.role?.name || 'EXECUTIVE').toUpperCase()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialSearch = searchParams?.get('search') || ''

  const triggerNativeLink = (url: string, newTab = false) => {
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_url', url }));
    } else if (newTab) {
      window.open(url, '_blank')
    } else {
      window.location.href = url;
    }
  }

  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState(initialSearch)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLead, setNewLead] = useState({ clientName: '', clientPhone: '', vehicleNo: '', clientEmail: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    vehicleNo: '',
    registrationDate: '',
    expiryDate: '',
    gvw: '',
    existingAgent: '',
    city: '',
    address: ''
  })

  // Status Filter State (for active cards)
  const [statusFilter, setStatusFilter] = useState('all')

  // Date Range State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Sorting Config (Default: Recently Added First!)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  })

  // Selected values checklist per column (Excel / Google Sheets style)
  const [columnSelectedValues, setColumnSelectedValues] = useState<Record<string, Set<string>>>({})

  // Search input inside Excel popover
  const [popoverSearch, setPopoverSearch] = useState<string>('')

  // Toggle active filter popups for headers
  const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Detailed Drawer State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailedLead, setDetailedLead] = useState<any | null>(null)
  const [isDrawerLoading, setIsDrawerLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'call' | 'whatsapp' | 'response'>('info')

  // Call Logger State
  const [logOutcome, setLogOutcome] = useState('Connected')
  const [logNotes, setLogNotes] = useState('')
  const [logFollowupDate, setLogFollowupDate] = useState('')
  const [isLogging, setIsLogging] = useState(false)

  // WhatsApp Template State
  const [selectedTemplateId, setSelectedTemplateId] = useState('renewal')
  const [copiedText, setCopiedText] = useState(false)

  // Follow-up Modal State
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [followupData, setFollowupData] = useState({
    scheduled_at: '',
    type: 'call',
    notes: ''
  })
  const [isScheduling, setIsScheduling] = useState(false)

  // Response Tab State
  const [predefinedResponses, setPredefinedResponses] = useState<any[]>([])
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null)
  const [responseNotes, setResponseNotes] = useState('')
  const [isSavingResponse, setIsSavingResponse] = useState(false)

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveFilterHeader(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', '500')

      const [leadsData, statsData] = await Promise.all([
        fetchApi(`/api/v1/leads?${params}`),
        fetchApi(`/api/v1/leads/stats?${params}`)
      ])
      
      setLeads(leadsData?.leads || [])
      setStats(statsData?.summary || null)
    } catch (error: any) {
      console.error('Failed to fetch leads:', error)
      setErrorMessage(error.message || 'Failed to load leads from database')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await fetchApi('/api/v1/users?limit=100')
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch employees list:', error)
    }
  }

  const fetchLeadDetails = async (id: string) => {
    setIsDrawerLoading(true)
    try {
      const data = await fetchApi(`/api/v1/leads/${id}`)
      setDetailedLead(data)
    } catch (error) {
      console.error('Failed to fetch lead details:', error)
    } finally {
      setIsDrawerLoading(false)
    }
  }

  const fetchPredefinedResponses = async () => {
    try {
      const data = await fetchApi('/api/v1/settings/responses?activeOnly=true')
      setPredefinedResponses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch predefined responses:', error)
    }
  }

  const handleOpenDrawer = (leadId: string) => {
    setSelectedLeadId(leadId)
    fetchLeadDetails(leadId)
    fetchPredefinedResponses()
    setActiveTab('info')
    setSelectedResponseId(null)
    setResponseNotes('')
  }

  const handleCloseDrawer = () => {
    setSelectedLeadId(null)
    setDetailedLead(null)
    setIsEditing(false)
  }

  const handleUpdateLeadStatus = async (newStatus: string) => {
    if (!detailedLead) return
    
    if (newStatus === 'Follow Up') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const localString = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
        
      setFollowupData({
        scheduled_at: localString,
        type: 'call',
        notes: ''
      })
      setShowFollowupModal(true)
      return
    }

    try {
      const updated = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      setDetailedLead({ ...detailedLead, status: updated.status })
      fetchData()
    } catch (error) {
      alert('Failed to update lead status')
    }
  }

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsScheduling(true)
    try {
      await fetchApi('/api/v1/follow-ups', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: detailedLead.id,
          assigned_to: detailedLead.assignedTo || null,
          lead_name: detailedLead.clientName,
          type: followupData.type,
          scheduled_at: new Date(followupData.scheduled_at).toISOString(),
          notes: followupData.notes
        })
      })

      const updated = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Follow Up' })
      })
      setDetailedLead({ ...detailedLead, status: updated.status })
      
      setShowFollowupModal(false)
      fetchData()
      alert('Follow-up scheduled successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to schedule follow-up')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleUpdateLeadAssignee = async (newAssigneeId: string) => {
    if (!detailedLead) return
    try {
      await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          assigned_to: newAssigneeId === 'unassigned' ? null : newAssigneeId 
        })
      })
      fetchLeadDetails(detailedLead.id)
      fetchData()
    } catch (error) {
      alert('Failed to update lead assignee')
    }
  }

  const handleStartEdit = () => {
    if (!detailedLead) return
    setEditForm({
      clientName: detailedLead.clientName || '',
      clientPhone: detailedLead.clientPhone || '',
      clientEmail: detailedLead.clientEmail || '',
      vehicleNo: detailedLead.vehicleNo || '',
      registrationDate: detailedLead.registrationDate ? new Date(detailedLead.registrationDate).toISOString().split('T')[0] : '',
      expiryDate: detailedLead.expiryDate ? new Date(detailedLead.expiryDate).toISOString().split('T')[0] : '',
      gvw: detailedLead.gvw || '',
      existingAgent: detailedLead.existingAgent || '',
      city: detailedLead.city || '',
      address: detailedLead.address || ''
    })
    setIsEditing(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsSubmitting(true)
    try {
      const res = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      })
      if (res) {
        setIsEditing(false)
        fetchLeadDetails(detailedLead.id)
        fetchData()
        alert('Lead details updated successfully!')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogCallResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsLogging(true)
    try {
      const body = {
        status: logOutcome,
        notes: logNotes,
        followupDate: logFollowupDate || undefined
      }
      await fetchApi(`/api/v1/leads/${detailedLead.id}/response`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      
      setLogNotes('')
      setLogFollowupDate('')
      
      fetchLeadDetails(detailedLead.id)
      fetchData()
    } catch (error: any) {
      alert(error.message || 'Failed to log communication log')
    } finally {
      setIsLogging(false)
    }
  }

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await fetchApi('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(newLead)
      })
      setShowAddModal(false)
      setNewLead({ clientName: '', clientPhone: '', vehicleNo: '', clientEmail: '' })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to add lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      await fetchApi('/api/v1/leads', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete leads')
    } finally {
      setIsDeleting(false)
    }
  }

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedLeads.map(l => l.id)))
    }
  }

  // Save predefined response for a lead
  const handleSaveResponse = async () => {
    if (!detailedLead || !selectedResponseId) return
    setIsSavingResponse(true)
    try {
      const selectedResponse = predefinedResponses.find(r => r.id === selectedResponseId)
      const notesText = selectedResponse ? `[Response: ${selectedResponse.text}]${responseNotes ? ` — ${responseNotes}` : ''}` : responseNotes

      await fetchApi(`/api/v1/leads/${detailedLead.id}/response`, {
        method: 'POST',
        body: JSON.stringify({
          status: selectedResponse?.requiresFollowUp ? 'Follow Up' : detailedLead.status,
          notes: notesText
        })
      })

      setSelectedResponseId(null)
      setResponseNotes('')
      fetchLeadDetails(detailedLead.id)
      fetchData()
      alert('Response recorded successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to save response')
    } finally {
      setIsSavingResponse(false)
    }
  }

  // Value getter helper for any column key
  const getLeadColumnValue = (lead: any, colKey: string): string => {
    if (colKey === 'clientName') return lead.clientName || '—'
    if (colKey === 'phone1') return lead.clientPhone || '—'
    if (colKey === 'phone2') {
      if (lead.customFields?.phone2 || lead.customFields?.mobile2) {
        return lead.customFields?.phone2 || lead.customFields?.mobile2
      }
      if (lead.clientEmail && /^[0-9\s+-]{7,15}$/.test(lead.clientEmail.trim())) {
        return lead.clientEmail
      }
      return '—'
    }
    if (colKey === 'regNo') return lead.vehicleNo || '—'
    if (colKey === 'expiryDate') return lead.expiryDate ? new Date(lead.expiryDate).toLocaleDateString() : '—'
    if (colKey === 'gvw') return lead.gvw || '—'
    if (colKey === 'cat') return lead.customFields?.cat || lead.customFields?.category || lead.messageTemplate || '—'
    if (colKey === 'model') return lead.customFields?.model || lead.customFields?.vehicleModel || '—'
    if (colKey === 'company') return lead.customFields?.company || lead.customFields?.insuranceCompany || '—'
    if (colKey === 'tpFull') return lead.customFields?.tpFull || lead.customFields?.policyType || '—'
    if (colKey === 'via') return lead.existingAgent || lead.city || lead.customFields?.via || '—'
    if (colKey === 'assignedTo') return lead.assignee?.fullName || 'Unassigned'
    return '—'
  }

  // Get distinct non-empty values for a column
  const getDistinctColumnValues = (colKey: string): string[] => {
    const set = new Set<string>()
    leads.forEach(l => {
      const val = getLeadColumnValue(l, colKey)
      if (val && val !== '—') set.add(val)
    })
    return Array.from(set).sort()
  }

  // Checkbox toggle handler for popover value filters
  const toggleColumnValue = (colKey: string, val: string) => {
    const currentSet = new Set(columnSelectedValues[colKey] || getDistinctColumnValues(colKey))
    if (currentSet.has(val)) {
      currentSet.delete(val)
    } else {
      currentSet.add(val)
    }
    setColumnSelectedValues({ ...columnSelectedValues, [colKey]: currentSet })
  }

  const selectAllColumnValues = (colKey: string) => {
    const distinct = getDistinctColumnValues(colKey)
    setColumnSelectedValues({ ...columnSelectedValues, [colKey]: new Set(distinct) })
  }

  const clearColumnValues = (colKey: string) => {
    setColumnSelectedValues({ ...columnSelectedValues, [colKey]: new Set() })
  }

  // Filter Leads based on Search Query AND status cards AND Excel-style selected values
  const filteredLeads = leads.filter(l => {
    // Support #sheetname search to filter by importName
    if (search.startsWith('#')) {
      const importSearch = search.slice(1).toLowerCase().trim()
      if (importSearch && !(l.importName?.toLowerCase() === importSearch)) {
        return false
      }
    } else {
      const searchMatch = 
        l.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        l.vehicleNo?.toLowerCase().includes(search.toLowerCase()) ||
        l.clientPhone?.includes(search) ||
        l.assignee?.fullName?.toLowerCase().includes(search.toLowerCase())

      if (!searchMatch) return false
    }

    // Active Card Filters
    if (statusFilter !== 'all') {
      if (statusFilter === 'assigned') {
        if (l.assignedTo === null) return false
      } else if (l.status?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false
      }
    }

    // Excel-style Distinct Value Checkboxes per column
    for (const [colKey, selectedSet] of Object.entries(columnSelectedValues)) {
      if (!selectedSet || selectedSet.size === 0) continue
      const val = getLeadColumnValue(l, colKey)
      if (!selectedSet.has(val)) return false
    }

    return true
  })

  // Sort Leads dynamically based on sortConfig
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aVal: any = ''
    let bVal: any = ''

    if (sortConfig.key === 'clientName') { aVal = a.clientName || ''; bVal = b.clientName || ''; }
    else if (sortConfig.key === 'phone1') { aVal = a.clientPhone || ''; bVal = b.clientPhone || ''; }
    else if (sortConfig.key === 'phone2') { aVal = getLeadColumnValue(a, 'phone2'); bVal = getLeadColumnValue(b, 'phone2'); }
    else if (sortConfig.key === 'regNo') { aVal = a.vehicleNo || ''; bVal = b.vehicleNo || ''; }
    else if (sortConfig.key === 'expiryDate') { aVal = a.expiryDate ? new Date(a.expiryDate).getTime() : 0; bVal = b.expiryDate ? new Date(b.expiryDate).getTime() : 0; }
    else if (sortConfig.key === 'gvw') { aVal = parseFloat(a.gvw || '0') || 0; bVal = parseFloat(b.gvw || '0') || 0; }
    else if (sortConfig.key === 'cat') { aVal = getLeadColumnValue(a, 'cat'); bVal = getLeadColumnValue(b, 'cat'); }
    else if (sortConfig.key === 'model') { aVal = getLeadColumnValue(a, 'model'); bVal = getLeadColumnValue(b, 'model'); }
    else if (sortConfig.key === 'company') { aVal = getLeadColumnValue(a, 'company'); bVal = getLeadColumnValue(b, 'company'); }
    else if (sortConfig.key === 'tpFull') { aVal = getLeadColumnValue(a, 'tpFull'); bVal = getLeadColumnValue(b, 'tpFull'); }
    else if (sortConfig.key === 'via') { aVal = getLeadColumnValue(a, 'via'); bVal = getLeadColumnValue(b, 'via'); }
    else if (sortConfig.key === 'assignedTo') { aVal = getLeadColumnValue(a, 'assignedTo'); bVal = getLeadColumnValue(b, 'assignedTo'); }
    else { aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); }

    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Get selected WhatsApp template text
  const getWhatsAppText = () => {
    if (!detailedLead) return ''
    const template = WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId)
    if (!template) return ''
    
    const formattedExpiry = detailedLead.expiryDate 
      ? new Date(detailedLead.expiryDate).toLocaleDateString()
      : 'N/A'
      
    if (template.id === 'renewal') {
      return template.text(detailedLead.clientName, detailedLead.vehicleNo || 'Vehicle', formattedExpiry)
    }
    return template.text(detailedLead.clientName, detailedLead.vehicleNo || 'Vehicle')
  }

  const hasActiveColumnFilters = Object.keys(columnSelectedValues).some(k => columnSelectedValues[k] && columnSelectedValues[k].size > 0) || sortConfig.key !== 'createdAt'

  return (
    <AdminLayout>
      {/* Top action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lead Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track monthly renewals and employee performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk Delete Button */}
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-md"
            >
              <Trash2 size={14} />
              Delete ({selectedIds.size})
            </button>
          )}
          {/* Import Leads → redirect to /data/import */}
          <button 
            onClick={() => router.push('/data/import')}
            className="cursor-pointer px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Upload size={14} />
            Import Leads
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md"
          >
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </div>

      {/* Summary Cards with click filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        <StatCard 
          title="Total Leads" 
          value={stats?.total || leads.length || 0} 
          icon={<Users className="text-blue-600" />} 
          color="bg-white hover:bg-blue-50/20" 
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard 
          title="Assigned" 
          value={stats?.assigned || 0} 
          icon={<CheckCircle className="text-emerald-600" />} 
          color="bg-white hover:bg-emerald-50/20" 
          isActive={statusFilter === 'assigned'}
          onClick={() => setStatusFilter('assigned')}
        />
        <StatCard 
          title="Converted" 
          value={stats?.converted || 0} 
          icon={<CheckCircle className="text-purple-600" />} 
          color="bg-white hover:bg-purple-50/20" 
          isActive={statusFilter === 'Converted'}
          onClick={() => setStatusFilter('Converted')}
        />
        <StatCard 
          title="Followups" 
          value={stats?.followups || 0} 
          icon={<AlertCircle className="text-amber-600" />} 
          color="bg-white hover:bg-amber-50/20" 
          isActive={statusFilter === 'Follow Up'}
          onClick={() => setStatusFilter('Follow Up')}
        />
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold mt-4 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px]">Retry</button>
        </div>
      )}

      {/* Search Bar, Sort Indicator & Reset */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, phone, vehicle... or #sheetname for import batches" 
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Global Sort Pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
          <ArrowUpDown size={14} className="text-blue-600" />
          <span>Sort:</span>
          <button 
            onClick={() => setSortConfig({ key: 'createdAt', direction: sortConfig.direction === 'desc' ? 'asc' : 'desc' })}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sortConfig.key === 'createdAt' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            {sortConfig.key === 'createdAt' && sortConfig.direction === 'desc' ? '⚡ Recently Added' : 'Oldest First'}
          </button>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <Calendar size={14} className="text-slate-400" />
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="text-[10px] font-bold outline-none bg-transparent w-24 text-slate-600"
          />
          <span className="text-slate-300 text-xs">—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="text-[10px] font-bold outline-none bg-transparent w-24 text-slate-600"
          />
          {(startDate || endDate) && (
            <button onClick={() => {setStartDate(''); setEndDate('')}} className="text-slate-400 hover:text-rose-500 ml-1">
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {/* Clear all filters */}
        {hasActiveColumnFilters && (
          <button 
            onClick={() => {
              setColumnSelectedValues({})
              setSortConfig({ key: 'createdAt', direction: 'desc' })
            }}
            className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer"
          >
            <X size={12} /> Clear All Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-10">
                  <input 
                    type="checkbox" 
                    checked={sortedLeads.length > 0 && selectedIds.size === sortedLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 accent-slate-900 cursor-pointer"
                  />
                </th>

                {/* Columns with Excel / Google Sheets Filter Popover */}
                {[
                  { key: 'clientName', label: 'Name', type: 'text' },
                  { key: 'phone1', label: 'Mo No. 1', type: 'text' },
                  { key: 'phone2', label: 'Mo No. 2', type: 'text' },
                  { key: 'regNo', label: 'REG no.', type: 'text' },
                  { key: 'expiryDate', label: 'Expiry date', type: 'date' },
                  { key: 'gvw', label: 'GVW', type: 'number' },
                  { key: 'cat', label: 'CAT', type: 'select' },
                  { key: 'model', label: 'Model', type: 'select' },
                  { key: 'company', label: 'Company', type: 'select' },
                  { key: 'tpFull', label: 'TP/Full', type: 'select' },
                  { key: 'via', label: 'VIA', type: 'select' },
                  { key: 'assignedTo', label: 'Assigned To', type: 'select' }
                ].map(col => {
                  const isSorted = sortConfig.key === col.key
                  const selectedSet = columnSelectedValues[col.key]
                  const hasFilter = selectedSet && selectedSet.size > 0
                  const distinctVals = getDistinctColumnValues(col.key)
                  const filteredDistinctVals = distinctVals.filter(v => v.toLowerCase().includes(popoverSearch.toLowerCase()))

                  return (
                    <th key={col.key} className="px-3 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider relative">
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer select-none group" 
                        onClick={() => {
                          setPopoverSearch('')
                          setActiveFilterHeader(activeFilterHeader === col.key ? null : col.key)
                        }}
                      >
                        <span className={isSorted ? 'text-blue-600 font-extrabold' : ''}>{col.label}</span>
                        
                        {/* Filter Funnel Icon with Active indicator */}
                        <div className={`p-1 rounded-md transition-all ${hasFilter ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-400'}`}>
                          <Filter size={11} className={hasFilter ? 'fill-white' : ''} />
                        </div>
                      </div>

                      {/* Excel / Google Sheets Style Popover Card */}
                      {activeFilterHeader === col.key && (
                        <div ref={popoverRef} className="absolute left-2 top-full mt-1 z-40 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl w-60 space-y-3 font-normal text-slate-700 normal-case">
                          {/* Header */}
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <span>Filter & Sort {col.label}</span>
                            <button onClick={(e) => { e.stopPropagation(); setActiveFilterHeader(null); }} className="hover:text-slate-600"><X size={12} /></button>
                          </div>

                          {/* Excel Style Sort Options */}
                          <div className="space-y-1">
                            <button 
                              onClick={() => { setSortConfig({ key: col.key, direction: 'asc' }); setActiveFilterHeader(null); }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{col.type === 'date' ? 'Sort Oldest to Newest' : col.type === 'number' ? 'Sort Smallest to Largest' : 'Sort A to Z'}</span>
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              onClick={() => { setSortConfig({ key: col.key, direction: 'desc' }); setActiveFilterHeader(null); }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{col.type === 'date' ? 'Sort Newest to Oldest' : col.type === 'number' ? 'Sort Largest to Smallest' : 'Sort Z to A'}</span>
                              <ArrowDown size={12} />
                            </button>
                          </div>

                          <hr className="border-slate-100" />

                          {/* Search Box inside Popover */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input 
                              type="text" 
                              autoFocus
                              placeholder="Search..."
                              value={popoverSearch}
                              onChange={e => setPopoverSearch(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </div>

                          {/* Filter by Values (Select All / Distinct Checkbox List) */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase py-0.5">
                              <span>Filter by Values</span>
                              <div className="flex gap-2">
                                <button onClick={() => selectAllColumnValues(col.key)} className="text-blue-600 hover:underline">Select All</button>
                                <span>•</span>
                                <button onClick={() => clearColumnValues(col.key)} className="text-rose-500 hover:underline">Clear</button>
                              </div>
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50 custom-scrollbar">
                              {filteredDistinctVals.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic py-1 text-center">No values found</p>
                              ) : (
                                filteredDistinctVals.map(val => {
                                  const isChecked = selectedSet ? selectedSet.has(val) : true
                                  return (
                                    <label key={val} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleColumnValue(col.key, val)}
                                        className="rounded border-slate-300 accent-slate-900 cursor-pointer"
                                      />
                                      <span className="truncate">{val}</span>
                                    </label>
                                  )
                                })
                              )}
                            </div>
                          </div>

                          {/* Apply & Cancel Footer */}
                          <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => {
                                const newFilterObj = { ...columnSelectedValues }
                                delete newFilterObj[col.key]
                                setColumnSelectedValues(newFilterObj)
                                setActiveFilterHeader(null)
                              }} 
                              className="flex-1 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all text-center"
                            >
                              Reset
                            </button>
                            <button 
                              onClick={() => setActiveFilterHeader(null)}
                              className="flex-1 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all text-center"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  )
                })}

                <th className="px-3 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={14} className="px-6 py-20 text-center text-slate-400 font-semibold">Loading leads...</td></tr>
              ) : sortedLeads.length === 0 ? (
                <tr><td colSpan={14} className="px-6 py-20 text-center text-slate-400 font-medium">No matching leads found.</td></tr>
              ) : sortedLeads.map((lead) => {
                const phone1 = getLeadColumnValue(lead, 'phone1')
                const phone2 = getLeadColumnValue(lead, 'phone2')
                const regNo = getLeadColumnValue(lead, 'regNo')
                const expiryDate = getLeadColumnValue(lead, 'expiryDate')
                const gvw = getLeadColumnValue(lead, 'gvw')
                const cat = getLeadColumnValue(lead, 'cat')
                const model = getLeadColumnValue(lead, 'model')
                const company = getLeadColumnValue(lead, 'company')
                const tpFull = getLeadColumnValue(lead, 'tpFull')
                const via = getLeadColumnValue(lead, 'via')

                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => handleOpenDrawer(lead.id)}
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                      selectedLeadId === lead.id ? 'bg-slate-50' : ''
                    } ${selectedIds.has(lead.id) ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-slate-300 accent-slate-900 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-slate-900 text-xs">{lead.clientName}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap">{phone1}</td>
                    <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap">{phone2}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-slate-800 font-bold whitespace-nowrap">{regNo}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{expiryDate}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{gvw}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[100px] truncate">{cat}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[100px] truncate">{model}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[100px] truncate">{company}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{tpFull}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[110px] truncate">{via}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-[120px] truncate">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.assignee?.fullName ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {lead.assignee?.fullName || 'Unassigned'}
                      </span>
                    </td>

                    {/* Dedicated Column for Call, WhatsApp & Details Buttons in one line */}
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.clientPhone) {
                              triggerNativeLink(`tel:${lead.clientPhone.replace(/\s+/g, '')}`);
                            }
                          }}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                          title="Call now"
                        >
                          <Phone size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.clientPhone) {
                              triggerNativeLink(`https://api.whatsapp.com/send?phone=91${lead.clientPhone.replace(/[^0-9]/g, '')}`, true);
                            }
                          }}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
                          title="WhatsApp message (opens new tab)"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenDrawer(lead.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="View Details"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer Panel */}
      {selectedLeadId && (
        <>
          {/* Backdrop */}
          <div 
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity"
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col transition-all duration-300">
            {isDrawerLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading details...</p>
              </div>
            ) : detailedLead ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{detailedLead.clientName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[9px] uppercase font-bold tracking-wider">
                        {detailedLead.vehicleNo || 'NO PLATE'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{detailedLead.city || 'Out of City'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCloseDrawer}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-100 flex gap-4 text-xs font-bold bg-white overflow-x-auto">
                  <button 
                    onClick={() => setActiveTab('info')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider whitespace-nowrap ${
                      activeTab === 'info' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('call')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider whitespace-nowrap ${
                      activeTab === 'call' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Log Activity ({detailedLead.calls?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveTab('whatsapp')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider whitespace-nowrap ${
                      activeTab === 'whatsapp' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button 
                    onClick={() => setActiveTab('response')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider whitespace-nowrap ${
                      activeTab === 'response' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Response
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'info' && (
                    <div className="space-y-6">
                      {isEditing ? (
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Name *</label>
                            <input 
                              type="text" required
                              value={editForm.clientName}
                              onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Phone</label>
                              <input 
                                type="text"
                                value={editForm.clientPhone}
                                onChange={e => setEditForm({ ...editForm, clientPhone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Email / Phone 2</label>
                              <input 
                                type="text"
                                value={editForm.clientEmail}
                                onChange={e => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle No</label>
                              <input 
                                type="text"
                                value={editForm.vehicleNo}
                                onChange={e => setEditForm({ ...editForm, vehicleNo: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">GVW</label>
                              <input 
                                type="text"
                                value={editForm.gvw}
                                onChange={e => setEditForm({ ...editForm, gvw: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Registration Date</label>
                              <input 
                                type="date"
                                value={editForm.registrationDate}
                                onChange={e => setEditForm({ ...editForm, registrationDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date</label>
                              <input 
                                type="date"
                                value={editForm.expiryDate}
                                onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">City / VIA</label>
                              <input 
                                type="text"
                                value={editForm.city}
                                onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Existing Agent</label>
                              <input 
                                type="text"
                                value={editForm.existingAgent}
                                onChange={e => setEditForm({ ...editForm, existingAgent: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                            <textarea 
                              value={editForm.address}
                              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                              rows={2}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100 resize-none"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button 
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                            >
                              {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {/* Lead Status Card Controls */}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Configure lead status</label>
                            <select 
                              value={detailedLead.status || 'New'}
                              onChange={e => handleUpdateLeadStatus(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="New">New Lead</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Follow Up">Follow Up Needed</option>
                              <option value="Converted">Converted Account</option>
                              <option value="Lost">Lost Opportunity</option>
                            </select>
                          </div>

                          {/* Lead Assignee Card Controls */}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assign to auto advisor</label>
                            <select 
                              value={detailedLead.assignedTo || 'unassigned'}
                              onChange={e => handleUpdateLeadAssignee(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="unassigned">Unassigned (Leave Open)</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.role?.name})</option>
                              ))}
                            </select>
                          </div>

                          {/* Client Card details */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata sheet</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <DetailItem label="Mo No. 1" value={detailedLead.clientPhone || 'N/A'} isCopyable />
                              <DetailItem label="Mo No. 2" value={getLeadColumnValue(detailedLead, 'phone2')} isCopyable />
                              <DetailItem label="Gross Vehicle Weight (GVW)" value={detailedLead.gvw || 'N/A'} />
                              <DetailItem label="City / VIA" value={getLeadColumnValue(detailedLead, 'via')} />
                              <DetailItem label="Policy Expiry Date" value={detailedLead.expiryDate ? new Date(detailedLead.expiryDate).toLocaleDateString() : 'N/A'} />
                              <DetailItem label="Created On" value={new Date(detailedLead.createdAt).toLocaleDateString()} />
                            </div>
                          </div>

                          {/* Edit button */}
                          {role !== 'EXECUTIVE' && role !== 'VIEWER' && (
                            <button
                              onClick={handleStartEdit}
                              className="w-full py-2.5 mt-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                            >
                              Edit Lead Details
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CALL LOG TIMELINE HISTORY */}
                  {activeTab === 'call' && (
                    <div className="space-y-6">
                      {/* Log form */}
                      <form onSubmit={handleLogCallResponse} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Log outbound calling interaction</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Call Outcome</label>
                            <select 
                              value={logOutcome}
                              onChange={e => setLogOutcome(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none"
                            >
                              <option value="Connected">Connected</option>
                              <option value="In Progress">Busy / Calling</option>
                              <option value="Follow Up">Callback Requested</option>
                              <option value="Lost">Failed / Switched Off</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Followup Date (Optional)</label>
                            <input 
                              type="date"
                              value={logFollowupDate}
                              onChange={e => setLogFollowupDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Conversation Notes / Brief</label>
                          <textarea 
                            required
                            placeholder="Add brief details about renewal conversion or client constraints..."
                            rows={3}
                            value={logNotes}
                            onChange={e => setLogNotes(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isLogging}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                        >
                          <Phone size={14} /> {isLogging ? 'Logging...' : 'Log Response'}
                        </button>
                      </form>

                      {/* Log Timeline */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronological Call Logs History</h5>
                        {detailedLead.calls && detailedLead.calls.length > 0 ? (
                          <div className="space-y-4 border-l border-slate-100 pl-4 ml-2">
                            {detailedLead.calls.map((c: any) => (
                              <div key={c.id} className="relative space-y-1">
                                <div className="absolute -left-6.5 top-0.5 bg-slate-900 border-4 border-white rounded-full w-4 h-4" />
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                    c.outcome === 'Connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                    c.outcome === 'Follow Up' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                    'bg-rose-50 border-rose-200 text-rose-600'
                                  }`}>
                                    {c.outcome}
                                  </span>
                                  <span className="text-slate-400 font-medium">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{c.notes || 'No description notes added.'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No communication logs recorded yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: WHATSAPP TEMPLATES REDIRECT */}
                  {activeTab === 'whatsapp' && (
                    <div className="space-y-6">
                      {/* Template Selector */}
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Choose messaging script template</label>
                        <select 
                          value={selectedTemplateId}
                          onChange={e => setSelectedTemplateId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none"
                        >
                          {WHATSAPP_TEMPLATES.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Message Live Preview Card */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 relative">
                        <label className="absolute right-4 top-4 text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">Preview</label>
                        <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Compiled Text</h6>
                        <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                          {getWhatsAppText()}
                        </pre>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => handleCopyTemplate(getWhatsAppText())}
                          className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                        >
                          <Clipboard size={14} />
                          {copiedText ? 'Copied!' : 'Copy Script'}
                        </button>
                        <button 
                          onClick={() => {
                            if (detailedLead.clientPhone) {
                              triggerNativeLink(`https://api.whatsapp.com/send?phone=91${detailedLead.clientPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(getWhatsAppText())}`, true);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <MessageCircle size={14} />
                          Open WhatsApp
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: RESPONSE */}
                  {activeTab === 'response' && (
                    <div className="space-y-6">
                      <div>
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">Select lead response</h5>
                        <p className="text-[10px] text-slate-400 mb-4">Choose the response given by the lead during the call or WhatsApp conversation.</p>
                      </div>
                      
                      {predefinedResponses.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
                          <p className="text-xs text-slate-400">No predefined responses available yet.</p>
                          <p className="text-[10px] text-slate-300 mt-1">Admin can add responses from Settings → Lead Responses</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {predefinedResponses.map((resp: any) => (
                            <button
                              key={resp.id}
                              onClick={() => setSelectedResponseId(resp.id === selectedResponseId ? null : resp.id)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                                selectedResponseId === resp.id 
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                  : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{resp.text}</span>
                                {resp.requiresFollowUp && (
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    selectedResponseId === resp.id ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
                                  }`}>Follow-up</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedResponseId && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                            <textarea 
                              placeholder="Add any extra notes about the conversation..."
                              rows={2}
                              value={responseNotes}
                              onChange={e => setResponseNotes(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none resize-none"
                            />
                          </div>
                          <button 
                            onClick={handleSaveResponse}
                            disabled={isSavingResponse}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                          >
                            <Check size={14} /> {isSavingResponse ? 'Saving...' : 'Save Response'}
                          </button>
                        </div>
                      )}

                      {/* Past response logs from calls */}
                      {detailedLead.calls && detailedLead.calls.filter((c: any) => c.notes?.startsWith('[Response:')).length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Responses</h5>
                          {detailedLead.calls.filter((c: any) => c.notes?.startsWith('[Response:')).map((c: any) => (
                            <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <p className="text-xs text-slate-700 font-medium">{c.notes}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Add New Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Owner Name *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientName} onChange={e => setNewLead({...newLead, clientName: e.target.value})} placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number 1 *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientPhone} onChange={e => setNewLead({...newLead, clientPhone: e.target.value})} placeholder="e.g. +919876543210" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Number (REG no.) *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.vehicleNo} onChange={e => setNewLead({...newLead, vehicleNo: e.target.value})} placeholder="e.g. MH-12-AB-1234" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number 2 / Email (Optional)</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientEmail} onChange={e => setNewLead({...newLead, clientEmail: e.target.value})} placeholder="e.g. 9876543210" />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold font-sans">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg">
                  {isSubmitting ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-slate-100">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-rose-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Move to Trash?</h2>
              <p className="text-xs text-slate-500">
                {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} will be moved to trash. You can restore them later from the Trashed Leads section.
              </p>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Move to Trash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowupModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Schedule Follow-up</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Lead: {detailedLead?.clientName}</p>
              </div>
              <button 
                onClick={() => setShowFollowupModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleScheduleFollowup} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scheduled Date & Time *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required 
                    type="datetime-local" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 text-xs outline-none focus:ring-2 focus:ring-slate-100" 
                    value={followupData.scheduled_at} 
                    onChange={e => setFollowupData({...followupData, scheduled_at: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Channel *</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100 font-bold text-slate-700"
                  value={followupData.type} 
                  onChange={e => setFollowupData({...followupData, type: e.target.value})}
                >
                  <option value="call">📞 Phone Call</option>
                  <option value="whatsapp">💬 WhatsApp Message</option>
                  <option value="visit">🏠 Customer Site Visit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Follow-up Notes / Instructions</label>
                <textarea 
                  placeholder="What is the context of this callback?" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none resize-none" 
                  rows={3}
                  value={followupData.notes} 
                  onChange={e => setFollowupData({...followupData, notes: e.target.value})} 
                />
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowFollowupModal(false)} 
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isScheduling} 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-black transition-all"
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
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
      onClick={onClick}
      className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${color} ${
        isActive 
          ? 'border-slate-900 ring-2 ring-slate-100 shadow-md transform scale-[1.01]' 
          : 'border-slate-100 shadow-sm hover:shadow'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value, isCopyable }: { label: string; value: string; isCopyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative group">
      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="block text-xs font-bold text-slate-700 mt-1 truncate">{value}</span>
      {isCopyable && value !== 'N/A' && (
        <button 
          onClick={handleCopy}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded transition-all text-[8px] font-bold"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}
