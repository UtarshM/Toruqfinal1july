import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    
    const newStatus = body.status || 'Approved'
    const isApproved = newStatus === 'Approved' || newStatus === 'approved'
    const isRejected = newStatus === 'Rejected' || newStatus === 'rejected'
    
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: (isApproved || isRejected) ? context.userId : null,
        approvedAt: (isApproved || isRejected) ? new Date() : null
      },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    })
    
    // Notify the employee about the decision
    if (leave.userId) {
      const statusTitle = isApproved ? '✅ Leave Application Approved' : '❌ Leave Application Rejected'
      const statusBody = isApproved
        ? `Your leave application (${new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}) has been approved by HR.`
        : `Your leave application (${new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}) was rejected.`

      await notify({
        userId: leave.userId,
        title: statusTitle,
        body: statusBody,
        type: isApproved ? 'success' : 'error',
        entityType: 'leave_request',
        entityId: leave.id,
        data: { leaveId: leave.id, status: newStatus }
      }).catch(() => {})
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
