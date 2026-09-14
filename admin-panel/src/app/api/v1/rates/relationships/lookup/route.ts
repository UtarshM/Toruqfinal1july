import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const categoryId = searchParams.get('categoryId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const where: any = {
      companyId,
      status: 1 // Must be active
    }
    if (categoryId) {
      where.categoryId = categoryId
    }

    const relation = await prisma.quotationRelationship.findFirst({
      where,
      orderBy: { updatedAt: 'desc' }
    })

    if (relation) {
      return NextResponse.json({
        qtr_percentage: parseFloat(relation.percentage.toString()),
        qtr_profit: parseFloat(relation.profit.toString()),
        qtr_remarks: (relation as any).remarks || ''
      })
    }

    return NextResponse.json({
      qtr_percentage: 0,
      qtr_profit: 0,
      qtr_remarks: ''
    })
  } catch (err) {
    console.error('Relationship lookup GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
