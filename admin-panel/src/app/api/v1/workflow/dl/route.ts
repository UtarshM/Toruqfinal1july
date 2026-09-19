import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const paymentStatus = searchParams.get('paymentStatus') // 'all', 'paid', 'baki'
    const workType = searchParams.get('workType')
    const status = searchParams.get('status')

    const where: any = {}

    if (workType && workType !== 'all') {
      where.workType = workType
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
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { mobileNo: { contains: s, mode: 'insensitive' } },
        { workType: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } }
      ]
    }

    const items = await prisma.dLWork.findMany({
      where,
      orderBy: [
        { srNo: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Calculate aggregated metrics
    const allItems = await prisma.dLWork.findMany()
    const metrics = allItems.reduce(
      (acc, item) => {
        acc.totalTasks += 1
        acc.totalAmount += Number(item.amount || 0)
        acc.totalJama += Number(item.jama || 0)
        acc.totalBaki += Number(item.baki || 0)
        return acc
      },
      { totalTasks: 0, totalAmount: 0, totalJama: 0, totalBaki: 0 }
    )

    return NextResponse.json({ items, metrics })
  } catch (err: any) {
    console.error('DL GET Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!body.workType || !body.workType.trim()) {
      return NextResponse.json({ error: 'Work Type is required' }, { status: 400 })
    }

    const amount = body.amount !== undefined && body.amount !== '' ? parseFloat(body.amount) : 0
    const jama = body.jama !== undefined && body.jama !== '' ? parseFloat(body.jama) : 0
    const baki = amount - jama

    let inDate = null
    if (body.inDate) {
      if (typeof body.inDate === 'string' && body.inDate.includes('/')) {
        const [d, m, y] = body.inDate.split('/').map(Number)
        inDate = new Date(Date.UTC(y, m - 1, d))
      } else {
        inDate = new Date(body.inDate)
      }
    } else {
      inDate = new Date()
    }

    const record = await prisma.dLWork.create({
      data: {
        inDate,
        name: body.name.trim(),
        workType: body.workType.trim(),
        amount,
        jama,
        baki,
        mobileNo: body.mobileNo ? body.mobileNo.trim() : null,
        remarks: body.remarks ? body.remarks.trim() : null,
        status: body.status || (baki === 0 ? 'completed' : 'pending')
      }
    })

    return NextResponse.json(record)
  } catch (err: any) {
    console.error('DL POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Missing record ID' }, { status: 400 })

    if (updates.inDate) {
      if (typeof updates.inDate === 'string' && updates.inDate.includes('/')) {
        const [d, m, y] = updates.inDate.split('/').map(Number)
        updates.inDate = new Date(Date.UTC(y, m - 1, d))
      } else {
        updates.inDate = new Date(updates.inDate)
      }
    }

    if (updates.amount !== undefined || updates.jama !== undefined) {
      const existing = await prisma.dLWork.findUnique({ where: { id } })
      if (existing) {
        const amount = updates.amount !== undefined ? parseFloat(updates.amount) : Number(existing.amount)
        const jama = updates.jama !== undefined ? parseFloat(updates.jama) : Number(existing.jama)
        updates.amount = amount
        updates.jama = jama
        updates.baki = amount - jama
      }
    }

    const updated = await prisma.dLWork.update({
      where: { id },
      data: updates
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('DL PATCH Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Missing record ID' }, { status: 400 })

    await prisma.dLWork.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'DL record deleted successfully' })
  } catch (err: any) {
    console.error('DL DELETE Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
