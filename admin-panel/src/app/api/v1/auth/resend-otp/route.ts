import { NextRequest, NextResponse } from 'next/server'
import { POST as staffOtpPost } from '../staff-otp/route'

export async function POST(req: NextRequest) {
  return staffOtpPost(req)
}
