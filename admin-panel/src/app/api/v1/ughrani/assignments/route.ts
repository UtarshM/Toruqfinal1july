import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const bookId = url.searchParams.get('book_id') || url.searchParams.get('bookId')
  const agentId = url.searchParams.get('agent_id') || url.searchParams.get('agentId')
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')
  const paged = url.searchParams.get('paged') === 'true'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '100')

  try {
    const where: any = {}

    if (bookId && bookId !== 'all') {
      where.bookId = bookId
    }

    if (agentId && agentId !== 'all') {
      where.agentId = agentId
    }

    // Role-based filtering: non-admins only see their assigned debt collections
    const userRole = (context.role || '').toUpperCase()
    if (!['SUPER ADMIN', 'ADMIN', 'MANAGER'].includes(userRole)) {
      where.agentId = context.userId
    }

    if (status && status !== 'all') {
      where.status = status.toLowerCase()
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { vehicleNo: { contains: q, mode: 'insensitive' } },
        { book: { bookName: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [rawAssignments, total, stats] = await Promise.all([
      prisma.ughraniAssignment.findMany({
        where,
        include: {
          book: { select: { id: true, bookName: true } },
          agent: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: paged ? (page - 1) * limit : 0,
        take: paged ? limit : 250,
      }),
      prisma.ughraniAssignment.count({ where }),
      prisma.ughraniAssignment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amountDue: true, collectedAmount: true },
      })
    ])

    const formatted = rawAssignments.map(a => ({
      id: a.id,
      bookId: a.bookId,
      book_id: a.bookId,
      bookName: a.book?.bookName || 'General Book',
      book_name: a.book?.bookName || 'General Book',
      agentId: a.agentId,
      agent_id: a.agentId,
      agentName: a.agent?.fullName || 'Unassigned',
      agent_name: a.agent?.fullName || 'Unassigned',
      customerId: a.customerId,
      customer_id: a.customerId,
      customerName: a.customerName || 'Customer',
      customer_name: a.customerName || 'Customer',
      customerPhone: a.customerPhone,
      customer_phone: a.customerPhone,
      vehicleNo: a.vehicleNo,
      vehicle_no: a.vehicleNo,
      amountDue: Number(a.amountDue),
      amount_due: Number(a.amountDue),
      collectedAmount: Number(a.collectedAmount),
      collected_amount: Number(a.collectedAmount),
      pendingAmount: Math.max(0, Number(a.amountDue) - Number(a.collectedAmount)),
      status: a.status,
      collectedDate: a.collectedDate ? a.collectedDate.toISOString() : null,
      collected_date: a.collectedDate ? a.collectedDate.toISOString().split('T')[0] : null,
      remarks: a.remarks,
      createdAt: a.createdAt.toISOString(),
      created_at: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      updated_at: a.updatedAt.toISOString(),
    }))

    if (!paged) {
      return NextResponse.json(formatted)
    }

    const summary = {
      totalAssignments: 0,
      totalDue: 0,
      totalCollected: 0,
      totalPending: 0,
      pendingCount: 0,
      partialCount: 0,
      collectedCount: 0,
    }

    for (const s of stats) {
      const count = s._count.id
      const due = Number(s._sum.amountDue || 0)
      const col = Number(s._sum.collectedAmount || 0)
      summary.totalAssignments += count
      summary.totalDue += due
      summary.totalCollected += col

      if (s.status === 'pending') summary.pendingCount = count
      else if (s.status === 'partially_collected') summary.partialCount = count
      else if (s.status === 'collected') summary.collectedCount = count
    }
    summary.totalPending = Math.max(0, summary.totalDue - summary.totalCollected)

    return NextResponse.json({
      assignments: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    })
  } catch (err: any) {
    console.error('[API Ughrani Assignments GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch assignments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const bookId = body.book_id || body.bookId
    const agentId = body.agent_id || body.agentId || null
    const customerId = body.customer_id || body.customerId || null
    const customerName = (body.customer_name || body.customerName || '').trim()
    const customerPhone = (body.customer_phone || body.customerPhone || '').trim() || null
    const vehicleNo = (body.vehicle_no || body.vehicleNo || '').trim().toUpperCase() || null
    const amountDue = Number(body.amount_due || body.amountDue)
    const remarks = (body.remarks || '').trim() || null

    if (!bookId || isNaN(amountDue) || amountDue <= 0) {
      return NextResponse.json({ error: 'Book and a valid positive amount due are required' }, { status: 400 })
    }

    const created = await prisma.ughraniAssignment.create({
      data: {
        bookId,
        agentId: agentId ? String(agentId) : null,
        customerId: customerId ? String(customerId) : null,
        customerName: customerName || 'Customer',
        customerPhone,
        vehicleNo,
        amountDue,
        status: 'pending',
        collectedAmount: 0,
        remarks,
      },
      include: {
        book: { select: { bookName: true } },
        agent: { select: { fullName: true } }
      }
    })

    return NextResponse.json({
      id: created.id,
      book_id: created.bookId,
      bookId: created.bookId,
      book_name: created.book?.bookName || '',
      bookName: created.book?.bookName || '',
      agent_id: created.agentId,
      agentId: created.agentId,
      agent_name: created.agent?.fullName || '',
      agentName: created.agent?.fullName || '',
      customer_id: created.customerId,
      customerId: created.customerId,
      customer_name: created.customerName,
      customerName: created.customerName,
      customer_phone: created.customerPhone,
      customerPhone: created.customerPhone,
      vehicle_no: created.vehicleNo,
      vehicleNo: created.vehicleNo,
      amount_due: Number(created.amountDue),
      amountDue: Number(created.amountDue),
      collected_amount: 0,
      collectedAmount: 0,
      status: created.status,
      created_at: created.createdAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    }, { status: 201 })
  } catch (err: any) {
    console.error('[API Ughrani Assignments POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create assignment' }, { status: 500 })
  }
}
