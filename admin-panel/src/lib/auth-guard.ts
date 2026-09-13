import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AuthContext {
  userId: string
  email: string
  name?: string
  fullName?: string
  role: string
  permissions: string[]
}

interface CachedAuthContext {
  context: AuthContext
  userProfile: any
  timestamp: number
}

// In-memory cache for validated tokens (60-second TTL to eliminate repeated auth roundtrips)
const authCache = new Map<string, CachedAuthContext>()
const AUTH_CACHE_TTL_MS = 60000

export function invalidateAuthCache(token?: string) {
  if (token) {
    authCache.delete(token)
  } else {
    authCache.clear()
  }
}

/**
 * Validates the JWT token and optionally checks for a specific permission.
 * Merges role-level permissions WITH per-user extra permissions.
 * Uses an in-memory cache for 15s to avoid duplicate Supabase/DB roundtrips on parallel requests.
 */
export async function validateAuth(
  req: NextRequest, 
  requiredPermission?: string,
  allowInactive = false
): Promise<{ context?: AuthContext; userProfile?: any; error?: NextResponse }> {
  try {
    const authHeader = req.headers.get('Authorization')
    let token = ''
    if (authHeader) {
      token = authHeader.split(' ')[1]
    } else {
      const { searchParams } = new URL(req.url)
      token = searchParams.get('token') || ''
    }

    if (!token) {
      console.error('[auth-guard] Missing Authorization header or query token');
      return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) }
    }

    let context: AuthContext
    let profile: any

    const cached = authCache.get(token)
    const now = Date.now()

    if (cached && (now - cached.timestamp < AUTH_CACHE_TTL_MS)) {
      context = cached.context
      profile = cached.userProfile
    } else {
      let authUser: any = null
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && data?.user) {
        authUser = data.user
      } else {
        // Resilient fallback 1: verify token directly with configured Supabase auth endpoint
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qzxresquqptqxajuffsd.supabase.co'
          const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eHJlc3F1cXB0cXhhanVmZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDc1MzEsImV4cCI6MjEwNDc4MzUzMX0.tRftNSoyB-kL1cB5kJgKTxfoNtLtFs0wFIg1L47KI9A'
          const verifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'apikey': supabaseAnon,
              'Authorization': `Bearer ${token}`
            }
          })
          if (verifyRes.ok) {
            authUser = await verifyRes.json()
          }
        } catch (e) {
          console.error('[auth-guard] Fallback auth verify failed:', e)
        }

        // Resilient fallback 2: direct verify against primary active Supabase project
        if (!authUser) {
          try {
            const primaryUrl = 'https://qzxresquqptqxajuffsd.supabase.co'
            const primaryAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eHJlc3F1cXB0cXhhanVmZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDc1MzEsImV4cCI6MjEwNDc4MzUzMX0.tRftNSoyB-kL1cB5kJgKTxfoNtLtFs0wFIg1L47KI9A'
            const verifyRes = await fetch(`${primaryUrl}/auth/v1/user`, {
              headers: {
                'apikey': primaryAnon,
                'Authorization': `Bearer ${token}`
              }
            })
            if (verifyRes.ok) {
              authUser = await verifyRes.json()
            }
          } catch (e) {
            console.error('[auth-guard] Primary Supabase fallback verify failed:', e)
          }
        }
      }

      if (!authUser) {
        authCache.delete(token)
        console.error('[auth-guard] Supabase Auth Error:', authError?.message || 'No user found');
        return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }
      }

      const user = authUser

      // Fetch user profile with role AND individual extra permissions
      profile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          role: {
            include: { permissions: true }
          },
          permissions: true  // ← Individual extra permissions per user
        }
      })

      if (!profile && user.email) {
        profile = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          include: {
            role: {
              include: { permissions: true }
            },
            permissions: true
          }
        })
      }

      if (!profile) {
        console.error('[auth-guard] User profile not found in Prisma for ID:', user.id, 'email:', user.email);
        return { error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }
      }

      // Merge role permissions + individual extra permissions (deduplicated)
      const rolePermNames = profile.role?.permissions.map((p: any) => p.name) || []
      const extraPermNames = profile.permissions.map((p: any) => p.name) || []
      const permissions = Array.from(new Set([...rolePermNames, ...extraPermNames]))

      context = {
        userId: profile.id,
        email: profile.email,
        name: profile.fullName || profile.email,
        fullName: profile.fullName || profile.email,
        role: profile.role?.name || 'No Role',
        permissions
      }

      // Cache valid auth result
      authCache.set(token, {
        context,
        userProfile: profile,
        timestamp: now
      })

      // Periodic pruning if cache size grows
      if (authCache.size > 200) {
        for (const [k, v] of authCache.entries()) {
          if (now - v.timestamp > AUTH_CACHE_TTL_MS) {
            authCache.delete(k)
          }
        }
      }
    }

    // Check for specific permission if required
    if (requiredPermission) {
      let hasPermission = context.permissions.includes(requiredPermission);
      
      // Self-healing fallback for singular vs plural mismatches
      if (!hasPermission) {
        const prefixes = [
          ['leads.', 'lead.'],
          ['quotations.', 'quotation.'],
          ['roles.', 'role.'],
          ['users.', 'user.'],
          ['settings.', 'setting.'],
          ['permissions.', 'permission.'],
          ['policies.', 'policy.']
        ];
        for (const [plural, singular] of prefixes) {
          if (requiredPermission.startsWith(plural)) {
            const alternative = requiredPermission.replace(plural, singular);
            if (context.permissions.includes(alternative)) {
              hasPermission = true;
              break;
            }
          } else if (requiredPermission.startsWith(singular)) {
            const alternative = requiredPermission.replace(singular, plural);
            if (context.permissions.includes(alternative)) {
              hasPermission = true;
              break;
            }
          }
        }
      }

      // Fallback: If user has lead.view permission, allow policy.view as well
      if (!hasPermission && (requiredPermission === 'policy.view' || requiredPermission === 'policies.view')) {
        if (context.permissions.includes('lead.view') || context.permissions.includes('leads.view')) {
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        return { error: NextResponse.json({ error: `Missing required permission: ${requiredPermission}` }, { status: 403 }) }
      }
    }

    return {
      context,
      userProfile: profile
    }
  } catch (error: any) {
    console.error('[auth-guard] CRITICAL ERROR:', error)
    return { 
      error: NextResponse.json({ 
        error: 'Internal Server Error during authorization',
        details: error?.message || 'Unknown error'
      }, { status: 500 }) 
    }
  }
}

