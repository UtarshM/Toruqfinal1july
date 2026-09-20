/**
 * Mock database helper for the web platform to prevent bundling expo-sqlite.
 * Enables running the app on the web without WebAssembly compiler errors.
 */

export async function getDB(): Promise<any> {
  return {
    getAllAsync: async (query: string, params: any[] = []) => {
      console.log('[SQLite Web Mock] getAllAsync:', query, params);
      // Return empty array for tables by default to avoid UI crashes
      return [];
    },
    runAsync: async (query: string, params: any[] = []) => {
      console.log('[SQLite Web Mock] runAsync:', query, params);
      return { lastInsertRowId: 1, changes: 1 };
    },
    getFirstAsync: async (query: string, params: any[] = []) => {
      console.log('[SQLite Web Mock] getFirstAsync:', query, params);
      return null;
    },
    execAsync: async (query: string) => {
      console.log('[SQLite Web Mock] execAsync:', query);
    }
  };
}

export async function initDB(): Promise<void> {
  console.log('[SQLite Web Mock] Database initialized.');
}

import { DEFAULT_RATE_COMPANIES, DEFAULT_RATE_RELATIONSHIPS } from './rate-data-seed';

export async function getCacheItem(key: string): Promise<any | null> {
  if (typeof window !== 'undefined') {
    try {
      const val = window.localStorage.getItem(`@sqlite_cache_${key}`);
      if (val) return JSON.parse(val);
    } catch {
      // continue to fallback
    }
  }
  if (key === 'rate_companies') return DEFAULT_RATE_COMPANIES;
  if (key === 'rate_relationships') return DEFAULT_RATE_RELATIONSHIPS;
  return null;
}

export async function setCacheItem(key: string, value: any): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`@sqlite_cache_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('[SQLite Web Mock] Cache write failed:', e);
    }
  }
}

export async function clearSQLiteCache(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('@sqlite_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('[SQLite Web Mock] Cache clear failed:', e);
    }
  }
}
