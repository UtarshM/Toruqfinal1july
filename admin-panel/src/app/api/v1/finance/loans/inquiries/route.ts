import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

// Helper to calculate difference in days
function calculateDays(inward?: Date | string | null, disbursed?: Date | string | null): number | null {
  if (!inward || !disbursed) return null
  const d1 = new Date(inward)
  const d2 = new Date(disbursed)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  const diffTime = d2.getTime() - d1.getTime()
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))
}

// Helper to calculate payout amount
function calculatePayout(sanctioned?: number | null, percent?: number | null): number | null {
  if (sanctioned == null || percent == null) return null
  return Math.round(((sanctioned * percent) / 100) * 100) / 100
}

export async function GET(req: NextRequest) {
  // Validate authentication - "all have right of this" so we don't block by specific sub-role
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    // Filter by status if not "all"
    if (status && status !== 'all') {
      where.status = status
    }

    // Search by customer name, vehicle number, mobile number, or lead by
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
        { mobileNo: { contains: search, mode: 'insensitive' } },
        { leadBy: { contains: search, mode: 'insensitive' } },
        { remarksIfAny: { contains: search, mode: 'insensitive' } },
        { bankNbfc: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Date range filter on inwardDate
    if (startDate || endDate) {
      where.inwardDate = {}
      if (startDate) where.inwardDate.gte = new Date(startDate)
      if (endDate) where.inwardDate.lte = new Date(endDate)
    }

    // Fetch inquiries
    const [inquiries, totalCount, allStatuses] = await Promise.all([
      prisma.loanInquiry.findMany({
        where,
        orderBy: [{ inwardDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          lead: { select: { id: true, clientName: true, vehicleNo: true } }
        }
      }),
      prisma.loanInquiry.count({ where }),
      prisma.loanInquiry.findMany({
        select: {
          status: true,
          sanctionedAmount: true,
          payoutAmount: true
        }
      })
    ])

    // Calculate aggregated metrics
    let onlyInquiryCount = 0
    let triedNotDoneCount = 0
    let completedCount = 0
    let rejectCount = 0
    let totalSanctioned = 0
    let totalPayout = 0

    for (const item of allStatuses) {
      const st = (item.status || '').toUpperCase()
      if (st === 'ONLY INQUIRY') onlyInquiryCount++
      else if (st === 'TRIED BUT NOT DONE') triedNotDoneCount++
      else if (st === 'COMPLETED') {
        completedCount++
        if (item.sanctionedAmount) totalSanctioned += Number(item.sanctionedAmount)
        if (item.payoutAmount) totalPayout += Number(item.payoutAmount)
      } else if (st === 'REJECT' || st === 'REJECTED') {
        rejectCount++
      }
    }

    return NextResponse.json({
      inquiries,
      totalCount,
      metrics: {
        total: allStatuses.length,
        onlyInquiry: onlyInquiryCount,
        triedNotDone: triedNotDoneCount,
        completed: completedCount,
        reject: rejectCount,
        totalSanctioned,
        totalPayout
      }
    })
  } catch (error: any) {
    console.error('Loan Inquiries GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    if (!body.customerName || !body.customerName.trim()) {
      return NextResponse.json({ error: 'Customer Name is required.' }, { status: 400 })
    }

    const inwardDate = body.inwardDate ? new Date(body.inwardDate) : new Date()
    const disbursedDate = body.disbursedDate ? new Date(body.disbursedDate) : null

    // Auto calculate days if not provided
    const noOfDays = body.noOfDays != null && body.noOfDays !== ''
      ? parseInt(body.noOfDays)
      : calculateDays(inwardDate, disbursedDate)

    const sanctionedAmount = body.sanctionedAmount != null && body.sanctionedAmount !== ''
      ? parseFloat(body.sanctionedAmount)
      : null

    const payoutPercent = body.payoutPercent != null && body.payoutPercent !== ''
      ? parseFloat(body.payoutPercent)
      : null

    // Auto calculate payout amount if not provided
    const payoutAmount = body.payoutAmount != null && body.payoutAmount !== ''
      ? parseFloat(body.payoutAmount)
      : calculatePayout(sanctionedAmount, payoutPercent)

    const requiredAmount = body.requiredAmount != null && body.requiredAmount !== ''
      ? parseFloat(body.requiredAmount)
      : null

    const inquiry = await prisma.loanInquiry.create({
      data: {
        inwardDate,
        customerName: body.customerName.trim(),
        mobileNo: body.mobileNo?.trim() || null,
        vehicleNumber: body.vehicleNumber?.trim()?.toUpperCase() || null,
        category: body.category?.trim() || 'PRIVATE USED',
        leadBy: body.leadBy?.trim() || null,
        requiredAmount,
        status: body.status || 'ONLY INQUIRY',
        reasonForNotDone: body.reasonForNotDone?.trim() || null,
        bankNbfc: body.bankNbfc?.trim() || null,
        sanctionedAmount,
        disbursedDate,
        noOfDays,
        payoutPercent,
        payoutAmount,
        remarksIfAny: body.remarksIfAny?.trim() || null,
        assignedTo: body.assignedTo || context.userId,
        leadId: body.leadId || null
      }
    })

    return NextResponse.json(inquiry, { status: 201 })
  } catch (error: any) {
    console.error('Loan Inquiry POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Inquiry ID is required' }, { status: 400 })
    }

    const dataToUpdate: any = {}

    if (updates.customerName !== undefined) dataToUpdate.customerName = updates.customerName.trim()
    if (updates.mobileNo !== undefined) dataToUpdate.mobileNo = updates.mobileNo?.trim() || null
    if (updates.vehicleNumber !== undefined) dataToUpdate.vehicleNumber = updates.vehicleNumber?.trim()?.toUpperCase() || null
    if (updates.category !== undefined) dataToUpdate.category = updates.category?.trim() || null
    if (updates.leadBy !== undefined) dataToUpdate.leadBy = updates.leadBy?.trim() || null
    if (updates.status !== undefined) dataToUpdate.status = updates.status
    if (updates.reasonForNotDone !== undefined) dataToUpdate.reasonForNotDone = updates.reasonForNotDone?.trim() || null
    if (updates.bankNbfc !== undefined) dataToUpdate.bankNbfc = updates.bankNbfc?.trim() || null
    if (updates.remarksIfAny !== undefined) dataToUpdate.remarksIfAny = updates.remarksIfAny?.trim() || null
    if (updates.assignedTo !== undefined) dataToUpdate.assignedTo = updates.assignedTo || null

    if (updates.inwardDate !== undefined) {
      dataToUpdate.inwardDate = updates.inwardDate ? new Date(updates.inwardDate) : null
    }

    if (updates.disbursedDate !== undefined) {
      dataToUpdate.disbursedDate = updates.disbursedDate ? new Date(updates.disbursedDate) : null
    }

    if (updates.requiredAmount !== undefined) {
      dataToUpdate.requiredAmount = updates.requiredAmount != null && updates.requiredAmount !== ''
        ? parseFloat(updates.requiredAmount)
        : null
    }

    if (updates.sanctionedAmount !== undefined) {
      dataToUpdate.sanctionedAmount = updates.sanctionedAmount != null && updates.sanctionedAmount !== ''
        ? parseFloat(updates.sanctionedAmount)
        : null
    }

    if (updates.payoutPercent !== undefined) {
      dataToUpdate.payoutPercent = updates.payoutPercent != null && updates.payoutPercent !== ''
        ? parseFloat(updates.payoutPercent)
        : null
    }

    // Auto-calculate or update payoutAmount
    if (updates.payoutAmount !== undefined) {
      dataToUpdate.payoutAmount = updates.payoutAmount != null && updates.payoutAmount !== ''
        ? parseFloat(updates.payoutAmount)
        : null
    } else if (dataToUpdate.sanctionedAmount !== undefined || dataToUpdate.payoutPercent !== undefined) {
      const sAmt = dataToUpdate.sanctionedAmount ?? undefined
      const pPct = dataToUpdate.payoutPercent ?? undefined
      if (sAmt != null && pPct != null) {
        dataToUpdate.payoutAmount = calculatePayout(sAmt, pPct)
      }
    }

    // Auto-calculate or update noOfDays
    if (updates.noOfDays !== undefined) {
      dataToUpdate.noOfDays = updates.noOfDays != null && updates.noOfDays !== ''
        ? parseInt(updates.noOfDays)
        : null
    } else if (dataToUpdate.inwardDate && dataToUpdate.disbursedDate) {
      dataToUpdate.noOfDays = calculateDays(dataToUpdate.inwardDate, dataToUpdate.disbursedDate)
    }

    const updated = await prisma.loanInquiry.update({
      where: { id },
      data: dataToUpdate
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Loan Inquiry PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 })
    }

    await prisma.loanInquiry.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Loan inquiry deleted' })
  } catch (error: any) {
    console.error('Loan Inquiry DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
