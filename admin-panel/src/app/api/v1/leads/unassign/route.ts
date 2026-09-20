import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { recordBulkSyncEvents } from '@/lib/sync-helper'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/leads/unassign
 * De-assigns (unassigns) leads and returns them to the unassigned pool.
 * Supported modes:
 *  1. { leadIds: string[] } -> de-assigns specific selected leads
 *  2. { unassignAll: true, executiveId?: string, importName?: string } -> de-assigns all assigned leads (or filtered subset)
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = context.role?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || roleUpper === 'MANAGER'
  if (!isAdmin) {
    return NextResponse.json({ error: 'Only Admins and Managers have permission to de-assign leads.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { leadIds, unassignAll, executiveId, importName, startDate, endDate } = body

    if (!unassignAll && (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0)) {
      return NextResponse.json({ error: 'Please provide leadIds or set unassignAll to true.' }, { status: 400 })
    }

    let affectedCount = 0

    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      // 1. De-assign specific selected leads
      // Reset status to 'New' if it was 'Assigned' or 'Allotted'
      const assignedRes = await prisma.lead.updateMany({
        where: {
          id: { in: leadIds },
          status: { in: ['Assigned', 'assigned', 'Allotted', 'allotted'] }
        },
        data: {
          assignedTo: null,
          status: 'New'
        }
      })

      // For any other statuses (e.g. Follow Up, etc.), preserve status but clear assignedTo
      const otherRes = await prisma.lead.updateMany({
        where: {
          id: { in: leadIds },
          status: { notIn: ['Assigned', 'assigned', 'Allotted', 'allotted'] }
        },
        data: {
          assignedTo: null
        }
      })

      affectedCount = assignedRes.count + otherRes.count

      // Remove assignment tracking records for these leads so history is clean
      await prisma.leadAssignment.deleteMany({
        where: { leadId: { in: leadIds } }
      }).catch(() => {})

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'LEADS_DEASSIGNED',
          entityType: 'LEAD',
          entityId: context.userId,
          metadata: { count: affectedCount, leadIds }
        }
      }).catch(() => {})

      // Record sync events for offline mobile SQLite synchronization
      recordBulkSyncEvents(leadIds.map(id => ({
        entityType: 'lead',
        entityId: id,
        action: 'update',
        payload: { assignedTo: null, status: 'New' }
      }))).catch(() => {})

      return NextResponse.json({
        success: true,
        count: affectedCount,
        message: `Successfully de-allotted ${affectedCount} lead(s).`
      })
    }

    if (unassignAll) {
      // 2. De-assign all assigned leads matching filters
      const where: any = {
        assignedTo: { not: null },
        deletedAt: null,
        status: { not: 'Trashed' }
      }

      if (executiveId && executiveId !== 'all') {
        where.assignedTo = executiveId
      }
      if (importName && importName !== 'all') {
        where.importName = importName
      }
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          const d = new Date(startDate)
          d.setHours(0, 0, 0, 0)
          if (!isNaN(d.getTime())) where.createdAt.gte = d
        }
        if (endDate) {
          const d = new Date(endDate)
          d.setHours(23, 59, 59, 999)
          if (!isNaN(d.getTime())) where.createdAt.lte = d
        }
      }

      // Update leads with status 'Assigned' or 'Allotted' -> 'New'
      const assignedRes = await prisma.lead.updateMany({
        where: {
          ...where,
          status: { in: ['Assigned', 'assigned', 'Allotted', 'allotted'] }
        },
        data: {
          assignedTo: null,
          status: 'New'
        }
      })

      // Update remaining assigned leads
      const otherRes = await prisma.lead.updateMany({
        where: {
          ...where,
          status: { notIn: ['Assigned', 'assigned', 'Allotted', 'allotted'] }
        },
        data: {
          assignedTo: null
        }
      })

      affectedCount = assignedRes.count + otherRes.count

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'LEADS_DEASSIGNED_BULK',
          entityType: 'LEAD',
          entityId: context.userId,
          metadata: { count: affectedCount, filters: { executiveId, importName, startDate, endDate } }
        }
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        count: affectedCount,
        message: `Successfully de-allotted ${affectedCount} lead(s) and returned them to the unallotted pool.`
      })
    }

    return NextResponse.json({ error: 'No operation matched.' }, { status: 400 })
  } catch (err: any) {
    console.error('[leads/unassign] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
