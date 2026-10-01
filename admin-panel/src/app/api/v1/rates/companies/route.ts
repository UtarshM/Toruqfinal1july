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
    const cached = getCachedRateData<any[]>('rates_companies')
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'X-Cache': 'HIT'
        }
      })
    }

    const companies = await prisma.companyDetail.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' }
    })
    setCachedRateData('rates_companies', companies)

    return NextResponse.json(companies, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Cache': 'MISS'
      }
    })
  } catch (err) {
    console.error('Companies GET error:', err)
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
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check duplicate
    const existing = await prisma.companyDetail.findUnique({
      where: { name: trimmedName }
    })

    if (existing) {
      if (existing.status !== 1) {
        // Reactivate
        const updated = await prisma.companyDetail.update({
          where: { id: existing.id },
          data: { status: 1 }
        })
        invalidateRateCache()
        return NextResponse.json(updated)
      }
      return NextResponse.json({ error: 'Company already exists' }, { status: 400 })
    }

    const company = await prisma.companyDetail.create({
      data: { name: trimmedName, status: 1 }
    })

    invalidateRateCache()
    return NextResponse.json(company)
  } catch (err) {
    console.error('Company POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
