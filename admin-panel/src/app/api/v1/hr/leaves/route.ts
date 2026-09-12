import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { notifyRole } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    // Check permission: Self or has hr.view / hr.manage_leave / users.view
    const isSelf = userId === context.userId
    const hasHRView = context.permissions.some(p => ['hr.view', 'hr.manage_leave', 'users.view'].includes(p)) ||
      context.role?.toUpperCase().includes('ADMIN') ||
      context.role?.toUpperCase().includes('HR')

    if (!isSelf && !hasHRView) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to view leaves' }, { status: 403 })
    }

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = { equals: status, mode: 'insensitive' }
    }
    if (userId) {
      where.userId = userId
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: { select: { name: true } } }
          },
          approver: {
            select: { id: true, fullName: true }
          }
        }
      }),
      prisma.leaveRequest.count({ where })
    ])

    return NextResponse.json({ items: leaves, total })
  } catch (error) {
    console.error('Leaves GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const targetUserId = body.userId || context.userId

    // Check permission: Self or has hr.manage_leave
    const isSelf = targetUserId === context.userId
    const hasHRManage = context.permissions.includes('hr.manage_leave') || context.role?.toUpperCase().includes('ADMIN')
    if (!isSelf && !hasHRManage) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to request leaves for others' }, { status: 403 })
    }

    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    const daysCalc = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: targetUserId,
        type: body.type || 'Casual',
        startDate,
        endDate,
        days: body.days || daysCalc,
        reason: body.reason || null,
        status: (hasHRManage && body.status) ? body.status : 'Pending'
      },
      include: {
        user: { select: { fullName: true, email: true } }
      }
    })

    // Notify Admins / HR about new leave application
    const applicantName = leave.user?.fullName || 'An employee'
    const dateRangeStr = `${startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
    
    await notifyRole('Admin', {
      title: `🏖️ Leave Request: ${applicantName}`,
      body: `${applicantName} applied for ${leave.type} leave (${dateRangeStr}, ${leave.days} days). Reason: ${leave.reason || 'Not specified'}`,
      type: 'action',
      entityType: 'leave_request',
      entityId: leave.id,
      data: { leaveId: leave.id, userId: targetUserId }
    }).catch(() => {})

    await notifyRole('Super Admin', {
      title: `🏖️ Leave Request: ${applicantName}`,
      body: `${applicantName} applied for ${leave.type} leave (${dateRangeStr}, ${leave.days} days). Reason: ${leave.reason || 'Not specified'}`,
      type: 'action',
      entityType: 'leave_request',
      entityId: leave.id,
      data: { leaveId: leave.id, userId: targetUserId }
    }).catch(() => {})

    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
