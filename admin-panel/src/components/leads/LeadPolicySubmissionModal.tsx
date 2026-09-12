"use client"

import React, { useState, useEffect, useRef } from 'react'
import {
  FileText, UploadCloud, Upload, CheckCircle2, AlertCircle, Eye, Download,
  Send, Trash2, RefreshCw, X, Copy, Check, MessageSquare, Shield,
  Car, User, Phone, Calendar, ArrowRight, Sparkles, ExternalLink
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface DocumentEntry {
  id: string
  category: string
  categoryLabel: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  uploadedAt: string
}

interface LeadPolicySubmissionProps {
  leadId: string
  lead: any
  onClose?: () => void
  onUpdated?: () => void
}

export const REQUIRED_DOCUMENTS = [
  { key: 'IMP_DATE_SS', label: '1. IMP Date Message Screenshot', desc: 'Screenshot of important date communication' },
  { key: 'NCB_CONFIRMATION_SS', label: '2. NCB Confirmation Screenshot', desc: 'Proof of No Claim Bonus confirmation' },
  { key: 'PAN_CARD', label: '3. Pan Card', desc: 'Client PAN card copy / photo' },
  { key: 'PREVIOUS_POLICY', label: '4. Previous Policy (If applicable)', desc: 'Prior policy document copy' },
  { key: 'QUOTATION', label: '5. Quotation', desc: 'Generated insurance quotation PDF/image' },
  { key: 'RC_BOOK', label: '6. RC Book', desc: 'Vehicle Registration Certificate (Front & Back)' },
  { key: 'VEHICLE_PHOTO', label: '7. Vehicle Photo for Body Type', desc: 'Live vehicle photo confirming body type match' },
]

export function formatToDateMonthYear(dateVal: any): string {
  if (!dateVal) return ''
  const str = String(dateVal).trim()
  if (!str || str === 'N/A' || str === 'NA') return ''

  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0')
    const mm = dmyMatch[2].padStart(2, '0')
    const yyyy = dmyMatch[3]
    return `${dd}/${mm}/${yyyy}`
  }

  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (ymdMatch) {
    const yyyy = ymdMatch[1]
    const mm = ymdMatch[2].padStart(2, '0')
    const dd = ymdMatch[3].padStart(2, '0')
    return `${dd}/${mm}/${yyyy}`
  }

  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0')
    const mm = String(parsed.getMonth() + 1).padStart(2, '0')
    const yyyy = parsed.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  return str
}

export function getDefaultCreditPaymentMsg(customerName?: string, vehicleNo?: string, amount?: string, dueDate?: string) {
  const name = customerName?.trim() || 'Customer name'
  const veh = vehicleNo?.trim() ? ` ${vehicleNo.trim()}` : ''
  const amt = amount?.trim() || '48000'
  const date = dueDate?.trim() || '10-11-2025'

  return `${name}
આપની ગાડી${veh} ની વીમા પોલિસી આપ એ અમારી પાસે કરાવેલ છે.
જે ${amt} મા નક્કી કરેલ છે અને ${amt} પેમેન્ટ બાકી રાખેલ છે 

બાકી પેમેન્ટ તારીખ ${date} સુધી માં કરાવી આપવાનું નક્કી થયેલ છે.
પેમેન્ટ કરતી વખતે નક્કી થયેલ રકમથી કઈ પણ ઓછું નહીં કરવામાં આવે જેની ખાસ નોંધ લેશો.
સમયસર પેમેન્ટ કરી સહકાર આપશો એવી આપને વિનંતી છે.`
}

