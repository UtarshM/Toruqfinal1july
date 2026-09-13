import prisma from '@/lib/prisma'

/**
 * Safely deletes leads by removing or unlinking all foreign-key dependent records first.
 * Executes in chunks of 500 to stay well within PostgreSQL parameter/query bounds.
 */
export async function deleteLeadsWithCascade(leadIds: string[]): Promise<number> {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return 0
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(leadIds.filter(Boolean)))
  if (uniqueIds.length === 0) return 0

  const CHUNK_SIZE = 500
  let totalDeleted = 0

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)

    // Run clean-up of all child records in PARALLEL to prevent serverless function timeouts
    await Promise.allSettled([
      prisma.dataChangeRequest.deleteMany({
        where: { entityType: 'Lead', entityId: { in: chunk } }
      }),
      prisma.leadAssignment.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.call.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.followUp.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.quotation.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.claim.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.transaction.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.visit.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.rTOWork.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.fitnessWork.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.loan.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.renewalRecord.deleteMany({ where: { leadId: { in: chunk } } }),
      prisma.policy.updateMany({
        where: { leadId: { in: chunk } },
        data: { leadId: null }
      }),
      prisma.activityLog.deleteMany({ where: { entityId: { in: chunk } } })
    ])

    // Finally delete the leads themselves
    const delResult = await prisma.lead.deleteMany({
      where: { id: { in: chunk } }
    }).catch(err => {
      console.error('[deleteLeadsWithCascade] lead delete error:', err?.message)
      return { count: 0 }
    })

    totalDeleted += delResult.count
  }

  return totalDeleted
}
