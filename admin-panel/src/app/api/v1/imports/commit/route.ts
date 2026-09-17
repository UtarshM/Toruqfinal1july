import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { commitImportJob } from '@/lib/worker/import-worker'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const body = await req.json()
    const { jobId, mapping } = body

    if (!jobId) {
      return apiError('jobId is required', 'VALIDATION_ERROR', 400)
    }

    const job = await prisma.importJob.findUnique({
      where: { id: jobId }
    })

    if (!job || !job.fileUrl) {
      return apiError('Import job not found or staged file missing', 'NOT_FOUND', 404)
    }

    // Launch background worker (does not block HTTP response)
    commitImportJob(jobId, job.fileUrl, mapping || {}).catch(err => {
      console.error(`[imports-commit] Background worker error for job ${jobId}:`, err)
    })

    return apiSuccess({
      jobId,
      status: 'processing',
      message: 'Import job started in background. Monitor progress via /api/v1/imports/' + jobId
    })
  } catch (err: any) {
    console.error('[imports-commit] Error:', err)
    return apiError(err?.message || 'Failed to start import job', 'INTERNAL_ERROR', 500, null, req)
  }
}
