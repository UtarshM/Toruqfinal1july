import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { deleteLeadsWithCascade } from '@/lib/lead-delete-helper'

export const maxDuration = 60

/**
 * GET: Preview leads matching purge criteria before executing deletion
 */
export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'lead.delete')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can purge leads' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const importName = searchParams.get('importName')
    const hours = parseInt(searchParams.get('hours') || '0', 10)
    const includeNullImport = searchParams.get('includeNullImport') === 'true'

    const where: any = {}

    if (importName) {
      if (includeNullImport) {
        where.OR = [
          { importName: { contains: importName, mode: 'insensitive' } },
          { importName: null }
        ]
      } else {
        where.importName = { contains: importName, mode: 'insensitive' }
      }
    }

    if (hours > 0) {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000)
      where.createdAt = { gte: since }
    }

    const count = await prisma.lead.count({ where })
    const sample = await prisma.lead.findMany({
      where,
      take: 10,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        vehicleNo: true,
        importName: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      matchingCount: count,
      sample,
      criteria: { importName, hours, includeNullImport }
    })
  } catch (err: any) {
    console.error('[leads/purge GET] Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to preview leads for purge' }, { status: 500 })
  }
}

/**
 * POST: Execute lead purge with cascading foreign key deletion
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'lead.delete')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can purge leads' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { importName, hours, leadIds, includeNullImport } = body

    let targetIds: string[] = []

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targetIds = leadIds
    } else {
      const where: any = {}

      if (importName) {
        if (includeNullImport) {
          where.OR = [
            { importName: { contains: importName, mode: 'insensitive' } },
            { importName: null }
          ]
        } else {
          where.importName = { contains: importName, mode: 'insensitive' }
        }
      }

      if (hours && Number(hours) > 0) {
        const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000)
        where.createdAt = { gte: since }
      }

      // Safety check: Don't purge whole DB with empty criteria
      if (!importName && (!hours || Number(hours) <= 0)) {
        return NextResponse.json({
          error: 'Safety guard: You must specify an importName or hours criteria to purge leads.'
        }, { status: 400 })
      }

      const leads = await prisma.lead.findMany({
        where,
        select: { id: true }
      })

      targetIds = leads.map(l => l.id)
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: 'No matching leads found to delete.'
      })
    }

    const deletedCount = await deleteLeadsWithCascade(targetIds)

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully purged ${deletedCount} leads and all associated records with zero foreign key errors.`
    })
  } catch (err: any) {
    console.error('[leads/purge POST] Error:', err)
    return NextResponse.json({ error: err?.message || 'Lead purge failed' }, { status: 500 })
  }
}
