import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
        permissions: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(roles)
  } catch (error) {
    console.error('Roles GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    const role = await prisma.role.create({
      data: { name: name.trim(), description },
      include: { _count: { select: { users: true } }, permissions: true }
    })

    return NextResponse.json(role)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })
    }
    console.error('Roles POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
