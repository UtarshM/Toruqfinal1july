import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'policy.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const roleUpper = (context.role || '').toUpperCase()
    const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
    const isManager = roleUpper.includes('MANAGER')
    const isExecutive = !isAdmin && !isManager

    const where: any = {}
    if (status && status !== 'all') where.status = status

    if (fromParam || toParam) {
      where.createdAt = {}
      if (fromParam) {
        const d = new Date(fromParam)
        d.setHours(0, 0, 0, 0)
        if (!isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (toParam) {
        const d = new Date(toParam)
        d.setHours(23, 59, 59, 999)
        if (!isNaN(d.getTime())) where.createdAt.lte = d
      }
    }

    // Role-based scope filtering
    if (isExecutive) {
      // Sales executive only sees their own assigned leads' policies
      where.lead = {
        assignedTo: context.userId
      }
    } else if (isManager && !isAdmin) {
      // Manager sees team members' policies
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamMemberIds = [context.userId, ...team.map(t => t.id)]
      where.lead = {
        assignedTo: { in: teamMemberIds }
      }
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            vehicleNo: true,
            assignedTo: true,
            customFields: true,
            assignee: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    })

    // If Sales Executive, filter out policies where manager disabled visibility (visibleToSalesPerson === false)
    const filteredPolicies = policies.filter(p => {
      if (!isExecutive) return true
      const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {}
      const sub = cf.policySubmission
      if (sub && sub.visibleToSalesPerson === false) {
        return false
      }
      return true
    })

    // Format response to include convenience fields
    const formatted = filteredPolicies.map(p => {
      const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {}
      const sub = cf.policySubmission || {}
      return {
        ...p,
        salesPersonName: p.lead?.assignee?.fullName || 'Direct',
        clientPhone: p.lead?.clientPhone,
        visibleToSalesPerson: sub.visibleToSalesPerson !== false,
        compiledPdfUrl: sub.compiledPdfUrl || null,
        documentsCount: sub.documents?.length || 0,
        submissionStatus: sub.status || 'Approved'
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Policies GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'policy.create')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isManagerOrAdmin = roleUpper.includes('MANAGER') || roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')

  if (!isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Managers and Admins can create or issue policies.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const policy = await prisma.policy.create({
      data: {
        leadId: body.lead_id,
        policyNumber: body.policy_number,
        provider: body.provider,
        type: body.type,
        premiumAmount: body.premium_amount,
        status: body.status || 'Active',
        startDate: new Date(body.start_date),
        endDate: new Date(body.end_date)
      }
    })
    return NextResponse.json(policy)
  } catch (error) {
    console.error('Policy POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