export default function LeadPolicySubmissionModal({ leadId, lead, onClose, onUpdated }: LeadPolicySubmissionProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [msgCopied, setMsgCopied] = useState(false)
  const [previewPdfModal, setPreviewPdfModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'form' | 'documents' | 'preview'>('form')

  const [submission, setSubmission] = useState<any>(null)
  const [hpSelection, setHpSelection] = useState<string>('As per RC')
  const [formData, setFormData] = useState<any>({
    policyType: 'nil dep',
    customerType: 'Existing',
    customerCategory: 'OPC-Our Premium Customer',
    regNo: lead?.vehicleNo || '',
    rate: '',
    rateConfirmationSS: 'YES',
    rsFromCustomer: '',
    description: '',
    otherWorks: '',
    paymentMode: 'cash',
    ncb: 'with ncb',
    expDate: lead?.expiryDate ? formatToDateMonthYear(lead.expiryDate) : '',
    mobileNo1: lead?.clientPhone || '',
    mobileNo2: '',
    ncbConfirmation: 'Yes',
    impDateMsgSS: 'Yes',
    hpDetails: 'As per RC',
    vehiclePhoto: 'n.a.',
    bodyTypeMatched: 'n.a.',
    googleFormSubmitted: 'YES',
    noJackCoverConfirmationSS: 'N.A.',
    idvBreakup: '',
    newName: '',
    dueDate: '',
    inspectionStatus: 'Not Applicable',
    mparivahanRcStatus: '',
    amountDueDateMsgSS: '',
    creditPaymentMsg: ''
  })

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load current submission state
  const loadSubmission = async () => {
    setLoading(true)
    try {
      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission`)
      if (res?.submission) {
        setSubmission(res.submission)
        if (res.submission.formData) {
          const loadedHp = res.submission.formData.hpDetails || ''
          const hpType = (!loadedHp || loadedHp.toLowerCase() === 'as per rc')
            ? 'As per RC'
            : (loadedHp.toUpperCase() === 'NO HP' || loadedHp.toLowerCase() === 'no hp' ? 'NO HP' : 'Other')
          setHpSelection(hpType)
          setFormData((prev: any) => ({
            ...prev,
            ...res.submission.formData,
            hpDetails: loadedHp || 'As per RC',
            dueDate: formatToDateMonthYear(res.submission.formData.dueDate) || '',
            inspectionStatus: res.submission.formData.inspectionStatus === 'Not Required' ? 'Not Applicable' : (res.submission.formData.inspectionStatus || 'Not Applicable'),
            expDate: formatToDateMonthYear(res.submission.formData.expDate || lead?.expiryDate),
            regNo: res.submission.formData.regNo || lead?.vehicleNo || '',
            mobileNo1: res.submission.formData.mobileNo1 || lead?.clientPhone || ''
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load submission:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubmission()
  }, [leadId])

  // Save Form Draft
  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission`, {
        method: 'POST',
        body: JSON.stringify({ formData })
      })
      if (res?.submission) {
        setSubmission(res.submission)
      }
      alert('Policy details draft saved successfully!')
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  // Handle Document Upload
  const handleUploadFile = async (category: string, file: File) => {
    setUploadingCategory(category)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const safeBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${category.toLowerCase()}_${Date.now()}_${safeBaseName}.${ext}`
      const storagePath = `lead-documents/${leadId}/${fileName}`

      // 1. Direct Supabase Storage Upload
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        })

      if (!uploadErr && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath)

        const docEntry = {
          id: `doc_${Date.now()}`,
          category,
          categoryLabel: REQUIRED_DOCUMENTS.find(d => d.key === category)?.label || category,
          fileName: file.name,
          savedFileName: fileName,
          filePath: publicUrl,
          storagePath,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        }

        // Save doc entry via policy-submission endpoint
        const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission`, {
          method: 'POST',
          body: JSON.stringify({ document: docEntry })
        })

        if (res?.submission) {
          setSubmission(res.submission)
        }
        if (onUpdated) onUpdated()
        return
      }

      // 2. Fallback to server route
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)

      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission/upload`, {
        method: 'POST',
        body: form
      })
      if (res?.submission) {
        setSubmission(res.submission)
      }
      if (onUpdated) onUpdated()
    } catch (err: any) {
      console.error('[Upload error]', err)
      alert(err.message || 'Failed to upload document')
    } finally {
      setUploadingCategory(null)
    }
  }

  // Handle Document Delete
  const handleDeleteDoc = async (docId: string, category: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return
    try {
      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission/upload?docId=${docId}&category=${category}`, {
        method: 'DELETE'
      })
      if (res?.submission) {
        setSubmission(res.submission)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document')
    }
  }

  // Convert to Single PDF
  const handleCompilePdf = async () => {
    setCompiling(true)
    try {
      // First save draft formData
      await fetchApi(`/api/v1/leads/${leadId}/policy-submission`, {
        method: 'POST',
        body: JSON.stringify({ formData })
      })

      // Then trigger compile
      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission/compile-pdf`, {
        method: 'POST'
      })

      if (res?.submission) {
        setSubmission(res.submission)
      }
      alert('All uploaded document attachments (RC, Previous Policy, PAN, Quotation, etc.) successfully merged into a single consolidated PDF! The 25-field form details are available separately as copyable text.')
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to merge documents into single PDF')
    } finally {
      setCompiling(false)
    }
  }

  // Submit to Manager
  const handleSubmitToManager = async () => {
    if (!submission?.compiledPdfUrl) {
      alert('Please click "Merge Documents into PDF" first to combine all uploaded files before sending to your Manager.')
      return
    }

    if (!confirm('Are you sure you want to submit this policy document bundle to your Manager for review?')) return

    setSubmitting(true)
    try {
      const res = await fetchApi(`/api/v1/leads/${leadId}/policy-submission/submit`, {
        method: 'POST'
      })
      if (res?.submission) {
        setSubmission(res.submission)
      }
      alert('Policy submission sent to Manager! You will be notified once reviewed.')
      if (onUpdated) onUpdated()
    } catch (err: any) {
      alert(err.message || 'Failed to submit to Manager')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate copyable text format
  const generateFormattedText = () => {
    const isWithoutNcb =
      formData.ncbConfirmation?.toLowerCase() === 'no' ||
      formData.ncbConfirmation?.toLowerCase() === 'without ncb' ||
      formData.ncb?.toLowerCase() === 'without ncb' ||
      formData.ncb?.toLowerCase() === 'no'

    if (isWithoutNcb) {
      return `*Policy Type:* ${formData.policyType || 'nil dep'}
*Customer Type:* ${formData.customerType || 'Existing'}
*Customer Category:* ${formData.customerCategory || 'OPC-Our Premium Customer'}
*Reg No:* ${formData.regNo || lead?.vehicleNo || ''}
*Rate:* ${formData.rate || ''}
*Rate Confirmation SS:* ${formData.rateConfirmationSS || 'YES'}
*Rs From Customer:* ${formData.rsFromCustomer || ''}
*Description:* ${formData.description || ''}
*Other Works:* ${formData.otherWorks || ''}
*Payment mode*:- ${formData.paymentMode || 'cash'}
*NCB:* ${formData.ncb || 'without ncb'}
*Exp Date:* ${formatToDateMonthYear(formData.expDate)}
*Mobile No. 1:* ${formData.mobileNo1 || lead?.clientPhone || ''}
*Mobile No. 2:* ${formData.mobileNo2 || ''}
*NCB Confirmation:* ${formData.ncbConfirmation || 'No'}`
    }

    return `*Policy Type:* ${formData.policyType || 'nil dep'}
*Customer Type:* ${formData.customerType || 'Existing'}
*Customer Category:* ${formData.customerCategory || 'OPC-Our Premium Customer'}
*Reg No:* ${formData.regNo || lead?.vehicleNo || ''}
*Rate:* ${formData.rate || ''}
*Rate Confirmation SS:* ${formData.rateConfirmationSS || 'YES'}
*Rs From Customer:* ${formData.rsFromCustomer || ''}
*Description:* ${formData.description || ''}
*Other Works:* ${formData.otherWorks || ''}
*Payment mode*:- ${formData.paymentMode || 'cash'}
*NCB:* ${formData.ncb || 'with ncb'}
*Exp Date:* ${formatToDateMonthYear(formData.expDate)}
*Mobile No. 1:* ${formData.mobileNo1 || lead?.clientPhone || ''}
*Mobile No. 2:* ${formData.mobileNo2 || ''}
*NCB Confirmation:* ${formData.ncbConfirmation || 'Yes'}
*Imp Date msg SS:* ${formData.impDateMsgSS || 'Yes'}
*HP Details*:- ${formData.hpDetails || 'As per RC'}
*Vehicle Photo:* ${formData.vehiclePhoto || 'n.a.'}
*Body Type Matched:* ${formData.bodyTypeMatched || 'n.a.'}
*Google Form Submitted:* ${formData.googleFormSubmitted || 'YES'}

*No-Jack Cover Confirmation SS:* ${formData.noJackCoverConfirmationSS || 'N.A.'}
*IDV Break up:* ${formData.idvBreakup || ''}
*New name:* ${formData.newName || ''}
*Inspection status:* ${formData.inspectionStatus || 'Not Applicable'}
${formData.paymentMode?.toLowerCase() === 'credit' && formData.dueDate ? `*Due Date:* ${formData.dueDate}\n` : ''}*Mparivahan RC / RC Status:* ${formData.mparivahanRcStatus || ''}
*Amount and Due Date confirmation msg SS:* ${formData.amountDueDateMsgSS || (formData.paymentMode?.toLowerCase() === 'credit' ? 'Uploaded' : 'N.A.')}`
  }

  const handleCopyText = () => {
    const text = generateFormattedText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const getDoc = (category: string) => {
    return (submission?.documents || []).find((d: any) => d.category === category)
  }

  const getCategoryDocs = (category: string) => {
    return (submission?.documents || []).filter((d: any) => d.category === category)
  }

  const uniqueUploadedCategories = new Set((submission?.documents || []).map((d: any) => d.category))
  const uploadedCount = uniqueUploadedCategories.size
  const status = submission?.status || 'Draft'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-400/20">
              <Shield size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                  Policy Documents & Manager Submission
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  status === 'Approved' ? 'bg-emerald-500 text-white' :
                  status === 'Pending_Review' ? 'bg-amber-500 text-white animate-pulse' :
                  status === 'Reverted' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  {status === 'Pending_Review' ? 'Pending Manager Review' : status}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Client: <span className="text-slate-100 font-bold">{lead?.clientName}</span> • Vehicle: <span className="text-emerald-400 font-mono font-bold">{lead?.vehicleNo || 'N/A'}</span> • Phone: <span className="text-slate-200">{lead?.clientPhone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleCopyText}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied 25-Field Text!' : 'Copy 25-Field Text'}</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* REVERTED ALERT BANNER */}
        {status === 'Reverted' && submission?.revertReason && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-900 font-bold block text-sm">Manager Reverted This Submission:</strong>
                <p className="text-rose-700 font-medium mt-0.5">"{submission.revertReason}"</p>
                <span className="text-[10px] text-rose-500 font-bold">Please update the required documents, recompile the single PDF, and send again.</span>
              </div>
            </div>
            {lead?.clientPhone && (
              <a
                href={`https://wa.me/91${lead.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${lead.clientName}, regarding your policy for ${lead.vehicleNo || 'vehicle'}: ${submission.revertReason}. Please share the required document photo. Thank you.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
              >
                <MessageSquare size={14} />
                <span>Message Client on WhatsApp</span>
              </a>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'form' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Policy Form (25 Fields Text)
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>2. Upload Documents & Merged PDF</span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold">
                {uploadedCount}/7
              </span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              3. WhatsApp / Text Preview
            </button>
          </div>

          {submission?.compiledPdfUrl && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Merged Documents PDF Ready
              </span>
              <a
                href={submission.compiledPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              >
                <Eye size={12} /> View Merged PDF
              </a>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw size={32} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading policy submission data...</p>
            </div>
          ) : activeTab === 'form' ? (
            /* TAB 1: 25-FIELD POLICY DETAILS FORM */
            <div className="space-y-6">
              
              {/* Section 1: Customer & Vehicle Info */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Car size={15} className="text-blue-600" />
                  Vehicle & Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Policy Type *</label>
                    <select
                      value={formData.policyType}
                      onChange={e => setFormData({ ...formData, policyType: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="nil dep">Nil Dep (Zero Depreciation)</option>
                      <option value="comprehensive">Comprehensive</option>
                      <option value="TP">Third Party (TP)</option>
                      <option value="OD">Own Damage (OD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Type *</label>
                    <select
                      value={formData.customerType}
                      onChange={e => setFormData({ ...formData, customerType: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="New">New</option>
                      <option value="Existing">Existing</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Category *</label>
                    <select
                      value={formData.customerCategory}
                      onChange={e => setFormData({ ...formData, customerCategory: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="OPC-Our Premium Customer">OPC-Our Premium Customer</option>
                      <option value="SVC Single Vehicle Customer">SVC Single Vehicle Customer</option>
                      <option value="MVC Multiple Vehicle Customer">MVC Multiple Vehicle Customer</option>
                      <option value="FC- Firm/Company">FC- Firm/Company</option>
                      <option value="Sub- Sub Agent">Sub- Sub Agent</option>
                      <option value="BDG- Broker/Dealer/Garage">BDG- Broker/Dealer/Garage</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Reg No *</label>
                    <input
                      type="text"
                      placeholder="e.g. GJ36AJ3672"
                      value={formData.regNo}
                      onChange={e => setFormData({ ...formData, regNo: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiry Date (Date Month Year - DD/MM/YYYY) *</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={formData.expDate || ''}
                        onChange={e => setFormData({ ...formData, expDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <input
                        type="date"
                        title="Pick Date"
                        className="absolute right-2 w-6 h-6 opacity-40 hover:opacity-100 cursor-pointer bg-transparent border-none text-transparent"
                        onChange={e => {
                          const val = e.target.value
                          if (val) {
                            const [y, m, d] = val.split('-')
                            setFormData({ ...formData, expDate: `${d}/${m}/${y}` })
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">NCB</label>
                    <select
                      value={formData.ncb}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          ncb: val,
                          ncbConfirmation: val === 'without ncb' ? 'No' : (formData.ncbConfirmation || 'Yes')
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="with ncb">With NCB (Yes)</option>
                      <option value="without ncb">Without NCB (No)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile No. 1 *</label>
                    <input
                      type="text"
                      placeholder="e.g. 98792 77112"
                      value={formData.mobileNo1}
                      onChange={e => setFormData({ ...formData, mobileNo1: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile No. 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 97222 06434"
                      value={formData.mobileNo2}
                      onChange={e => setFormData({ ...formData, mobileNo2: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">HP (Hypothecation)</label>
                    <select
                      value={hpSelection}
                      onChange={e => {
                        const v = e.target.value
                        setHpSelection(v)
                        if (v === 'As per RC') {
                          setFormData({ ...formData, hpDetails: 'As per RC' })
                        } else if (v === 'NO HP') {
                          setFormData({ ...formData, hpDetails: 'NO HP' })
                        } else {
                          // Other selected - if it was previously As per RC or NO HP, clear for typing
                          if (!formData.hpDetails || formData.hpDetails.toLowerCase() === 'as per rc' || formData.hpDetails.toUpperCase() === 'NO HP') {
                            setFormData({ ...formData, hpDetails: '' })
                          }
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="As per RC">As per RC</option>
                      <option value="NO HP">NO HP</option>
                      <option value="Other">Other - Manual type</option>
                    </select>

                    {hpSelection === 'Other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Type HP / Bank details manually..."
                          value={formData.hpDetails && formData.hpDetails.toLowerCase() !== 'as per rc' && formData.hpDetails.toUpperCase() !== 'NO HP' ? formData.hpDetails : ''}
                          onChange={e => setFormData({ ...formData, hpDetails: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Financials & Rates */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={15} className="text-emerald-600" />
                  Premium & Financials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Rate (Net Rate) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 6168"
                      value={formData.rate}
                      onChange={e => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Rate Confirmation SS</label>
                    <select
                      value={formData.rateConfirmationSS}
                      onChange={e => setFormData({ ...formData, rateConfirmationSS: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                      <option value="N.A.">N.A.</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Rs From Customer *</label>
                    <input
                      type="text"
                      placeholder="e.g. 7000"
                      value={formData.rsFromCustomer}
                      onChange={e => setFormData({ ...formData, rsFromCustomer: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Mode</label>
                    <select
                      value={formData.paymentMode}
                      onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">cash</option>
                      <option value="online">online / UPI</option>
                      <option value="cheque">cheque</option>
                      <option value="credit">credit</option>
                    </select>
                  </div>
                </div>

                {/* Credit Payment Fields (Due Date & Confirmation SS Upload) */}
                {formData.paymentMode?.toLowerCase() === 'credit' && (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-900 uppercase tracking-wide">
                      <Calendar size={15} className="text-purple-600" />
                      Credit Payment Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Due Date Calendar Picker */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Due date (Date Month Year - DD/MM/YYYY) *</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={formData.dueDate || ''}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                          />
                          <input
                            type="date"
                            title="Pick Due Date"
                            className="absolute right-2 w-6 h-6 opacity-40 hover:opacity-100 cursor-pointer bg-transparent border-none text-transparent"
                            onChange={e => {
                              const val = e.target.value
                              if (val) {
                                const [y, m, d] = val.split('-')
                                setFormData({ ...formData, dueDate: `${d}/${m}/${y}` })
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Upload Amount & Due Date Confirmation Screenshot */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Amount & Due Date Confirmation Screenshot *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="amount_due_ss_file_input"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleUploadFile('AMOUNT_DUE_DATE_SS', file)
                                setFormData({ ...formData, amountDueDateMsgSS: 'Yes (Uploaded)' })
                                e.target.value = ''
                              }
                            }}
                          />
                          <label
                            htmlFor="amount_due_ss_file_input"
                            className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-purple-300 text-purple-900 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors flex-1 justify-center"
                          >
                            <Upload size={13} />
                            {uploadingCategory === 'AMOUNT_DUE_DATE_SS' ? 'Uploading...' : 'Upload Confirmation Screenshot (PDF / Image)'}
                          </label>
                        </div>

                        {getCategoryDocs('AMOUNT_DUE_DATE_SS').map((doc: any) => (
                          <div key={doc.id || doc.filePath} className="flex items-center justify-between bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 mt-2 text-xs">
                            <a href={doc.filePath} target="_blank" rel="noreferrer" className="text-purple-700 font-bold hover:underline truncate max-w-[220px] flex items-center gap-1">
                              <ExternalLink size={12} /> {doc.fileName || 'Confirmation_SS.jpg'}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id, 'AMOUNT_DUE_DATE_SS')}
                              className="text-red-500 hover:text-red-700 font-bold text-xs ml-2 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Autogenerated Editable Confirmation Message for Customer (Visible for ALL payment modes) */}
                <div className="bg-white border border-purple-200 rounded-xl p-3.5 space-y-2 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                    <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-purple-600" />
                      Customer Confirmation Message (Gujarati - Fully Editable)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const msg = formData.creditPaymentMsg || getDefaultCreditPaymentMsg(lead?.clientName, formData.regNo || lead?.vehicleNo, formData.rate || formData.rsFromCustomer, formData.dueDate)
                          navigator.clipboard.writeText(msg)
                          setMsgCopied(true)
                          setTimeout(() => setMsgCopied(false), 2000)
                        }}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {msgCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        {msgCopied ? 'Copied!' : 'Copy Message'}
                      </button>
                      <a
                        href={`https://wa.me/${(formData.mobileNo1 || lead?.clientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(formData.creditPaymentMsg || getDefaultCreditPaymentMsg(lead?.clientName, formData.regNo || lead?.vehicleNo, formData.rate || formData.rsFromCustomer, formData.dueDate))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        Send on WhatsApp
                      </a>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={formData.creditPaymentMsg !== undefined && formData.creditPaymentMsg !== '' ? formData.creditPaymentMsg : getDefaultCreditPaymentMsg(lead?.clientName, formData.regNo || lead?.vehicleNo, formData.rate || formData.rsFromCustomer, formData.dueDate)}
                    onChange={e => setFormData({ ...formData, creditPaymentMsg: e.target.value })}
                    className="w-full bg-slate-50/70 border border-purple-100 rounded-lg p-3 text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed font-sans"
                    placeholder="Edit Gujarati confirmation message..."
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>* Edit customer name, amount, date or any text above before sending.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          creditPaymentMsg: getDefaultCreditPaymentMsg(lead?.clientName, formData.regNo || lead?.vehicleNo, formData.rate || formData.rsFromCustomer, formData.dueDate)
                        })
                      }}
                      className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                    >
                      Reset to Template
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. 0 dep + rsa + key replacement"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Other Works</label>
                    <input
                      type="text"
                      placeholder="e.g. fitness / rto transfer if any"
                      value={formData.otherWorks}
                      onChange={e => setFormData({ ...formData, otherWorks: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Confirmations & SS Checks */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-600" />
                  Confirmations & Verification Flags
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">NCB Confirmation (With NCB?) *</label>
                    <select
                      value={formData.ncbConfirmation || (formData.ncb?.toLowerCase().includes('without') ? 'No' : 'Yes')}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          ncbConfirmation: val,
                          ncb: val === 'No' ? 'without ncb' : 'with ncb'
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Yes">Yes (With NCB)</option>
                      <option value="No">No (Without NCB)</option>
                    </select>
                  </div>

                  {(formData.ncbConfirmation?.toLowerCase() !== 'no' && formData.ncbConfirmation?.toLowerCase() !== 'without ncb' && formData.ncb?.toLowerCase() !== 'without ncb') && (
                    <>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Imp Date Msg SS</label>
                        <input
                          type="text"
                          placeholder="e.g. Yes"
                          value={formData.impDateMsgSS}
                          onChange={e => setFormData({ ...formData, impDateMsgSS: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Vehicle Photo</label>
                        <input
                          type="text"
                          placeholder="e.g. YES / n.a."
                          value={formData.vehiclePhoto}
                          onChange={e => setFormData({ ...formData, vehiclePhoto: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Body Type Matched</label>
                        <input
                          type="text"
                          placeholder="e.g. YES / n.a."
                          value={formData.bodyTypeMatched}
                          onChange={e => setFormData({ ...formData, bodyTypeMatched: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Google Form Submitted</label>
                        <input
                          type="text"
                          placeholder="e.g. YES"
                          value={formData.googleFormSubmitted}
                          onChange={e => setFormData({ ...formData, googleFormSubmitted: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">No-Jack Cover SS</label>
                        <input
                          type="text"
                          placeholder="e.g. N.A. / YES"
                          value={formData.noJackCoverConfirmationSS}
                          onChange={e => setFormData({ ...formData, noJackCoverConfirmationSS: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">IDV Break up</label>
                        <input
                          type="text"
                          placeholder="e.g. IDV value details"
                          value={formData.idvBreakup}
                          onChange={e => setFormData({ ...formData, idvBreakup: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">New Name (Endorsement)</label>
                        <input
                          type="text"
                          placeholder="e.g. Name if ownership transfer"
                          value={formData.newName}
                          onChange={e => setFormData({ ...formData, newName: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Inspection *</label>
                        <select
                          value={formData.inspectionStatus || 'Not Applicable'}
                          onChange={e => setFormData({ ...formData, inspectionStatus: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Not Applicable">Not Applicable</option>
                          <option value="Approved">Approved</option>
                          <option value="Approved on Declaration">Approved on Declaration</option>
                        </select>

                        {/* Upload option for Approved & Approved on Declaration */}
                        {(formData.inspectionStatus === 'Approved' || formData.inspectionStatus === 'Approved on Declaration') && (
                          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 mt-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                <FileText size={13} className="text-amber-600" />
                                Inspection Report (PDF or Image) *
                              </label>
                              {getCategoryDocs('INSPECTION_REPORT').length > 0 && (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Uploaded ({getCategoryDocs('INSPECTION_REPORT').length})
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id="inspection_report_file_input"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleUploadFile('INSPECTION_REPORT', file)
                                    e.target.value = ''
                                  }
                                }}
                              />
                              <label
                                htmlFor="inspection_report_file_input"
                                className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors"
                              >
                                <Upload size={13} />
                                {uploadingCategory === 'INSPECTION_REPORT' ? 'Uploading...' : 'Upload Inspection Report (PDF / Image)'}
                              </label>
                            </div>

                            {getCategoryDocs('INSPECTION_REPORT').map((doc: any) => (
                              <div key={doc.id || doc.filePath} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 text-xs">
                                <a href={doc.filePath} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline truncate max-w-[280px] flex items-center gap-1">
                                  <ExternalLink size={12} /> {doc.fileName || 'Inspection_Report.pdf'}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc.id, 'INSPECTION_REPORT')}
                                  className="text-red-500 hover:text-red-700 font-bold text-xs ml-2 cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Mparivahan RC Status (Juni policy na hoy to)</label>
                        <input
                          type="text"
                          placeholder="e.g. Verified on Mparivahan"
                          value={formData.mparivahanRcStatus}
                          onChange={e => setFormData({ ...formData, mparivahanRcStatus: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          ) : activeTab === 'documents' ? (
            /* TAB 2: 7 DOCUMENT CATEGORIES UPLOADER */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Upload 7 Required Documents</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload images (PNG, JPG) or PDFs for each category. Click "Convert to Single PDF" when done.
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-black border border-blue-200">
                  {uploadedCount} of {REQUIRED_DOCUMENTS.length} Uploaded
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_DOCUMENTS.map((reqDoc, idx) => {
                  const attachedFiles = getCategoryDocs(reqDoc.key)
                  const isUploading = uploadingCategory === reqDoc.key

                  return (
                    <div
                      key={reqDoc.key}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        attachedFiles.length > 0
                          ? 'bg-emerald-50/40 border-emerald-200 shadow-sm'
                          : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-slate-900 truncate">
                            {reqDoc.label}
                          </h5>
                          {attachedFiles.length > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-black flex items-center gap-1">
                              <Check size={11} /> {attachedFiles.length} Attached
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
                              Empty
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {reqDoc.desc}
                        </p>
                      </div>

                      {attachedFiles.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {attachedFiles.map((attached: any) => (
                            <div key={attached.id} className="bg-white p-2 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <FileText size={14} className="text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate" title={attached.fileName}>
                                    {attached.fileName}
                                  </p>
                                  <span className="text-[9px] text-slate-400 block leading-tight">
                                    {(attached.fileSize / 1024).toFixed(0)} KB • {new Date(attached.uploadedAt).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={attached.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                                  title="Preview document"
                                >
                                  <Eye size={12} />
                                </a>
                                <button
                                  onClick={() => handleDeleteDoc(attached.id, reqDoc.key)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer"
                                  title="Delete document"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {attachedFiles.length < 15 && (
                        <div>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            ref={el => { fileInputRefs.current[reqDoc.key] = el }}
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleUploadFile(reqDoc.key, file)
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[reqDoc.key]?.click()}
                            disabled={isUploading}
                            className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 border-dashed rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {isUploading ? (
                              <>
                                <RefreshCw size={14} className="animate-spin text-blue-600" />
                                <span>Uploading file...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud size={15} className="text-blue-600" />
                                <span>{attachedFiles.length > 0 ? 'Upload Additional File' : 'Upload Screenshot / File'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* TAB 3: WHATSAPP FORMATTED PREVIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">WhatsApp / ERP Form Summary</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    This formatted text can be copied with 1-click and pasted directly into WhatsApp or external policy booking systems.
                  </p>
                </div>
                <button
                  onClick={handleCopyText}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-black text-white'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary Text'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-emerald-400 p-5 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto border border-slate-800">
                {generateFormattedText()}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>Status: <strong className="text-slate-900">{status}</strong></span>
            {uploadedCount > 0 && <span>• {uploadedCount} Docs Attached</span>}
            {submission?.compiledPdfUrl && <span className="text-emerald-600">• Merged Documents PDF Ready</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Save Form Draft */}
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving Form...' : 'Save Form Draft'}
            </button>

            {/* 2. Merge Uploaded Documents into PDF */}
            <button
              onClick={handleCompilePdf}
              disabled={compiling || uploadedCount === 0}
              title={uploadedCount === 0 ? 'Upload documents first' : 'Merge all uploaded document files into one PDF'}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} className={compiling ? 'animate-spin' : ''} />
              <span>{compiling ? 'Merging Documents...' : 'Merge Documents into PDF'}</span>
            </button>

            {/* 3. Send to Manager */}
            <button
              onClick={handleSubmitToManager}
              disabled={submitting || !submission?.compiledPdfUrl || status === 'Pending_Review'}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                status === 'Pending_Review'
                  ? 'bg-amber-500 text-white cursor-default'
                  : 'bg-slate-900 hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Send size={14} />
              <span>{status === 'Pending_Review' ? 'Submitted to Manager' : 'Send to Manager'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
