import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function RenewalsRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(protected)/rate-calculator');
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#002FA7" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
