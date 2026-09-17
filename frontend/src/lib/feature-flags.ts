/**
 * src/lib/feature-flags.ts
 * Mobile Client Feature Flag Controller.
 * 
 * Determines whether this device runs the new Offline-First SQLite engine
 * or legacy online API routes.
 */

import { api } from './api';
import { getCacheItem, setCacheItem } from './db';

export interface MobileFeatureFlags {
  offlineSqlitePilot: boolean;
  approvalInboxV2: boolean;
  isPilotUser: boolean;
}

const DEFAULT_FLAGS: MobileFeatureFlags = {
  offlineSqlitePilot: true,
  approvalInboxV2: true,
  isPilotUser: true
};

const CACHE_KEY = 'user_feature_flags';

export async function fetchFeatureFlags(): Promise<MobileFeatureFlags> {
  try {
    const res = await api.get('/settings/feature-flags');
    const flags = res.data?.data?.flags || res.data?.flags || DEFAULT_FLAGS;
    await setCacheItem(CACHE_KEY, flags);
    return flags;
  } catch (err) {
    console.warn('[FeatureFlags] Using cached flags due to offline/network error:', err);
    const cached = await getCacheItem(CACHE_KEY);
    return cached || DEFAULT_FLAGS;
  }
}

export async function isOfflinePilotEnabled(): Promise<boolean> {
  const flags = await fetchFeatureFlags();
  return !!flags.offlineSqlitePilot;
}
