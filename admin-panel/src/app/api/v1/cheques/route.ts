import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')
  const paged = url.searchParams.get('paged') === 'true'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '100')

  try {
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status.toLowerCase()
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { chequeNo: { contains: q, mode: 'insensitive' } },
        { bankName: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { vehicleNo: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [rawCheques, total, allStats] = await Promise.all([
      prisma.cheque.findMany({
        where,
        orderBy: { receivedDate: 'desc' },
        skip: paged ? (page - 1) * limit : 0,
        take: paged ? limit : 200,
      }),
      prisma.cheque.count({ where }),
      prisma.cheque.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      })
    ])

    // Format cheques with dual camelCase & snake_case for universal web + mobile parity
    const formatted = rawCheques.map(c => ({
      id: c.id,
      bankName: c.bankName,
      bank_name: c.bankName,
      chequeNo: c.chequeNo,
      cheque_no: c.chequeNo,
      amount: Number(c.amount),
      receivedDate: c.receivedDate.toISOString(),
      received_date: c.receivedDate.toISOString().split('T')[0],
      depositDate: c.depositDate ? c.depositDate.toISOString() : null,
      deposit_date: c.depositDate ? c.depositDate.toISOString().split('T')[0] : null,
      clearanceDate: c.clearanceDate ? c.clearanceDate.toISOString() : null,
      clearance_date: c.clearanceDate ? c.clearanceDate.toISOString().split('T')[0] : null,
      status: c.status,
      bounceReason: c.bounceReason,
      bounce_reason: c.bounceReason,
      customerId: c.customerId,
      customer_id: c.customerId,
      customerName: c.customerName,
      customer_name: c.customerName,
      vehicleNo: c.vehicleNo,
      vehicle_no: c.vehicleNo,
      remarks: c.remarks,
      createdAt: c.createdAt.toISOString(),
      created_at: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    }))

    if (!paged) {
      // Mobile expects raw array by default
      return NextResponse.json(formatted)
    }

    // Summary statistics for web dashboard
    const summary = {
      totalCheques: 0,
      totalAmount: 0,
      receivedCount: 0,
      receivedAmount: 0,
      depositedCount: 0,
      depositedAmount: 0,
      clearedCount: 0,
      clearedAmount: 0,
      bouncedCount: 0,
      bouncedAmount: 0,
    }

    for (const s of allStats) {
      const count = s._count.id
      const amt = Number(s._sum.amount || 0)
      summary.totalCheques += count
      summary.totalAmount += amt

      if (s.status === 'received') {
        summary.receivedCount = count
        summary.receivedAmount = amt
      } else if (s.status === 'deposited') {
        summary.depositedCount = count
        summary.depositedAmount = amt
      } else if (s.status === 'cleared') {
        summary.clearedCount = count
        summary.clearedAmount = amt
      } else if (s.status === 'bounced') {
        summary.bouncedCount = count
        summary.bouncedAmount = amt
      }
    }

    return NextResponse.json({
      cheques: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    })
  } catch (err: any) {
    console.error('[API Cheques GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch cheques' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const bankName = body.bank_name || body.bankName
    const chequeNo = body.cheque_no || body.chequeNo
    const amount = Number(body.amount)
    const receivedDateRaw = body.received_date || body.receivedDate || new Date().toISOString()
    const customerId = body.customer_id || body.customerId || null
    const customerName = body.customer_name || body.customerName || null
    const vehicleNo = body.vehicle_no || body.vehicleNo || null
    const remarks = body.remarks || null

    if (!bankName || !chequeNo || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Bank Name, Cheque Number, and a valid positive Amount are required.' },
        { status: 400 }
      )
    }

    const created = await prisma.cheque.create({
      data: {
        bankName: bankName.trim(),
        chequeNo: chequeNo.trim(),
        amount,
        receivedDate: new Date(receivedDateRaw),
        status: (body.status || 'received').toLowerCase(),
        customerId: customerId ? String(customerId) : null,
        customerName: customerName ? customerName.trim() : null,
        vehicleNo: vehicleNo ? vehicleNo.trim().toUpperCase() : null,
        remarks: remarks ? remarks.trim() : null,
      }
    })

    return NextResponse.json({
      id: created.id,
      bank_name: created.bankName,
      bankName: created.bankName,
      cheque_no: created.chequeNo,
      chequeNo: created.chequeNo,
      amount: Number(created.amount),
      received_date: created.receivedDate.toISOString().split('T')[0],
      receivedDate: created.receivedDate.toISOString(),
      status: created.status,
      customerId: created.customerId,
      customer_id: created.customerId,
      customerName: created.customerName,
      customer_name: created.customerName,
      vehicleNo: created.vehicleNo,
      vehicle_no: created.vehicleNo,
      remarks: created.remarks,
      created_at: created.createdAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
    }, { status: 201 })
  } catch (err: any) {
    console.error('[API Cheques POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create cheque' }, { status: 500 })
  }
}
