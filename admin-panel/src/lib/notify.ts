import prisma from './prisma'
import { supabaseAdmin } from './supabase-admin'

export interface NotifyPayload {
  userId: string
  title: string
  body: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'action'
  entityType?: string
  entityId?: string
  data?: Record<string, any>
  pushEnabled?: boolean
}

/**
 * Create an in-app notification and optionally send an Expo push notification.
 * Fire-and-forget safe — never throws.
 */
export async function notify(payload: NotifyPayload) {
  try {
    // 1. Save to DB
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'info',
        entityType: payload.entityType,
        entityId: payload.entityId,
        data: payload.data
      }
    })

    // 2. Send Expo push notification if token available
    if (payload.pushEnabled !== false) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { expoPushToken: true }
      })

      if (user?.expoPushToken && user.expoPushToken.startsWith('ExponentPushToken[')) {
        await sendExpoPush(user.expoPushToken, payload.title, payload.body, payload.data)
      }
    }

    return notification
  } catch (err) {
    console.error('[Notify] Failed to send notification:', err)
    return null
  }
}

/**
 * Notify multiple users at once (e.g. broadcast to all managers)
 */
export async function notifyMany(userIds: string[], payload: Omit<NotifyPayload, 'userId'>) {
  await Promise.allSettled(
    userIds.map(userId => notify({ ...payload, userId }))
  )
}

/**
 * Notify all users with a specific role
 */
export async function notifyRole(roleName: string, payload: Omit<NotifyPayload, 'userId'>) {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: roleName } },
    select: { id: true }
  })
  await notifyMany(users.map(u => u.id), payload)
}

async function sendExpoPush(token: string, title: string, body: string, data?: Record<string, any>) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high'
      })
    })
  } catch (err) {
    console.error('[ExpoPush] Failed to send push:', err)
  }
}
