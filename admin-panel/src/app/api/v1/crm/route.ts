import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'

// GET — all customers with revenue data
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'crm.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    const where: any = {}
    
    // RBAC: Dynamic filtering based on role via associated lead
    if (context && context.role === 'EXECUTIVE') {
      where.lead = { assignedTo: context.userId }
    } else if (context && context.role === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.lead = { assignedTo: { in: [context.userId, ...teamIds] } }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { [sortBy]: order },
      include: {
        visits: { orderBy: { scheduledAt: 'desc' }, take: 3 }
      }
    })
    return NextResponse.json(customers)
  } catch (error) {
    console.error('CRM GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST — create customer
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'crm.create')
  if (error) return error

  try {
    const body = await req.json()
    const customer = await prisma.customer.create({
      data: {
        leadId: body.lead_id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        kycStatus: body.kyc_status || 'pending'
      }
    })
    logActivity(context!.userId, 'create', 'Customer', customer.id, { name: body.name })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Customer POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
