import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

export function generateCopyableSummary(formData: any, lead: any): string {
  const f = formData || {}
  return `*Policy Type:* ${f.policyType || 'nil dep'}
*Customer Type:* ${f.customerType || 'existing'}
*Customer Category:* ${f.customerCategory || 'MVC'}
*Reg No:* ${f.regNo || lead?.vehicleNo || ''}
*Rate:* ${f.rate || ''}
*Rate Confirmation SS:* ${f.rateConfirmationSS || 'YES'}
*Rs From Customer:* ${f.rsFromCustomer || ''}
*Description:* ${f.description || ''}
*Other Works:* ${f.otherWorks || ''}
*Payment mode*:- ${f.paymentMode || 'cash'}
*NCB:* ${f.ncb || 'with ncb'}
*Exp Date:* ${f.expDate || (lead?.expiryDate ? new Date(lead.expiryDate).toLocaleDateString('en-GB') : '')}
*Mobile No. 1:* ${f.mobileNo1 || lead?.clientPhone || ''}
*Mobile No. 2:* ${f.mobileNo2 || ''}
*NCB Confirmation:* ${f.ncbConfirmation || 'Yes'}
*Imp Date msg SS:* ${f.impDateMsgSS || 'Yes'}
*HP Details*:- ${f.hpDetails || 'as per rc'}
*Vehicle Photo:* ${f.vehiclePhoto || 'n.a.'}
*Body Type Matched:* ${f.bodyTypeMatched || 'n.a.'}
*Google Form Submitted:* ${f.googleFormSubmitted || 'YES'}

*No-Jack Cover Confirmation SS:* ${f.noJackCoverConfirmationSS || 'N.A.'}
*IDV Break up:* ${f.idvBreakup || ''}
*New name:* ${f.newName || ''}
*Inspection status:* ${f.inspectionStatus || 'Not Required'}
*Mparivahan RC / RC Status:* ${f.mparivahanRcStatus || ''}
*Amount and Due Date confirmation msg SS:* ${f.amountDueDateMsgSS || ''}`
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'
    const search = searchParams.get('search')?.toLowerCase() || ''

    const roleUpper = context.role?.toUpperCase() || ''
    const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
    const isManager = roleUpper.includes('MANAGER')

    // Find all team members if manager
    let teamMemberIds: string[] = []
    if (isManager && !isAdmin) {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      teamMemberIds = [context.userId, ...team.map(t => t.id)]
    }

    const whereClause: any = {
      status: { not: 'Trashed' },
      deletedAt: null
    }

    if (teamMemberIds.length > 0) {
      whereClause.assignedTo = { in: teamMemberIds }
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true, personalMobile: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Filter leads that have policy submissions
    const submissions: any[] = []
    leads.forEach(lead => {
      const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
      const sub = cf.policySubmission
      if (sub && (sub.documents?.length > 0 || sub.compiledPdfUrl || sub.status !== 'Draft')) {
        const subStatus = sub.status || 'Draft'

        // Apply status filter
        if (statusFilter !== 'all' && subStatus.toLowerCase() !== statusFilter.toLowerCase()) {
          return
        }

        // Apply search filter
        if (search) {
          const matchClient = (lead.clientName || '').toLowerCase().includes(search)
          const matchPhone = (lead.clientPhone || '').toLowerCase().includes(search)
          const matchVehicle = (lead.vehicleNo || '').toLowerCase().includes(search)
          const matchSales = (lead.assignee?.fullName || '').toLowerCase().includes(search)
          const matchReg = (sub.formData?.regNo || '').toLowerCase().includes(search)

          if (!matchClient && !matchPhone && !matchVehicle && !matchSales && !matchReg) {
            return
          }
        }

        submissions.push({
          leadId: lead.id,
          clientName: lead.clientName,
          clientPhone: lead.clientPhone,
          vehicleNo: lead.vehicleNo,
          expiryDate: lead.expiryDate,
          leadStatus: lead.status,
          assignee: lead.assignee,
          submission: {
            ...sub,
            copyableSummary: generateCopyableSummary(sub.formData, lead)
          },
          updatedAt: sub.updatedAt || lead.updatedAt
        })
      }
    })

    // Sort: Pending_Review first, then newest
    submissions.sort((a, b) => {
      if (a.submission.status === 'Pending_Review' && b.submission.status !== 'Pending_Review') return -1
      if (b.submission.status === 'Pending_Review' && a.submission.status !== 'Pending_Review') return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    const stats = {
      total: submissions.length,
      pending: submissions.filter(s => s.submission.status === 'Pending_Review').length,
      approved: submissions.filter(s => s.submission.status === 'Approved').length,
      reverted: submissions.filter(s => s.submission.status === 'Reverted').length
    }

    return NextResponse.json({ submissions, stats })
  } catch (err: any) {
    console.error('[manager submissions GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch submissions', details: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.edit')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')

  if (!isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Managers and Admins can approve, revert, or modify policy approvals.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { leadId, action, revertReason, notes, visibleToSalesPerson } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true, personalMobile: true, managerId: true }
        }
      }
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || {}
    const managerName = context.name || 'Manager'

    // ACTION: TOGGLE VISIBILITY ONLY
    if (action === 'TOGGLE_VISIBILITY') {
      const updatedSubmission = {
        ...submission,
        visibleToSalesPerson: visibleToSalesPerson !== false,
        updatedAt: new Date().toISOString()
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          customFields: {
            ...cf,
            policySubmission: updatedSubmission
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Policy visibility updated: visible to sales person = ${visibleToSalesPerson !== false}`,
        visibleToSalesPerson: visibleToSalesPerson !== false
      })
    }

    if (!['APPROVE', 'REVERT'].includes(action)) {
      return NextResponse.json({ error: 'Valid action (APPROVE, REVERT, or TOGGLE_VISIBILITY) is required' }, { status: 400 })
    }

    if (action === 'REVERT' && !revertReason?.trim()) {
      return NextResponse.json({ error: 'Revert reason is required when returning documents to sales person' }, { status: 400 })
    }

    const isApprove = action === 'APPROVE'
    const newStatus = isApprove ? 'Approved' : 'Reverted'
    const isVisibleToSales = visibleToSalesPerson !== undefined ? (visibleToSalesPerson === true) : true

    const historyEntry = {
      action: isApprove ? 'APPROVED' : 'REVERTED',
      by: managerName,
      userId: context.userId,
      timestamp: new Date().toISOString(),
      notes: isApprove ? (notes || 'Policy document bundle verified and approved.') : revertReason
    }

    const updatedSubmission = {
      ...submission,
      status: newStatus,
      visibleToSalesPerson: isVisibleToSales,
      reviewedAt: new Date().toISOString(),
      reviewedBy: context.userId,
      reviewedByName: managerName,
      revertReason: isApprove ? null : revertReason,
      revertedAt: isApprove ? null : new Date().toISOString(),
      history: [...(submission.history || []), historyEntry],
      updatedAt: new Date().toISOString()
    }

    // 1. Update Lead CustomFields & Lead Status to Won on Approval
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: isApprove ? 'Won' : lead.status,
        customFields: {
          ...cf,
          policySubmission: updatedSubmission
        }
      }
    })

    // 2. IF APPROVED: Create or Update official Policy in Policy Module
    if (isApprove) {
      try {
        const formData = submission.formData || {}
        const rawPrem = parseFloat(formData.rsFromCustomer || formData.rate || '0') || 0
        const policyNumber = formData.policyNumber || `POL-${(formData.regNo || lead.vehicleNo || 'NA').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`
        
        let expDate = new Date(Date.now() + 365 * 24 * 3600 * 1000)
        if (formData.expDate) {
          const parsed = new Date(formData.expDate)
          if (!isNaN(parsed.getTime())) expDate = parsed
        } else if (lead.expiryDate) {
          const parsed = new Date(lead.expiryDate)
          if (!isNaN(parsed.getTime())) expDate = parsed
        }

        // Check if a policy already exists for this lead
        const existingPolicy = await prisma.policy.findFirst({
          where: { leadId }
        })

        if (existingPolicy) {
          await prisma.policy.update({
            where: { id: existingPolicy.id },
            data: {
              provider: formData.provider || formData.policyType || 'Torque Insurance',
              type: formData.policyType || 'Motor',
              premiumAmount: rawPrem,
              status: 'Active',
              endDate: expDate
            }
          })
        } else {
          await prisma.policy.create({
            data: {
              leadId,
              policyNumber,
              provider: formData.provider || formData.policyType || 'Torque Insurance',
              type: formData.policyType || 'Motor',
              premiumAmount: rawPrem,
              status: 'Active',
              startDate: new Date(),
              endDate: expDate
            }
          })
        }
      } catch (policyErr) {
        console.error('[manager submissions action] Error creating policy record:', policyErr)
      }
    }

    // 3. Send notification to Sales Person
    if (lead.assignedTo) {
      try {
        await prisma.notification.create({
          data: {
            userId: lead.assignedTo,
            title: isApprove
              ? `✅ Policy Approved: ${lead.clientName}`
              : `⚠️ Document Revert: ${lead.clientName} (${lead.vehicleNo || 'Vehicle'})`,
            body: isApprove
              ? `Manager ${managerName} approved the policy bundle for ${lead.vehicleNo || lead.clientName}. It is now live in the Policy Module.`
              : `Manager ${managerName} requested changes: "${revertReason}". Please re-upload docs and re-submit.`,
            type: isApprove ? 'policy_approved' : 'policy_reverted',
            entityType: 'lead',
            entityId: leadId,
            data: {
              leadId,
              clientName: lead.clientName,
              vehicleNo: lead.vehicleNo,
              managerName,
              action,
              revertReason: isApprove ? null : revertReason
            }
          }
        })
      } catch (notifErr) {
        console.error('[manager submissions action] Error creating sales notification:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: isApprove ? 'Policy submission approved and created in Policy Module successfully' : 'Policy submission reverted to sales executive',
      submission: updatedSubmission
    })
  } catch (err: any) {
    console.error('[manager submissions POST] Error:', err)
    return NextResponse.json({ error: 'Failed to process manager action', details: err?.message }, { status: 500 })
  }
}
