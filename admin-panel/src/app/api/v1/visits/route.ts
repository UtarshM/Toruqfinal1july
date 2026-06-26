import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'
import { notify } from '@/lib/notify'

// GET — list visits (with GPS data)
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'visit.view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  const where: any = {}
  
  if (context?.role === 'EXECUTIVE') {
    where.userId = context.userId
  } else if (context?.role === 'MANAGER') {
    const team = await prisma.user.findMany({
      where: { managerId: context.userId },
      select: { id: true }
    })
    const teamIds = team.map(t => t.id)
    where.userId = { in: [context.userId, ...teamIds] }
  }

  if (status) where.status = status

  const visits = await prisma.visit.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    include: {
      customer: { select: { name: true, phone: true } },
      lead: { select: { clientName: true } },
      user: { select: { fullName: true } }
    }
  })

  return NextResponse.json(visits)
}

// POST — create a visit
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'visit.create')
  if (error) return error

  const body = await req.json()
  const visit = await prisma.visit.create({
    data: {
      userId: context!.userId,
      customerId: body.customerId,
      leadId: body.leadId,
      purpose: body.purpose,
      scheduledAt: new Date(body.scheduledAt),
      location: body.location,
      status: 'scheduled'
    }
  })

  logActivity(context!.userId, 'create', 'Visit', visit.id)
  return NextResponse.json(visit, { status: 201 })
}
