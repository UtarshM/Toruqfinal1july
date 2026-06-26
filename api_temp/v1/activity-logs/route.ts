import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const isAdmin = context!.permissions.includes('system.audit_logs_view')

    // Admins/Managers see all logs; others see only their own
    const where = isAdmin ? {} : { userId: context!.userId }

    const logs = await prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } }
      }
    })

    return NextResponse.json(logs)
  } catch (err: any) {
    console.error('Activity Logs GET Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
