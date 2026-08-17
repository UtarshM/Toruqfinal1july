"use client"
import React, { useState, useEffect, use } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { User, Phone, Mail, MapPin, Car, Calendar, Shield, Clock, FileText, ArrowLeft, History, MessageCircle, AlertCircle, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LeadPolicySubmissionModal from '@/components/leads/LeadPolicySubmissionModal'

export default function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)

  useEffect(() => {
    fetchLeadData()
  }, [id])

  const fetchLeadData = async () => {
    try {
      const data = await fetchApi(`/api/v1/leads/${id}`)
      setLead(data)
    } catch (error: any) {
      console.error(error)
      setLead(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <AdminLayout><div className="p-20 text-center">Loading Profile...</div></AdminLayout>
  if (!lead) return <AdminLayout><div className="p-20 text-center text-red-500 font-bold">Lead Not Found</div></AdminLayout>

  return (
    <AdminLayout>
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-semibold">Back to Leads</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Primary Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              {lead.clientName?.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.clientName}</h1>
            <p className="text-sm text-gray-500 font-medium">{lead.status} · ID: {lead.id.slice(0, 8)}</p>
            
            <div className="mt-8 space-y-4 text-left">
              <InfoItem icon={Phone} label="Phone" value={lead.clientPhone} />
              <InfoItem icon={Mail} label="Email" value={lead.clientEmail || 'Not Provided'} />
              <InfoItem icon={MapPin} label="Location" value={lead.city || 'Unknown'} />
              <InfoItem icon={Car} label="Vehicle No" value={lead.vehicleNo} />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                <MessageCircle size={14} />
                WhatsApp
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all">
                <Phone size={14} />
                Call
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              Lead Activity
            </h3>
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
              <TimelineItem date="Today" action="Profile viewed by Admin" />
              <TimelineItem date="2 days ago" action="Updated status to Interested" />
              <TimelineItem date="1 week ago" action="Lead imported from CSV" />
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Modules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* POLICY SUBMISSION & DOCUMENT MODULE */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Policy Documents & Manager Approval</h3>
                  <p className="text-xs text-slate-400">Fill 25 policy fields, upload 7 documents, convert to Single PDF & submit to manager.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  lead.customFields?.policySubmission?.status === 'Approved' ? 'bg-emerald-500 text-white' :
                  lead.customFields?.policySubmission?.status === 'Pending_Review' ? 'bg-amber-500 text-white animate-pulse' :
                  lead.customFields?.policySubmission?.status === 'Reverted' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {lead.customFields?.policySubmission?.status === 'Pending_Review' ? 'Pending Review' : (lead.customFields?.policySubmission?.status || 'Draft')}
                </span>
              </div>
            </div>

            {/* Reverted reason notice if present */}
            {lead.customFields?.policySubmission?.status === 'Reverted' && (
              <div className="bg-rose-500/20 border border-rose-500/40 p-3.5 rounded-2xl text-xs space-y-1">
                <p className="text-rose-300 font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-rose-400" />
                  Manager Reverted: "{lead.customFields?.policySubmission?.revertReason}"
                </p>
                <p className="text-slate-300 text-[11px]">Please upload the updated documents, re-convert to Single PDF, and submit again.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Uploaded Docs</span>
                <span className="font-black text-slate-200">
                  {lead.customFields?.policySubmission?.documents?.length || 0} / 7 Required Docs
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Consolidated PDF</span>
                <span className="font-black text-emerald-400">
                  {lead.customFields?.policySubmission?.compiledPdfUrl ? 'Generated & Ready' : 'Not Compiled Yet'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Manager Status</span>
                <span className="font-black text-slate-200">
                  {lead.customFields?.policySubmission?.status === 'Approved' ? 'Approved ✓' : lead.customFields?.policySubmission?.status === 'Pending_Review' ? 'Under Review' : 'Draft'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => setShowSubmissionModal(true)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileText size={15} />
                <span>Open Policy Form & Upload Docs</span>
              </button>

              {lead.customFields?.policySubmission?.compiledPdfUrl && (
                <a
                  href={lead.customFields.policySubmission.compiledPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye size={14} />
                  <span>View Single PDF</span>
                </a>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Insurance Policies</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">{lead.policies?.length || 0} Active</span>
            </div>
            <div className="p-8">
              {lead.policies?.length > 0 ? (
                <div className="space-y-4">
                  {lead.policies.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <Shield className="text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900">{p.policyNumber}</p>
                          <p className="text-xs text-gray-500 uppercase font-bold">{p.provider} · {p.type}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-gray-400 font-bold uppercase">Expires</p>
                        <p className="font-bold text-gray-900">{new Date(p.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No insurance policies issued yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryBox icon={FileText} label="Claims" count={lead.claims?.length || 0} />
            <SummaryBox icon={Clock} label="Follow-ups" count={lead.followUps?.length || 0} />
            <SummaryBox icon={Shield} label="Quotations" count={lead.quotations?.length || 0} />
            <SummaryBox icon={Calendar} label="Renewals" count={0} />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6">Notes & Comments</h3>
            <textarea 
              rows={4}
              placeholder="Add a private note about this lead..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100">
              Save Note
            </button>
          </div>
        </div>
      </div>

      {showSubmissionModal && (
        <LeadPolicySubmissionModal
          leadId={id}
          lead={lead}
          onClose={() => setShowSubmissionModal(false)}
          onUpdated={() => {
            fetchLeadData()
          }}
        />
      )}
    </AdminLayout>
  )
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-sm font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  )
}

function TimelineItem({ date, action }: any) {
  return (
    <div className="pl-8 relative">
      <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm shadow-blue-200 z-10" />
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{action}</p>
    </div>
  )
}

function SummaryBox({ icon: Icon, label, count }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
          <Icon size={24} />
        </div>
        <p className="font-bold text-gray-900">{label}</p>
      </div>
      <p className="text-xl font-bold text-blue-600">{count}</p>
    </div>
  )
}
