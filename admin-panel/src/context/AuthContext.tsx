"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

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

  const fetchProfile = async (session: any, isInitial = false) => {
    if (!session) {
      setUser(null)
      setToken(null)
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('toque_user_profile') } catch {}
      }
      setIsLoading(false)
      return
    }

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
        if (typeof window !== 'undefined') {
          try { sessionStorage.setItem('toque_user_profile', JSON.stringify(profile)) } catch {}
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle invalid/expired tokens (401) or missing user profiles (404)
        if (response.status === 401 || response.status === 404) {
          console.error(`[auth-me] Authentication failed (${response.status}). Signing out...`, errorData)
          setUser(null)
          setToken(null)
          if (typeof window !== 'undefined') {
            try { sessionStorage.removeItem('toque_user_profile') } catch {}
          }
          setIsLoading(false)
          try {
            await supabase.auth.signOut()
          } catch (err) {
            console.error('[auth-me] Failed to clear Supabase session:', err)
          }
          return
        }

        if (response.status !== 403) {
          console.error('[auth-me] API Error:', response.status, errorData)
        }
        
        // FALLBACK: If API fails for other reasons, use basic session info
        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || 'Team Member',
          permissions: []
        }
        setUser(fallbackProfile)
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error?.message || error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Check cached session on client mount
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('toque_user_profile')
        if (cached) {
          setUser(JSON.parse(cached))
          setIsLoading(false)
        }
      } catch {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session, true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session, false)
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
