import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await validateAuth(req, 'settings.manage')
  if (error) return error
  const { id } = await params

  try {
    const body = await req.json()
    const response = await prisma.predefinedResponse.update({
      where: { id },
      data: {
        text: body.text,
        isActive: body.isActive,
        orderIndex: body.orderIndex,
        requiresFollowUp: body.requiresFollowUp
      }
    })
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Response PUT Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await validateAuth(req, 'settings.manage')
  if (error) return error
  const { id } = await params

  try {
    await prisma.predefinedResponse.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Response DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
