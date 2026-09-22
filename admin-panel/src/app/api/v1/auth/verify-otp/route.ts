import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logActivity } from '@/lib/activity-logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawEmail = body?.email
    const rawOtp = body?.otp

    if (!rawEmail || !rawOtp) {
      return NextResponse.json({ error: 'Email and OTP code are required.' }, { status: 400 })
    }

    const email = rawEmail.trim().toLowerCase()
    const otp = rawOtp.toString().trim()

    // 1. Find OTP record in database
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json({
        error: 'No active OTP found. Please request a new OTP.',
      }, { status: 400 })
    }

    // 2. Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } })
      return NextResponse.json({
        error: 'OTP has expired. Please request a new code.',
      }, { status: 400 })
    }

    // 3. Check attempt limit
    if (otpRecord.attempts >= 5) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } })
      return NextResponse.json({
        error: 'Too many incorrect attempts. Please request a new OTP.',
      }, { status: 429 })
    }

    // 4. Validate OTP match
    if (otpRecord.otp !== otp) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      })
      const remaining = 5 - (otpRecord.attempts + 1)
      return NextResponse.json({
        error: `Invalid OTP code. (${remaining} attempts remaining)`,
      }, { status: 400 })
    }

    // 5. Successful OTP verification: Delete consumed OTP
    await prisma.otpVerification.delete({ where: { id: otpRecord.id } })

    // 6. Fetch user profile from database
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        permissions: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        error: 'User account not found or has been deactivated.',
      }, { status: 404 })
    }

    // 7. Ensure user exists in Supabase Auth and generate session token
    let linkData: any = null
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })

    if (linkError || !data?.properties?.hashed_token) {
      // If user doesn't exist in Supabase auth yet, create them with random password
      const tempPassword = `T@rq${Math.random().toString(36).slice(2)}!${Date.now()}`
      await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      })

      // Retry generateLink
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
      })
      linkData = retry.data
    } else {
      linkData = data
    }

    const tokenHash = linkData?.properties?.hashed_token || null
    const actionLink = linkData?.properties?.action_link || null

    // 8. Log successful staff login activity
    logActivity(user.id, 'STAFF_OTP_LOGIN', 'AUTH', user.id, {
      email: user.email,
      name: user.fullName,
      verifiedAt: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'mobile-app',
      userAgent: req.headers.get('user-agent') || 'mobile-apk',
    })

    // Permissions merge
    const rolePermissions = user.role?.permissions?.map((p: any) => p.name) || []
    const userPermissions = user.permissions?.map((p: any) => p.name) || []
    const allPermissions = Array.from(new Set([...rolePermissions, ...userPermissions]))

    return NextResponse.json({
      success: true,
      tokenHash,
      actionLink,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        name: user.fullName,
        role: user.role?.name || 'Staff',
        role_id: user.roleId,
        permissions: allPermissions,
        is_active: user.isActive,
      },
    })
  } catch (error: any) {
    console.error('[verify-otp] Verification error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error during verification',
    }, { status: 500 })
  }
}
