import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, Alert, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

export async function checkAndApplyUpdate(interactive = true) {
  if (__DEV__ || !Updates.isEnabled) {
    if (interactive) {
      const mode = __DEV__ ? 'Expo Development' : (!Updates.isEnabled ? 'Expo Go / Native Client' : 'Standalone Build');
      Alert.alert(
        'OTA Update Status',
        [
          'Over-The-Air (OTA) updates are configured and active in standalone production and preview APK builds.',
          '',
          `App Version: 2.0.0`,
          `Channel: ${Updates.channel || 'preview'}`,
          `Runtime Version: ${Updates.runtimeVersion || '2.0.0'}`,
          `Environment: ${mode}`
        ].join('\n')
      );
    }
    return false;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      if (interactive) {
        Alert.alert('Update Found 🚀', 'Downloading the latest version of Torque Auto Advisor over-the-air...');
      }
      await Updates.fetchUpdateAsync();
      if (interactive) {
        Alert.alert(
          'Update Ready 🎉',
          'The latest update has been downloaded over-the-air. Restart now to apply changes?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart Now', onPress: async () => await Updates.reloadAsync() }
          ]
        );
      }
      return true;
    } else {
      if (interactive) {
        const info = [
          'You are running the latest version.',
          `Channel: ${Updates.channel || 'preview'}`,
          `Update ID: ${Updates.updateId ? Updates.updateId.slice(0, 8) + '...' : 'Embedded Build'}`,
          `Runtime: ${Updates.runtimeVersion || '2.0.0'}`
        ].join('\n');
        Alert.alert('Up to Date ✓', info);
      }
      return false;
    }
  } catch (error: any) {
    if (interactive) {
      Alert.alert('Update Check', error?.message || 'Could not check for updates.');
    }
    return false;
  }
}

export function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const checkBackgroundUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          setUpdateReady(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8
          }).start();
          Alert.alert(
            'New Version Downloaded 🎉',
            'An on-air update was successfully downloaded. Restart now to apply the latest changes?',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Restart Now', onPress: async () => await Updates.reloadAsync() }
            ]
          );
        }
      } catch (err) {
        // Silently continue
      }
    };

    checkBackgroundUpdate();
  }, []);

  const handleRestart = async () => {
    setReloading(true);
    try {
      await Updates.reloadAsync();
    } catch (e) {
      setReloading(false);
    }
  };

  if (!updateReady) return null;

  return (
    <Animated.View style={[styles.bannerContainer, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.bannerContent}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>New Version Ready!</Text>
          <Text style={styles.bannerText}>An on-air update was downloaded and is ready to use.</Text>
        </View>
        <Pressable
          style={styles.restartBtn}
          onPress={handleRestart}
          disabled={reloading}
        >
          {reloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.restartBtnText}>Restart</Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  restartBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  restartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
