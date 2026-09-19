import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'rto.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const paymentStatus = searchParams.get('paymentStatus') // 'all', 'paid', 'baki'
    const workType = searchParams.get('workType')
    const vehicleType = searchParams.get('vehicleType')
    const insuranceByTorque = searchParams.get('insuranceByTorque')
    const status = searchParams.get('status')

    const where: any = {}
    
    if (context && context.role === 'EXECUTIVE') {
      where.assignedTo = context.userId
    } else if (context && context.role === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.OR = [
        { assignedTo: context.userId },
        { assignedTo: { in: teamIds } },
        { assignedTo: null }
      ]
    }

    if (workType && workType !== 'all') {
      where.workType = workType
    }

    if (vehicleType && vehicleType !== 'all') {
      where.vehicleType = vehicleType
    }

    if (insuranceByTorque && insuranceByTorque !== 'all') {
      where.insuranceByTorque = insuranceByTorque
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (paymentStatus === 'paid') {
      where.baki = { lte: 0 }
    } else if (paymentStatus === 'baki') {
      where.baki = { gt: 0 }
    }

    if (search && search.trim()) {
      const s = search.trim()
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { customerName: { contains: s, mode: 'insensitive' } },
            { vehicleNo: { contains: s, mode: 'insensitive' } },
            { vehicleNumber: { contains: s, mode: 'insensitive' } },
            { mobileNo: { contains: s, mode: 'insensitive' } },
            { workType: { contains: s, mode: 'insensitive' } },
            { vehicleType: { contains: s, mode: 'insensitive' } },
            { remarks: { contains: s, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const items = await prisma.rTOWork.findMany({
      where,
      orderBy: [
        { srNo: 'asc' },
        { createdAt: 'asc' }
      ],
      include: { 
        lead: { select: { clientName: true } },
        assignee: { select: { fullName: true } }
      }
    })

    // Aggregated KPI metrics
    const allItems = await prisma.rTOWork.findMany()
    const metrics = allItems.reduce(
      (acc, item) => {
        acc.totalTasks += 1
        acc.totalAmount += Number(item.amount || item.fees || 0)
        acc.totalJama += Number(item.jama || 0)
        acc.totalBaki += Number(item.baki || 0)
        if ((item.insuranceByTorque || '').toUpperCase() === 'DONE') {
          acc.insuranceDone += 1
        }
        return acc
      },
      { totalTasks: 0, totalAmount: 0, totalJama: 0, totalBaki: 0, insuranceDone: 0 }
    )

    return NextResponse.json({ items, metrics })
  } catch (error: any) {
    console.error('RTO GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rto.create')
  if (error) return error

  try {
    const data = await req.json()
    const customer = data.customerName || data.name || data.customer_name || 'Customer'
    const vehicle = (data.vehicleNo || data.vehicleNumber || data.vehicle_number || '').toUpperCase().trim()
    const workType = data.workType || data.work_type || 'RTO Work'
    const vehicleType = data.vehicleType || data.vehicle_type || null
    const mobileNo = data.mobileNo || data.mobile_no || null
    const insuranceByTorque = data.insuranceByTorque || data.insurance_by_torque || 'NO'
    const remarks = data.remarks || null

    const amount = data.amount !== undefined && data.amount !== '' ? parseFloat(data.amount) : (data.fees ? parseFloat(data.fees) : 0)
    const jama = data.jama !== undefined && data.jama !== '' ? parseFloat(data.jama) : 0
    const baki = amount - jama

    let inDate = null
    if (data.inDate) {
      if (typeof data.inDate === 'string' && data.inDate.includes('/')) {
        const [d, m, y] = data.inDate.split('/').map(Number)
        inDate = new Date(Date.UTC(y, m - 1, d))
      } else {
        inDate = new Date(data.inDate)
      }
    } else {
      inDate = new Date()
    }

    const rto = await prisma.rTOWork.create({
      data: {
        inDate,
        customerName: customer,
        vehicleNumber: vehicle,
        vehicleNo: vehicle,
        vehicleType,
        workType,
        amount,
        fees: amount,
        jama,
        baki,
        mobileNo,
        insuranceByTorque,
        remarks,
        status: data.status || (baki === 0 ? 'completed' : 'pending'),
        rtoOffice: data.rtoOffice || data.rto_office,
        leadId: data.leadId || data.lead_id,
        assignedTo: data.assignedTo || data.assigned_to,
        paymentStatus: baki === 0 ? 'Paid' : (jama > 0 ? 'Partial' : 'Pending'),
        paymentAmount: jama
      }
    })
    return NextResponse.json(rto)
  } catch (error: any) {
    console.error('RTO POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    if (updates.inDate) {
      if (typeof updates.inDate === 'string' && updates.inDate.includes('/')) {
        const [d, m, y] = updates.inDate.split('/').map(Number)
        updates.inDate = new Date(Date.UTC(y, m - 1, d))
      } else {
        updates.inDate = new Date(updates.inDate)
      }
    }

    if (updates.vehicleNo) {
      updates.vehicleNo = updates.vehicleNo.toUpperCase().trim()
      updates.vehicleNumber = updates.vehicleNo
    }

    if (updates.amount !== undefined || updates.jama !== undefined) {
      const existing = await prisma.rTOWork.findUnique({ where: { id } })
      if (existing) {
        const amount = updates.amount !== undefined ? parseFloat(updates.amount) : Number(existing.amount || existing.fees || 0)
        const jama = updates.jama !== undefined ? parseFloat(updates.jama) : Number(existing.jama || 0)
        updates.amount = amount
        updates.fees = amount
        updates.jama = jama
        updates.baki = amount - jama
        updates.paymentAmount = jama
        updates.paymentStatus = (amount - jama) === 0 ? 'Paid' : (jama > 0 ? 'Partial' : 'Pending')
      }
    }

    const rto = await prisma.rTOWork.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(rto)
  } catch (error: any) {
    console.error('RTO PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await prisma.rTOWork.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'RTO record deleted successfully' })
  } catch (error: any) {
    console.error('RTO DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
