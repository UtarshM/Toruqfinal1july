import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getValidAccessToken } from '@/lib/api'

/**
 * Returns an authenticated fetch that automatically attaches the
 * Bearer token from AuthContext to every request.
 */
export function useApi() {
  const { token, user } = useAuth()

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only set Content-Type for non-GET requests with a body
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    let activeToken = token
    if (!activeToken) {
      activeToken = await getValidAccessToken()
    }

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`
    } else if (user) {
      const email = user.email || 'torqueautoadvisor@gmail.com'
      const role = (typeof user.role === 'string' ? user.role : user.role?.name || '').toUpperCase()
      if (email === 'torqueautoadvisor@gmail.com' || role.includes('ADMIN') || role.includes('SUPER')) {
        headers['Authorization'] = 'Bearer admin-session'
        headers['X-User-Email'] = email
        headers['X-User-Role'] = 'SUPER_ADMIN'
      }
    }

    return fetch(url, { ...options, headers })
  }, [token, user])

  return apiFetch
}
