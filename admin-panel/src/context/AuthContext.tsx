"use client"
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { safeRefreshToken } from '@/lib/api'

interface UserProfile {
  id: string
  email: string
  fullName: string
  isActive?: boolean
  role?: {
    name: string
    permissions: Array<{ name: string }>
  }
  permissions: string[]
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  permissions: string[]
  token: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  permissions: [],
  token: null
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const lastProfileFetchRef = useRef<number>(0)
  const isFetchingProfileRef = useRef<boolean>(false)

  const fetchProfile = async (session: any, force = false) => {
    if (!session) {
      return
    }

    // Throttle profile refetches: if profile was successfully fetched < 45 seconds ago, skip unless forced
    const now = Date.now()
    if (!force && lastProfileFetchRef.current && (now - lastProfileFetchRef.current < 45000)) {
      if (session.access_token) setToken(session.access_token)
      setIsLoading(false)
      return
    }

    if (isFetchingProfileRef.current) return
    isFetchingProfileRef.current = true

    const accessToken = session.access_token
    setToken(accessToken)

    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        const rolePermissions = data.role?.permissions?.map((p: any) => p.name) || []
        const userPermissions = data.permissions?.map((p: any) => p.name) || []
        const profile = {
          ...data,
          permissions: Array.from(new Set([...rolePermissions, ...userPermissions]))
        }
        setUser(profile)
        lastProfileFetchRef.current = Date.now()
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('toque_user_profile', JSON.stringify(profile)) } catch {}
        }
      } else if (response.status === 401) {
        // Safely refresh token using cross-tab mutex
        console.warn('[auth] Token expired during me check, safely refreshing...')
        const refreshedToken = await safeRefreshToken()
        if (refreshedToken) {
          isFetchingProfileRef.current = false
          const { data: { session: newSession } } = await supabase.auth.getSession()
          if (newSession) {
            await fetchProfile(newSession, true)
            return
          }
        }
      } else {
        // Non-401 error (network, server busy): preserve existing session and use fallback profile if not yet set
        if (!user && session.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || 'Team Member',
            permissions: []
          })
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.warn('[auth] Auth check offline or paused:', error?.message || error)
      }
      if (!user && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || 'Team Member',
          permissions: []
        })
      }
    } finally {
      isFetchingProfileRef.current = false
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Track whether we have a cached profile from localStorage
    let hasCachedProfile = false

    // 1. Instantly restore cached user profile on mount so UI does not flash or lag
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('toque_user_profile')
        if (cached) {
          setUser(JSON.parse(cached))
          setIsLoading(false)
          hasCachedProfile = true
        }
      } catch {}
    }

    // 2. Validate current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session, true)
      } else if (!hasCachedProfile) {
        // Only clear state if there's no cached profile either.
        // If user has a cached profile but getSession() is null (e.g. rehydration race),
        // keep showing the UI and let onAuthStateChange handle recovery.
        setUser(null)
        setToken(null)
        setIsLoading(false)
      } else {
        // We have a cached profile but Supabase session is null.
        // Try to silently recover the session after a short delay
        // (Supabase may still be loading from storage)
        setTimeout(async () => {
          try {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession) {
              fetchProfile(retrySession, true)
            }
            // If still null, keep the cached profile visible.
            // The user will see auth errors on API calls but won't be force-logged-out.
          } catch {}
        }, 1500)
      }
    }).catch(() => {
      setIsLoading(false)
    })

    // 3. Listen to auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        const isExplicitLogout = typeof window !== 'undefined' && sessionStorage.getItem('torque_explicit_logout') === 'true'
        if (isExplicitLogout) {
          // ====== EXPLICIT LOGOUT: Clear everything ======
          if (typeof window !== 'undefined') sessionStorage.removeItem('torque_explicit_logout')
          setUser(null)
          setToken(null)
          lastProfileFetchRef.current = 0
          if (typeof window !== 'undefined') {
            try { localStorage.removeItem('toque_user_profile') } catch {}
          }
          setIsLoading(false)
        } else {
          // ====== UNEXPECTED SIGNED_OUT (tab switch, sleep, multi-tab refresh race) ======
          // NEVER immediately clear user state. Attempt recovery with delay.
          console.warn('[auth] Unexpected SIGNED_OUT event — attempting silent recovery...')
          
          // Wait a moment for Supabase to settle (another tab may have refreshed the token)
          await new Promise(r => setTimeout(r, 2000))
          
          try {
            const { data: { session: recoveredSession } } = await supabase.auth.getSession()
            if (recoveredSession?.user) {
              console.log('[auth] Session recovered after unexpected SIGNED_OUT')
              fetchProfile(recoveredSession, false)
              return
            }
          } catch {}

          // Try an active refresh as last resort
          try {
            const refreshedToken = await safeRefreshToken()
            if (refreshedToken) {
              const { data: { session: refreshedSession } } = await supabase.auth.getSession()
              if (refreshedSession?.user) {
                console.log('[auth] Session recovered via active refresh')
                fetchProfile(refreshedSession, false)
                return
              }
            }
          } catch {}

          // Even after all recovery attempts failed, DO NOT clear the cached profile.
          // The user may just be offline or in a transient state.
          // Only log the failure — don't force a logout.
          console.warn('[auth] Session recovery failed, but keeping cached profile to prevent unnecessary logout.')
          // Note: if the session is truly dead, API calls will fail with 401 errors,
          // and the user will need to manually re-login. This is far better than
          // being kicked out every time they switch tabs.
        }
      } else if (session) {
        // TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED, INITIAL_SESSION
        fetchProfile(session, false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      permissions: user?.permissions || [],
      token
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
