import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateAuth, invalidateAuthCache } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isOnboarding = searchParams.get('onboarding') === 'true'

  let { error, context } = await validateAuth(req, 'users.view')
  
  let isMinimized = false
  if (error) {
    if (isOnboarding) {
      // Validate token generally and check if role is administrative
      const altAuth = await validateAuth(req)
      if (!altAuth.error && altAuth.context) {
        const role = altAuth.context.role?.toUpperCase()
        if (role === 'SUPER ADMIN' || role === 'ADMIN' || role === 'HR MANAGER' || role === 'MANAGER') {
          context = altAuth.context
          error = undefined
          isMinimized = false
        }
      }
    }

    if (error) {
      // If they don't have users.view, check alternative permissions (e.g. leads page needs to list assignees)
      const altAuth = await validateAuth(req, 'lead.view')
      if (altAuth.error) {
        const altAuth2 = await validateAuth(req, 'crm.view')
        if (altAuth2.error) {
          return error // Return the original 403 Forbidden
        }
        context = altAuth2.context
      } else {
        context = altAuth.context
      }
      isMinimized = true
    }
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const isManager = context?.role?.toUpperCase() === 'MANAGER'
    const where: any = {}
    
    // If user is a manager, only show their team (unless viewing onboarding requests who don't have an assigned manager yet)
    if (isManager && !isOnboarding) {
      where.managerId = context!.userId
    }

    const queryArgs: any = {
      where,
      take: limit,
      skip: skip,
      orderBy: { fullName: 'asc' }
    }

    if (isMinimized) {
      queryArgs.select = {
        id: true,
        fullName: true,
        role: { select: { id: true, name: true } }
      }
    } else {
      queryArgs.include = {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
        permissions: { select: { id: true, name: true } },
        documents: true
      }
    }

    const users = await prisma.user.findMany(queryArgs)

    let serializedUsers = users
    if (!isMinimized && users.length > 0) {
      const userIds = users.map(u => u.id)
      const allUserDocs = await prisma.document.findMany({
        where: {
          entityType: 'User',
          entityId: { in: userIds }
        }
      })
      serializedUsers = users.map((u: any) => {
        const uClone = { ...u }
        uClone.documents = allUserDocs.filter(d => d.entityId === u.id)
        return uClone
      })
    }

    return NextResponse.json(serializedUsers)
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
      fullName, email, password, roleId, managerId, extraPermissionIds,
      highestQualification, dateOfBirth, joiningDate, personalMobile, homeMobile
    } = body

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanFullName = (fullName && typeof fullName === 'string' && fullName.trim())
      ? fullName.trim()
      : cleanEmail.split('@')[0]

    // Secure fallback password if not provided (user logs in via Email & OTP)
    const cleanPassword = (password && typeof password === 'string' && password.trim().length >= 6)
      ? password.trim()
      : ('Torque@' + Math.random().toString(36).slice(-8) + '!')

    const callerRole = (context?.role || '').toUpperCase()
    const isHr = callerRole.includes('HR')
    const isManager = callerRole === 'MANAGER' && !isHr
    let finalRoleId = roleId
    let finalIsActive = body.isActive !== undefined ? body.isActive : true // Admins and HR create active users ready for OTP login

    if (isManager) {
      // Managers create inactive users requiring Admin/HR review
      const executiveRole = await prisma.role.findFirst({ where: { name: 'EXECUTIVE' } })
      finalRoleId = executiveRole?.id || roleId
      finalIsActive = false
    }

    if (!finalRoleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: { in: ['Sales Executive', 'EXECUTIVE', 'Executive'] } }
      })
      finalRoleId = defaultRole?.id || null
    }

    const finalManagerId = isManager ? (context?.userId || null) : (managerId || null)

    // 1. Create user in Supabase Auth (so they can log in via OTP/token)
    let authUserId: string | null = null
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: { full_name: cleanFullName, name: cleanFullName }
    })

    if (authError) {
      // If user already exists in Supabase Auth, link and activate in Prisma
      if (authError.message?.toLowerCase().includes('already') || (authError as any).status === 422) {
        const existingPrisma = await prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: 'insensitive' } }
        })
        if (existingPrisma) {
          const updated = await prisma.user.update({
            where: { id: existingPrisma.id },
            data: {
              fullName: cleanFullName || existingPrisma.fullName,
              roleId: finalRoleId || existingPrisma.roleId,
              managerId: finalManagerId !== undefined ? finalManagerId : existingPrisma.managerId,
              isActive: finalIsActive,
              personalMobile: personalMobile || existingPrisma.personalMobile,
            },
            include: {
              role: { select: { id: true, name: true } },
              manager: { select: { id: true, fullName: true } },
              permissions: { select: { id: true, name: true } }
            }
          })
          invalidateAuthCache()
          return NextResponse.json(updated)
        }
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    } else {
      authUserId = authData.user.id
    }

    // 2. Create/Update user in Prisma DB (using upsert to handle trigger-created rows)
    const user = await prisma.user.upsert({
      where: { id: authUserId },
      update: {
        email: cleanEmail,
        fullName: cleanFullName,
        roleId: finalRoleId || null,
        managerId: finalManagerId,
        isActive: finalIsActive,
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        permissions: extraPermissionIds?.length
          ? { connect: extraPermissionIds.map((id: string) => ({ id })) }
          : undefined
      },
      create: {
        id: authUserId!,
        email: cleanEmail,
        fullName: cleanFullName,
        roleId: finalRoleId || null,
        managerId: finalManagerId,
        isActive: finalIsActive,
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
        manager: { select: { id: true, fullName: true } },
        permissions: { select: { id: true, name: true } }
      }
    })

    invalidateAuthCache()

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Users POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
