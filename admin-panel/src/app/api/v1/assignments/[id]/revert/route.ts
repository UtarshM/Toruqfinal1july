import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { revertAssignmentBatch } from '@/lib/assignment-engine'

/**
 * POST /api/v1/assignments/[id]/revert
 * Safely reverts an assignment batch without overwriting manual reassignments made afterwards.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) {
    return apiError('Unauthorized to revert assignment batch', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const { id: batchId } = await params

    if (!batchId) {
      return apiError('Batch ID is required', 'BAD_REQUEST', 400, null, req)
    }

    const result = await revertAssignmentBatch(batchId, context.userId)
    return apiSuccess(result)
  } catch (err: any) {
    console.error('[AssignmentRevert] Error:', err)
    return apiError(err.message || 'Failed to revert assignment batch', 'INTERNAL_ERROR', 500, null, req)
  }
}
