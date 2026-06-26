import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'quotation.share')
  if (error) return error

  try {
    const { id } = await params
    
    // Generate a unique token if it doesn't exist
    const token = uuidv4()
    
    const quotation = await prisma.quotation.update({
      where: { id },
      data: { shareToken: token }
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://toque.in'}/view-quote/${token}`

    return NextResponse.json({ 
      shareToken: token,
      shareUrl
    })
  } catch (error) {
    console.error('Quotation Share Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
