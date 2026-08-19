import React, { useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/utils/theme';

export default function RenewalsScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace('/sheets' as any);
    }, [router])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
