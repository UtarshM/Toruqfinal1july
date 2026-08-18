import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const bodyCompiledPdfUrl = body?.compiledPdfUrl

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true, personalMobile: true, managerId: true }
        }
      }
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || { status: 'Draft', formData: {}, documents: [] }

    const compiledPdfUrl = bodyCompiledPdfUrl || submission.compiledPdfUrl

    if (!compiledPdfUrl) {
      return NextResponse.json({ error: 'Please convert documents into Single PDF before submitting to Manager' }, { status: 400 })
    }

    const salesPersonName = lead.assignee?.fullName || context.name || 'Sales Executive'
    const salesPersonId = lead.assignee?.id || context.userId
    const managerId = lead.assignee?.managerId || null

    let managerName = 'Operations Manager'
    if (managerId) {
      const mUser = await prisma.user.findUnique({
        where: { id: managerId },
        select: { fullName: true }
      })
      if (mUser?.fullName) managerName = mUser.fullName
    }

    const historyEntry = {
      action: 'SUBMITTED',
      by: context.name || 'Sales Person',
      userId: context.userId,
      timestamp: new Date().toISOString(),
      notes: `Submitted policy document bundle to manager (${managerName}) for review`
    }

    const updatedSubmission = {
      ...submission,
      compiledPdfUrl,
      status: 'Pending_Review',
      salesPersonId,
      salesPersonName,
      managerId,
      managerName,
      submittedAt: new Date().toISOString(),
      revertReason: null,
      history: [...(submission.history || []), historyEntry],
      updatedAt: new Date().toISOString()
    }

    await prisma.lead.update({
      where: { id },
      data: {
        customFields: {
          ...cf,
          policySubmission: updatedSubmission
        }
      }
    })

    // Create Notification for Manager
    if (managerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: managerId,
            title: `📋 New Policy Submission: ${lead.clientName}`,
            body: `${salesPersonName} submitted policy docs for ${lead.vehicleNo || 'vehicle'}. Review consolidated PDF & details.`,
            type: 'policy_submission',
            entityType: 'lead',
            entityId: id,
            data: {
              leadId: id,
              clientName: lead.clientName,
              vehicleNo: lead.vehicleNo,
              salesPersonName,
              compiledPdfUrl: submission.compiledPdfUrl
            }
          }
        })
      } catch (notifErr) {
        console.error('[submit] Error creating manager notification:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Policy document bundle successfully submitted to Manager',
      submission: updatedSubmission
    })
  } catch (err: any) {
    console.error('[policy-submission submit] Error:', err)
    return NextResponse.json({ error: 'Failed to submit to Manager', details: err?.message }, { status: 500 })
  }
}
