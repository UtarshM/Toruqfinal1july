"use client"
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  FileText, Shield, Save, RotateCcw, Plus, Trash2, Eye, EyeOff,
  CheckCircle2, AlertCircle, Sparkles, Sliders, ChevronRight,
  HelpCircle, Settings, Check, X, ArrowUpRight, Smartphone, RefreshCw
} from 'lucide-react'

interface FormFieldConfig {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'boolean'
  required: boolean
  enabled: boolean
  placeholder?: string
  options?: string[]
  helpText?: string
  isSystem?: boolean
}

interface FormSchema {
  name: string
  description: string
  fields: FormFieldConfig[]
  isCustomized?: boolean
  updatedAt?: string
}

export default function FormCustomizerPage() {
  const { user } = useAuth()
  const apiFetch = useApi()

  const [formConfigs, setFormConfigs] = useState<Record<string, FormSchema>>({})
  const [activeFormKey, setActiveFormKey] = useState<string>('leads')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Working copy of fields for the active form
  const [workingFields, setWorkingFields] = useState<FormFieldConfig[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // Preview Mode Toggle ('editor' | 'preview')
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  // New field modal state
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newField, setNewField] = useState<Partial<FormFieldConfig>>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    enabled: true,
    placeholder: '',
    options: []
  })
  const [newOptionInput, setNewOptionInput] = useState('')

  // New Form Modal State (for future forms)
  const [showCreateFormModal, setShowCreateFormModal] = useState(false)
  const [newFormMeta, setNewFormMeta] = useState({ key: '', name: '', description: '' })

  const role = (user?.role?.name || (typeof user?.role === 'string' ? user.role : '')).toUpperCase()
  const isAdmin = role.includes('ADMIN') || role.includes('SUPER')

  // Fetch all form configurations
  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/settings/forms')
      if (res.ok) {
        const data = await res.json()
        setFormConfigs(data)
        if (data[activeFormKey]) {
          setWorkingFields(JSON.parse(JSON.stringify(data[activeFormKey].fields)))
        }
      }
    } catch (err) {
      console.error('Failed to load form configs:', err)
      setNotification({ type: 'error', message: 'Failed to load form configurations.' })
    } finally {
      setLoading(false)
    }
  }, [apiFetch, activeFormKey])

  useEffect(() => {
    fetchConfigs()
  }, [])

  // When active form tab changes, update working fields
  const handleSelectForm = (key: string) => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes in this form. Discard changes and switch?')
      if (!confirmLeave) return
    }
    setActiveFormKey(key)
    setIsDirty(false)
    if (formConfigs[key]) {
      setWorkingFields(JSON.parse(JSON.stringify(formConfigs[key].fields)))
    }
  }

  // Update an attribute of a field
  const updateField = (index: number, updates: Partial<FormFieldConfig>) => {
    setWorkingFields(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...updates }
      return copy
    })
    setIsDirty(true)
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    setNotification(null)
    try {
      const res = await apiFetch('/api/v1/settings/forms', {
        method: 'POST',
        body: JSON.stringify({
          formId: activeFormKey,
          fields: workingFields
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration.')
      }

      setFormConfigs(prev => ({
        ...prev,
        [activeFormKey]: {
          ...prev[activeFormKey],
          fields: workingFields,
          isCustomized: true,
          updatedAt: new Date().toISOString()
        }
      }))
      setIsDirty(false)
      setNotification({ type: 'success', message: `Form "${formConfigs[activeFormKey]?.name || activeFormKey}" updated successfully!` })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error saving form settings.' })
    } finally {
      setSaving(false)
    }
  }

  // Reset to default
  const handleReset = async () => {
    const confirmReset = window.confirm(
      `Are you sure you want to reset "${formConfigs[activeFormKey]?.name || activeFormKey}" back to system defaults?\nAll custom field labels, requirements, and options will be restored.`
    )
    if (!confirmReset) return

    setResetting(true)
    setNotification(null)
    try {
      const res = await apiFetch(`/api/v1/settings/forms?formId=${activeFormKey}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset.')
      }

      if (data.defaultSchema) {
        setWorkingFields(JSON.parse(JSON.stringify(data.defaultSchema.fields)))
        setFormConfigs(prev => ({
          ...prev,
          [activeFormKey]: {
            ...prev[activeFormKey],
            fields: data.defaultSchema.fields,
            isCustomized: false
          }
        }))
      }
      setIsDirty(false)
      setNotification({ type: 'success', message: `Form "${formConfigs[activeFormKey]?.name}" restored to defaults.` })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error resetting form.' })
    } finally {
      setResetting(false)
    }
  }

  // Add custom field
  const handleCreateField = () => {
    if (!newField.id || !newField.label) {
      alert('Field Key and Label are required.')
      return
    }
    const cleanId = newField.id.trim().replace(/\s+/g, '_').toLowerCase()
    if (workingFields.some(f => f.id.toLowerCase() === cleanId)) {
      alert('A field with this Identifier already exists in this form.')
      return
    }

    const fieldToAdd: FormFieldConfig = {
      id: cleanId,
      label: newField.label.trim(),
      type: (newField.type as any) || 'text',
      required: !!newField.required,
      enabled: true,
      placeholder: newField.placeholder || '',
      options: newField.type === 'select' ? (newField.options || []) : undefined,
      isSystem: false
    }

    setWorkingFields(prev => [...prev, fieldToAdd])
    setIsDirty(true)
    setShowAddFieldModal(false)
    setNewField({ id: '', label: '', type: 'text', required: false, enabled: true, placeholder: '', options: [] })
    setNewOptionInput('')
  }

  // Delete non-system field
  const handleDeleteField = (index: number) => {
    const field = workingFields[index]
    if (field.isSystem) {
      alert('Core system fields cannot be removed, but you can hide them by disabling the visibility switch.')
      return
    }
    if (confirm(`Remove custom field "${field.label}"?`)) {
      setWorkingFields(prev => prev.filter((_, i) => i !== index))
      setIsDirty(true)
    }
  }

  // Options tag manager for select dropdowns
  const handleAddOptionToField = (fieldIndex: number, optionVal: string) => {
    if (!optionVal.trim()) return
    const current = workingFields[fieldIndex].options || []
    if (!current.includes(optionVal.trim())) {
      updateField(fieldIndex, { options: [...current, optionVal.trim()] })
    }
  }

  const handleRemoveOptionFromField = (fieldIndex: number, optionVal: string) => {
    const current = workingFields[fieldIndex].options || []
    updateField(fieldIndex, { options: current.filter(o => o !== optionVal) })
  }

  const currentSchema = formConfigs[activeFormKey]

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Sliders size={20} />
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Universal Form Customizer</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Configure, rename, hide/show, and set requirements for all operational forms across Torque ERP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={resetting || !isAdmin}
              className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Reset this form to system default schema"
            >
              <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
              Reset Default
            </button>

            <button
              onClick={() => setShowCreateFormModal(true)}
              disabled={!isAdmin}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Create a new custom form for the future"
            >
              <Plus size={15} />
              Create New Form
            </button>

            <button
              onClick={() => setShowAddFieldModal(true)}
              disabled={!isAdmin}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Plus size={15} />
              Add Custom Field
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !isAdmin}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isDirty 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-100 animate-pulse' 
                  : 'bg-gray-900 text-white hover:bg-black'
              }`}
            >
              <Save size={15} className={saving ? 'animate-spin' : ''} />
              {saving ? 'Saving...' : isDirty ? 'Save Changes *' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold border ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Form Selector Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex overflow-x-auto gap-2 no-scrollbar">
          {Object.entries(formConfigs).map(([key, schema]) => (
            <button
              key={key}
              onClick={() => handleSelectForm(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFormKey === key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText size={15} />
              <span>{schema.name}</span>
              {schema.isCustomized && (
                <span className={`w-2 h-2 rounded-full ${activeFormKey === key ? 'bg-blue-200' : 'bg-blue-600'}`} title="Customized by Admin" />
              )}
            </button>
          ))}
        </div>

        {/* Form Info Banner & Mode Switcher */}
        {currentSchema && (
          <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white rounded-2xl border border-blue-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">{currentSchema.name}</h2>
                {currentSchema.isCustomized ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg">
                    <Sparkles size={12} /> Customized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-lg">
                    Default Template
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">{currentSchema.description}</p>
            </div>

            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-blue-100">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'editor' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Field Configuration ({workingFields.length})
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Eye size={13} />
                Live Form Preview
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <RefreshCw className="animate-spin text-blue-600 mx-auto mb-3" size={28} />
            <p className="text-sm font-semibold text-gray-600">Loading form configuration...</p>
          </div>
        ) : activeTab === 'editor' ? (
          /* ── Field Configuration Table ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Field Identifier</th>
                    <th className="px-6 py-4">Custom Display Label</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-center">Visible in Form</th>
                    <th className="px-6 py-4 text-center">Mandatory</th>
                    <th className="px-6 py-4">Configuration / Options</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {workingFields.map((field, idx) => (
                    <tr
                      key={field.id}
                      className={`hover:bg-blue-50/30 transition-colors ${!field.enabled ? 'opacity-50 bg-gray-50/40' : ''}`}
                    >
                      {/* Field ID */}
                      <td className="px-6 py-4 font-mono font-medium text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{field.id}</span>
                          {field.isSystem && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded uppercase tracking-wider">
                              Core
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Display Label (Editable) */}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(idx, { label: e.target.value })}
                          className="w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="Label name"
                        />
                      </td>

                      {/* Field Type */}
                      <td className="px-6 py-4">
                        <select
                          value={field.type}
                          disabled={field.isSystem}
                          onChange={e => updateField(idx, { type: e.target.value as any })}
                          className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none disabled:opacity-60"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="select">Dropdown (Select)</option>
                          <option value="textarea">Textarea (Multi-line)</option>
                          <option value="file">File Upload</option>
                          <option value="boolean">Checkbox (Yes/No)</option>
                        </select>
                      </td>

                      {/* Visible Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => updateField(idx, { enabled: !field.enabled })}
                          className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold ${
                            field.enabled
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                          }`}
                          title={field.enabled ? 'Click to hide from form' : 'Click to show in form'}
                        >
                          {field.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                          <span>{field.enabled ? 'Shown' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Required Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => updateField(idx, { required: !field.required })}
                          className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold ${
                            field.required
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                          title={field.required ? 'Mandatory field' : 'Optional field'}
                        >
                          <span>{field.required ? 'Required *' : 'Optional'}</span>
                        </button>
                      </td>

                      {/* Options / Placeholder Details */}
                      <td className="px-6 py-4">
                        {field.type === 'select' ? (
                          <div className="space-y-2 max-w-sm">
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-gray-50 border border-gray-200 rounded-xl">
                              {(field.options || []).map(opt => (
                                <span
                                  key={opt}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 text-[10px] font-semibold rounded-lg text-gray-700 shadow-2xs"
                                >
                                  {opt}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionFromField(idx, opt)}
                                    className="text-gray-400 hover:text-rose-600"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Add new choice..."
                                id={`opt_input_${idx}`}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddOptionToField(idx, (e.target as HTMLInputElement).value)
                                    ;(e.target as HTMLInputElement).value = ''
                                  }
                                }}
                                className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[11px] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(`opt_input_${idx}`) as HTMLInputElement
                                  if (input && input.value) {
                                    handleAddOptionToField(idx, input.value)
                                    input.value = ''
                                  }
                                }}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[10px] font-bold rounded-lg"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={e => updateField(idx, { placeholder: e.target.value })}
                            placeholder="Placeholder text..."
                            className="w-full max-w-xs px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 outline-none"
                          />
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        {!field.isSystem ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteField(idx)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete custom field"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-semibold italic">System</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Live Form Preview Pane ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-4xl mx-auto">
            <div className="border-b border-gray-100 pb-6 mb-8 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Client / Agent View</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{currentSchema.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This is exactly how this form renders for staff and executives with your customized labels, required markers, and dropdown options.
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                <Smartphone size={24} />
              </div>
            </div>

            <form onSubmit={e => { e.preventDefault(); alert('Live Preview Only — form validation passed!') }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workingFields
                  .filter(f => f.enabled)
                  .map(field => (
                    <div
                      key={field.id}
                      className={field.type === 'textarea' ? 'md:col-span-2 space-y-2' : 'space-y-2'}
                    >
                      <label className="block text-xs font-bold text-gray-700">
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-1 font-black">*</span>}
                      </label>

                      {field.type === 'select' ? (
                        <select
                          required={field.required}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select an option...</option>
                          {(field.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          required={field.required}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : field.type === 'file' ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                          <p className="text-xs text-gray-500 font-semibold">Click or drag files to upload</p>
                          <span className="text-[10px] text-gray-400">PDF, JPG, PNG up to 10MB</span>
                        </div>
                      ) : field.type === 'boolean' ? (
                        <div className="flex items-center gap-2 pt-2">
                          <input type="checkbox" id={`prev_${field.id}`} className="w-4 h-4 text-blue-600 rounded" />
                          <label htmlFor={`prev_${field.id}`} className="text-xs text-gray-600">{field.label}</label>
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          required={field.required}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="px-4 py-2.5 text-gray-500 font-bold text-xs hover:bg-gray-100 rounded-xl transition-all"
                >
                  Return to Field Editor
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Test Submit Preview
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Add Custom Field Modal ── */}
        {showAddFieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Custom Form Field</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Add a new field to {currentSchema?.name}</p>
                </div>
                <button
                  onClick={() => setShowAddFieldModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. GSTIN Number, Alternate Phone"
                    value={newField.label}
                    onChange={e => {
                      const label = e.target.value
                      const generatedId = label.toLowerCase().replace(/[^a-z0-9]/g, '_')
                      setNewField(prev => ({
                        ...prev,
                        label,
                        id: prev.id ? prev.id : generatedId
                      }))
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Identifier (Code Key) *</label>
                  <input
                    type="text"
                    placeholder="e.g. gstin_number"
                    value={newField.id}
                    onChange={e => setNewField(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Field Type</label>
                    <select
                      value={newField.type}
                      onChange={e => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown (Select)</option>
                      <option value="textarea">Textarea</option>
                      <option value="file">File Upload</option>
                      <option value="boolean">Checkbox</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Validation</label>
                    <select
                      value={newField.required ? 'true' : 'false'}
                      onChange={e => setNewField(prev => ({ ...prev, required: e.target.value === 'true' }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
                    >
                      <option value="false">Optional</option>
                      <option value="true">Required *</option>
                    </select>
                  </div>
                </div>

                {newField.type === 'select' && (
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-700">Dropdown Choices</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add choice..."
                        value={newOptionInput}
                        onChange={e => setNewOptionInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (newOptionInput.trim()) {
                              setNewField(prev => ({ ...prev, options: [...(prev.options || []), newOptionInput.trim()] }))
                              setNewOptionInput('')
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newOptionInput.trim()) {
                            setNewField(prev => ({ ...prev, options: [...(prev.options || []), newOptionInput.trim()] }))
                            setNewOptionInput('')
                          }
                        }}
                        className="px-3 py-2 bg-gray-900 text-white font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {(newField.options || []).map((opt, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold">
                          {opt}
                          <button
                            type="button"
                            onClick={() => setNewField(prev => ({ ...prev, options: prev.options?.filter((_, idx) => idx !== i) }))}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Enter details..."
                    value={newField.placeholder}
                    onChange={e => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="px-4 py-2.5 text-gray-500 font-bold text-xs hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateField}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ── Create New Custom Form Modal ── */}
        {showCreateFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Custom Form</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Build a new operational or simple form for future workflows</p>
                </div>
                <button
                  onClick={() => setShowCreateFormModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Form Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Survey Inspection Form, Customer Feedback"
                    value={newFormMeta.name}
                    onChange={e => {
                      const name = e.target.value
                      const generatedKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
                      setNewFormMeta(prev => ({
                        ...prev,
                        name,
                        key: prev.key ? prev.key : generatedKey
                      }))
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unique Identifier Key *</label>
                  <input
                    type="text"
                    placeholder="e.g. survey_inspection"
                    value={newFormMeta.key}
                    onChange={e => setNewFormMeta(prev => ({ ...prev, key: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Form Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe what this form is used for..."
                    value={newFormMeta.description}
                    onChange={e => setNewFormMeta(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateFormModal(false)}
                  className="px-4 py-2.5 text-gray-500 font-bold text-xs hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newFormMeta.name || !newFormMeta.key) {
                      alert('Form Name and Identifier Key are required.')
                      return
                    }
                    const cleanKey = newFormMeta.key.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
                    if (formConfigs[cleanKey]) {
                      alert('A form with this identifier already exists.')
                      return
                    }

                    const defaultFields: FormFieldConfig[] = [
                      { id: 'clientName', label: 'Client / Customer Name', type: 'text', required: true, enabled: true, placeholder: 'Enter name' },
                      { id: 'mobile', label: 'Contact Phone / Mobile', type: 'text', required: true, enabled: true, placeholder: '10-digit mobile' },
                      { id: 'date', label: 'Date (DD/MM/YYYY)', type: 'date', required: true, enabled: true },
                      { id: 'status', label: 'Status', type: 'select', required: true, enabled: true, options: ['Draft', 'Pending Approval', 'Completed', 'Rejected'] },
                      { id: 'remarks', label: 'Remarks / Notes', type: 'textarea', required: false, enabled: true, placeholder: 'Add any remarks...' }
                    ]

                    try {
                      const res = await apiFetch('/api/v1/settings/forms', {
                        method: 'POST',
                        body: JSON.stringify({
                          formId: cleanKey,
                          name: newFormMeta.name.trim(),
                          description: newFormMeta.description.trim() || 'Custom business form',
                          fields: defaultFields
                        })
                      })
                      if (!res.ok) throw new Error('Failed to create form.')
                      setShowCreateFormModal(false)
                      setNewFormMeta({ key: '', name: '', description: '' })
                      await fetchConfigs()
                      setActiveFormKey(cleanKey)
                      setWorkingFields(defaultFields)
                      setNotification({ type: 'success', message: `Custom form "${newFormMeta.name}" created successfully!` })
                    } catch (err: any) {
                      alert(err.message || 'Error creating form')
                    }
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Create Form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
