import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { userProfile, error } = await validateAuth(req, undefined, true)
  if (error) return error

  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }

  return NextResponse.json(userProfile)
}

