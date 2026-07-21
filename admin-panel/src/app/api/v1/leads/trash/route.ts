import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET: List trashed (soft-deleted) leads
export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'lead.view')
  if (error) return error

  try {
    let leads: any[] = []
    try {
      leads = await prisma.lead.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          assignee: { select: { fullName: true } }
        }
      })
    } catch (err: any) {
      if (err?.message?.includes('deletedAt')) {
        leads = []
      } else {
        throw err
      }
    }

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Trash GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Restore leads from trash
export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'lead.edit')
  if (error) return error

  try {
    const body = await req.json()
    const ids: string[] = body.ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    try {
      await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: null,
          deletedBy: null
        }
      })
    } catch (prismaErr: any) {
      const formattedIds = ids.map(id => `'${id}'`).join(',')
      await prisma.$executeRawUnsafe(
        `UPDATE "leads" SET "deletedAt" = NULL, "deletedBy" = NULL WHERE "id"::text IN (${formattedIds})`
      )
    }

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error: any) {
    console.error('Trash Restore Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Permanently delete leads from trash
export async function DELETE(req: NextRequest) {
  const { error } = await validateAuth(req, 'lead.delete')
  if (error) return error

  try {
    const body = await req.json()
    const ids: string[] = body.ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    const formattedIds = ids.map(id => `'${id}'`).join(',')
    await prisma.$executeRawUnsafe(
      `DELETE FROM "leads" WHERE "id"::text IN (${formattedIds})`
    )

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error: any) {
    console.error('Trash Permanent DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
