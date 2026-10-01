import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCachedRateData, setCachedRateData, invalidateRateCache } from '@/lib/rate-cache'

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
    const cached = getCachedRateData<any[]>('rates_relationships')
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'X-Cache': 'HIT'
        }
      })
    }

    const relations = await prisma.quotationRelationship.findMany({
      where: { status: { in: [1, 2] } },
      include: {
        company: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    setCachedRateData('rates_relationships', relations)

    return NextResponse.json(relations, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Cache': 'MISS'
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

  const role = context.role?.toUpperCase() || ''
  const isSuperAdminEmail = context.email?.toLowerCase() === 'torqueautoadvisor@gmail.com'
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN' && !isSuperAdminEmail) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { categoryId, percentage, profit, remarks, status } = body
    let companyId = body.companyId

    if (!companyId && body.companyName && typeof body.companyName === 'string') {
      const trimmedName = body.companyName.trim()
      if (trimmedName) {
        let existingComp = await prisma.companyDetail.findFirst({
          where: { name: { equals: trimmedName, mode: 'insensitive' } }
        })
        if (!existingComp) {
          existingComp = await prisma.companyDetail.create({
            data: { name: trimmedName, status: 1 }
          })
        }
        companyId = existingComp.id
      }
    }

    if (!companyId || percentage === undefined || profit === undefined) {
      return NextResponse.json({ error: 'Company, percentage, and profit are required' }, { status: 400 })
    }

    let finalCategoryId = categoryId
    if (!finalCategoryId) {
      const defaultCat = await prisma.categoryDetail.findFirst({ select: { id: true } })
      finalCategoryId = defaultCat?.id
    }
    if (!finalCategoryId) {
      const newCat = await prisma.categoryDetail.create({
        data: { name: 'Standard', status: 1 }
      })
      finalCategoryId = newCat.id
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
        categoryId: finalCategoryId,
        status: { in: [1, 2] }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Quotation relationship already exists for this Company' }, { status: 400 })
    }

    const createData: any = {
      companyId,
      categoryId: finalCategoryId,
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

    invalidateRateCache()
    return NextResponse.json(relation)
  } catch (err) {
    console.error('Relationship POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase() || ''
  const isSuperAdminEmail = context.email?.toLowerCase() === 'torqueautoadvisor@gmail.com'
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN' && !isSuperAdminEmail) {
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

    invalidateRateCache()
    return NextResponse.json({ success: true, count: result.count })
  } catch (err) {
    console.error('Relationship bulk DELETE error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

