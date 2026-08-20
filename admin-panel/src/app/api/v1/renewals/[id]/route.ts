import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

/**
 * PATCH /api/v1/renewals/[id] — Update renewal record (status, assignment, etc.)
 * DELETE /api/v1/renewals/[id] — Soft-delete or remove renewal
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()

    const renewal = await prisma.renewalRecord.findUnique({ where: { id } })
    if (!renewal) return NextResponse.json({ error: 'Renewal not found' }, { status: 404 })

    const updateData: any = {}

    // Allow updating status
    if (body.renewalStatus) {
      updateData.renewalStatus = body.renewalStatus
      if (body.renewalStatus === 'Renewed') {
        updateData.renewedAt = new Date()
      } else if (body.renewalStatus === 'Refused') {
        updateData.refusedAt = new Date()
      }
    }

    // Allow re-assignment
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo
    }
    if (body.assignedMonth) updateData.assignedMonth = body.assignedMonth
    if (body.assignedYear) updateData.assignedYear = body.assignedYear

    // Allow updating documents
    if (body.documents !== undefined) {
      updateData.documents = body.documents
    }

    // Allow updating custom data
    if (body.customData !== undefined) {
      updateData.customData = body.customData
    }

    const updated = await prisma.renewalRecord.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, fullName: true } },
        lead: { select: { id: true, clientName: true, status: true } }
      }
    })

    // If refused → recycle back to leads pool as a normal unassigned lead
    if (body.renewalStatus === 'Refused' && renewal.leadId) {
      await prisma.lead.update({
        where: { id: renewal.leadId },
        data: {
          status: 'New',
          assignedTo: null // unassign so admin can re-assign
        }
      }).catch(() => {})
    }

    // Notify about renewal status change
    if (body.renewalStatus && renewal.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: renewal.assignedTo,
          title: `📋 Renewal ${body.renewalStatus}: ${renewal.clientName}`,
          body: `Renewal for ${renewal.clientName} (${renewal.vehicleNo || 'N/A'}) has been marked as ${body.renewalStatus}.`,
          type: 'info',
          entityType: 'renewal',
          data: { renewalId: id, status: body.renewalStatus }
        }
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, renewal: updated })
  } catch (err: any) {
    console.error('[renewals PATCH] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update renewal' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    const renewal = await prisma.renewalRecord.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
        lead: { select: { id: true, clientName: true, clientPhone: true, status: true, vehicleNo: true } },
        policy: { select: { id: true, policyNumber: true, provider: true, status: true, startDate: true, endDate: true } }
      }
    })

    if (!renewal) return NextResponse.json({ error: 'Renewal not found' }, { status: 404 })

    return NextResponse.json({ renewal })
  } catch (err: any) {
    console.error('[renewals GET by ID] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
