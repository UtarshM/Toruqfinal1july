import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const email = 'admin@test.com'
    
    // 1. Find Super Admin role
    const role = await prisma.role.findUnique({
      where: { name: 'Super Admin' }
    })

    if (!role) {
      return NextResponse.json({ error: 'Super Admin role not found. Please run npx prisma db seed first.' }, { status: 404 })
    }

    // 2. Find all permissions
    const allPermissions = await prisma.permission.findMany()

    // 3. Link all permissions to Super Admin role
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: allPermissions.map(p => ({ id: p.id }))
        }
      }
    })

    // 4. Update the user
    const user = await prisma.user.update({
      where: { email },
      data: {
        roleId: role.id,
        isActive: true
      }
    })

    return NextResponse.json({
      message: 'Admin account fixed successfully!',
      user: {
        email: user.email,
        role: role.name,
        permissionsCount: allPermissions.length
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
