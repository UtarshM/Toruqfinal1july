'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  User, Mail, Lock, Shield, CheckCircle2, ArrowRight, ArrowLeft,
  UploadCloud, FileText, Check, GraduationCap, Calendar, Phone, AlertCircle
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string
  permissions: { name: string; description: string }[]
}

interface UploadedDoc {
  type: string
  url: string
  name: string
}

export default function JoinPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data lists
  const [roles, setRoles] = useState<Role[]>([])
  
  // Form State
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    highestQualification: '',
    dateOfBirth: '',
    joiningDate: '',
    personalMobile: '',
    homeMobile: ''
  })
  
  // Documents State
  const [docs, setDocs] = useState<Record<string, { file: File; url: string; name: string } | null>>({
    adhar: null,
    pan: null,
    ssc: null,
    qualification: null,
    leaving: null,
    photo: null
  })

  // Fetch Roles on mount
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch('/api/v1/roles')
        if (res.ok) {
          const data = await res.json()
          setRoles(data)
          if (data.length > 0) {
            setSelectedRoleId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error fetching roles:', err)
      }
    }
    fetchRoles()
  }, [])

  const selectedRole = roles.find(r => r.id === selectedRoleId)

  // Handle Input Changes
  const updateForm = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // Handle Document Upload
  const handleFileChange = async (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${type}.${fileExt}`
      const filePath = `onboarding/${fileName}`

      // Upload to Supabase documents bucket
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setDocs(prev => ({
        ...prev,
        [type]: { file, url: publicUrl, name: file.name }
      }))
    } catch (err: any) {
      console.error('File upload error:', err)
      setError(`Failed to upload ${type.toUpperCase()}: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || !form.password) {
      setError('Name, Email, and Password are required fields.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Prepare documents array
      const uploadedDocs: UploadedDoc[] = []
      Object.entries(docs).forEach(([key, val]) => {
        if (val) {
          uploadedDocs.push({
            type: key.toUpperCase(),
            url: val.url,
            name: val.name
          })
        }
      })

      // 2. Call backend onboarding API
      const res = await fetch('/api/v1/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roleId: selectedRoleId,
          documents: uploadedDocs
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setStep(5) // Show success step
    } catch (err: any) {
      console.error('Onboarding submit error:', err)
      setError(err.message || 'An error occurred during submission.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl z-10">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/30">
            <Shield size={32} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-4xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-rose-200 to-blue-400 bg-clip-text text-transparent">
          Join Torque Auto Advisor
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Complete your professional profile and upload credentials for admin activation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10">
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          
          {/* Progress tracker */}
          {step <= 4 && (
            <div className="mb-8">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <span>Step {step} of 4</span>
                <span>
                  {step === 1 && 'Role selection'}
                  {step === 2 && 'Personal Details'}
                  {step === 3 && 'Qualifications'}
                  {step === 4 && 'Credential Verification'}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Select your professional role
                </label>
                <div className="relative">
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all appearance-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRole && (
                <div className="bg-slate-900/50 border border-slate-700/40 rounded-2xl p-5 space-y-4">
                  <div>
                    <h4 className="text-md font-bold text-rose-400 flex items-center gap-2">
                      <Shield size={18} />
                      Role Scope & Permissions
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{selectedRole.description || 'No description available for this role.'}</p>
                  </div>
                  
                  <div className="border-t border-slate-700/60 pt-4">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
                      Authorized Permissions (Auto-Selected)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                      {selectedRole.permissions.map((p, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-slate-800/40 border border-slate-700/30 p-2.5 rounded-xl text-xs">
                          <CheckCircle2 size={14} className="text-rose-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200">{p.name}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">{p.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-rose-900/20 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                Next: Personal Details
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2: PERSONAL DETAILS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Full Name (Surname First) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => updateForm('fullName', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="e.g. MEHRA KARAN"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="karan@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={18} />
                    </span>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone size={18} />
                    </span>
                    <input
                      type="tel"
                      required
                      value={form.personalMobile}
                      onChange={(e) => updateForm('personalMobile', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Home Alternative Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone size={18} />
                    </span>
                    <input
                      type="tel"
                      value={form.homeMobile}
                      onChange={(e) => updateForm('homeMobile', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex justify-center items-center gap-2 py-3.5 border border-slate-700 rounded-2xl hover:bg-slate-700/50 transition-all text-sm font-bold text-slate-300 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-[2] flex justify-center items-center gap-2 py-3.5 border border-transparent rounded-2xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all cursor-pointer"
                >
                  Next: Qualifications
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: QUALIFICATIONS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Highest Educational Qualification *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <GraduationCap size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      value={form.highestQualification}
                      onChange={(e) => updateForm('highestQualification', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                      placeholder="e.g. B.Tech, MBA, MCA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Calendar size={18} />
                    </span>
                    <input
                      type="date"
                      required
                      value={form.dateOfBirth}
                      onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Requested Joining Date *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Calendar size={18} />
                    </span>
                    <input
                      type="date"
                      required
                      value={form.joiningDate}
                      onChange={(e) => updateForm('joiningDate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-slate-100 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 flex justify-center items-center gap-2 py-3.5 border border-slate-700 rounded-2xl hover:bg-slate-700/50 transition-all text-sm font-bold text-slate-300 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-[2] flex justify-center items-center gap-2 py-3.5 border border-transparent rounded-2xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all cursor-pointer"
                >
                  Next: Verify Credentials
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DOCUMENT UPLOADS */}
          {step === 4 && (
            <div className="space-y-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Upload scans or photos of your credentials (PNG/JPG/PDF)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['adhar', 'pan', 'ssc', 'qualification', 'leaving', 'photo'].map((type) => {
                  const doc = docs[type]
                  return (
                    <div
                      key={type}
                      className={`relative border rounded-2xl p-4 flex flex-col items-center justify-center h-36 cursor-pointer hover:bg-slate-900/30 transition-all group overflow-hidden ${
                        doc ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 border-dashed hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(type, e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {doc ? (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                            <Check size={20} />
                          </div>
                          <span className="text-xs font-bold text-slate-200 capitalize">{type} Attached</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px]">{doc.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-2">
                          <UploadCloud size={28} className="text-slate-500 group-hover:text-rose-400 transition-all" />
                          <span className="text-xs font-semibold text-slate-300 capitalize">Upload {type === 'ssc' ? 'SSC Marksheet' : type === 'leaving' ? 'Leaving Cert' : type === 'qualification' ? 'Highest degree' : type}</span>
                          <span className="text-[10px] text-slate-500">PDF, JPG, or PNG</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 flex justify-center items-center gap-2 py-3.5 border border-slate-700 rounded-2xl hover:bg-slate-700/50 transition-all text-sm font-bold text-slate-300 cursor-pointer"
                  disabled={loading}
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] flex justify-center items-center gap-2 py-3.5 border border-transparent rounded-2xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Uploading & Registering...' : 'Submit Application'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS BLOCK */}
          {step === 5 && (
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <div className="h-20 w-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Application Received!</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Thank you for submitting your joining registration. Your professional profile has been saved. 
                  Our administrative team will audit your uploaded documents and activate your account shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="inline-flex justify-center items-center gap-2 py-3 px-6 border border-transparent rounded-2xl shadow-lg shadow-emerald-950/20 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
              >
                Return to Login Page
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
