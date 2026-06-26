/**
 * src/lib/notifications.ts
 * Service to send push notifications via Expo Push API.
 */

interface PushPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
}

export async function sendPushNotification(payload: PushPayload) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Expo Push Error: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return null;
  }
}

/**
 * Convenience method to notify a specific user by their database ID.
 */
import prisma from './prisma';

export async function notifyUser(userId: string, title: string, body: string, data?: any) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true }
  });

  if (user?.expoPushToken) {
    return sendPushNotification({
      to: user.expoPushToken,
      title,
      body,
      data,
      sound: 'default'
    });
  }
  return null;
}
