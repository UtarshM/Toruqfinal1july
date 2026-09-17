import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { calculateAssignmentPlan, executeAssignmentBatch, AssignmentScope } from '@/lib/assignment-engine'

/**
 * POST /api/v1/assignments/confirm
 * Commits the assignment batch with concurrency lock and idempotency protection.
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) {
    return apiError('Unauthorized to execute assignments', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const body = await req.json()
    const { sheetName, city, month, year, targetCapacity, salesExecutiveIds, idempotencyKey } = body

    if (!month || !year) {
      return apiError('Month and year are required fields', 'VALIDATION_ERROR', 400, null, req)
    }

    const scope: AssignmentScope = {
      sheetName,
      city,
      month: Number(month),
      year: Number(year),
      targetCapacity: targetCapacity ? Number(targetCapacity) : 400,
      salesExecutiveIds
    }

    // 1. Calculate the deterministic assignment plan
    const plan = await calculateAssignmentPlan(scope)

    if (plan.totalEligibleLeads === 0) {
      return apiError('No eligible unassigned leads match the criteria', 'NO_LEADS', 400, null, req)
    }

    // 2. Execute assignment batch in transaction with idempotency protection
    const result = await executeAssignmentBatch(
      plan,
      scope,
      context.userId,
      idempotencyKey
    )

    return apiSuccess(result)
  } catch (err: any) {
    console.error('[AssignmentConfirm] Error:', err)
    return apiError(err.message || 'Failed to execute assignment batch', 'INTERNAL_ERROR', 500, null, req)
  }
}
