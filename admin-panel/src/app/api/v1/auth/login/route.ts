import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qzxresquqptqxajuffsd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eHJlc3F1cXB0cXhhanVmZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDc1MzEsImV4cCI6MjEwNDc4MzUzMX0.tRftNSoyB-kL1cB5kJgKTxfoNtLtFs0wFIg1L47KI9A'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawEmail = body?.email
    const password = body?.password

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const email = rawEmail.trim().toLowerCase()

    // 1. Super Admin Direct Login
    if (email === 'torqueautoadvisor@gmail.com') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required for admin login' }, { status: 400 })
      }

      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        return NextResponse.json({ error: error?.message || 'Invalid admin credentials' }, { status: 401 })
      }

      return NextResponse.json({
        requiresOtp: false,
        status: 'success',
        session: data.session,
        user: {
          id: data.user.id,
          email: 'torqueautoadvisor@gmail.com',
          fullName: 'Admin',
          name: 'Admin',
          role: 'Super Admin',
          permissions: ['*'],
          is_active: true,
        },
      })
    }

    // 2. Other users / Staff: Must use OTP
    return NextResponse.json({
      requiresOtp: true,
      status: 'otp_required',
      message: 'Staff members must sign in using OTP. Please use the Staff OTP login option.',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[login] Error in auth/login:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
