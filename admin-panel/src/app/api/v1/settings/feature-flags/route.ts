import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { evaluateUserFeatureFlags, getGlobalFeatureFlags, updateGlobalFeatureFlags } from '@/lib/feature-flags'

/**
 * GET /api/v1/settings/feature-flags
 * Returns active feature flags for the current user.
 */
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const flags = await evaluateUserFeatureFlags(context.userId, context.role)
    const isAdmin = ['SUPER ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(context.role?.toUpperCase() || '')

    let globalConfig = null
    if (isAdmin) {
      globalConfig = await getGlobalFeatureFlags()
    }

    return apiSuccess({
      flags,
      globalConfig
    })
  } catch (err: any) {
    console.error('[FeatureFlags GET] Error:', err)
    return apiError(err.message || 'Failed to fetch feature flags', 'INTERNAL_ERROR', 500, null, req)
  }
}

/**
 * POST /api/v1/settings/feature-flags
 * Updates feature flags configuration (Admin only).
 */
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'settings.manage')
  if (error || !context) {
    return apiError('Unauthorized to modify feature flags', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const body = await req.json()
    const updated = await updateGlobalFeatureFlags(body, context.userId)
    return apiSuccess(updated)
  } catch (err: any) {
    console.error('[FeatureFlags POST] Error:', err)
    return apiError(err.message || 'Failed to update feature flags', 'INTERNAL_ERROR', 500, null, req)
  }
}
