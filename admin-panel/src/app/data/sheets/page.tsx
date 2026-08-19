"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  FileSpreadsheet, Download, Eye, Search, AlertCircle, RefreshCw, X,
  CheckCircle, FileText, ArrowRight, ChevronLeft, ChevronRight,
  Calendar, Clock, User, Filter, ArrowUpDown, ChevronDown, Sparkles,
  Phone, Car, MapPin, Tag, Check, CalendarDays, Lock, Users, UserCheck,
  Trash2, CheckSquare, Square
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface SpreadsheetFile {
  fileName: string
  batchName: string
  sizeBytes: number
  importedAt?: string
  updatedAt: string
  dayOfWeek?: string
  dateOnly?: string
  totalRows: number
  agentCount: number
  headers: string[]
  downloadUrl: string
}

interface MatchingLead {
  id: string
  clientName: string
  clientPhone: string | null
  vehicleNo: string | null
  city: string | null
  status: string
  importName: string | null
  existingAgent: string | null
  createdAt: string
  expiryDate: string | null
}

interface SheetPreviewData {
  fileName: string
  downloadUrl: string
  headers: string[]
  rows: any[][]
  agentColIdx: number
  agentRowsCount: number
  totalRows?: number
}

const DAYS_OF_WEEK = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Custom Range', value: 'custom' },
]

