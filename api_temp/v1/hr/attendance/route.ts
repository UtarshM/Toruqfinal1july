import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (userId) {
      where.userId = userId
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          }
        }
      }),
      prisma.attendance.count({ where })
    ])

    return NextResponse.json({ items: attendance, total })
  } catch (error) {
    console.error('Attendance GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const attendance = await prisma.attendance.create({
      data: {
        userId: body.userId,
        date: new Date(body.date),
        status: body.status,
        checkInTime: body.checkInTime ? new Date(body.checkInTime) : null,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : null,
      }
    })
    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Attendance POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
