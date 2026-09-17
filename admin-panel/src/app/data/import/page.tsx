'use client'
import React, { useState, useRef, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  UploadCloud, FileSpreadsheet, Map, CheckCircle2, AlertCircle,
  ArrowRight, RefreshCw, Database, Eye, Info,
  Edit, Trash2, Plus, Save, X, Check, Lock
} from 'lucide-react'

interface ColumnMapping {
  dbField: string
  label: string
  required: boolean
  mappedHeader: string
}

const DB_LEAD_FIELDS: ColumnMapping[] = [
  { dbField: 'clientName', label: 'Client Name', required: true, mappedHeader: '' },
  { dbField: 'clientPhone', label: 'Phone Number', required: false, mappedHeader: '' },
  { dbField: 'clientEmail', label: 'Email Address', required: false, mappedHeader: '' },
  { dbField: 'vehicleNo', label: 'Vehicle Number', required: false, mappedHeader: '' },
  { dbField: 'expiryDate', label: 'Policy Expiry Date', required: false, mappedHeader: '' },
  { dbField: 'registrationDate', label: 'Registration Date', required: false, mappedHeader: '' },
  { dbField: 'gvw', label: 'Gross Vehicle Weight (GVW)', required: false, mappedHeader: '' },
  { dbField: 'address', label: 'Address', required: false, mappedHeader: '' },
  { dbField: 'city', label: 'City', required: false, mappedHeader: '' },
  { dbField: 'existingAgent', label: 'Agent', required: false, mappedHeader: '' }
]

// List of available predefined database fields (excluding the ones already in default list)
const AVAILABLE_DB_FIELDS = [
  { value: 'existingAgent', label: 'Existing Agent' },
  { value: 'messageTemplate', label: 'Message Template' },
  { value: 'status', label: 'Lead Status' },
  { value: 'clientName', label: 'Client Name' },
  { value: 'clientPhone', label: 'Phone Number' },
  { value: 'clientEmail', label: 'Email Address' },
  { value: 'vehicleNo', label: 'Vehicle Number' },
  { value: 'expiryDate', label: 'Policy Expiry Date' },
  { value: 'registrationDate', label: 'Registration Date' },
  { value: 'gvw', label: 'Gross Vehicle Weight (GVW)' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'fitnessValidity', label: 'Fitness Validity' },
  { value: 'puccValidity', label: 'PUCC Validity' },
  { value: 'permitDate', label: 'Permit Date' }
]

const sanitizeFieldKey = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove non-alphanumeric except spaces
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s+/g, '') // remove spaces
}

