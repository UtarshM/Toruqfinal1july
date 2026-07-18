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
  { dbField: 'registrationDate', label: 'REG NO', required: false, mappedHeader: '' },
  { dbField: 'gvw', label: 'Gross Vehicle Weight (GVW)', required: false, mappedHeader: '' },
  { dbField: 'address', label: 'Address', required: false, mappedHeader: '' },
  { dbField: 'city', label: 'City', required: false, mappedHeader: '' }
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
  { value: 'city', label: 'City' }
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

  const isAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'SUPER ADMIN'

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
  const [newColDbField, setNewColDbField] = useState('custom')
  const [newColCustomKey, setNewColCustomKey] = useState('')

  // Outcome State
  const [importResult, setImportResult] = useState<{
    total: number
    importedCount: number
    updatedCount: number
  } | null>(null)

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
        const fieldLabel = field.label.toLowerCase().trim()
        const dbFieldName = field.dbField.toLowerCase().trim()

        if (header === fieldLabel) return true

        // Fallbacks for default fields
        if (field.dbField === 'clientName') return header === 'name' || header === 'client name' || header === 'customer name'
        if (field.dbField === 'clientPhone') return header === 'phone' || header === 'mobile' || header === 'contact' || header === 'client phone'
        if (field.dbField === 'clientEmail') return header === 'email' || header === 'client email' || header === 'mail'
        if (field.dbField === 'vehicleNo') return header === 'vehicle' || header === 'vehicle no' || header === 'vehicle number' || header === 'reg no'
        if (field.dbField === 'expiryDate') return header === 'expiry' || header === 'expiry date' || header === 'policy expiry'
        if (field.dbField === 'registrationDate') return header === 'registration' || header === 'registration date' || header === 'reg date'
        if (field.dbField === 'gvw') return header === 'gvw' || header === 'gross weight' || header === 'weight'
        if (field.dbField === 'address') return header === 'address' || header === 'location'
        if (field.dbField === 'city') return header === 'city'
        
        return header === dbFieldName
      })
      return { ...field, mappedHeader: match || '' }
    })
  }

  // Parse CSV File
  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const sheetHeaders = Object.keys(results.data[0] as object)
          setHeaders(sheetHeaders)
          setParsedRows(results.data)
          setMappings(prev => autoDetectMappings(sheetHeaders, prev))
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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (jsonData.length > 0) {
          const sheetHeaders = Object.keys(jsonData[0] as object)
          setHeaders(sheetHeaders)
          setParsedRows(jsonData)
          setMappings(prev => autoDetectMappings(sheetHeaders, prev))
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
    return parsedRows.map((row) => {
      const mappedRecord: any = {}
      mappings.forEach(m => {
        if (m.mappedHeader) {
          mappedRecord[m.dbField] = row[m.mappedHeader]
        } else {
          mappedRecord[m.dbField] = null
        }
      })
      return mappedRecord
    })
  }

  const executeImport = async () => {
    const mappedLeads = getMappedData()
    const requiredMapping = mappings.find(m => m.required && !m.mappedHeader)
    
    if (requiredMapping) {
      setError(`Critical Error: You must map a spreadsheet column to "${requiredMapping.label}"`)
      return
    }

    // Check if there are valid rows
    const validLeads = mappedLeads.filter(l => l.clientName && l.clientName.trim() !== '')
    if (validLeads.length === 0) {
      setError('Error: No rows contain a valid Client Name. Check your mapping.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch('/api/v1/import', {
        method: 'POST',
        body: JSON.stringify({ leads: validLeads })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Import transaction failed.')
      }

      setImportResult({
        total: validLeads.length,
        importedCount: data.importedCount,
        updatedCount: data.updatedCount
      })
      setStep(3)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during import.')
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

  const addMapping = () => {
    if (!newColLabel.trim()) {
      setError('Please enter a column label.')
      return
    }

    let finalDbField = newColDbField
    if (newColDbField === 'custom') {
      const sanitized = newColCustomKey.trim() || sanitizeFieldKey(newColLabel)
      if (!sanitized) {
        setError('Invalid custom field key.')
        return
      }
      finalDbField = sanitized
    }

    if (mappings.some(m => m.dbField === finalDbField)) {
      setError(`A mapping for database field "${finalDbField}" already exists.`)
      return
    }

    const newField: ColumnMapping = {
      dbField: finalDbField,
      label: newColLabel.trim(),
      required: false,
      mappedHeader: ''
    }

    setMappings(prev => [...prev, newField])
    setShowAddForm(false)
    setNewColLabel('')
    setNewColDbField('custom')
    setNewColCustomKey('')
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Engine Number"
                        value={newColLabel}
                        onChange={(e) => setNewColLabel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DB Property Type</label>
                      <select
                        value={newColDbField}
                        onChange={(e) => setNewColDbField(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="custom">-- Custom Field (JSON metadata) --</option>
                        {AVAILABLE_DB_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
                        ))}
                      </select>
                    </div>

                    {newColDbField === 'custom' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JSON Property Key (Optional)</label>
                        <input
                          type="text"
                          placeholder={newColLabel ? sanitizeFieldKey(newColLabel) : "e.g. engineNo"}
                          value={newColCustomKey}
                          onChange={(e) => setNewColCustomKey(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    <button
                      onClick={addMapping}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer"
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
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
                  {loading ? 'Syncing...' : 'Run Import'}
                  {!loading && <ArrowRight size={14} />}
                </button>
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
                            const isEmptyAndRequired = m.required && (!val || val.toString().trim() === '')
                            
                            return (
                              <td key={m.dbField} className="px-6 py-4.5 whitespace-nowrap">
                                {isEmptyAndRequired ? (
                                  <span className="text-rose-500 font-bold flex items-center gap-1">
                                    <AlertCircle size={12} /> Required Field
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

            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Rows</p>
                <p className="text-xl font-extrabold text-slate-800 mt-1">{importResult.total}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">New Created</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-1">+{importResult.importedCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Updated</p>
                <p className="text-xl font-extrabold text-blue-600 mt-1">{importResult.updatedCount}</p>
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
                onClick={() => router.push('/leads')}
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                View Leads Database
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
