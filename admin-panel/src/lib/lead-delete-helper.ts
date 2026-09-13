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

    // Run clean-up of child records sequentially to guarantee zero foreign-key constraint violations
    await prisma.dataChangeRequest.deleteMany({
      where: {
        entityType: 'Lead',
        entityId: { in: chunk }
      }
    }).catch(err => console.warn('[deleteLeadsWithCascade] dataChangeRequest error:', err?.message))

    await prisma.leadAssignment.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] leadAssignment error:', err?.message))

    await prisma.leadStatusHistory.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] leadStatusHistory error:', err?.message))

    await prisma.leadWhatsAppLog.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] leadWhatsAppLog error:', err?.message))

    await prisma.call.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] call error:', err?.message))

    await prisma.followUp.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] followUp error:', err?.message))

    await prisma.quotation.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] quotation error:', err?.message))

    await prisma.claim.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] claim error:', err?.message))

    await prisma.transaction.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] transaction error:', err?.message))

    await prisma.visit.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] visit error:', err?.message))

    await prisma.rTOWork.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] rTOWork error:', err?.message))

    await prisma.fitnessWork.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] fitnessWork error:', err?.message))

    await prisma.loan.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] loan error:', err?.message))

    await prisma.renewalRecord.deleteMany({
      where: { leadId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] renewalRecord error:', err?.message))

    // Disassociate policies rather than deleting existing policies
    await prisma.policy.updateMany({
      where: { leadId: { in: chunk } },
      data: { leadId: null }
    }).catch(err => console.warn('[deleteLeadsWithCascade] policy unlink error:', err?.message))

    // Disassociate activity logs
    await prisma.activityLog.deleteMany({
      where: { entityId: { in: chunk } }
    }).catch(err => console.warn('[deleteLeadsWithCascade] activityLog error:', err?.message))

    // Finally delete the leads themselves
    const delResult = await prisma.lead.deleteMany({
      where: { id: { in: chunk } }
    })

    totalDeleted += delResult.count
  }

  return totalDeleted
}
