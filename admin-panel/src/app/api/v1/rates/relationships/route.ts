import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      await validateAuth(req).catch(() => null)
    }
  } catch {}

  try {
    const relations = await prisma.quotationRelationship.findMany({
      where: { status: { in: [1, 2] } },
      include: {
        company: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(relations, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (err) {
    console.error('Relationships GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase()
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { companyId, categoryId, percentage, profit, remarks, status } = body

    if (!companyId || !categoryId || percentage === undefined || profit === undefined) {
      return NextResponse.json({ error: 'companyId, categoryId, percentage, and profit are required' }, { status: 400 })
    }

    const pct = parseFloat(percentage)
    const prof = parseFloat(profit)

    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 })
    }
    if (isNaN(prof) || prof < 0) {
      return NextResponse.json({ error: 'Profit must be a positive number' }, { status: 400 })
    }

    // Check duplicate
    const existing = await prisma.quotationRelationship.findFirst({
      where: {
        companyId,
        categoryId,
        status: { in: [1, 2] }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Quotation relationship already exists for this Company and Category' }, { status: 400 })
    }

    const createData: any = {
      companyId,
      categoryId,
      percentage: pct,
      profit: prof,
      status: status !== undefined ? parseInt(status) : 1,
      addedBy: context.userId,
      updatedBy: context.userId
    }
    if (remarks) createData.remarks = String(remarks).trim()

    const relation = await prisma.quotationRelationship.create({
      data: createData
    })

    return NextResponse.json(relation)
  } catch (err) {
    console.error('Relationship POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase()
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { ids } = body
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    const result = await prisma.quotationRelationship.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 3,
        updatedBy: context.userId
      }
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (err) {
    console.error('Relationship bulk DELETE error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

