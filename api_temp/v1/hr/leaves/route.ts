import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (userId) {
      where.userId = userId
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          },
          approver: {
            select: { fullName: true }
          }
        }
      }),
      prisma.leaveRequest.count({ where })
    ])

    return NextResponse.json({ items: leaves, total })
  } catch (error) {
    console.error('Leaves GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const leave = await prisma.leaveRequest.create({
      data: {
        userId: body.userId,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        status: body.status || 'Pending'
      }
    })
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
