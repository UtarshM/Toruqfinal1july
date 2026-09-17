import { validateAuth } from '@/lib/auth-guard'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'
import { formatDateDMY } from '@/lib/date-format'
import { apiSuccess, apiError } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-logger'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401, null, req)
  }

  // Permission: HR or Admin
  const isAuthorized =
    context.permissions.includes('hr.manage_leave') ||
    ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(context.role?.toUpperCase() || '')
  if (!isAuthorized) {
    return apiError('Forbidden: Missing HR management permissions', 'FORBIDDEN', 403, null, req)
  }

  try {
    const { id } = await params
    const body = await req.json()
    
    const newStatus = body.status || 'Approved'
    const isApproved = newStatus.toLowerCase() === 'approved'
    const isRejected = newStatus.toLowerCase() === 'rejected'
    
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
    
    const dateRange = `${formatDateDMY(leave.startDate)} - ${formatDateDMY(leave.endDate)}`

    // Audit Logging
    logActivity(
      context.userId,
      isApproved ? 'leave_approved' : 'leave_rejected',
      'leave_request',
      leave.id,
      {
        applicantId: leave.userId,
        applicantName: leave.user?.fullName,
        days: leave.days,
        dateRange,
        status: newStatus
      }
    )

    // Notify the employee about the decision
    if (leave.userId) {
      const statusTitle = isApproved ? '✅ Leave Application Approved' : '❌ Leave Application Rejected'
      const statusBody = isApproved
        ? `Your leave application (${dateRange}) for ${leave.days} day(s) has been approved by HR.`
        : `Your leave application (${dateRange}) was rejected by HR.`

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

    return apiSuccess(leave)
  } catch (error: any) {
    console.error('Leaves PUT Error:', error)
    return apiError(error.message || 'Internal Server Error', 'INTERNAL_ERROR', 500, null, req)
  }
}
