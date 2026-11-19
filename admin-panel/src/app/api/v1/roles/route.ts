import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth, invalidateAuthCache } from '@/lib/auth-guard'

function checkIsAdmin(context: any): boolean {
  if (!context) return false
  const roleUpper = (context.role || '').toUpperCase()
  const isSuperAdminEmail = context.email?.toLowerCase() === 'torqueautoadvisor@gmail.com'
  return roleUpper === 'SUPER ADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || (roleUpper.includes('ADMIN') && !roleUpper.includes('MANAGER')) || isSuperAdminEmail || context.permissions?.includes('*')
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'role.view')
  if (error) return error

  if (!checkIsAdmin(context)) {
    return NextResponse.json({ error: 'Forbidden: Only Administrators can view roles and permissions' }, { status: 403 })
  }

  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        },
        permissions: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('GET /api/v1/roles error:', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'role.edit')
  if (error) return error

  if (!checkIsAdmin(context)) {
    return NextResponse.json({ error: 'Forbidden: Only Administrators can create roles' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description } = body
    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    const existingRole = await prisma.role.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } }
    })
    if (existingRole) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 })
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    })
    invalidateAuthCache()
    return NextResponse.json(role)
  } catch (err: any) {
    console.error('POST /api/v1/roles error:', err)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
