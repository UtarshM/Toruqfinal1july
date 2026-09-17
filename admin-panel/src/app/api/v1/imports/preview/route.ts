import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { parseAndPreviewImport } from '@/lib/worker/import-worker'

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

    const preview = await parseAndPreviewImport(jobId, job.fileUrl, mapping || {})
    return apiSuccess(preview)
  } catch (err: any) {
    console.error('[imports-preview] Error:', err)
    return apiError(err?.message || 'Failed to preview import file', 'INTERNAL_ERROR', 500, null, req)
  }
}
