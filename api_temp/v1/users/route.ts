import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'users.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const users = await prisma.user.findMany({
      take: limit,
      skip: skip,
      orderBy: { fullName: 'asc' },
      include: {
        role: { select: { id: true, name: true } },
        permissions: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'users.create')
  if (error) return error

  try {
    const body = await req.json()
    const { 
      fullName, email, password, roleId, extraPermissionIds,
      highestQualification, dateOfBirth, joiningDate, personalMobile, homeMobile
    } = body

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'fullName, email, and password are required' }, { status: 400 })
    }

    // 1. Create user in Supabase Auth (so they can log in)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Create user in Prisma DB
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        fullName,
        roleId: roleId || null,
        isActive: true,
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        permissions: extraPermissionIds?.length
          ? { connect: extraPermissionIds.map((id: string) => ({ id })) }
          : undefined
      },
      include: {
        role: { select: { id: true, name: true } },
        permissions: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Users POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
