import { validateAuth, invalidateAuthCache } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { userProfile, error } = await validateAuth(req, undefined, true)
  if (error) return error

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  return NextResponse.json(userProfile)
}

export async function PATCH(req: NextRequest) {
  const { context, userProfile, error } = await validateAuth(req, undefined, true)
  if (error || !userProfile) {
    return error || NextResponse.json({ error: 'Unauthorized or profile not found' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const rawName = body.fullName !== undefined ? body.fullName : body.name

    if (rawName !== undefined && (!rawName || typeof rawName !== 'string' || !rawName.trim())) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const trimmedName = rawName !== undefined ? rawName.trim() : undefined
    const phone = body.personalMobile !== undefined 
      ? (body.personalMobile ? String(body.personalMobile).trim() : null) 
      : (body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined)

    const updatedUser = await prisma.user.update({
      where: { id: userProfile.id },
      data: {
        ...(trimmedName !== undefined && { fullName: trimmedName }),
        ...(phone !== undefined && { personalMobile: phone }),
        ...(body.homeMobile !== undefined && { homeMobile: body.homeMobile ? String(body.homeMobile).trim() : null }),
        ...(body.highestQualification !== undefined && { highestQualification: body.highestQualification }),
        ...(body.dateOfBirth !== undefined && { dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null }),
      },
      include: {
        role: { include: { permissions: true } },
        permissions: true,
      }
    })

    // Invalidate auth cache specifically for this user so their new profile reflects immediately
    invalidateAuthCache(userProfile.id)

    // Sync to Supabase Auth metadata in background (non-blocking)
    try {
      const authUpdates: any = {
        user_metadata: {}
      }
      if (trimmedName !== undefined) {
        authUpdates.user_metadata.full_name = trimmedName
        authUpdates.user_metadata.name = trimmedName
      }
      if (phone !== undefined && phone) {
        authUpdates.user_metadata.phone = phone
      }
      if (Object.keys(authUpdates.user_metadata).length > 0) {
        void (async () => {
          try {
            await supabaseAdmin.auth.admin.updateUserById(userProfile.id, authUpdates).catch(async () => {
              if (context?.userId && context.userId !== userProfile.id) {
                await supabaseAdmin.auth.admin.updateUserById(context.userId, authUpdates).catch(() => {})
              }
            })
          } catch (e) {
            console.warn('[auth/me PATCH] Background auth sync note:', e)
          }
        })()
      }
    } catch (authErr) {
      console.warn('[auth/me PATCH] Supabase Auth sync note:', authErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      ...updatedUser
    })
  } catch (err: any) {
    console.error('[auth/me PATCH] Error updating profile:', err)
    return NextResponse.json({ error: 'Failed to update profile', details: err?.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req)
}

