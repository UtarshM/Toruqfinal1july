import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    const responses = await prisma.predefinedResponse.findMany({
      where,
      orderBy: { orderIndex: 'asc' }
    })

    return NextResponse.json(responses)
  } catch (error) {
    console.error('Responses GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'settings.manage') // Assuming admin only
  if (error) return error

  try {
    const body = await req.json()
    
    // Get highest order index
    const lastItem = await prisma.predefinedResponse.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true }
    })
    
    const newOrderIndex = lastItem ? lastItem.orderIndex + 1 : 0

    const response = await prisma.predefinedResponse.create({
      data: {
        text: body.text,
        isActive: body.isActive ?? true,
        orderIndex: body.orderIndex ?? newOrderIndex,
        requiresFollowUp: body.requiresFollowUp ?? false
      }
    })
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Response POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
