import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { id } = await params
    const body = await req.json()
    
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: body.status,
        approvedBy: body.approvedBy || null
      }
    })
    
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
