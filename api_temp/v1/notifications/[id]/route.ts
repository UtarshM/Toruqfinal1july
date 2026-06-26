import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

// PATCH /api/v1/notifications/[id] — mark single as read
// PATCH /api/v1/notifications/read-all — mark all as read
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req)
  if (error) return error
  const { id } = await params

  if (id === 'read-all') {
    await prisma.notification.updateMany({
      where: { userId: context!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    })
    return NextResponse.json({ success: true })
  }

  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notification.userId !== context!.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() }
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req)
  if (error) return error
  const { id } = await params

  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== context!.userId) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 })
  }

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
