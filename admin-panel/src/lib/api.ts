import { supabase } from './supabase'

// In-tab singleton promise to deduplicate concurrent refresh requests within the same browser tab
let tabRefreshPromise: Promise<string | null> | null = null

/**
 * Safely refreshes the session token across multiple tabs and concurrent calls.
 * Uses Web Locks API (navigator.locks) to ensure that only ONE tab across all open windows
 * executes refreshSession(), while other tabs wait and consume the resulting refreshed session.
 * This completely prevents Supabase Refresh Token Reuse errors.
 */
export async function safeRefreshToken(): Promise<string | null> {
  if (tabRefreshPromise) {
    return tabRefreshPromise
  }

  tabRefreshPromise = (async () => {
    try {
      // 1. Cross-tab synchronization via Web Locks API
      if (typeof window !== 'undefined' && 'locks' in navigator) {
        const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
          ? AbortSignal.timeout(12000)
          : undefined
        return await navigator.locks.request('torque_auth_refresh_lock', signal ? { signal } : {}, async () => {
          // Inside the lock: first check if another tab ALREADY refreshed the token while we were queued!
          const { data: { session } } = await supabase.auth.getSession()
          const nowSec = Math.floor(Date.now() / 1000)
          if (session?.access_token && session.expires_at && session.expires_at - nowSec > 60) {
            // Already refreshed by another tab! Use fresh access token
            return session.access_token
          }

          // We hold the lock and need to perform the refresh
          const { data, error } = await supabase.auth.refreshSession()
          if (error || !data.session) {
            console.warn('[auth] Safe cross-tab token refresh failed:', error?.message)
            // If refresh fails, check if existing session token is still usable
            return session?.access_token || null
          }
          return data.session.access_token
        })
      } else {
        // Fallback for environments without navigator.locks
        const { data: { session } } = await supabase.auth.getSession()
        const nowSec = Math.floor(Date.now() / 1000)
        if (session?.access_token && session.expires_at && session.expires_at - nowSec > 60) {
          return session.access_token
        }
        const { data, error } = await supabase.auth.refreshSession()
        if (error || !data.session) {
          return session?.access_token || null
        }
        return data.session.access_token
      }
    } catch (err: any) {
      console.warn('[auth] safeRefreshToken exception:', err?.message || err)
      // On timeout or exception, fallback to reading current session
      try {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
      } catch {
        return null
      }
    } finally {
      tabRefreshPromise = null
    }
  })()

  return tabRefreshPromise
}

export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    // Check if token expires within 90 seconds (expires_at is Unix seconds)
    const nowSec = Math.floor(Date.now() / 1000)
    const isExpiringSoon = session.expires_at ? (session.expires_at - nowSec < 90) : false

    if (isExpiringSoon) {
      const refreshedToken = await safeRefreshToken()
      if (refreshedToken) return refreshedToken
    }

    return session.access_token
  } catch {
    return null
  }
}

export async function fetchApi(path: string, options: RequestInit = {}, retries = 2) {
  let token = await getValidAccessToken()

  if (!token) {
    // Do NOT redirect or clear localStorage here!
    // AuthContext is the single source of truth for auth state.
    // Transient token unavailability (tab switch, sleep wake) is normal.
    throw new Error('Missing authorization token')
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(path, {
        ...options,
        headers,
      })

      if (!res.ok) {
        // If 401 Unauthorized, attempt safe token refresh and retry request
        if (res.status === 401 && i === 0) {
          const refreshedToken = await safeRefreshToken()
          if (refreshedToken) {
            token = refreshedToken
            headers['Authorization'] = `Bearer ${refreshedToken}`
            continue // Retry this request with the refreshed token!
          }
        }

        // Read body as text first, then try to parse as JSON
        // This prevents "Unexpected token" errors when server returns HTML/text errors
        let error: any = { error: 'An unknown error occurred' }
        try {
          const errorText = await res.text()
          try {
            error = JSON.parse(errorText)
          } catch {
            // Response is not JSON (e.g., "Request Entity Too Large", HTML error page)
            error = { error: errorText || `HTTP error! status: ${res.status}` }
          }
        } catch {
          // Failed to read response body at all
          error = { error: `HTTP error! status: ${res.status}` }
        }

        // Only redirect to login if user profile was deleted in DB (404 profile error)
        if (res.status === 404 && error?.error?.includes('profile') && typeof window !== 'undefined') {
          console.error('[api] User profile deleted. Logging out...')
          try { localStorage.removeItem('toque_user_profile') } catch {}
          sessionStorage.setItem('torque_explicit_logout', 'true')
          await supabase.auth.signOut().catch(() => {})
          window.location.href = '/login'
        }

        const errorMsg = error.details 
          ? `${error.error} (${error.details})` 
          : (error.error || `HTTP error! status: ${res.status}`)

        throw new Error(errorMsg)
      }

      // Also safely parse the success response
      const responseText = await res.text()
      if (!responseText || responseText.trim() === '') {
        return {} // Empty response is valid for some operations
      }
      try {
        return JSON.parse(responseText)
      } catch {
        console.warn('[api] Response is not valid JSON:', responseText.substring(0, 200))
        throw new Error(`Server returned invalid JSON response`)
      }
    } catch (err: any) {
      if (i === retries - 1) throw err
      console.warn(`[api] Fetch failed, retrying (${i + 1}/${retries})...`, err.message)
      await new Promise(resolve => setTimeout(resolve, 400 * (i + 1)))
    }
  }
}
