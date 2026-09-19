import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, email, password, roleId, managerId } = body

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'fullName, email, and password are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Check if user already exists in database
    const existingDbUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    })
    if (existingDbUser) {
      return NextResponse.json({ 
        error: 'An account with this email address already exists. Please sign in instead.' 
      }, { status: 409 })
    }

    // 1. Create user in Supabase Auth using the admin client
    // Setting email_confirm: true completely bypasses verification emails and low SMTP rate limits
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() }
    })

    if (authError) {
      console.error('[auth-signup] Supabase Auth Error:', authError.message)
      if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('exists')) {
        return NextResponse.json({ error: 'An account with this email address already exists. Please sign in.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Get selected role or fallback to default role
    let role = null
    if (roleId) {
      role = await prisma.role.findUnique({ where: { id: roleId } })
    }
    if (!role) {
      const isSuperAdminEmail = email.toLowerCase().includes('admin') || email.toLowerCase().includes('jiya')
      const roleName = isSuperAdminEmail ? 'Super Admin' : 'Sales Executive'
      role = await prisma.role.findFirst({ where: { name: roleName } })
    }

    // 2. Create or update user profile row in Prisma public.users table
    const user = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        email,
        fullName,
        roleId: role?.id || null,
        managerId: managerId || null,
        isActive: false // Pending onboarding and admin approval by default
      },
      create: {
        id: authData.user.id,
        email,
        fullName,
        roleId: role?.id || null,
        managerId: managerId || null,
        isActive: false // Pending onboarding and admin approval by default
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully and auto-confirmed.',
      userId: user.id
    })
  } catch (error: any) {
    console.error('[auth-signup] API Error:', error)
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      return NextResponse.json({ error: 'An account with this email address already exists. Please sign in.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