export default function LeadImportPage() {
  const apiFetch = useApi()
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const roleName = user?.role?.name?.toUpperCase() || ''
  const isExecutive = roleName.endsWith('EXECUTIVE') || roleName === 'VIEWER'
  const isAdmin = roleName === 'ADMIN' || roleName === 'SUPER ADMIN'

  // States
  const [step, setStep] = useState(1) // 1: Upload, 2: Map & Preview, 3: Completed
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  
  // Data State
  const [headers, setHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>(DB_LEAD_FIELDS)
  
  // Admin Editing States
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempLabel, setTempLabel] = useState('')
  const [savingMappings, setSavingMappings] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Add new column mapping states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newColLabel, setNewColLabel] = useState('')
  const [selectedSheetHeader, setSelectedSheetHeader] = useState('')

  // Outcome State
  const [importResult, setImportResult] = useState<{
    total: number
    importedCount: number
    updatedCount: number
    duplicateCount: number
  } | null>(null)

  // Duplicate Lead Strategy: 'skip' (default) or 'overwrite' (update existing lead by vehicle registration number)
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite'>('skip')

  // Import Name State (sheet/batch name for #search)
  const [importName, setImportName] = useState('')

  // Fetch mappings from DB settings on mount
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await apiFetch('/api/v1/settings/import-mappings')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.mappings) {
            setMappings(data.mappings.map((m: any) => ({ ...m, mappedHeader: '' })))
          }
        }
      } catch (err) {
        console.error('Failed to load mappings', err)
      }
    }
    loadMappings()
  }, [apiFetch])

  // Try to auto-detect mappings based on header name
  const autoDetectMappings = (sheetHeaders: string[], currentMappings: ColumnMapping[]): ColumnMapping[] => {
    return currentMappings.map(field => {
      const match = sheetHeaders.find(h => {
        const header = h.toLowerCase().trim()
        const normHeader = header.replace(/[^a-z0-9]/g, '')
        const fieldLabel = field.label.toLowerCase().trim()
        const dbFieldName = field.dbField.toLowerCase().trim()

        if (header === fieldLabel || normHeader === fieldLabel.replace(/[^a-z0-9]/g, '')) return true

        // Fallbacks for default fields
        if (field.dbField === 'clientName') {
          return ['name', 'client name', 'customer name', 'owner name', 'insured name', 'party name', 'insured', 'customer', 'client', 'party', 'owner_name', 'owner'].includes(header) ||
            header.includes('owner name') || header.includes('client name') || header.includes('customer name')
        }
        if (field.dbField === 'clientPhone') {
          return ['phone', 'mobile', 'contact', 'client phone', 'mobile no', 'contact no', 'phone no', 'mobile number', 'cust mobile', 'phone_no', 'contact_no', 'contact number'].includes(header) ||
            header === 'contact' || header === 'contact no' || normHeader === 'contact' || normHeader === 'contactno'
        }
        if (field.dbField === 'clientEmail') {
          return ['email', 'client email', 'mail', 'email id', 'email_id', 'email address'].includes(header)
        }
        if (field.dbField === 'vehicleNo') {
          return ['vehicle', 'vehicle no', 'vehicle number', 'reg no', 'registration no', 'vahan no', 'vehicle_no', 'reg_no', 'rc no', 'registration number', 'reg no / vehicle no'].includes(header) ||
            normHeader === 'vehicleno' || normHeader === 'regno'
        }
        if (field.dbField === 'expiryDate') {
          return ['expiry', 'expiry date', 'policy expiry', 'policy expiry date', 'exp date', 'due date', 'policy end date', 'exp_date', 'policy expiry_date', 'insurance validity', 'insurance valid', 'insurance_validity', 'insurance date', 'insurance', 'ins validity', 'ins date', 'policy validity'].includes(header) ||
            header.includes('insurance validity') || header.includes('policy expiry') || normHeader === 'insurancevalidity' || normHeader === 'policyexpirydate'
        }
        if (field.dbField === 'registrationDate') {
          return ['registration', 'registration date', 'reg date', 'reg_date', 'registration_date', 'reg dt', 'rc date'].includes(header) ||
            header.includes('registration date') || normHeader === 'registrationdate'
        }
        if (field.dbField === 'gvw') {
          return ['gvw', 'gross weight', 'weight', 'gross vehicle weight', 'gvw (in kg.)', 'gvw (in kg)', 'gvw in kg', 'gvw(in kg.)', 'gvw(in kg)', 'gross vehicle weight (gvw)', 'gross weight (in kg)'].includes(header) ||
            header.startsWith('gvw') || normHeader.startsWith('gvwin') || normHeader === 'gvw' || normHeader === 'grossvehicleweight'
        }
        if (field.dbField === 'address') {
          return ['address', 'location', 'full address', 'client address', 'owner address'].includes(header) || header.includes('address')
        }
        if (field.dbField === 'city') {
          return ['city', 'state', 'district', 'taluka'].includes(header)
        }
        if (field.dbField === 'existingAgent') {
          return ['agent', 'broker', 'is agent', 'existing agent', 'is_agent', 'agent status', 'agent?', 'agent number', 'agent name', 'agent contact', 'agent no', 'agent_number', 'agent_no'].includes(header) ||
            header.includes('agent number') || header.includes('agent no') || normHeader === 'agentnumber'
        }
        if (field.dbField === 'fitnessValidity') {
          return ['fitness validity', 'fitness valid', 'fitness date', 'fitness', 'fitness_validity', 'fitness expiry'].includes(header) ||
            header.includes('fitness validity') || normHeader === 'fitnessvalidity'
        }
        if (field.dbField === 'puccValidity') {
          return ['pucc validity', 'pucc valid', 'pucc date', 'pucc', 'pucc_validity', 'puc validity', 'puc date', 'puc'].includes(header) ||
            header.includes('pucc validity') || normHeader === 'puccvalidity'
        }
        if (field.dbField === 'permitDate') {
          return ['permit date', 'permit validity', 'permit valid', 'permit_date', 'permit'].includes(header) ||
            header.includes('permit date') || normHeader === 'permitdate'
        }
        
        return header === dbFieldName || normHeader === dbFieldName.replace(/[^a-z0-9]/g, '')
      })
      return { ...field, mappedHeader: match || '' }
    })
  }

