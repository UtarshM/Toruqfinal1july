import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'

// GET — fetch my notifications
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  const notifications = await prisma.notification.findMany({
    where: {
      userId: context!.userId,
      ...(unreadOnly ? { isRead: false } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: context!.userId, isRead: false }
  })

  return NextResponse.json({ notifications, unreadCount })
}

// POST — send a notification (admin only)
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'notification.send')
  if (error) return error

  const body = await req.json()
  const { userId, title, body: msgBody, type, entityType, entityId, data } = body

  if (!userId || !title || !msgBody) {
    return NextResponse.json({ error: 'userId, title, and body are required' }, { status: 400 })
  }

  const notification = await notify({ userId, title, body: msgBody, type, entityType, entityId, data })
  return NextResponse.json(notification)
}
