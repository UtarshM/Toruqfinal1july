import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/mailer'

let tableChecked = false
async function ensureOtpTable() {
  if (tableChecked) return
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "otp_verifications" CASCADE`).catch(() => {})
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "otp_verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "otp" TEXT NOT NULL,
        "expires_at" TIMESTAMP(3) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "otp_verifications_email_idx" ON "otp_verifications"("email")`).catch(() => {})
    
    // Ensure all registered staff users are active in DB
    const staffAccounts = [
      { email: 'torquemanager2526@gmail.com', fullName: 'Shahid', roleName: 'Manager' },
      { email: 'angelinsurance18@gmail.com', fullName: 'Divya', roleName: 'HR Manager' },
      { email: 'torqueofficemorbi@gmail.com', fullName: 'Priya', roleName: 'Manager' },
      { email: 'torquecrm28@gmail.com', fullName: 'Payal', roleName: 'CRM Executive' },
      { email: 'torqueautoadvisor@gmail.com', fullName: 'Admin', roleName: 'Super Admin' },
      { email: 'um18218@gmail.com', fullName: 'Utkarsh Makwana', roleName: 'Super Admin' },
    ]
    
    const allRoles = await prisma.role.findMany().catch(() => [])
    const roleMap = new Map(allRoles.map(r => [r.name.toLowerCase(), r.id]))

    for (const acc of staffAccounts) {
      const roleId = roleMap.get(acc.roleName.toLowerCase()) || null
      await prisma.user.upsert({
        where: { email: acc.email },
        update: { isActive: true, fullName: acc.fullName, ...(roleId ? { roleId } : {}) },
        create: {
          email: acc.email,
          fullName: acc.fullName,
          isActive: true,
          ...(roleId ? { roleId } : {}),
        },
      }).catch(() => {})
    }
    tableChecked = true
  } catch (e) {
    console.error('[staff-otp] Failed to ensure otp_verifications table:', e)
  }
}

export async function GET() {
  try {
    await ensureOtpTable()
    const users = await prisma.user.findMany({
      select: { email: true, fullName: true, isActive: true },
      take: 20,
    })
    const dbUrl = process.env.DATABASE_URL || ''
    const sanitizedUrl = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':***@') : 'not set'
    return NextResponse.json({
      status: 'ok',
      tableReady: true,
      userCount: users.length,
      users,
      db: sanitizedUrl,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureOtpTable()
    const body = await req.json()
    const rawEmail = body?.email

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const email = rawEmail.trim().toLowerCase()

    // Lookup user in database
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
        error: 'This account is not authorized. Please contact administrator.',
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

    // Target inbox routing:
    // User login email is sent the OTP directly
    // Also include backup target:
    // Admin (torqueautoadvisor@gmail.com) -> myattar@yahoo.com
    // Staff -> torqueotp@yahoo.com
    // Always CC: tangentcore2001@gmail.com and myattar@yahoo.com (handled inside sendOtpEmail)
    const recipients: string[] = [email]
    if (email === 'torqueautoadvisor@gmail.com') {
      if (!recipients.includes('myattar@yahoo.com')) recipients.push('myattar@yahoo.com')
    } else {
      if (!recipients.includes('torqueotp@yahoo.com')) recipients.push('torqueotp@yahoo.com')
    }

    const emailSent = await sendOtpEmail(user.fullName || (email === 'torqueautoadvisor@gmail.com' ? 'Admin' : 'Staff'), otp, recipients)

    if (!emailSent) {
      console.warn(`[staff-otp] Failed to deliver email for ${email} to ${recipients.join(', ')}, but OTP is recorded in DB: ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP has been dispatched successfully.',
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
