import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await validateAuth(req, 'lead.view')
  if (authError) return authError

  try {
    const { id } = await params
    
    // Validate UUID format to prevent Prisma/DB crash
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid Lead ID format' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { fullName: true } },
        policies: true,
        quotations: true,
        claims: true,
        followUps: { orderBy: { scheduledAt: 'asc' } }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error: any) {
    console.error('Lead Detail GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        clientName: body.client_name,
        clientEmail: body.client_email,
        clientPhone: body.client_phone,
        status: body.status,
        assignedTo: body.assigned_to
      }
    })
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead Detail PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
