import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/rates/calculations
 * Retrieves all saved Rate Calculator records.
 * Profits are strictly redacted for non-admin users.
 */
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'rate_calculator_entries' }
    })

    const rawRecords: any[] = Array.isArray(setting?.value) ? (setting.value as any[]) : []

    // Sanitize records: If caller is not Admin, redact profit fields
    const sanitized = rawRecords.map(rec => {
      if (isAdmin) return rec

      const cleanCalc = (c: any) => {
        if (!c) return c
        const { profit, ...rest } = c
        return rest
      }

      return {
        ...rec,
        calculator1: cleanCalc(rec.calculator1),
        calculator2: cleanCalc(rec.calculator2),
        calculator3: cleanCalc(rec.calculator3)
      }
    })

    return NextResponse.json({ success: true, records: sanitized, isAdmin })
  } catch (err: any) {
    console.error('Error fetching rate calculations:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch rate calculations' }, { status: 500 })
  }
}

/**
 * POST /api/v1/rates/calculations
 * Creates a new 3-tab Rate Calculator record.
 */
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can save rate calculator entries' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { date, percentage, calculator1, calculator2, calculator3 } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const newRecord = {
      id: randomUUID(),
      date,
      percentage: percentage !== undefined ? String(percentage) : '',
      calculator1: calculator1 || {},
      calculator2: calculator2 || {},
      calculator3: calculator3 || {},
      createdBy: context.userId,
      creatorName: context.email || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'rate_calculator_entries' }
    })

    const records: any[] = Array.isArray(setting?.value) ? (setting.value as any[]) : []
    records.unshift(newRecord)

    await prisma.systemSetting.upsert({
      where: { key: 'rate_calculator_entries' },
      update: { value: records },
      create: { key: 'rate_calculator_entries', value: records }
    })

    return NextResponse.json({ success: true, record: newRecord })
  } catch (err: any) {
    console.error('Error saving rate calculation:', err)
    return NextResponse.json({ error: err.message || 'Failed to save rate calculation' }, { status: 500 })
  }
}

/**
 * PUT /api/v1/rates/calculations
 * Updates an existing Rate Calculator record by ID.
 */
export async function PUT(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can edit rate calculator entries' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, date, percentage, calculator1, calculator2, calculator3 } = body

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'rate_calculator_entries' }
    })

    const records: any[] = Array.isArray(setting?.value) ? (setting.value as any[]) : []
    const idx = records.findIndex(r => r.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Rate calculator record not found' }, { status: 404 })
    }

    const updatedRecord = {
      ...records[idx],
      date: date || records[idx].date,
      percentage: percentage !== undefined ? String(percentage) : records[idx].percentage,
      calculator1: calculator1 !== undefined ? calculator1 : records[idx].calculator1,
      calculator2: calculator2 !== undefined ? calculator2 : records[idx].calculator2,
      calculator3: calculator3 !== undefined ? calculator3 : records[idx].calculator3,
      updatedAt: new Date().toISOString()
    }

    records[idx] = updatedRecord

    await prisma.systemSetting.upsert({
      where: { key: 'rate_calculator_entries' },
      update: { value: records },
      create: { key: 'rate_calculator_entries', value: records }
    })

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (err: any) {
    console.error('Error updating rate calculation:', err)
    return NextResponse.json({ error: err.message || 'Failed to update rate calculation' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/rates/calculations?id=...
 * Deletes a Rate Calculator record.
 */
export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete rate calculator entries' }, { status: 403 })
  }

  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'rate_calculator_entries' }
    })

    const records: any[] = Array.isArray(setting?.value) ? (setting.value as any[]) : []
    const filtered = records.filter(r => r.id !== id)

    await prisma.systemSetting.upsert({
      where: { key: 'rate_calculator_entries' },
      update: { value: filtered },
      create: { key: 'rate_calculator_entries', value: filtered }
    })

    return NextResponse.json({ success: true, deletedId: id })
  } catch (err: any) {
    console.error('Error deleting rate calculation:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete rate calculation' }, { status: 500 })
  }
}
