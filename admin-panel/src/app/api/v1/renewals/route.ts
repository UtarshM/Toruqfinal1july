import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

/**
 * GET /api/v1/renewals — List renewal records with filters
 * Query: ?status=Active&month=1&year=2027&assignedTo=uuid&page=1&limit=50
 * 
 * POST /api/v1/renewals — Manually create a renewal record
 */
export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')
  const assignedTo = url.searchParams.get('assignedTo')
  const search = url.searchParams.get('search')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  try {
    const where: any = {}

    // Status filter
    if (status) {
      where.renewalStatus = status
    }

    // Month/year filter on policyEndDate
    if (month && year) {
      const m = parseInt(month)
      const y = parseInt(year)
      const monthStart = new Date(y, m - 1, 1)
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999)
      where.policyEndDate = { gte: monthStart, lte: monthEnd }
    } else if (year) {
      const y = parseInt(year)
      where.policyEndDate = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59, 999) }
    }

    // Assigned to filter
    if (assignedTo) {
      where.assignedTo = assignedTo
    }

    // For sales executives, only show their assigned renewals
    const userRole = context.role?.toUpperCase() || ''
    if (!['SUPER ADMIN', 'ADMIN', 'MANAGER', 'HR MANAGER'].includes(userRole)) {
      where.assignedTo = context.userId
    }

    // Search
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { vehicleNo: { contains: search, mode: 'insensitive' } },
        { policyNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [renewals, total] = await Promise.all([
      prisma.renewalRecord.findMany({
        where,
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          lead: { select: { id: true, clientName: true, status: true } },
          policy: { select: { id: true, policyNumber: true, provider: true, status: true } }
        },
        orderBy: { policyEndDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.renewalRecord.count({ where })
    ])

    // Compute stats
    const stats = await prisma.renewalRecord.groupBy({
      by: ['renewalStatus'],
      _count: { id: true }
    })

    const statusCounts: Record<string, number> = {}
    stats.forEach(s => { statusCounts[s.renewalStatus] = s._count.id })

    return NextResponse.json({
      renewals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: statusCounts
    })
  } catch (err: any) {
    console.error('[renewals GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch renewals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.create')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    if (!body.clientName || !body.policyEndDate) {
      return NextResponse.json({ error: 'clientName and policyEndDate are required' }, { status: 400 })
    }

    const renewal = await prisma.renewalRecord.create({
      data: {
        leadId: body.leadId || null,
        policyId: body.policyId || null,
        vehicleNo: body.vehicleNo || null,
        clientName: body.clientName,
        clientPhone: body.clientPhone || null,
        clientEmail: body.clientEmail || null,
        policyNumber: body.policyNumber || null,
        provider: body.provider || null,
        policyType: body.policyType || null,
        premiumAmount: body.premiumAmount || null,
        policyStartDate: body.policyStartDate ? new Date(body.policyStartDate) : null,
        policyEndDate: new Date(body.policyEndDate),
        assignedTo: body.assignedTo || null,
        renewalStatus: body.renewalStatus || 'Active',
        createdBySalesId: context.userId,
        documents: body.documents || null,
        customData: body.customData || null
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        lead: { select: { id: true, clientName: true } }
      }
    })

    return NextResponse.json({ success: true, renewal })
  } catch (err: any) {
    console.error('[renewals POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create renewal' }, { status: 500 })
  }
}
