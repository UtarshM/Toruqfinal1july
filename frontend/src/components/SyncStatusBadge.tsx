/**
 * src/components/SyncStatusBadge.tsx
 * Status badge communicating offline/online synchronization state (Phase 34, 35).
 * 
 * States:
 * - ✓ Synced
 * - ↻ Syncing...
 * - ! N items waiting
 * - ✕ Sync failed (Tap to retry)
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSyncState, subscribeSyncState, syncAll, retryFailedMutations, SyncState } from '../lib/sync-engine';

export function SyncStatusBadge() {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    const unsubscribe = subscribeSyncState((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const handlePress = () => {
    if (state.status === 'failed') {
      retryFailedMutations();
    } else if (state.status !== 'syncing') {
      syncAll();
    }
  };

  if (state.status === 'syncing') {
    return (
      <View style={[styles.badge, styles.syncingBadge]}>
        <ActivityIndicator size="small" color="#0284c7" style={styles.icon} />
        <Text style={[styles.text, styles.syncingText]}>Syncing...</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <TouchableOpacity style={[styles.badge, styles.failedBadge]} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="close-circle" size={14} color="#dc2626" style={styles.icon} />
        <Text style={[styles.text, styles.failedText]}>Sync failed (Tap to retry)</Text>
      </TouchableOpacity>
    );
  }

  if (state.pendingCount > 0) {
    return (
      <TouchableOpacity style={[styles.badge, styles.pendingBadge]} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="cloud-upload-outline" size={14} color="#d97706" style={styles.icon} />
        <Text style={[styles.text, styles.pendingText]}>{state.pendingCount} items waiting</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.badge, styles.syncedBadge]} onPress={handlePress} activeOpacity={0.7}>
      <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={styles.icon} />
      <Text style={[styles.text, styles.syncedText]}>Synced</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncedBadge: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  syncedText: {
    color: '#16a34a',
  },
  syncingBadge: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  syncingText: {
    color: '#0284c7',
  },
  pendingBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  pendingText: {
    color: '#d97706',
  },
  failedBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  failedText: {
    color: '#dc2626',
  },
});
