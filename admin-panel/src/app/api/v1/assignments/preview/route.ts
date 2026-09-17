import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { calculateAssignmentPlan, AssignmentScope } from '@/lib/assignment-engine'

/**
 * POST /api/v1/assignments/preview
 * Generates an assignment plan preview without committing to DB.
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) {
    return apiError('Unauthorized to preview assignments', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const body = await req.json()
    const { sheetName, city, month, year, targetCapacity, salesExecutiveIds } = body

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

    const plan = await calculateAssignmentPlan(scope)
    return apiSuccess(plan)
  } catch (err: any) {
    console.error('[AssignmentPreview] Error:', err)
    return apiError(err.message || 'Failed to calculate assignment preview', 'INTERNAL_ERROR', 500, null, req)
  }
}
