import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const { id } = await params
    const job = await prisma.importJob.findUnique({
      where: { id },
      include: {
        creator: { select: { fullName: true, email: true } },
        errors: { take: 50, orderBy: { rowNumber: 'asc' } }
      }
    })

    if (!job) {
      return apiError(`Import job ${id} not found`, 'NOT_FOUND', 404)
    }

    const progressPercentage = job.totalRows > 0
      ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100))
      : 0

    return apiSuccess({
      ...job,
      progressPercentage
    })
  } catch (err: any) {
    console.error('[imports-status] Error:', err)
    return apiError(err?.message || 'Failed to get import job status', 'INTERNAL_ERROR', 500, null, req)
  }
}
