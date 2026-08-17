"use client"
import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Users, Calendar, Settings, RefreshCw, CheckCircle2, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/api'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const onboardingChecked = useRef(false)
  const [mounted, setMounted] = useState(false)

  // Background Lead Import Job Progress State
  const [activeImportJobs, setActiveImportJobs] = useState<any[]>([])
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  // Poll background import status
  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    const checkImportStatus = async () => {
      try {
        const storedJobId = localStorage.getItem('torque_active_import_job_id')
        const url = storedJobId ? `/api/v1/leads/import/status?jobId=${storedJobId}` : '/api/v1/leads/import/status'
        const res = await fetchApi(url, {}, 1)

        if (res?.job) {
          setActiveImportJobs([res.job])
          if (res.job.status === 'completed' || res.job.status === 'failed') {
            // Keep completed job for 12 seconds then remove from localStorage
            setTimeout(() => {
              localStorage.removeItem('torque_active_import_job_id')
            }, 12000)
          }
        } else if (res?.activeJobs) {
          setActiveImportJobs(res.activeJobs)
        }
      } catch (err) {
        // Silently catch background poll errors
      }
    }

    checkImportStatus()
    const interval = setInterval(checkImportStatus, 3000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user) {
        router.push('/login')
      } else {
        const roleName = user.role?.name?.toUpperCase() || ''
        const isAdmin = roleName === 'SUPER ADMIN' || roleName === 'ADMIN'
        const isCleanActiveUser = user.isActive !== false && !(user as any).onboardingRemark

        if (isAdmin || isCleanActiveUser) {
          return
        }

        if (!onboardingChecked.current) {
          onboardingChecked.current = true
          const checkFormStatus = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (!session?.access_token) return
              const response = await fetch('/api/v1/onboarding/check-form-status', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.requiresForm) {
                  router.push('/onboarding/form')
                }
              }
            } catch (err) {
              console.error('Error checking onboarding status:', err)
            }
          }
          checkFormStatus()
        }
      }
    }
  }, [user, isLoading, mounted, router])

  if (!mounted || (isLoading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) return null

  const visibleJobs = activeImportJobs.filter(j => !dismissedJobs.has(j.id))

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      {/* ml-64 only on desktop, full width on mobile, pb-16 to avoid cutting off elements under mobile navigation bar */}
      <div className="md:ml-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <Header />

        {/* Global Background Import Progress Banner */}
        {visibleJobs.length > 0 && (
          <div className="px-4 md:px-8 pt-4">
            {visibleJobs.map(job => {
              const percent = job.totalRows > 0 ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100)) : 0
              const isDone = job.status === 'completed'
              const isFailed = job.status === 'failed'

              return (
                <div
                  key={job.id}
                  className={`p-4 rounded-2xl shadow-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                      : isFailed
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                      : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <div className="p-2 bg-emerald-500 rounded-xl">
                        <CheckCircle2 size={20} className="text-white" />
                      </div>
                    ) : isFailed ? (
                      <div className="p-2 bg-rose-500 rounded-xl">
                        <X size={20} className="text-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-600 rounded-xl">
                        <RefreshCw size={20} className="text-white animate-spin" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          {isDone ? 'Lead Import Complete!' : isFailed ? 'Import Failed' : `Importing: ${job.name || 'Lead Batch'}`}
                        </h4>
                        {!isDone && !isFailed && (
                          <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded text-[10px] font-bold">
                            {percent}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {isDone
                          ? `Successfully processed and distributed ${job.validCount?.toLocaleString() || job.totalRows?.toLocaleString()} leads across sales executives.`
                          : isFailed
                          ? (job.errorMessage || 'An error occurred during bulk lead import.')
                          : `${job.processedRows?.toLocaleString()} of ${job.totalRows?.toLocaleString()} leads processed... Background upload active.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {!isDone && !isFailed && (
                      <div className="w-36 sm:w-48 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    {isDone && (
                      <Link
                        href="/leads"
                        className="px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        <span>View Leads</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setDismissedJobs(prev => new Set([...prev, job.id]))
                        localStorage.removeItem('torque_active_import_job_id')
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                      title="Dismiss notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around h-16 px-4 shadow-lg shadow-gray-200/50">
        <Link href="/" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Home size={18} />
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        <Link href="/leads" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/leads' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Users size={18} />
          <span className="text-[10px] font-bold tracking-wider">Leads</span>
        </Link>
        <Link href="/follow-ups" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/follow-ups' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Calendar size={18} />
          <span className="text-[10px] font-bold tracking-wider">Follow-ups</span>
        </Link>
        <Link href="/settings" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/settings' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Settings size={18} />
          <span className="text-[10px] font-bold tracking-wider">Settings</span>
        </Link>
      </div>
    </div>
  )
}
