import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // e.g. "2027-08"
    const urgency = searchParams.get('urgency') // 'all', 'overdue', '30days', '60days', 'this_month', 'renewed'
    const status = searchParams.get('status') // 'Pending Contact', 'Follow-up In Progress', 'Quotation Sent', 'Renewed', 'Lost', 'all'
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const roleUpper = (context.role || '').toUpperCase()
    const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
    const isManager = roleUpper.includes('MANAGER')
    const isExecutive = !isAdmin && !isManager

    const where: any = {}

    // Role-based filtering
    if (isExecutive) {
      where.lead = {
        assignedTo: context.userId
      }
    } else if (isManager && !isAdmin) {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamMemberIds = [context.userId, ...team.map(t => t.id)]
      where.lead = {
        assignedTo: { in: teamMemberIds }
      }
    }

    // Month filter for expiry date
    if (month && month !== 'all') {
      const [y, m] = month.split('-').map(Number)
      if (y && m) {
        const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0)
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)
        where.endDate = {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { endDate: 'asc' }, // Soonest expiring first
      include: {
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            clientEmail: true,
            vehicleNo: true,
            gvw: true,
            customFields: true,
            expiryDate: true,
            assignee: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    })

    const now = Date.now()

    const items = policies.map(p => {
      const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {}
      const submission = cf.policySubmission || {}
      const formData = submission.formData || {}

      // Sales visibility filter for executives
      if (isExecutive && submission.visibleToSalesPerson === false) {
        return null
      }

      const expiryDate = p.endDate ? new Date(p.endDate) : (p.lead?.expiryDate ? new Date(p.lead.expiryDate) : null)
      let daysRemaining = 999
      if (expiryDate) {
        daysRemaining = Math.ceil((expiryDate.getTime() - now) / (1000 * 3600 * 24))
      }

      let urgencyCategory = 'Upcoming'
      if (daysRemaining < 0) {
        urgencyCategory = 'Overdue'
      } else if (daysRemaining <= 30) {
        urgencyCategory = '30days'
      } else if (daysRemaining <= 60) {
        urgencyCategory = '60days'
      }

      const renewalStatus = cf.renewalStatus || (daysRemaining < 0 ? 'Overdue / Expired' : 'Pending Contact')
      const renewalNotes = cf.renewalNotes || ''
      const renewalFollowUpDate = cf.renewalFollowUpDate || null

      return {
        id: p.id,
        policyNumber: p.policyNumber,
        provider: p.provider,
        type: p.type,
        premiumAmount: Number(p.premiumAmount) || 0,
        issueDate: p.startDate ? new Date(p.startDate).toISOString() : p.createdAt.toISOString(),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        daysRemaining,
        urgencyCategory,
        renewalStatus,
        renewalNotes,
        renewalFollowUpDate,
        leadId: p.lead?.id || null,
        clientName: p.lead?.clientName || 'Unknown Customer',
        clientPhone: p.lead?.clientPhone || '',
        clientEmail: p.lead?.clientEmail || '',
        vehicleNo: p.lead?.vehicleNo || 'N/A',
        gvw: p.lead?.gvw || '',
        salesPersonName: p.lead?.assignee?.fullName || 'Unassigned',
        salesPersonId: p.lead?.assignee?.id || null,
        compiledPdfUrl: submission.compiledPdfUrl || null,
        documentsCount: submission.documents?.length || 0,
        submissionStatus: submission.status || 'Active'
      }
    }).filter(Boolean) as any[]

    // Filter by search, urgency, and status
    let filtered = items

    if (search) {
      filtered = filtered.filter(item =>
        item.policyNumber.toLowerCase().includes(search) ||
        item.clientName.toLowerCase().includes(search) ||
        item.vehicleNo.toLowerCase().includes(search) ||
        item.clientPhone.toLowerCase().includes(search) ||
        item.salesPersonName.toLowerCase().includes(search) ||
        item.provider.toLowerCase().includes(search)
      )
    }

    if (urgency && urgency !== 'all') {
      if (urgency === 'overdue') {
        filtered = filtered.filter(i => i.daysRemaining < 0)
      } else if (urgency === '30days') {
        filtered = filtered.filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 30)
      } else if (urgency === '60days') {
        filtered = filtered.filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 60)
      } else if (urgency === 'renewed') {
        filtered = filtered.filter(i => i.renewalStatus === 'Renewed')
      }
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(i => i.renewalStatus.toLowerCase() === status.toLowerCase())
    }

    // Summary statistics
    const totalRenewals = items.length
    const expiring30Days = items.filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 30).length
    const overdueCount = items.filter(i => i.daysRemaining < 0).length
    const renewedCount = items.filter(i => i.renewalStatus === 'Renewed').length
    const totalVolume = items.reduce((sum, i) => sum + i.premiumAmount, 0)

    // Current month expiring count
    const currentMonthPrefix = new Date().toISOString().slice(0, 7)
    const expiringThisMonth = items.filter(i => i.expiryDate && i.expiryDate.startsWith(currentMonthPrefix)).length

    return NextResponse.json({
      items: filtered,
      summary: {
        totalRenewals,
        expiringThisMonth,
        expiring30Days,
        overdueCount,
        renewedCount,
        totalVolume
      }
    })
  } catch (err: any) {
    console.error('[renewals GET] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.update')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { leadId, renewalStatus, renewalNotes, renewalFollowUpDate } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}

    const updatedCustomFields = {
      ...cf,
      renewalStatus: renewalStatus || cf.renewalStatus,
      renewalNotes: renewalNotes !== undefined ? renewalNotes : cf.renewalNotes,
      renewalFollowUpDate: renewalFollowUpDate !== undefined ? renewalFollowUpDate : cf.renewalFollowUpDate,
      renewalUpdatedAt: new Date().toISOString(),
      renewalUpdatedBy: context.name || context.fullName || 'Staff'
    }

    // If marked as renewed, update lead status to Converted / Active
    const newStatus = renewalStatus === 'Renewed' ? 'Converted' : lead.status

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        customFields: updatedCustomFields,
        status: newStatus
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Renewal status updated successfully'
    })
  } catch (err: any) {
    console.error('[renewals PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
