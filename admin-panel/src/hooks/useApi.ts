import { useCallback, useContext } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Returns an authenticated fetch that automatically attaches the
 * Bearer token from AuthContext to every request.
 */
export function useApi() {
  const { token } = useAuth()

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only set Content-Type for non-GET requests with a body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return fetch(url, { ...options, headers })
  }, [token])

  return apiFetch
}
