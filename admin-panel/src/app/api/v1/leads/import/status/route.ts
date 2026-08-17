import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'

// In-memory global store for active import jobs
// Map of jobId -> JobProgress
export interface ImportJob {
  id: string
  name: string
  status: 'processing' | 'completed' | 'failed'
  totalRows: number
  processedRows: number
  validCount: number
  errorCount: number
  duplicateCount: number
  assignedCount: number
  agentCount: number
  startTime: number
  completedTime?: number
  errorMessage?: string
  importedLeads?: any[]
}

// Global reference surviving within the server process
declare global {
  var globalImportJobs: Map<string, ImportJob> | undefined
}

if (!global.globalImportJobs) {
  global.globalImportJobs = new Map<string, ImportJob>()
}

export function getImportJob(id: string): ImportJob | undefined {
  return global.globalImportJobs?.get(id)
}

export function setImportJob(id: string, job: ImportJob) {
  global.globalImportJobs?.set(id, job)
  // Clean up completed jobs older than 1 hour
  if (global.globalImportJobs && global.globalImportJobs.size > 50) {
    const oneHourAgo = Date.now() - 3600 * 1000
    for (const [key, val] of global.globalImportJobs.entries()) {
      if (val.completedTime && val.completedTime < oneHourAgo) {
        global.globalImportJobs.delete(key)
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.import')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      const job = getImportJob(jobId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json({ job })
    }

    // Return active running jobs
    const activeJobs: ImportJob[] = []
    if (global.globalImportJobs) {
      for (const job of global.globalImportJobs.values()) {
        if (job.status === 'processing' || (job.completedTime && Date.now() - job.completedTime < 60000)) {
          activeJobs.push(job)
        }
      }
    }

    return NextResponse.json({ activeJobs })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 })
  }
}