export default function ImportedSheetsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const roleName = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').toUpperCase()
  const isAdmin = roleName.includes('ADMIN') || roleName.includes('SUPER')

  const [files, setFiles] = useState<SpreadsheetFile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Search & Filter States
  const [sheetSearch, setSheetSearch] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [matchingLeads, setMatchingLeads] = useState<MatchingLead[]>([])
  const [matchingBatchNames, setMatchingBatchNames] = useState<string[]>([])
  const [leadSearchLoading, setLeadSearchLoading] = useState(false)
  
  // Date & Day Filters
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [specificDate, setSpecificDate] = useState('')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('All Days')
  
  // Additional Filters
  const [agentFilter, setAgentFilter] = useState<'all' | 'has_agent' | 'no_agent'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rows_desc' | 'rows_asc' | 'name_asc'>('newest')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Preview modal state
  const [selectedFile, setSelectedFile] = useState<SpreadsheetFile | null>(null)
  const [previewData, setPreviewData] = useState<SheetPreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewAgentFilter, setPreviewAgentFilter] = useState<'all' | 'agent' | 'direct'>('all')
  const [previewSortCol, setPreviewSortCol] = useState<number | null>(null)
  const [previewSortOrder, setPreviewSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(50)

  // Monthly Assignment States
  const [expiryMonthFilter, setExpiryMonthFilter] = useState<number>(0) // 0 = All, 1-12 = month
  const [expiryYearFilter, setExpiryYearFilter] = useState<number>(new Date().getFullYear())
  const [showAssignPanel, setShowAssignPanel] = useState(false)
  const [availableExecs, setAvailableExecs] = useState<any[]>([])
  const [selectedExecIds, setSelectedExecIds] = useState<string[]>([])
  const [execsLoading, setExecsLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<any>(null)

  // Multi-Selection & Deletion States
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])
  const [deleteAssociatedLeads, setDeleteAssociatedLeads] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('')

  const formatDateTime = (dateStr: string | Date | undefined) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '—'
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return '—'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Fetch all spreadsheet files
  const fetchFiles = async (sync = false) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const url = sync ? '/api/v1/import/sheets?sync=true' : '/api/v1/import/sheets'
      const data = await fetchApi(url)
      setFiles(data?.files || [])
    } catch (err: any) {
      console.error('Failed to fetch spreadsheet files:', err)
      setErrorMessage(err.message || 'Failed to load spreadsheet files.')
    } finally {
      setLoading(false)
    }
  }

  // Perform backend lead search
  const performLeadSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMatchingLeads([])
      setMatchingBatchNames([])
      return
    }
    setLeadSearchLoading(true)
    try {
      const res = await fetchApi(`/api/v1/import/sheets?leadSearch=${encodeURIComponent(query.trim())}`)
      setMatchingLeads(res?.matchingLeads || [])
      setMatchingBatchNames(res?.matchingBatchNames || [])
    } catch (err) {
      console.error('Failed to search leads across sheets:', err)
    } finally {
      setLeadSearchLoading(false)
    }
  }, [])

  // Debounce lead search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leadSearch.trim().length >= 2) {
        performLeadSearch(leadSearch)
      } else {
        setMatchingLeads([])
        setMatchingBatchNames([])
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [leadSearch, performLeadSearch])

  // Initial load
  useEffect(() => {
    fetchFiles()
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const initialSearch = params.get('search') || params.get('batch') || ''
      const initialLead = params.get('lead') || ''
      if (initialSearch) {
        setSheetSearch(initialSearch.replace(/^#/, ''))
      }
      if (initialLead) {
        setLeadSearch(initialLead)
      }
    }
  }, [])

  const handleOpenPreview = async (file: SpreadsheetFile, initialRowSearch?: string) => {
    setSelectedFile(file)
    setPreviewLoading(true)
    setPreviewSearch(initialRowSearch || '')
    setPreviewAgentFilter('all')
    setPreviewSortCol(null)
    setCurrentPage(1)
    try {
      const res = await fetchApi(`/api/v1/import/sheets/${encodeURIComponent(file.fileName)}`)
      setPreviewData(res)
    } catch (err: any) {
      alert(err.message || 'Failed to load spreadsheet preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Fetch available executives for assignment
  const fetchAvailableExecs = async (month: number, year: number) => {
    setExecsLoading(true)
    try {
      const res = await fetchApi(`/api/v1/leads/available-executives?month=${month}&year=${year}`)
      setAvailableExecs(res?.executives || [])
      // Auto-select available ones (not on extended leave)
      const available = (res?.executives || []).filter((e: any) => !e.isOnExtendedLeave)
      setSelectedExecIds(available.map((e: any) => e.id))
    } catch (err) {
      console.error('Failed to fetch executives:', err)
    } finally {
      setExecsLoading(false)
    }
  }

  // Handle month filter change in preview
  const handleExpiryMonthChange = (month: number) => {
    setExpiryMonthFilter(month)
    setCurrentPage(1)
    setAssignResult(null)
    if (month > 0) {
      fetchAvailableExecs(month, expiryYearFilter)
    } else {
      setShowAssignPanel(false)
    }
  }

  // Assign leads for the selected month
  const handleAssignLeads = async () => {
    if (!expiryMonthFilter || selectedExecIds.length === 0) return
    setAssigning(true)
    setAssignResult(null)
    try {
      const res = await fetchApi('/api/v1/leads/assign-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importName: selectedFile?.batchName || null,
          month: expiryMonthFilter,
          year: expiryYearFilter,
          salesExecutiveIds: selectedExecIds
        })
      })
      setAssignResult(res)
    } catch (err: any) {
      setAssignResult({ error: err.message || 'Assignment failed' })
    } finally {
      setAssigning(false)
    }
  }

  const MONTH_NAMES = ['All Months', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Multi-Selection Handlers
  const toggleSelectFile = (fileName: string) => {
    if (fileName === 'import_all_leads.xlsx') return
    setSelectedFileNames(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    )
  }

  const selectAllFiles = () => {
    const selectable = filteredFiles
      .filter(f => f.fileName !== 'import_all_leads.xlsx')
      .map(f => f.fileName)
    setSelectedFileNames(selectable)
  }

  const clearSelectedFiles = () => {
    setSelectedFileNames([])
  }

  const promptDeleteFiles = (fileNames: string[]) => {
    const valid = fileNames.filter(f => f !== 'import_all_leads.xlsx')
    if (valid.length === 0) return
    setFilesToDelete(valid)
    setDeleteAssociatedLeads(true)
    setDeleteModalOpen(true)
  }

  const confirmDeleteFiles = async () => {
    if (filesToDelete.length === 0) return
    setIsDeleting(true)
    try {
      const res = await fetchApi('/api/v1/import/sheets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNames: filesToDelete,
          deleteLeads: deleteAssociatedLeads
        })
      })

      // Instantly update local state
      setFiles(prev => prev.filter(f => !filesToDelete.includes(f.fileName)))
      setSelectedFileNames(prev => prev.filter(f => !filesToDelete.includes(f)))
      setDeleteModalOpen(false)
      setFilesToDelete([])
      setDeleteSuccessMessage(res?.message || 'Spreadsheet(s) deleted successfully.')
      setTimeout(() => setDeleteSuccessMessage(''), 5000)
      fetchFiles(false)
    } catch (err: any) {
      alert(err.message || 'Failed to delete spreadsheets')
    } finally {
      setIsDeleting(false)
    }
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSheetSearch('')
    setLeadSearch('')
    setMatchingLeads([])
    setMatchingBatchNames([])
    setDatePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setSpecificDate('')
    setSelectedDayOfWeek('All Days')
    setAgentFilter('all')
    setSortBy('newest')
  }

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (sheetSearch.trim()) count++
    if (leadSearch.trim()) count++
    if (datePreset !== 'all') count++
    if (specificDate) count++
    if (selectedDayOfWeek !== 'All Days') count++
    if (agentFilter !== 'all') count++
    return count
  }, [sheetSearch, leadSearch, datePreset, specificDate, selectedDayOfWeek, agentFilter])

  // Main file filtering logic
  const filteredFiles = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    return files.filter(f => {
      const fileDate = f.importedAt ? new Date(f.importedAt) : null
      const dateOnly = f.dateOnly || (fileDate && !isNaN(fileDate.getTime()) ? fileDate.toISOString().split('T')[0] : '')
      const fileDay = f.dayOfWeek || (fileDate && !isNaN(fileDate.getTime()) ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][fileDate.getDay()] : '')

      // 1. Sheet / Batch / File name search
      if (sheetSearch.trim()) {
        const term = sheetSearch.toLowerCase().trim()
        const cleanTerm = term.replace(/[^a-z0-9]/g, '')
        const fileName = (f.fileName || '').toLowerCase()
        const batchName = (f.batchName || '').toLowerCase()
        const cleanFile = fileName.replace(/[^a-z0-9]/g, '')
        const cleanBatch = batchName.replace(/[^a-z0-9]/g, '')
        
        const match = fileName.includes(term) || batchName.includes(term) || cleanFile.includes(cleanTerm) || cleanBatch.includes(cleanTerm)
        if (!match) return false
      }

      // 2. Lead search filtering across sheets
      if (leadSearch.trim() && matchingBatchNames.length > 0) {
        const cleanBatch = f.batchName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanFile = f.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const matchesLeadBatch = matchingBatchNames.some(bn => {
          if (!bn) return false
          const cleanBn = bn.toLowerCase().replace(/[^a-z0-9]/g, '')
          return cleanBatch.includes(cleanBn) || cleanFile.includes(cleanBn) || bn === 'all_leads'
        })
        if (!matchesLeadBatch && f.fileName !== 'import_all_leads.xlsx') return false
      }

      // 3. Date Preset filtering
      if (datePreset === 'today') {
        if (dateOnly !== todayStr) return false
      } else if (datePreset === 'yesterday') {
        if (dateOnly !== yesterdayStr) return false
      } else if (datePreset === 'this_week') {
        if (!fileDate || fileDate < sevenDaysAgo) return false
      } else if (datePreset === 'this_month') {
        if (!fileDate || fileDate.getFullYear() !== currentYear || fileDate.getMonth() !== currentMonth) return false
      } else if (datePreset === 'custom') {
        if (customStartDate && dateOnly < customStartDate) return false
        if (customEndDate && dateOnly > customEndDate) return false
      }

      // 4. Specific Date picker filter
      if (specificDate && dateOnly !== specificDate) {
        return false
      }

      // 5. Day of Week filter
      if (selectedDayOfWeek !== 'All Days') {
        if (fileDay.toLowerCase() !== selectedDayOfWeek.toLowerCase()) return false
      }

      // 6. Agent leads filter
      if (agentFilter === 'has_agent' && f.agentCount === 0) return false
      if (agentFilter === 'no_agent' && f.agentCount > 0) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.importedAt || 0).getTime() - new Date(a.importedAt || 0).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.importedAt || 0).getTime() - new Date(b.importedAt || 0).getTime()
      } else if (sortBy === 'rows_desc') {
        return b.totalRows - a.totalRows
      } else if (sortBy === 'rows_asc') {
        return a.totalRows - b.totalRows
      } else if (sortBy === 'name_asc') {
        return a.batchName.localeCompare(b.batchName)
      }
      return 0
    })
  }, [files, sheetSearch, leadSearch, matchingBatchNames, datePreset, customStartDate, customEndDate, specificDate, selectedDayOfWeek, agentFilter, sortBy])

  // Filter preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!previewData?.rows) return []
    let rows = previewData.rows

    // Filter by expiry month if selected
    if (expiryMonthFilter > 0 && previewData.headers) {
      const expiryColIdx = previewData.headers.findIndex(h => {
        const hLower = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        return hLower.includes('expiry') || hLower.includes('validity') || hLower.includes('duedate') || hLower.includes('policyend')
      })
      if (expiryColIdx !== -1) {
        rows = rows.filter(row => {
          const cellVal = String(row[expiryColIdx] || '').trim()
          if (!cellVal) return false
          // Parse the date to get its month
          let d: Date | null = null
          // Try DD/MM/YYYY or DD-MM-YYYY
          const dmyMatch = cellVal.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
          if (dmyMatch) {
            let yr = parseInt(dmyMatch[3], 10)
            if (yr < 100) yr += yr < 50 ? 2000 : 1900
            d = new Date(yr, parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10))
          }
          if (!d || isNaN(d.getTime())) {
            d = new Date(cellVal)
          }
          if (!d || isNaN(d.getTime())) return false
          return (d.getMonth() + 1) === expiryMonthFilter && d.getFullYear() === expiryYearFilter
        })
      }
    }

    // Filter by agent tag
    if (previewAgentFilter !== 'all' && previewData.agentColIdx !== -1) {
      rows = rows.filter(row => {
        const isAgent = String(row[previewData.agentColIdx] || '').toLowerCase().trim() === 'agent'
        return previewAgentFilter === 'agent' ? isAgent : !isAgent
      })
    }

    // Filter by preview search term
    if (previewSearch.trim()) {
      const term = previewSearch.toLowerCase().trim()
      rows = rows.filter(row =>
        row.some(cell => String(cell || '').toLowerCase().includes(term))
      )
    }

    // Sort preview rows if sort column selected
    if (previewSortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const valA = String(a[previewSortCol] || '').toLowerCase()
        const valB = String(b[previewSortCol] || '').toLowerCase()
        if (valA < valB) return previewSortOrder === 'asc' ? -1 : 1
        if (valA > valB) return previewSortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // If month is filtered, sort by expiry date nearest first
    if (expiryMonthFilter > 0 && previewData.headers) {
      const expiryColIdx = previewData.headers.findIndex(h => {
        const hLower = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        return hLower.includes('expiry') || hLower.includes('validity') || hLower.includes('duedate')
      })
      if (expiryColIdx !== -1 && previewSortCol === null) {
        rows = [...rows].sort((a, b) => {
          const parseD = (v: any) => {
            const s = String(v || '').trim()
            const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
            if (m) {
              let yr = parseInt(m[3], 10)
              if (yr < 100) yr += yr < 50 ? 2000 : 1900
              return new Date(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime()
            }
            return new Date(s).getTime() || 0
          }
          return parseD(a[expiryColIdx]) - parseD(b[expiryColIdx])
        })
      }
    }

    return rows
  }, [previewData, previewSearch, previewAgentFilter, previewSortCol, previewSortOrder, expiryMonthFilter, expiryYearFilter])

  // Pagination for preview modal
  const totalFilteredRows = filteredPreviewRows.length
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(totalFilteredRows / (rowsPerPage as number)) || 1
  const paginatedRows = useMemo(() => {
    if (rowsPerPage === 'all') return filteredPreviewRows
    const limit = rowsPerPage as number
    const start = (currentPage - 1) * limit
    return filteredPreviewRows.slice(start, start + limit)
  }, [filteredPreviewRows, currentPage, rowsPerPage])

  const startRowIdx = rowsPerPage === 'all' ? 1 : (currentPage - 1) * (rowsPerPage as number) + 1
  const endRowIdx = rowsPerPage === 'all' ? totalFilteredRows : Math.min(currentPage * (rowsPerPage as number), totalFilteredRows)

  const handleSortColumn = (colIdx: number) => {
    if (previewSortCol === colIdx) {
      setPreviewSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setPreviewSortCol(colIdx)
      setPreviewSortOrder('asc')
    }
  }

  if (!authLoading && user && !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4 shadow-sm">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            The Spreadsheet repository is strictly confidential and accessible only to Super Admins and Admins.
          </p>
          <a
            href="/leads"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md"
          >
            Back to Leads
          </a>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200">
                Excel & CSV Central
              </span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200">
                Multi-Filter Search
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Imported Spreadsheets
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Search by date, day of week, lead name, or sheet batch name. Preview live records instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchFiles(true)}
              disabled={loading}
              title="Resync sheets from live database"
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
              <span>Sync & Refresh</span>
            </button>
            <a
              href="/data/import"
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Import New Sheet</span>
            </a>
          </div>
        </div>

        {/* Quick summary cards (Clickable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spreadsheets -> Click to Reset & Show All Sheets */}
          <button
            onClick={() => handleResetFilters()}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              activeFiltersCount === 0 && agentFilter === 'all'
                ? 'bg-white border-blue-300 shadow-md ring-2 ring-blue-500/20'
                : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:bg-blue-50/20'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                  Total Spreadsheets
                </p>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{files.length}</h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {filteredFiles.length !== files.length ? `${filteredFiles.length} matching` : 'All files stored'}
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
              <FileText size={20} />
            </div>
          </button>

          {/* Card 2: Total Processed Rows -> Click to Preview Master Sheet / All Leads */}
          <button
            onClick={() => {
              const masterFile = files.find(f => f.fileName === 'import_all_leads.xlsx') || files[0]
              if (masterFile) {
                handleOpenPreview(masterFile)
              }
            }}
            className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md hover:bg-emerald-50/20 text-left transition-all cursor-pointer flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                  All Leads Master
                </p>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {files.reduce((acc, f) => acc + (f.fileName === 'import_all_leads.xlsx' || f.fileName === 'import_renewals.xlsx' ? 0 : f.totalRows), 0)}
              </h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Click to preview all
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm shrink-0">
              <FileSpreadsheet size={20} />
            </div>
          </button>

          {/* Card 3: Renewals Master Sheet */}
          <button
            onClick={() => {
              const renewalsFile = files.find(f => f.fileName === 'import_renewals.xlsx')
              if (renewalsFile) {
                handleOpenPreview(renewalsFile)
              }
            }}
            className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:bg-indigo-50/20 text-left transition-all cursor-pointer flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
                  Renewals Master
                </p>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {files.find(f => f.fileName === 'import_renewals.xlsx')?.totalRows || 0}
              </h2>
              <p className="text-[10px] font-semibold text-indigo-600 mt-0.5 font-bold">
                Click to preview renewals
              </p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0">
              <RefreshCw size={20} />
            </div>
          </button>

          {/* Card 4: Tagged Agent Leads -> Click to Filter / Toggle Agent Tagged Sheets */}
          <button
            onClick={() => {
              setAgentFilter(prev => prev === 'has_agent' ? 'all' : 'has_agent')
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              agentFilter === 'has_agent'
                ? 'bg-amber-50/60 border-amber-300 shadow-md ring-2 ring-amber-500/30'
                : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md hover:bg-amber-50/20'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition-colors">
                  Agent Leads
                </p>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {files.reduce((acc, f) => acc + f.agentCount, 0)}
              </h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {agentFilter === 'has_agent' ? 'Active filter (ON)' : 'Click to filter'}
              </p>
            </div>
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm shrink-0">
              <AlertCircle size={20} />
            </div>
          </button>
        </div>

        {/* COMPREHENSIVE FILTER & SEARCH BAR */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          
          {/* Row 1: Dual Search Boxes (Sheet Name + Lead Name) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Sheet / Batch Name Search */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Sheet Name / Batch Name..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold pl-10 pr-9 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                value={sheetSearch}
                onChange={e => setSheetSearch(e.target.value)}
              />
              {sheetSearch && (
                <button
                  onClick={() => setSheetSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Lead Name / Phone / Vehicle Search Across All Sheets */}
            <div className="md:col-span-5 relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
              <input
                type="text"
                placeholder="Search Lead Name, Phone, or Vehicle No across sheets..."
                className="w-full bg-blue-50/40 border border-blue-200/80 text-slate-800 text-xs font-semibold pl-10 pr-9 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
              />
              {leadSearchLoading ? (
                <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
              ) : leadSearch ? (
                <button
                  onClick={() => {
                    setLeadSearch('')
                    setMatchingLeads([])
                    setMatchingBatchNames([])
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Dropdown Jump Selector */}
            <div className="md:col-span-2">
              <select
                value={selectedFile?.fileName || ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) return
                  if (val === '__ALL_CARDS__') {
                    handleResetFilters()
                    return
                  }
                  const found = files.find(f => f.fileName === val)
                  if (found) handleOpenPreview(found)
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer truncate"
              >
                <option value="">Jump to Sheet / Master Database...</option>
                <option value="__ALL_CARDS__">📂 View All Spreadsheets Grid</option>

                <optgroup label="🌟 Central Master Sheets">
                  {files.filter(f => f.fileName === 'import_all_leads.xlsx' || f.fileName === 'import_renewals.xlsx').map(f => (
                    <option key={f.fileName} value={f.fileName}>
                      {f.fileName === 'import_renewals.xlsx' ? '🔄 Policy Renewals (Master)' : '📋 All Active Leads (Master)'} ({f.totalRows} records)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="📁 Uploaded Spreadsheets & Batches">
                  {files.filter(f => f.fileName !== 'import_all_leads.xlsx' && f.fileName !== 'import_renewals.xlsx').map(f => (
                    <option key={f.fileName} value={f.fileName}>
                      {f.batchName} ({f.totalRows} leads)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Row 2: Date Presets & Day of Week Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar size={12} /> Date:
              </span>
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setDatePreset(preset.value as any)
                    if (preset.value !== 'custom') {
                      setCustomStartDate('')
                      setCustomEndDate('')
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    datePreset === preset.value
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Day of the Week Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays size={12} /> Day:
              </span>
              <select
                value={selectedDayOfWeek}
                onChange={e => setSelectedDayOfWeek(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            {/* Toggle Advanced Filters */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showAdvancedFilters || agentFilter !== 'all' || specificDate || datePreset === 'custom'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter size={12} />
              <span>More Filters</span>
              <ChevronDown size={12} className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Row 3: Advanced Filter Details (Expandable) */}
          {(showAdvancedFilters || datePreset === 'custom' || specificDate) && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl animate-in slide-in-from-top-2 duration-150">
              {/* Custom Date Range */}
              {datePreset === 'custom' && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Specific Date Picker */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Specific Calendar Date
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={e => setSpecificDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Agent Leads Filter */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Agent Tagged Sheets
                </label>
                <select
                  value={agentFilter}
                  onChange={e => setAgentFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Sheets</option>
                  <option value="has_agent">With Agent Tagged Leads</option>
                  <option value="no_agent">Without Agent Tags</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="newest">Newest Imported First</option>
                  <option value="oldest">Oldest Imported First</option>
                  <option value="rows_desc">Most Leads First</option>
                  <option value="rows_asc">Least Leads First</option>
                  <option value="name_asc">Sheet Name (A - Z)</option>
                </select>
              </div>
            </div>
          )}

          {/* Active Filter Chips Strip */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active Filters:</span>
                
                {sheetSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200">
                    Sheet: "{sheetSearch}"
                    <button onClick={() => setSheetSearch('')} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}

                {leadSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 text-[11px] font-bold rounded-lg border border-blue-200">
                    Lead: "{leadSearch}"
                    <button onClick={() => { setLeadSearch(''); setMatchingLeads([]); }} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}

                {datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200">
                    Date: {DATE_PRESETS.find(p => p.value === datePreset)?.label}
                    <button onClick={() => setDatePreset('all')} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}

                {specificDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200">
                    Date: {specificDate}
                    <button onClick={() => setSpecificDate('')} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}

                {selectedDayOfWeek !== 'All Days' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200">
                    Day: {selectedDayOfWeek}
                    <button onClick={() => setSelectedDayOfWeek('All Days')} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}

                {agentFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 text-[11px] font-bold rounded-lg border border-amber-200">
                    {agentFilter === 'has_agent' ? 'With Agent Leads' : 'No Agent Leads'}
                    <button onClick={() => setAgentFilter('all')} className="hover:text-rose-600"><X size={12} /></button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500">
                  Showing {filteredFiles.length} of {files.length} sheets
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GLOBAL LEAD SEARCH RESULTS DRAWER */}
        {leadSearch.trim() && (
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5 rounded-3xl border border-blue-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Matching Leads in Database for "{leadSearch}"
                </h3>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md">
                  {matchingLeads.length} Found
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Click "View in Sheet" to highlight and preview the exact row
              </span>
            </div>

            {matchingLeads.length === 0 && !leadSearchLoading ? (
              <p className="text-xs text-slate-500 italic py-2">
                No direct lead record matched "{leadSearch}". Spreadsheets below are filtered by batch name.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {matchingLeads.map(lead => {
                  const targetFile = files.find(f => {
                    const cleanBatch = f.batchName.toLowerCase().replace(/[^a-z0-9]/g, '')
                    const leadBatch = (lead.importName || 'direct_entry').toLowerCase().replace(/[^a-z0-9]/g, '')
                    return cleanBatch.includes(leadBatch) || leadBatch.includes(cleanBatch)
                  }) || files.find(f => f.fileName === 'import_all_leads.xlsx')

                  return (
                    <div
                      key={lead.id}
                      className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 truncate" title={lead.clientName}>
                            {lead.clientName}
                          </h4>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded">
                            {lead.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {lead.clientPhone && (
                            <div className="flex items-center gap-1">
                              <Phone size={10} className="text-slate-400" />
                              <span>{lead.clientPhone}</span>
                            </div>
                          )}
                          {lead.vehicleNo && (
                            <div className="flex items-center gap-1">
                              <Car size={10} className="text-slate-400" />
                              <span className="font-mono">{lead.vehicleNo}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <FileSpreadsheet size={10} />
                            <span className="truncate">Batch: <strong className="text-slate-700">{lead.importName || 'Direct Entry'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {targetFile && (
                        <button
                          onClick={() => handleOpenPreview(targetFile, lead.clientName || lead.clientPhone || '')}
                          className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> View in {targetFile.batchName}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Success toast / banner */}
        {deleteSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{deleteSuccessMessage}</span>
            </div>
            <button onClick={() => setDeleteSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => fetchFiles()} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px]">Retry</button>
          </div>
        )}

        {/* BULK ACTIONS TOOLBAR */}
        {isAdmin && filteredFiles.filter(f => f.fileName !== 'import_all_leads.xlsx').length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={selectedFileNames.length === filteredFiles.filter(f => f.fileName !== 'import_all_leads.xlsx').length ? clearSelectedFiles : selectAllFiles}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {selectedFileNames.length > 0 && selectedFileNames.length === filteredFiles.filter(f => f.fileName !== 'import_all_leads.xlsx').length ? (
                  <CheckSquare size={16} className="text-blue-600" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>
                  {selectedFileNames.length > 0
                    ? `${selectedFileNames.length} sheet(s) selected`
                    : 'Select All Sheets'}
                </span>
              </button>
              {selectedFileNames.length > 0 && (
                <button
                  onClick={clearSelectedFiles}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedFileNames.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => promptDeleteFiles(selectedFileNames)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedFileNames.length})</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
            <RefreshCw className="animate-spin text-slate-400 mx-auto" size={32} />
            <p className="text-xs font-bold text-slate-500">Loading spreadsheet repository...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
            <FileSpreadsheet className="text-slate-300 mx-auto" size={48} />
            <h3 className="text-base font-black text-slate-800">No Matching Spreadsheets</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No spreadsheets matched your current search or date filters. Try changing your search query or resetting filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all mt-2 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* File Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFiles.map(file => {
              const isMaster = file.fileName === 'import_all_leads.xlsx'
              const isSelected = selectedFileNames.includes(file.fileName)

              return (
                <div 
                  key={file.fileName}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 group relative ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/10'
                      : 'border-slate-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {!isMaster && isAdmin && (
                          <button
                            onClick={() => toggleSelectFile(file.fileName)}
                            className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title={isSelected ? 'Deselect sheet' : 'Select sheet'}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-blue-600" />
                            ) : (
                              <Square size={18} className="text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        )}
                        <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                          <FileSpreadsheet size={20} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {file.dayOfWeek && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                            {file.dayOfWeek}
                          </span>
                        )}
                        {file.agentCount > 0 && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200 flex items-center gap-1">
                            <AlertCircle size={11} /> {file.agentCount} Agent
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={file.fileName}>
                        {file.fileName}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        Batch: <span className="text-slate-700 font-extrabold">{file.batchName}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-bold block text-[9px] uppercase">Total Rows</span>
                        <span className="font-black text-slate-800">{file.totalRows} leads</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block text-[9px] uppercase">File Size</span>
                        <span className="font-black text-slate-800">{formatFileSize(file.sizeBytes)}</span>
                      </div>
                    </div>

                    {/* IMPORT DATE, DAY, AND TIME BADGES */}
                    <div className="pt-2 text-[11px] space-y-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          📅 Imported:
                        </span>
                        <span className="font-extrabold text-slate-800 bg-slate-100/70 px-2 py-0.5 rounded-md">
                          {file.dayOfWeek ? `${file.dayOfWeek}, ` : ''}{formatDateTime(file.importedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          🔄 Last Synced:
                        </span>
                        <span className="font-semibold text-slate-600">
                          {formatDateTime(file.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenPreview(file, leadSearch)}
                      className="flex-1 py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} /> Preview Sheet
                    </button>
                    <a
                      href={file.downloadUrl}
                      download={file.fileName}
                      className="py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} /> Download
                    </a>
                    {!isMaster && isAdmin && (
                      <button
                        onClick={() => promptDeleteFiles([file.fileName])}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                        title="Delete this spreadsheet"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LIVE SPREADSHEET PREVIEW MODAL */}
        {(selectedFile || previewLoading) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-150">
              
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black tracking-tight truncate">{selectedFile?.fileName}</h3>
                    <p className="text-xs text-slate-400 truncate">
                      Batch: <span className="text-slate-200 font-bold">{selectedFile?.batchName}</span> • Imported on <span className="text-emerald-400 font-bold">{selectedFile?.dayOfWeek ? `${selectedFile.dayOfWeek}, ` : ''}{formatDateTime(selectedFile?.importedAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={selectedFile?.fileName || ''}
                    onChange={(e) => {
                      const found = files.find(f => f.fileName === e.target.value)
                      if (found) handleOpenPreview(found)
                    }}
                    className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all cursor-pointer hidden md:block"
                  >
                    {files.map(f => (
                      <option key={f.fileName} value={f.fileName} className="bg-white text-slate-900 font-bold py-1">
                        {f.batchName} ({f.totalRows} leads{f.agentCount > 0 ? ` • ${f.agentCount} Agent` : ''})
                      </option>
                    ))}
                  </select>

                  {previewData?.downloadUrl && (
                    <a
                      href={previewData.downloadUrl}
                      download={selectedFile?.fileName}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
                    >
                      <Download size={14} /> Download XLSX
                    </a>
                  )}
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewData(null); }}
                    className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body / Table Preview */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
                {previewLoading ? (
                  <div className="p-16 text-center space-y-3">
                    <RefreshCw className="animate-spin text-blue-600 mx-auto" size={36} />
                    <p className="text-xs font-bold text-slate-600">Reading spreadsheet cells from server disk...</p>
                  </div>
                ) : previewData ? (
                  <div className="space-y-4">
                    {/* Header Controls inside preview */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search within sheet rows (name, phone, vehicle, agent, city)..."
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                          value={previewSearch}
                          onChange={e => {
                            setPreviewSearch(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                        {previewSearch && (
                          <button
                            onClick={() => setPreviewSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                        {/* Agent Toggle */}
                        {previewData.agentRowsCount > 0 && (
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                            <button
                              onClick={() => setPreviewAgentFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                previewAgentFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              All ({previewData.rows.length})
                            </button>
                            <button
                              onClick={() => setPreviewAgentFilter('agent')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                previewAgentFilter === 'agent' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              <AlertCircle size={11} /> Agent ({previewData.agentRowsCount})
                            </button>
                            <button
                              onClick={() => setPreviewAgentFilter('direct')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                previewAgentFilter === 'direct' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Direct ({previewData.rows.length - previewData.agentRowsCount})
                            </button>
                          </div>
                        )}

                        <span>Filtered: <strong className="text-slate-900">{filteredPreviewRows.length}</strong></span>

                        {/* Rows per page selector */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[11px] text-slate-400 font-semibold">Rows:</span>
                          <select
                            value={rowsPerPage}
                            onChange={e => {
                              const val = e.target.value === 'all' ? 'all' : Number(e.target.value)
                              setRowsPerPage(val)
                              setCurrentPage(1)
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={250}>250</option>
                            <option value="all">All ({previewData.rows.length})</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* ========= MONTHLY FILTER + ASSIGNMENT PANEL ========= */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-blue-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-blue-600" />
                          <span className="text-xs font-black text-slate-800">Filter by Expiry Month:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={expiryMonthFilter}
                            onChange={e => handleExpiryMonthChange(Number(e.target.value))}
                            className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={idx} value={idx}>{name}</option>
                            ))}
                          </select>
                          <select
                            value={expiryYearFilter}
                            onChange={e => {
                              setExpiryYearFilter(Number(e.target.value))
                              if (expiryMonthFilter > 0) {
                                handleExpiryMonthChange(expiryMonthFilter)
                              }
                            }}
                            className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        {expiryMonthFilter > 0 && (
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">
                              {filteredPreviewRows.length} leads in {MONTH_NAMES[expiryMonthFilter]} {expiryYearFilter}
                            </span>
                            <button
                              onClick={() => setShowAssignPanel(!showAssignPanel)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                            >
                              <Users size={14} />
                              {showAssignPanel ? 'Hide Assignment Panel' : 'Assign to Sales Executives'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Executive Selection Panel */}
                      {showAssignPanel && expiryMonthFilter > 0 && (
                        <div className="bg-white rounded-2xl border border-blue-200 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <UserCheck size={16} className="text-indigo-600" />
                              Select Sales Executives for {MONTH_NAMES[expiryMonthFilter]} {expiryYearFilter}
                            </h4>
                            {!execsLoading && (
                              <span className="text-[10px] font-bold text-slate-500">
                                {selectedExecIds.length} of {availableExecs.length} selected
                              </span>
                            )}
                          </div>

                          {execsLoading ? (
                            <div className="flex items-center gap-2 py-4 justify-center">
                              <RefreshCw size={14} className="animate-spin text-blue-500" />
                              <span className="text-xs font-bold text-slate-500">Loading executives...</span>
                            </div>
                          ) : availableExecs.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-3">No active sales executives found.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {availableExecs.map(exec => {
                                const isSelected = selectedExecIds.includes(exec.id)
                                return (
                                  <button
                                    key={exec.id}
                                    onClick={() => {
                                      setSelectedExecIds(prev =>
                                        isSelected ? prev.filter(id => id !== exec.id) : [...prev, exec.id]
                                      )
                                    }}
                                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-xs font-black ${
                                        isSelected ? 'text-indigo-700' : 'text-slate-800'
                                      }`}>
                                        {exec.fullName}
                                      </span>
                                      <div className={`h-5 w-5 rounded-md flex items-center justify-center text-white ${
                                        isSelected ? 'bg-indigo-600' : 'bg-slate-200'
                                      }`}>
                                        {isSelected && <Check size={12} />}
                                      </div>
                                    </div>
                                    <div className="text-[10px] font-semibold text-slate-500 space-y-0.5">
                                      <div>{exec.roleName} • {exec.currentlyAssignedCount} assigned</div>
                                      {exec.isOnExtendedLeave ? (
                                        <span className="text-amber-600 font-bold">⚠️ On Leave ({exec.leaveDays} days this month)</span>
                                      ) : exec.isCurrentlyOnLeave ? (
                                        <span className="text-orange-500 font-bold">🕐 Currently on leave (returns soon)</span>
                                      ) : (
                                        <span className="text-emerald-600 font-bold">✅ Available</span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Assign Button + Result */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                            <div className="text-xs font-semibold text-slate-600">
                              <strong>{filteredPreviewRows.length}</strong> leads will be distributed via round-robin across <strong>{selectedExecIds.length}</strong> executives
                              {selectedExecIds.length > 0 && (
                                <span className="text-blue-600 ml-1">
                                  (~{Math.ceil(filteredPreviewRows.length / selectedExecIds.length)} each)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={handleAssignLeads}
                              disabled={assigning || selectedExecIds.length === 0 || filteredPreviewRows.length === 0}
                              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {assigning ? (
                                <><RefreshCw size={16} className="animate-spin" /> Assigning...</>
                              ) : (
                                <><Users size={16} /> Assign {filteredPreviewRows.length} Leads</>
                              )}
                            </button>
                          </div>

                          {/* Assignment Result */}
                          {assignResult && (
                            <div className={`p-4 rounded-xl border ${
                              assignResult.error
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}>
                              {assignResult.error ? (
                                <p className="text-xs font-bold">❌ {assignResult.error}</p>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm font-black">✅ {assignResult.message}</p>
                                  {assignResult.distribution && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                      {assignResult.distribution.map((d: any) => (
                                        <div key={d.id} className="bg-white p-2 rounded-lg text-xs">
                                          <span className="font-black text-slate-800">{d.name}</span>
                                          <span className="text-emerald-600 font-bold ml-1">→ {d.leadsAssigned} leads</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Scrollable Data Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[58vh] shadow-inner">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-100 sticky top-0 z-10 text-[11px] font-black uppercase tracking-wider">
                            <th className="px-4 py-3 border-b border-slate-700 w-12 text-center">#</th>
                            {previewData.headers.map((header, idx) => (
                              <th 
                                key={idx} 
                                onClick={() => handleSortColumn(idx)}
                                className={`px-4 py-3 border-b border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors ${
                                  header.toLowerCase().trim() === 'agent' ? 'bg-amber-600 text-white font-extrabold' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{header || `Col ${idx + 1}`}</span>
                                  <ArrowUpDown size={11} className="opacity-50" />
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedRows.length === 0 ? (
                            <tr>
                              <td colSpan={previewData.headers.length + 1} className="py-12 text-center text-slate-400 font-semibold">
                                No matching rows found in this spreadsheet.
                              </td>
                            </tr>
                          ) : (
                            paginatedRows.map((row, rIdx) => {
                              const globalRowNumber = rowsPerPage === 'all' ? rIdx + 1 : (currentPage - 1) * (rowsPerPage as number) + rIdx + 1
                              const isAgentRow = previewData.agentColIdx !== -1 && 
                                String(row[previewData.agentColIdx] || '').toLowerCase().trim() === 'agent'

                              return (
                                <tr 
                                  key={rIdx}
                                  className={`transition-colors ${
                                    isAgentRow 
                                      ? 'bg-amber-50/80 hover:bg-amber-100/80 font-bold text-amber-900 border-l-4 border-amber-500' 
                                      : rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-100/60'
                                  }`}
                                >
                                  <td className="px-4 py-3 text-slate-400 font-mono text-[10px] text-center">{globalRowNumber}</td>
                                  {previewData.headers.map((_, cIdx) => {
                                    const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''
                                    const isAgentCell = cIdx === previewData.agentColIdx && val.toLowerCase().trim() === 'agent'

                                    return (
                                      <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                                        {isAgentCell ? (
                                          <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 shadow-sm">
                                            <AlertCircle size={11} /> AGENT
                                          </span>
                                        ) : val ? (
                                          val
                                        ) : (
                                          <span className="text-slate-300 italic text-[10px]">—</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalFilteredRows > 0 && rowsPerPage !== 'all' && totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-bold text-slate-600">
                        <span>
                          Showing rows <strong className="text-slate-900">{startRowIdx}</strong> to <strong className="text-slate-900">{endRowIdx}</strong> of <strong className="text-slate-900">{totalFilteredRows}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-800">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" /> Loaded directly from server storage (`public/uploads/imports`)
                </span>
                <button
                  onClick={() => { setSelectedFile(null); setPreviewData(null); }}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>

            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in duration-150">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Delete {filesToDelete.length === 1 ? 'Spreadsheet' : `${filesToDelete.length} Spreadsheets`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This action will permanently delete the selected file(s).
                  </p>
                </div>
              </div>

              {/* List of files being deleted */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1 text-xs">
                {filesToDelete.map((fn, idx) => (
                  <div key={fn} className="flex items-center gap-2 text-slate-700 font-semibold truncate">
                    <span className="text-slate-400 text-[10px] font-mono">{idx + 1}.</span>
                    <span className="truncate">{fn}</span>
                  </div>
                ))}
              </div>

              {/* Option to also delete leads from DB */}
              <label className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAssociatedLeads}
                  onChange={e => setDeleteAssociatedLeads(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black text-amber-900 block">
                    Also delete associated leads from database
                  </span>
                  <span className="text-amber-700 text-[11px] block mt-0.5 leading-snug">
                    Removes all lead records, call logs, and assignments imported in this batch.
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setDeleteModalOpen(false); setFilesToDelete([]); }}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteFiles}
                  disabled={isDeleting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
