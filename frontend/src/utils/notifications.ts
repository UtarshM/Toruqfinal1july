import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../utils/api';

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id', // Replace with your actual project ID from app.json
  })).data;

  console.log('Push Token:', token);

  // Send token to backend
  try {
    await api.post('/users/push-token', { userId, token });
  } catch (error) {
    console.error('Failed to save push token to backend:', error);
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
