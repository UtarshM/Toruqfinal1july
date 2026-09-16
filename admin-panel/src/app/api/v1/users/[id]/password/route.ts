import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const userRole = context.role?.toUpperCase() || ''
    const isAdmin = userRole.includes('ADMIN') || userRole.includes('SUPER')

    // Only Admin or Super Admin can reset/change another user's password
    // Users can only change their own if permissions allow
    const isSelf = context.userId === id
    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Forbidden: Only Administrators can change other user passwords.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { password } = body

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    // Check user exists in database
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in system database.' }, { status: 404 })
    }

    // Update password in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password
    })

    if (authError) {
      console.error('[Admin Password Reset] Supabase error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Log the security action in ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: id,
          metadata: {
            targetEmail: targetUser.email,
            targetName: targetUser.fullName,
            resetBy: context.email,
            timestamp: new Date().toISOString()
          }
        }
      })
    } catch (logErr) {
      console.warn('[Admin Password Reset] Failed to log activity:', logErr)
    }

    return NextResponse.json({
      success: true,
      message: `Password for ${targetUser.fullName || targetUser.email} has been successfully updated.`
    })
  } catch (err: any) {
    console.error('[Admin Password Reset] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
