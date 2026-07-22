import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  console.log('[auth/me] GET request received');
  const { context, error } = await validateAuth(req, undefined, true)
  if (error) return error

  try {
    const user = await prisma.user.findUnique({
      where: { id: context!.userId },
      include: {
        role: {
          include: {
            permissions: {
              select: { name: true }
            }
          }
        },
        permissions: {
          select: { name: true }
        }
      }
    })

    if (!user) {
      console.error('[auth/me] User not found in DB for id:', context!.userId)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('[auth/me] Internal error:', error?.message || error)
    return NextResponse.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 })
  }
}
