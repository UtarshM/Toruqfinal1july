/**
 * src/lib/feature-flags.ts
 * Feature Flag & Phased Rollout Engine for Torque Auto Advisors.
 * 
 * Supports phased rollout:
 * Internal Testing -> 2-3 Pilot Sales Executives -> 1 Manager -> Production Group -> All Executives.
 */

import prisma from './prisma'

export interface FeatureFlagConfig {
  importV2: boolean
  assignmentV2: boolean
  offlineSqlitePilot: boolean
  approvalInboxV2: boolean
  dualVerificationLogging: boolean
  pilotUserIds: string[]
}

const DEFAULT_FLAGS: FeatureFlagConfig = {
  importV2: true,
  assignmentV2: true,
  offlineSqlitePilot: true,
  approvalInboxV2: true,
  dualVerificationLogging: true,
  pilotUserIds: [] // Populated dynamically or via admin settings
}

const SETTING_KEY = 'FEATURE_FLAGS_CONFIG'

/**
 * Retrieves the global feature flag configuration.
 */
export async function getGlobalFeatureFlags(): Promise<FeatureFlagConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY }
    })
    if (!setting || !setting.value) {
      return DEFAULT_FLAGS
    }
    return { ...DEFAULT_FLAGS, ...(setting.value as any) }
  } catch (err) {
    console.warn('[FeatureFlags] Using default flags due to read error:', err)
    return DEFAULT_FLAGS
  }
}

/**
 * Updates the global feature flag configuration (Admin only).
 */
export async function updateGlobalFeatureFlags(
  newConfig: Partial<FeatureFlagConfig>,
  updatedBy: string
): Promise<FeatureFlagConfig> {
  const current = await getGlobalFeatureFlags()
  const merged = { ...current, ...newConfig }

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: {
      value: merged as any,
      updatedAt: new Date()
    },
    create: {
      key: SETTING_KEY,
      value: merged as any
    }
  })

  return merged
}

/**
 * Evaluates active feature flags for a specific user and role.
 */
export async function evaluateUserFeatureFlags(
  userId: string,
  role?: string
): Promise<{
  importV2: boolean
  assignmentV2: boolean
  offlineSqlitePilot: boolean
  approvalInboxV2: boolean
  dualVerificationLogging: boolean
  isPilotUser: boolean
}> {
  const global = await getGlobalFeatureFlags()
  const userRole = (role || '').toUpperCase()
  const isAdmin = ['SUPER ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)
  const isManager = userRole === 'MANAGER'
  const isPilot = global.pilotUserIds.includes(userId)

  return {
    importV2: isAdmin || global.importV2,
    assignmentV2: isAdmin || isManager || global.assignmentV2,
    offlineSqlitePilot: isAdmin || isPilot || global.offlineSqlitePilot,
    approvalInboxV2: global.approvalInboxV2,
    dualVerificationLogging: global.dualVerificationLogging,
    isPilotUser: isPilot || isAdmin
  }
}
