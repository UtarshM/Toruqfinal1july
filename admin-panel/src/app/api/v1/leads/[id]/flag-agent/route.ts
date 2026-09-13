import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notifyRole } from '@/lib/notify'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { assignee: true }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const roleName = (context.role || '').toUpperCase()
    const isAdmin = roleName.includes('SUPER') || roleName.includes('ADMIN') || context.permissions.includes('data.approve_changes')

    // IF NON-ADMIN: Submit for Admin Approval
    if (!isAdmin) {
      const existingRequest = await prisma.dataChangeRequest.findFirst({
        where: {
          entityType: 'Lead',
          entityId: lead.id,
          field: 'existingAgent',
          status: 'pending'
        }
      })

      if (existingRequest) {
        return NextResponse.json({
          success: true,
          pendingApproval: true,
          message: 'An Agent approval request is already pending Admin review.'
        })
      }

      const request = await prisma.dataChangeRequest.create({
        data: {
          requestedBy: context.userId,
          entityType: 'Lead',
          entityId: lead.id,
          field: 'existingAgent',
          oldValue: lead.existingAgent || 'Regular',
          newValue: 'Agent',
          reason: 'Staff requested to mark as Agent',
          status: 'pending'
        }
      })

      // Notify Admins
      const senderName = context.fullName || context.email || 'Sales Executive'
      await notifyRole('Admin', {
        title: `🚨 Agent Approval Request: ${lead.clientName}`,
        body: `${senderName} requested to mark ${lead.clientName} (${lead.clientPhone || 'No Phone'}) as Agent.`,
        type: 'action',
        entityType: 'DataChangeRequest',
        entityId: request.id,
        data: {
          leadId: lead.id,
          requestId: request.id,
          clientName: lead.clientName,
          clientPhone: lead.clientPhone,
          vehicleNo: lead.vehicleNo,
          senderId: context.userId,
          senderName
        }
      }).catch(() => {})

      try {
        await prisma.activityLog.create({
          data: {
            userId: context.userId,
            action: 'FLAG_AGENT_REQUESTED',
            entityType: 'Lead',
            entityId: lead.id,
            metadata: {
              details: `Submitted agent approval request for lead "${lead.clientName}" (${lead.vehicleNo}) to Admin.`
            }
          }
        })
      } catch {}

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: 'Agent tag requested. Sent to Admin for approval. Spreadsheet and lead status will update once approved.'
      })
    }

    // IF ADMIN: Approve and apply directly to DB
    await prisma.lead.update({
      where: { id },
      data: {
        existingAgent: 'Agent',
        assignedTo: null
      }
    })

    if (lead.clientPhone) {
      await prisma.lead.updateMany({
        where: {
          clientPhone: lead.clientPhone,
          id: { not: id }
        },
        data: {
          existingAgent: 'Agent',
          assignedTo: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Lead marked as Agent successfully.'
    })
  } catch (err: any) {
    console.error('[flag-agent] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