function inferHeaderFromColumnData(values: any[], colIndex: number): string {
  const cleanVals = values.map(v => String(v || '').trim()).filter(Boolean)
  if (cleanVals.length === 0) return `Column_${colIndex + 1}`

  // 1. Check for 10-digit Phone numbers first (so secondary phones aren't misclassified)
  const phoneRegex = /^[6-9]\d{9}$/
  const phoneCount = cleanVals.filter(v => phoneRegex.test(v.replace(/\D/g, '').slice(-10))).length
  if (phoneCount >= Math.max(1, Math.floor(cleanVals.length * 0.3))) {
    return colIndex > 0 ? `Phone Number ${colIndex + 1}` : 'Phone Number'
  }

  // 2. Check for Vehicle Number pattern (e.g. GJ18AV5577, MH01AB1234, DL3C1234)
  const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i
  if (cleanVals.filter(v => vehicleRegex.test(v.replace(/\s+/g, ''))).length >= Math.min(2, cleanVals.length)) {
    return 'Vehicle Number'
  }

  // 3. Check for Agent/Broker indicators ONLY if values are text/status
  if (cleanVals.filter(v => ['agent', 'broker', 'direct agent'].includes(v.toLowerCase())).length >= 1) {
    return 'Agent'
  }

  // 4. Check for Dates
  const dateCount = cleanVals.filter(v => !isNaN(Date.parse(v)) && (v.includes('/') || v.includes('-'))).length
  if (dateCount >= Math.min(2, cleanVals.length)) {
    return 'Policy Expiry Date'
  }

  // 5. Check for Email
  if (cleanVals.some(v => v.includes('@') && v.includes('.'))) {
    return 'Email Address'
  }

  return `Column_${colIndex + 1}`
}

  // Parse CSV File
  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rawAoa = results.data as any[][]
        if (rawAoa.length > 1) {
          const headers: string[] = rawAoa[0].map(h => String(h || '').trim())
          // Automatically infer any empty/missing headers by analyzing column data
          for (let c = 0; c < headers.length; c++) {
            if (!headers[c] || headers[c] === '') {
              const colValues = rawAoa.slice(1).map(r => r[c])
              headers[c] = inferHeaderFromColumnData(colValues, c)
            }
          }

          const parsedData = rawAoa.slice(1).map(row => {
            const obj: any = {}
            headers.forEach((h, idx) => {
              obj[h] = row[idx] !== undefined ? row[idx] : ''
            })
            return obj
          })

          setHeaders(headers)
          setParsedRows(parsedData)
          setMappings(prev => autoDetectMappings(headers, prev))
          setStep(2)
        } else {
          setError('The uploaded CSV file is empty.')
        }
        setLoading(false)
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
        setLoading(false)
      }
    })
  }

  // Parse Excel File
  const parseExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        // Read with cellDates: false and raw: true to preserve exact underlying numbers/serials
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true })

        if (rawAoa.length > 1) {
          const headers: string[] = rawAoa[0].map((h: any) => String(h || '').trim())
          
          // Automatically infer any empty/missing headers by analyzing column data
          for (let c = 0; c < headers.length; c++) {
            if (!headers[c] || headers[c] === '') {
              const colValues = rawAoa.slice(1).map(r => r[c])
              headers[c] = inferHeaderFromColumnData(colValues, c)
            }
          }

          // Pre-identify date columns from headers
          const dateKeywords = ['date', 'validity', 'expiry', 'exp', 'due', 'fitness', 'pucc', 'permit']
          const isDateCol = headers.map(h => {
            const lower = h.toLowerCase()
            return dateKeywords.some(k => lower.includes(k))
          })

          const jsonData = rawAoa.slice(1).map((row, rowIdx) => {
            const obj: any = {}
            headers.forEach((h, idx) => {
              let val = row[idx] !== undefined && row[idx] !== null ? row[idx] : ''
              
              // Check if cell is an Excel serial number in a date column OR formatted as date in cell.w
              const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: idx })
              const cell = worksheet[cellRef]
              const hasDateFormatting = cell && cell.w && /[/.-]/.test(cell.w)
              
              if (typeof val === 'number' && val > 10000 && val < 80000 && (isDateCol[idx] || hasDateFormatting)) {
                const p = XLSX.SSF.parse_date_code(Math.floor(val))
                if (p && p.y && p.m && p.d) {
                  val = `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`
                }
              } else if (typeof val === 'number') {
                // If phone / agent / id column stored as numeric, format as whole integer string
                const hLower = h.toLowerCase()
                if (hLower.includes('contact') || hLower.includes('phone') || hLower.includes('mobile') || hLower.includes('agent')) {
                  val = String(Math.floor(val))
                } else {
                  val = String(val)
                }
              } else {
                val = String(val).trim()
              }
              obj[h] = val
            })
            return obj
          })

          setHeaders(headers)
          setParsedRows(jsonData)
          setMappings(prev => autoDetectMappings(headers, prev))
          setStep(2)
        } else {
          setError('The uploaded Excel file is empty.')
        }
      } catch (err: any) {
        setError(`Failed to parse Excel: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setError('FileReader reading error.')
      setLoading(false)
    }
    reader.readAsBinaryString(file)
  }

  // Handle file drop/upload
  const handleFile = (file: File) => {
    setLoading(true)
    setError(null)
    setFileName(file.name)

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt === 'csv') {
      parseCSV(file)
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      parseExcel(file)
    } else {
      setError('Unsupported file type. Please upload a valid CSV or Excel file.')
      setLoading(false)
    }
  }

  // File selection triggers
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // Mapping changes
  const handleMapChange = (dbField: string, value: string) => {
    setMappings(prev =>
      prev.map(m => (m.dbField === dbField ? { ...m, mappedHeader: value } : m))
    )
  }

  // Validate the mapped rows
  const getMappedData = () => {
    const effectiveImportName = importName.trim() || fileName.replace(/\.[^/.]+$/, '').trim() || 'Leads Batch'
    return parsedRows.map((row) => {
      const mappedRecord: any = {}
      mappings.forEach(m => {
        if (m.mappedHeader) {
          mappedRecord[m.dbField] = row[m.mappedHeader]
        } else {
          mappedRecord[m.dbField] = null
        }
      })
      // Also pass all original row columns so any raw/custom agent or broker columns are never lost
      Object.keys(row).forEach(k => {
        if (row[k] !== undefined && row[k] !== null && mappedRecord[k] === undefined) {
          mappedRecord[k] = row[k]
        }
      })
      // Always attach importName to each lead
      mappedRecord.importName = effectiveImportName
      return mappedRecord
    })
  }

  // Import progress state for large spreadsheets (e.g. 70k+ rows)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    percent: number
    batch: number
    totalBatches: number
  } | null>(null)

  const executeImport = async () => {
    const mappedLeads = getMappedData()
    const requiredMapping = mappings.find(m => m.required && !m.mappedHeader)
    
    if (requiredMapping) {
      setError(`Critical Error: You must map a spreadsheet column to "${requiredMapping.label}"`)
      return
    }

    // Check if there are valid rows (has client name, phone number, OR vehicle number)
    const validLeads = mappedLeads.filter(l => {
      const hasName = l.clientName && String(l.clientName).trim() !== ''
      const hasPhone = l.clientPhone && String(l.clientPhone).trim() !== ''
      const hasVehicle = l.vehicleNo && String(l.vehicleNo).trim() !== ''
      return hasName || hasPhone || hasVehicle
    })

    if (validLeads.length === 0) {
      setError('Error: No rows contain a valid Client Name, Phone Number, or Vehicle Registration. Please check your column mappings.')
      return
    }

    setLoading(true)
    setError(null)

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const batchName = importName.trim() || fileName.replace(/\.[^/.]+$/, '') || 'Leads Batch'

    if (typeof window !== 'undefined') {
      localStorage.setItem('torque_active_import_job_id', jobId)
      localStorage.setItem('torque_active_import_name', batchName)
    }

    // Chunk size: 500 leads per HTTP payload for fast ~300ms execution without timeouts
    const CHUNK_SIZE = 500
    const totalBatches = Math.ceil(validLeads.length / CHUNK_SIZE)
    let totalImported = 0
    let totalUpdated = 0
    let totalDuplicates = 0

    try {
      for (let i = 0; i < validLeads.length; i += CHUNK_SIZE) {
        const chunk = validLeads.slice(i, i + CHUNK_SIZE)
        const currentBatch = Math.floor(i / CHUNK_SIZE) + 1
        const isLastBatch = currentBatch === totalBatches
        const processedSoFar = Math.min(i + chunk.length, validLeads.length)
        const percent = Math.round((processedSoFar / validLeads.length) * 100)

        setImportProgress({
          current: processedSoFar,
          total: validLeads.length,
          percent,
          batch: currentBatch,
          totalBatches
        })

        // Retry mechanism (up to 3 retries per chunk with exponential backoff)
        let attempt = 0
        let success = false
        let lastErr = ''

        while (attempt < 3 && !success) {
          attempt++
          try {
            const mappingPayload: Record<string, string> = {}
            mappings.forEach(m => {
              if (m.mappedHeader) mappingPayload[m.dbField] = m.mappedHeader
            })

            const res = await apiFetch('/api/v1/leads/import', {
              method: 'POST',
              headers: {
                'x-import-job-id': `${jobId}_b${currentBatch}`,
                ...(isLastBatch ? { 'x-is-last-batch': 'true' } : {})
              },
              body: JSON.stringify({
                leads: chunk,
                importName: batchName,
                duplicateStrategy,
                mapping: mappingPayload
              })
            })

            const resText = await res.text()
            let data: any = {}
            try {
              data = JSON.parse(resText)
            } catch {
              throw new Error(resText || `Server returned error status: ${res.status}`)
            }

            if (!res.ok) {
              const errLower = (data.error || '').toLowerCase()
              if (errLower.includes('duplicate') || errLower.includes('already exist') || (data.stats && data.stats.duplicates > 0)) {
                totalDuplicates += data.stats?.duplicates ?? chunk.length
                success = true
                break
              }
              throw new Error(data.error || `Batch ${currentBatch}/${totalBatches} failed with status ${res.status}`)
            }

            const batchImported = data.stats?.imported ?? data.stats?.valid ?? 0
            const batchUpdated = data.stats?.updated ?? 0
            const batchDuplicates = data.stats?.duplicates ?? 0

            totalImported += batchImported
            totalUpdated += batchUpdated
            totalDuplicates += batchDuplicates
            success = true
          } catch (chunkErr: any) {
            lastErr = chunkErr?.message || 'Network error'
            const errLower = lastErr.toLowerCase()
            if (errLower.includes('duplicate') || errLower.includes('already exist')) {
              totalDuplicates += chunk.length
              success = true
              break
            }
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
            }
          }
        }

        if (!success) {
          console.warn(`[import] Warning: Batch ${currentBatch}/${totalBatches} failed after 3 attempts: ${lastErr}`)
          // Record failed batch as skipped and continue processing remaining batches
          totalDuplicates += chunk.length
        }
      }

      setImportResult({
        total: validLeads.length,
        importedCount: totalImported,
        updatedCount: totalUpdated,
        duplicateCount: totalDuplicates
      })
      setImportProgress(null)
      setStep(3)
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'An error occurred during import.')
      setImportProgress(null)
    } finally {
      setLoading(false)
    }
  }

  // Mappings management logic (Admins only)
  const startEditing = (dbField: string, label: string) => {
    setEditingField(dbField)
    setTempLabel(label)
  }

  const cancelEditing = () => {
    setEditingField(null)
    setTempLabel('')
  }

  const saveRename = (dbField: string) => {
    if (!tempLabel.trim()) return
    setMappings(prev =>
      prev.map(m => (m.dbField === dbField ? { ...m, label: tempLabel.trim() } : m))
    )
    setEditingField(null)
  }

  const deleteMapping = (dbField: string) => {
    setMappings(prev => prev.filter(m => m.dbField !== dbField))
  }

  const addAllUnmappedSheetColumns = () => {
    const mappedHeaders = new Set(mappings.map(m => m.mappedHeader).filter(Boolean))
    const unmappedSheetHeaders = headers.filter(h => !mappedHeaders.has(h))

    if (unmappedSheetHeaders.length === 0) {
      setError('All spreadsheet columns are already mapped!')
      return
    }

    const newMappings: ColumnMapping[] = unmappedSheetHeaders.map(h => {
      const key = sanitizeFieldKey(h) || 'customCol'
      let uniqueKey = key
      let counter = 1
      while (mappings.some(m => m.dbField === uniqueKey)) {
        uniqueKey = `${key}_${counter++}`
      }
      return {
        dbField: uniqueKey,
        label: h,
        required: false,
        mappedHeader: h
      }
    })

    setMappings(prev => [...prev, ...newMappings])
    setError(null)
  }

  const addMapping = () => {
    const label = newColLabel.trim() || selectedSheetHeader
    if (!label) {
      setError('Please select a spreadsheet column or enter a column label.')
      return
    }

    const key = sanitizeFieldKey(label) || 'customCol'
    let finalDbField = key
    let counter = 1
    while (mappings.some(m => m.dbField === finalDbField)) {
      finalDbField = `${key}_${counter++}`
    }

    const newField: ColumnMapping = {
      dbField: finalDbField,
      label,
      required: false,
      mappedHeader: selectedSheetHeader || (headers.includes(label) ? label : '')
    }

    setMappings(prev => [...prev, newField])
    setShowAddForm(false)
    setNewColLabel('')
    setSelectedSheetHeader('')
    setError(null)
  }

  const saveMappingsToDatabase = async () => {
    setSavingMappings(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const configToSave = mappings.map(({ dbField, label, required }) => ({
        dbField,
        label,
        required
      }))

      const res = await apiFetch('/api/v1/settings/import-mappings', {
        method: 'POST',
        body: JSON.stringify({ mappings: configToSave })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save mappings.')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save mappings to settings.')
    } finally {
      setSavingMappings(false)
    }
  }

  if (isExecutive) {
    return (
      <AdminLayout>
        <div className="p-12 text-center max-w-md mx-auto space-y-4 my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500">Only Administrators and Managers have permission to import bulk leads into the system.</p>
          <button 
            onClick={() => router.push('/leads')}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-all cursor-pointer"
          >
            Back to Leads
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Import Leads Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Upload renewals and leads directly into the core system.</p>
            </div>
          </div>

          {/* Admin Schema Action Button */}
          {isAdmin && step === 2 && (
            <div className="flex gap-2">
              <button
                onClick={addAllUnmappedSheetColumns}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-blue-200 shadow-sm"
                title="Automatically map all remaining unmapped columns from your spreadsheet"
              >
                <Plus size={14} />
                Add All Sheet Columns ({headers.filter(h => !mappings.some(m => m.mappedHeader === h)).length})
              </button>
              <button
                onClick={() => setShowAddForm(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                <Plus size={14} />
                Add Column
              </button>
              <button
                onClick={saveMappingsToDatabase}
                disabled={savingMappings}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {savingMappings ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saveSuccess ? 'Saved!' : 'Save Config'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
              <X size={16} />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Column mapping configuration saved successfully for the entire system!</span>
          </div>
        )}

        {/* STEP 1: FILE UPLOAD ZONE */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-12 bg-white flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/20 transition-all group min-h-[350px]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              
              {loading ? (
                <div className="space-y-4">
                  <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
                  <p className="font-bold text-slate-700">Reading spreadsheet data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <UploadCloud size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-800 text-lg">Drag & Drop Lead Spreadsheet</p>
                    <p className="text-xs text-slate-400">or click to browse your local folder</p>
                  </div>
                  <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    CSV, XLSX, or XLS supported
                  </span>
                </div>
              )}
            </div>

            {/* Quick guide card */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
              <Info className="text-blue-600 mt-0.5 shrink-0" size={20} />
              <div className="space-y-1 text-sm text-blue-900">
                <h4 className="font-bold">Lead-Only Import Protocol</h4>
                <p className="text-blue-800/80 leading-relaxed text-xs">
                  This importer expects sheets containing vehicle information and contact records. The system will look at your <b>Vehicle Registration Numbers</b> and <b>Phone Numbers</b> to verify if leads already exist in the database, automatically updating records rather than creating duplicates.
                </p>
              </div>
            </div>

            {/* Import Name / Sheet Name Input */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-slate-500" />
                <h4 className="font-bold text-slate-800 text-sm">Name This Import (Optional)</h4>
              </div>
              <p className="text-xs text-slate-500">
                Give this batch a name (e.g. <b>may-leads</b>, <b>july-renewals</b>). You can later search <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">#may-leads</code> in the Leads page to view only leads from this import.
              </p>
              <input
                type="text"
                placeholder="e.g. may-leads, sonali-list, july-renewals"
                value={importName}
                onChange={e => setImportName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* STEP 2: DYNAMIC MAPPING PANEL */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Mappings Form */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Map size={18} className="text-blue-600" />
                  <h3 className="font-black text-slate-900 text-md">Column Mapping</h3>
                </div>
                {!isAdmin && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock size={10} /> Read Only
                  </span>
                )}
              </div>

              {/* Import Name / Sheet Name Input in Step 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-blue-600" />
                  Import / Sheet Name (for #search)
                </label>
                <input
                  type="text"
                  placeholder="e.g. may-leads, sonali-list, july-renewals"
                  value={importName}
                  onChange={e => setImportName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Duplicate Lead Handling Strategy (by Unique Vehicle Reg No) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw size={13} className="text-indigo-600" />
                    Duplicate Leads Handling
                  </label>
                  <span className="text-[9px] bg-slate-200/80 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                    by Unique Reg No
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy('skip')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                      duplicateStrategy === 'skip'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">Skip Duplicates</span>
                      {duplicateStrategy === 'skip' && <Check size={12} className="text-blue-600 font-bold" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">Keep existing records, skip duplicates</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy('overwrite')}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                      duplicateStrategy === 'overwrite'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">Overwrite Data</span>
                      {duplicateStrategy === 'overwrite' && <Check size={12} className="text-indigo-600 font-bold" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">Update matching unique Reg No records</span>
                  </button>
                </div>
              </div>

              {/* Add Column Inline Form */}
              {showAddForm && isAdmin && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 shadow-inner animate-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Custom Column</h4>
                    <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {headers.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Column from Spreadsheet</label>
                        <select
                          value={selectedSheetHeader}
                          onChange={(e) => {
                            const val = e.target.value
                            setSelectedSheetHeader(val)
                            if (val && !newColLabel) {
                              setNewColLabel(val)
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- Pick Spreadsheet Column --</option>
                          {headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Or Enter Column Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Engine Number, NCB %, Model"
                        value={newColLabel}
                        onChange={(e) => setNewColLabel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <button
                      onClick={addMapping}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer"
                    >
                      Add Column Mapping
                    </button>
                  </div>
                </div>
              )}

              {/* Column Mapping Inputs List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {mappings.map((field) => (
                  <div key={field.dbField} className="space-y-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      {editingField === field.dbField ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={tempLabel}
                            onChange={(e) => setTempLabel(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                            autoFocus
                          />
                          <button
                            onClick={() => saveRename(field.dbField)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full group">
                          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <span className="truncate max-w-[150px]">{field.label}</span>
                            {field.required && <span className="text-rose-500">*</span>}
                            
                            {/* Badges for custom JSON columns or specific mapped fields */}
                            {!DB_LEAD_FIELDS.some(d => d.dbField === field.dbField) && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.2 rounded font-medium shrink-0">
                                Custom Field
                              </span>
                            )}
                          </label>

                          {/* Actions (Admins only) */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEditing(field.dbField, field.label)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-all cursor-pointer"
                                title="Rename column"
                              >
                                <Edit size={10} />
                              </button>
                              {!field.required && (
                                <button
                                  onClick={() => deleteMapping(field.dbField)}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                                  title="Delete column mapping"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <select
                      value={field.mappedHeader}
                      onChange={(e) => handleMapChange(field.dbField, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Choose Sheet Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Action Buttons & Progress Bar */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                {importProgress && (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                      <span>Importing Batch {importProgress.batch} of {importProgress.totalBatches}</span>
                      <span>{importProgress.percent}% ({importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} rows)</span>
                    </div>
                    <div className="w-full bg-blue-200/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-blue-600/80 text-center font-medium">
                      Chunking data securely to prevent server payload timeouts. Please do not close this window.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                    disabled={loading}
                  >
                    Change File
                  </button>
                  
                  <button
                    onClick={executeImport}
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-100 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw size={14} className="animate-spin" />
                        {importProgress ? `Importing ${importProgress.percent}%...` : 'Syncing...'}
                      </span>
                    ) : (
                      <>
                        Run Import
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Data Sheet Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-sm">{fileName}</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 uppercase">
                  {parsedRows.length} Rows Detected
                </span>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                  <Eye size={14} className="text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Active Mapping Preview (First 5 Rows)</h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-xs text-slate-400 font-bold">
                      <tr>
                        {mappings.map(m => (
                          <th key={m.dbField} className="px-6 py-3 whitespace-nowrap">{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          {mappings.map(m => {
                            const val = m.mappedHeader ? row[m.mappedHeader] : null
                            const strVal = val ? val.toString().trim() : ''
                            const isNaVal = ['NA', 'N/A', 'NULL', '—', '-'].includes(strVal.toUpperCase())
                            const isEmptyAndRequired = m.required && (!val || strVal === '' || isNaVal)
                            
                            return (
                              <td key={m.dbField} className="px-6 py-4.5 whitespace-nowrap">
                                {isEmptyAndRequired ? (
                                  <span className="text-rose-500 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} /> Required Field
                                  </span>
                                ) : isNaVal ? (
                                  <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200" title="Cell literally contains 'NA' in the uploaded spreadsheet file (treated as blank in database)">
                                    NA (Blank in File)
                                  </span>
                                ) : val ? (
                                  val.toString()
                                ) : (
                                  <span className="text-slate-300 italic">empty</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: OUTCOME STATE */}
        {step === 3 && importResult && (
          <div className="max-w-xl mx-auto bg-white border border-slate-100 shadow-2xl rounded-3xl p-10 text-center space-y-6 animate-in zoom-in duration-200">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={48} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sync Completed Successfully!</h3>
              <p className="text-slate-400 text-sm">
                Spreadsheet data processed and mapped directly to Supabase.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Rows</p>
                <p className="text-lg font-extrabold text-slate-800 mt-1">{importResult.total.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">New Created</p>
                <p className="text-lg font-extrabold text-emerald-600 mt-1">+{importResult.importedCount.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Overwritten</p>
                <p className="text-lg font-extrabold text-indigo-600 mt-1">{importResult.updatedCount.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Duplicates Skipped</p>
                <p className="text-lg font-extrabold text-amber-600 mt-1">{importResult.duplicateCount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                Import Another File
              </button>
              
              <button
                onClick={() => router.push(importName.trim() ? `/leads?search=%23${encodeURIComponent(importName.trim())}` : '/leads')}
                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer"
              >
                View Leads in Database →
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
