import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rawBooks = await prisma.ughraniBook.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          select: {
            id: true,
            amountDue: true,
            collectedAmount: true,
            status: true,
          }
        }
      }
    })

    const formatted = rawBooks.map(b => {
      let totalDue = 0
      let totalCollected = 0
      let pendingCount = 0
      let collectedCount = 0

      for (const a of b.assignments) {
        const due = Number(a.amountDue || 0)
        const col = Number(a.collectedAmount || 0)
        totalDue += due
        totalCollected += col
        if (a.status === 'collected') {
          collectedCount++
        } else {
          pendingCount++
        }
      }

      return {
        id: b.id,
        bookName: b.bookName,
        book_name: b.bookName,
        description: b.description,
        createdAt: b.createdAt.toISOString(),
        created_at: b.createdAt.toISOString(),
        assignmentsCount: b.assignments.length,
        totalDue,
        totalCollected,
        pendingBalance: Math.max(0, totalDue - totalCollected),
        pendingCount,
        collectedCount,
      }
    })

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error('[API Ughrani Books GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch ughrani books' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const bookName = (body.book_name || body.bookName || '').trim()
    const description = (body.description || '').trim() || null

    if (!bookName) {
      return NextResponse.json({ error: 'Book name is required' }, { status: 400 })
    }

    const created = await prisma.ughraniBook.create({
      data: {
        bookName,
        description,
      }
    })

    return NextResponse.json({
      id: created.id,
      bookName: created.bookName,
      book_name: created.bookName,
      description: created.description,
      createdAt: created.createdAt.toISOString(),
      created_at: created.createdAt.toISOString(),
    }, { status: 201 })
  } catch (err: any) {
    console.error('[API Ughrani Books POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create ughrani book' }, { status: 500 })
  }
}
