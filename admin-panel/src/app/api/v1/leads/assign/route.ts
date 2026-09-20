import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { recordBulkSyncEvents } from '@/lib/sync-helper'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/leads/assign
 * Allots/assigns selected leads from the List to a specified executive/staff member.
 * Payload: { leadIds: string[], assigneeId: string }
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = context.role?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN' || roleUpper.includes('ADMIN') || roleUpper === 'MANAGER'
  if (!isAdmin) {
    return NextResponse.json({ error: 'Only Admins and Managers have permission to allot leads.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { leadIds, assigneeId } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one lead to allot.' }, { status: 400 })
    }

    if (!assigneeId || typeof assigneeId !== 'string') {
      return NextResponse.json({ error: 'Please select a valid staff member to allot leads to.' }, { status: 400 })
    }

    // Verify target staff member exists
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, fullName: true, email: true }
    })

    if (!assignee) {
      return NextResponse.json({ error: 'Selected staff member was not found.' }, { status: 404 })
    }

    // 1. Update leads: set assignedTo = assigneeId and status = 'Allotted' (if New or Assigned)
    const updateAllottedStatusRes = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        status: { in: ['New', 'new', 'Assigned', 'assigned', 'Allotted', 'allotted'] }
      },
      data: {
        assignedTo: assigneeId,
        status: 'Allotted'
      }
    })

    // 2. For leads with other active statuses (Follow Up, Quotation Sent, etc.), keep their status but assign the lead
    const updateOtherLeadsRes = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        status: { notIn: ['New', 'new', 'Assigned', 'assigned', 'Allotted', 'allotted', 'Trashed'] }
      },
      data: {
        assignedTo: assigneeId
      }
    })

    const totalUpdated = updateAllottedStatusRes.count + updateOtherLeadsRes.count

    // 3. Create LeadAssignment audit records
    try {
      const assignmentData = leadIds.map(leadId => ({
        leadId,
        userId: assigneeId
      }))
      await prisma.leadAssignment.createMany({
        data: assignmentData,
        skipDuplicates: true
      })
    } catch (assignErr) {
      console.warn('LeadAssignment bulk insert warning:', assignErr)
    }

    // 4. Send notification to the assignee
    try {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          title: `📋 ${totalUpdated} New Leads Allotted`,
          body: `You have been allotted ${totalUpdated} leads by ${context.fullName || 'Admin'}.`,
          type: 'INFO'
        }
      })
    } catch (notifErr) {
      console.warn('Allotment notification warning:', notifErr)
    }

    // 5. Create activity log
    try {
      await prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'LEADS_ALLOTTED',
          entityType: 'LEAD',
          entityId: assigneeId,
          metadata: {
            leadCount: totalUpdated,
            assigneeName: assignee.fullName,
            leadIds
          }
        }
      })
    } catch (logErr) {
      console.warn('ActivityLog warning:', logErr)
    }

    // 6. Record sync events for offline mobile SQLite synchronization
    recordBulkSyncEvents(leadIds.map(id => ({
      entityType: 'lead',
      entityId: id,
      action: 'update',
      payload: { assignedTo: assigneeId, status: 'Allotted' },
      userId: assigneeId
    }))).catch(() => {})

    return NextResponse.json({
      success: true,
      count: totalUpdated,
      assignee: assignee.fullName,
      message: `Successfully allotted ${totalUpdated} lead(s) to ${assignee.fullName}.`
    })
  } catch (err: any) {
    console.error('POST /api/v1/leads/assign Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to allot leads' }, { status: 500 })
  }
}
