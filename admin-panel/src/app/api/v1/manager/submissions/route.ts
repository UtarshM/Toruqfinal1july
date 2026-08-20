import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { updateMonthlyMasterSheet } from '../monthly-sheet/route'
import { autoAssignUpcomingRenewals } from '@/lib/renewal-helper'

function generateCopyableSummary(formData: any, lead: any): string {
  const d = formData || {}
  const regNo = d.regNo || lead?.vehicleNo || 'NA'
  const mob1 = d.mobileNo1 || lead?.clientPhone || 'NA'
  const mob2 = d.mobileNo2 || 'NA'
  const customerName = lead?.clientName || 'NA'
  const policyType = d.policyType || 'nil dep'
  const customerType = d.customerType || 'existing'
  const customerCat = d.customerCategory || 'MVC'
  const rate = d.rate || 'NA'
  const rateSS = d.rateConfirmationSS || 'YES'
  const rsFromCust = d.rsFromCustomer || 'NA'
  const paymentMode = d.paymentMode || 'cash'
  const ncb = d.ncb || 'with ncb'
  const expDate = d.expDate || (lead?.expiryDate ? new Date(lead.expiryDate).toLocaleDateString('en-GB') : 'NA')
  const ncbConf = d.ncbConfirmation || 'Yes'
  const impDateSS = d.impDateMsgSS || 'Yes'
  const hpDetails = d.hpDetails || 'as per rc'
  const vehPhoto = d.vehiclePhoto || 'n.a.'
  const bodyMatch = d.bodyTypeMatched || 'n.a.'
  const gForm = d.googleFormSubmitted || 'YES'
  const noJackSS = d.noJackCoverConfirmationSS || 'N.A.'
  const idvBreakup = d.idvBreakup || 'NA'
  const desc = d.description || 'NA'
  const otherWorks = d.otherWorks || 'NA'
  const newName = d.newName || 'NA'
  const inspStatus = d.inspectionStatus || 'Not Required'
  const mparivahan = d.mparivahanRcStatus || 'NA'
  const amtDueSS = d.amountDueDateMsgSS || 'NA'

  return `POLICY SUBMISSION DETAILS
----------------------------------------
Registration No: ${regNo}
Customer Name: ${customerName}
Mobile No 1: ${mob1}
Mobile No 2: ${mob2}
Policy Type: ${policyType}
Customer Type: ${customerType}
Category: ${customerCat}
Rate: ${rate}
Rate Confirmation SS: ${rateSS}
Rs From Customer: ${rsFromCust}
Payment Mode: ${paymentMode}
NCB: ${ncb}
Expiry Date: ${expDate}
NCB Confirmation: ${ncbConf}
IMP Date Msg SS: ${impDateSS}
HP Details: ${hpDetails}
Vehicle Photo: ${vehPhoto}
Body Type Matched: ${bodyMatch}
Google Form Submitted: ${gForm}
No Jack Cover SS: ${noJackSS}
IDV Breakup: ${idvBreakup}
Inspection Status: ${inspStatus}
Mparivahan RC Status: ${mparivahan}
Amount Due Date Msg SS: ${amtDueSS}
New Name: ${newName}
Description: ${desc}
Other Works: ${otherWorks}`
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || 'all'
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const roleUpper = (context.role || '').toUpperCase()
    const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
    const isManager = roleUpper.includes('MANAGER')
    const isExecutive = !isAdmin && !isManager

    const where: any = {
      status: { not: 'Trashed' },
      deletedAt: null
    }

    if (isExecutive) {
      where.assignedTo = context.userId
    } else if (isManager && !isAdmin) {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamMemberIds = [context.userId, ...team.map(t => t.id)]
      where.assignedTo = { in: teamMemberIds }
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignee: {
          select: { id: true, fullName: true, personalMobile: true }
        }
      }
    })

    const submissions: any[] = []

    leads.forEach(lead => {
      const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
      if (cf.policySubmission) {
        const sub = cf.policySubmission
        const rawStatus = sub.status || 'Draft'
        
        // Normalize status for filtering
        let normalizedStatus = rawStatus
        if (rawStatus === 'Approved') normalizedStatus = 'Documents_Approved'

        if (statusFilter !== 'all') {
          if (statusFilter === 'Pending_Review' && rawStatus !== 'Pending_Review') return
          if (statusFilter === 'Documents_Approved' && rawStatus !== 'Documents_Approved' && rawStatus !== 'Approved') return
          if (statusFilter === 'Policy_Issued' && rawStatus !== 'Policy_Issued') return
          if (statusFilter === 'Reverted' && rawStatus !== 'Reverted') return
        }

        if (search) {
          const matchClient = (lead.clientName || '').toLowerCase().includes(search)
          const matchPhone = (lead.clientPhone || '').toLowerCase().includes(search)
          const matchVehicle = (lead.vehicleNo || '').toLowerCase().includes(search)
          const matchAssignee = (lead.assignee?.fullName || '').toLowerCase().includes(search)
          if (!matchClient && !matchPhone && !matchVehicle && !matchAssignee) {
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
            status: rawStatus === 'Approved' ? 'Documents_Approved' : rawStatus,
            copyableSummary: generateCopyableSummary(sub.formData, lead)
          },
          updatedAt: sub.updatedAt || lead.updatedAt
        })
      }
    })

    // Sort: Pending_Review first, then Documents_Approved, then newest
    submissions.sort((a, b) => {
      if (a.submission.status === 'Pending_Review' && b.submission.status !== 'Pending_Review') return -1
      if (b.submission.status === 'Pending_Review' && a.submission.status !== 'Pending_Review') return 1
      if (a.submission.status === 'Documents_Approved' && b.submission.status === 'Policy_Issued') return -1
      if (b.submission.status === 'Documents_Approved' && a.submission.status === 'Policy_Issued') return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    const stats = {
      total: submissions.length,
      pending: submissions.filter(s => s.submission.status === 'Pending_Review').length,
      docsApproved: submissions.filter(s => s.submission.status === 'Documents_Approved' || s.submission.status === 'Approved').length,
      policyIssued: submissions.filter(s => s.submission.status === 'Policy_Issued').length,
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
    return NextResponse.json({ error: 'Forbidden: Only Managers and Admins can approve documents or upload issued policies.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { 
      leadId, action, revertReason, notes, visibleToSalesPerson,
      policyNumber, provider, policyType, issuedPolicyPdfUrl,
      totalPremium, paidAmount, pendingAmount, paymentMode, startDate, endDate
    } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignee: true }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || {}
    const managerName = context.name || context.fullName || 'Manager'

    // ==========================================
    // ACTION 1: APPROVE_DOCS (Documents Only)
    // ==========================================
    if (action === 'APPROVE' || action === 'APPROVE_DOCS') {
      const isVisibleToSales = visibleToSalesPerson !== undefined ? (visibleToSalesPerson === true) : true
      const historyEntry = {
        action: 'DOCUMENTS_APPROVED',
        by: managerName,
        userId: context.userId,
        timestamp: new Date().toISOString(),
        notes: notes || 'All 7 verified documents approved by manager. Ready for insurance company issuance.'
      }

      const updatedSubmission = {
        ...submission,
        status: 'Documents_Approved',
        visibleToSalesPerson: isVisibleToSales,
        documentsApprovedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: context.userId,
        reviewedByName: managerName,
        revertReason: null,
        history: [...(submission.history || []), historyEntry],
        updatedAt: new Date().toISOString()
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'In Progress',
          customFields: {
            ...cf,
            policySubmission: updatedSubmission
          }
        }
      })

      // Notify Sales Person
      if (lead.assignedTo) {
        try {
          await prisma.notification.create({
            data: {
              userId: lead.assignedTo,
              title: `✅ Documents Approved: ${lead.clientName}`,
              body: `Manager ${managerName} approved the document bundle for ${lead.vehicleNo || lead.clientName}. It is now sent for external policy issuance.`,
              type: 'policy_approved',
              entityType: 'lead',
              entityId: leadId,
              data: { leadId, clientName: lead.clientName, vehicleNo: lead.vehicleNo, managerName }
            }
          })
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: 'Documents approved successfully. Ready for policy PDF upload once issued by insurer.'
      })
    }

    // ==========================================
    // ACTION 2: UPLOAD_ISSUED_POLICY
    // ==========================================
    if (action === 'UPLOAD_POLICY' || action === 'UPLOAD_ISSUED_POLICY') {
      if (!issuedPolicyPdfUrl && !body.policyFileUrl) {
        return NextResponse.json({ error: 'Issued Policy PDF file URL is required' }, { status: 400 })
      }

      const finalPdfUrl = issuedPolicyPdfUrl || body.policyFileUrl
      const finalPolicyNo = policyNumber || submission.formData?.policyNumber || `POL-${(lead.vehicleNo || 'NA').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`
      const finalProvider = provider || submission.formData?.provider || 'Torque Insurance'
      const finalType = policyType || submission.formData?.policyType || 'Motor'
      const rawTotalPrem = parseFloat(totalPremium || submission.formData?.rsFromCustomer || submission.formData?.rate || '0') || 0
      const rawPaid = parseFloat(paidAmount !== undefined ? paidAmount : (submission.formData?.paidAmount || rawTotalPrem)) || 0
      const rawPending = Math.max(0, rawTotalPrem - rawPaid)
      const finalPaymentMode = paymentMode || submission.formData?.paymentMode || 'Cash'

      const policyStartDate = startDate ? new Date(startDate) : new Date()
      let policyEndDate = new Date(policyStartDate.getTime() + 365 * 24 * 3600 * 1000)
      if (endDate) {
        const parsed = new Date(endDate)
        if (!isNaN(parsed.getTime())) policyEndDate = parsed
      }

      // 1. Create or Update Official Policy Record
      const existingPolicy = await prisma.policy.findFirst({
        where: { leadId }
      })

      let policyRecord = null
      if (existingPolicy) {
        policyRecord = await prisma.policy.update({
          where: { id: existingPolicy.id },
          data: {
            policyNumber: finalPolicyNo,
            provider: finalProvider,
            type: finalType,
            premiumAmount: rawTotalPrem,
            status: 'Active',
            startDate: policyStartDate,
            endDate: policyEndDate
          }
        })
      } else {
        policyRecord = await prisma.policy.create({
          data: {
            leadId,
            policyNumber: finalPolicyNo,
            provider: finalProvider,
            type: finalType,
            premiumAmount: rawTotalPrem,
            status: 'Active',
            startDate: policyStartDate,
            endDate: policyEndDate
          }
        })
      }

      // 2. Record Initial Payment in Transaction Ledger
      if (policyRecord && rawPaid > 0) {
        const existingTxn = await prisma.transaction.findFirst({
          where: { policyId: policyRecord.id, type: 'income' }
        })
        if (!existingTxn) {
          await prisma.transaction.create({
            data: {
              userId: context.userId,
              policyId: policyRecord.id,
              leadId,
              type: 'income',
              category: 'Policy Premium',
              amount: rawPaid,
              status: 'completed',
              paymentMethod: finalPaymentMode,
              referenceNumber: body.referenceNumber || null,
              description: `Initial premium for policy ${finalPolicyNo}`,
              date: new Date()
            }
          })
        }
      }
      // 2.5 Auto-create RenewalRecord for renewal lifecycle
      if (policyRecord) {
        try {
          await prisma.renewalRecord.create({
            data: {
              leadId,
              policyId: policyRecord.id,
              vehicleNo: lead.vehicleNo || null,
              clientName: lead.clientName || 'Unknown',
              clientPhone: lead.clientPhone || null,
              clientEmail: lead.clientEmail || null,
              policyNumber: finalPolicyNo,
              provider: finalProvider,
              policyType: finalType,
              premiumAmount: rawTotalPrem,
              policyStartDate: policyStartDate,
              policyEndDate: policyEndDate,
              renewalStatus: 'Active',
              createdBySalesId: lead.assignedTo || context.userId,
              documents: finalPdfUrl ? [finalPdfUrl] : []
            }
          })
        } catch (renewalErr) {
          console.warn('[submissions] Failed to create renewal record:', renewalErr)
        }
      }
      // 3. Update Lead CustomFields to Policy_Issued
      const historyEntry = {
        action: 'POLICY_ISSUED_UPLOADED',
        by: managerName,
        userId: context.userId,
        timestamp: new Date().toISOString(),
        notes: `Issued policy PDF uploaded by Manager. Policy #${finalPolicyNo} is now live.`
      }

      const updatedSubmission = {
        ...submission,
        status: 'Policy_Issued',
        policyId: policyRecord.id,
        policyNumber: finalPolicyNo,
        issuedPolicyPdfUrl: finalPdfUrl,
        issuedAt: new Date().toISOString(),
        formData: {
          ...(submission.formData || {}),
          policyNumber: finalPolicyNo,
          provider: finalProvider,
          policyType: finalType,
          totalPremium: rawTotalPrem,
          paidAmount: rawPaid,
          pendingAmount: rawPending,
          paymentMode: finalPaymentMode,
          expDate: policyEndDate.toISOString().split('T')[0]
        },
        history: [...(submission.history || []), historyEntry],
        updatedAt: new Date().toISOString()
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'Won',
          expiryDate: policyEndDate,
          customFields: {
            ...cf,
            policySubmission: updatedSubmission
          }
        }
      })

      // 4. Automatically scrape/update Monthly Master Sheet for this month
      const currentMonthStr = new Date().toISOString().slice(0, 7)
      try {
        await updateMonthlyMasterSheet(currentMonthStr)
      } catch (sheetErr) {
        console.error('[manager submissions] Failed to update monthly master sheet:', sheetErr)
      }

      // 4.5 Trigger auto-assignment of upcoming renewals expiring in < 30 days
      try {
        await autoAssignUpcomingRenewals()
      } catch (autoErr) {
        console.error('[manager submissions] Auto-assign error:', autoErr)
      }

      // 5. Notify Sales Person & Admin
      if (lead.assignedTo) {
        try {
          await prisma.notification.create({
            data: {
              userId: lead.assignedTo,
              title: `🎉 Policy Issued: ${lead.clientName}`,
              body: `Official policy ${finalPolicyNo} (${finalProvider}) has been uploaded and is active. 1-year renewal tracking enabled.`,
              type: 'policy_issued',
              entityType: 'lead',
              entityId: leadId
            }
          })
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: `Policy ${finalPolicyNo} uploaded and issued successfully. Scraped to monthly master sheet.`,
        policy: policyRecord
      })
    }

    // ==========================================
    // ACTION 3: REVERT
    // ==========================================
    if (action === 'REVERT') {
      if (!revertReason?.trim()) {
        return NextResponse.json({ error: 'Revert reason is required' }, { status: 400 })
      }

      const historyEntry = {
        action: 'REVERTED',
        by: managerName,
        userId: context.userId,
        timestamp: new Date().toISOString(),
        notes: revertReason
      }

      const updatedSubmission = {
        ...submission,
        status: 'Reverted',
        revertReason,
        revertedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: context.userId,
        reviewedByName: managerName,
        history: [...(submission.history || []), historyEntry],
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

      if (lead.assignedTo) {
        try {
          await prisma.notification.create({
            data: {
              userId: lead.assignedTo,
              title: `⚠️ Document Revert: ${lead.clientName} (${lead.vehicleNo || 'Vehicle'})`,
              body: `Manager ${managerName} requested changes: "${revertReason}". Please re-upload docs and re-submit.`,
              type: 'policy_reverted',
              entityType: 'lead',
              entityId: leadId
            }
          })
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: 'Submission reverted to sales executive.'
      })
    }

    // ==========================================
    // ACTION 4: TOGGLE_VISIBILITY
    // ==========================================
    if (action === 'TOGGLE_VISIBILITY') {
      const isVisible = visibleToSalesPerson === true
      const updatedSubmission = {
        ...submission,
        visibleToSalesPerson: isVisible,
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

      return NextResponse.json({ success: true, visibleToSalesPerson: isVisible })
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 })
  } catch (err: any) {
    console.error('[manager submissions action] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
