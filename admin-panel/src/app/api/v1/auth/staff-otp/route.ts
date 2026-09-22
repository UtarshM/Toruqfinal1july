import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendStaffOtpEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawEmail = body?.email

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const email = rawEmail.trim().toLowerCase()

    // Super Admin must log in directly with password
    if (email === 'torqueautoadvisor@gmail.com') {
      return NextResponse.json({
        error: 'Admin account requires direct password sign-in.',
        isAdmin: true,
      }, { status: 400 })
    }

    // Lookup staff user in database
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
      },
      include: {
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        error: 'This email is not approved. Only administrator-created staff accounts can receive an OTP. Please contact admin.',
      }, { status: 403 })
    }

    // Rate-limiting check: Clean up old expired OTPs for this email first
    await prisma.otpVerification.deleteMany({
      where: {
        email,
        expiresAt: { lt: new Date() },
      },
    })

    // Check recent OTP generated in the last 30 seconds to prevent rapid spamming
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentOtp) {
      return NextResponse.json({
        error: 'Please wait 30 seconds before requesting another OTP.',
      }, { status: 429 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Delete existing active OTPs for this email to avoid confusion
    await prisma.otpVerification.deleteMany({
      where: { email },
    })

    // Store in DB
    await prisma.otpVerification.create({
      data: {
        email,
        otp,
        expiresAt,
        attempts: 0,
      },
    })

    // Send email to torqueotp@yahoo.com
    const emailSent = await sendStaffOtpEmail(user.fullName, otp)

    if (!emailSent) {
      console.warn(`[staff-otp] Failed to deliver email for ${email}, but OTP is recorded in DB: ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP has been sent to admin inbox (torqueotp@yahoo.com).',
      email: user.email,
      fullName: user.fullName,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[staff-otp] Error generating OTP:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error processing OTP request',
    }, { status: 500 })
  }
}
