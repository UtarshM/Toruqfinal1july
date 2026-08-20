import prisma from './prisma'
import { notify } from './notify'

/**
 * Auto-assigns upcoming renewals that expire in less than 30 days (1 month).
 * They are assigned to the original salesperson who won the policy.
 * If that salesperson is inactive or not set, it falls back to round-robin or
 * the first active sales executive.
 * 
 * Set to run automatically when policies are issued, or renewals lists are queried.
 */
export async function autoAssignUpcomingRenewals(): Promise<number> {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  try {
    // Find all unassigned active renewal records expiring within the next 30 days (or in the past)
    const renewalsToAssign = await prisma.renewalRecord.findMany({
      where: {
        renewalStatus: 'Active',
        assignedTo: null,
        policyEndDate: { lte: thirtyDaysFromNow }
      }
    })

    if (renewalsToAssign.length === 0) return 0

    let assignedCount = 0

    for (const r of renewalsToAssign) {
      let targetAssigneeId = r.createdBySalesId

      // Verify the target assignee is active
      if (targetAssigneeId) {
        const activeUser = await prisma.user.findFirst({
          where: { id: targetAssigneeId, isActive: true }
        })
        if (!activeUser) {
          targetAssigneeId = null
        }
      }

      // Fallback: Find any active Sales Executive
      if (!targetAssigneeId) {
        const fallbackExec = await prisma.user.findFirst({
          where: {
            isActive: true,
            role: {
              name: { contains: 'Sales', mode: 'insensitive' }
            }
          }
        })
        if (fallbackExec) {
          targetAssigneeId = fallbackExec.id
        }
      }

      if (targetAssigneeId) {
        const expDate = r.policyEndDate ? new Date(r.policyEndDate) : new Date()

        const dbUpdates: any[] = [
          prisma.renewalRecord.update({
            where: { id: r.id },
            data: {
              assignedTo: targetAssigneeId,
              assignedMonth: expDate.getMonth() + 1,
              assignedYear: expDate.getFullYear(),
              renewalStatus: 'PendingRenewal' // Moves it to the salesperson's active list
            }
          })
        ]

        if (r.leadId) {
          dbUpdates.push(
            prisma.lead.update({
              where: { id: r.leadId },
              data: {
                assignedTo: targetAssigneeId,
                status: 'New'
              }
            })
          )
        }

        await prisma.$transaction(dbUpdates)

        // Send a notification to the assigned salesperson
        await notify({
          userId: targetAssigneeId,
          title: `🔄 Renewal Assigned: ${r.clientName}`,
          body: `Vehicle ${r.vehicleNo || 'N/A'} is due for renewal on ${expDate.toLocaleDateString('en-IN')}. Please contact the client.`,
          type: 'action',
          entityType: 'renewal',
          entityId: r.id
        }).catch(() => {})

        assignedCount++
      }
    }

    return assignedCount
  } catch (err) {
    console.error('[autoAssignUpcomingRenewals] Error:', err)
    return 0
  }
}
