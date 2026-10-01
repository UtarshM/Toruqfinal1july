// In-memory cache for rate data with TTL and instant invalidation

interface CacheEntry<T> {
  data: T
  timestamp: number
}

declare global {
  // eslint-disable-next-line no-var
  var _rateMemoryCache: Map<string, CacheEntry<any>> | undefined
}

const cache: Map<string, CacheEntry<any>> = globalThis._rateMemoryCache ?? new Map()
if (!globalThis._rateMemoryCache) {
  globalThis._rateMemoryCache = cache
}

const DEFAULT_TTL_MS = 60 * 1000 // 60 seconds

export function getCachedRateData<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCachedRateData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateRateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear()
    return
  }
  for (const k of cache.keys()) {
    if (k.startsWith(keyPrefix)) {
      cache.delete(k)
    }
  }
}
