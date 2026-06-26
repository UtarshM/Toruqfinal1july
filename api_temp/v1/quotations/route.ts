import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const quotation = await prisma.quotation.create({
      data: {
        leadId: body.lead_id,
        createdBy: body.created_by,
        amount: body.amount,
        status: body.status || 'Draft',
        details: body.details || {}
      }
    })
    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Quotation POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('lead_id')
    
    const where: any = {}
    if (leadId) where.leadId = leadId

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true } }
      }
    })

    return NextResponse.json(quotations)
  } catch (error) {
    console.error('Quotations GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
