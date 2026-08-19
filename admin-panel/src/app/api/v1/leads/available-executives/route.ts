import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

/**
 * GET /api/v1/leads/available-executives?month=1&year=2027
 * Returns active sales executives with leave info for the target month.
 */
export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()))

  try {
    // Fetch all active sales executives
    const executives = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          OR: [
            { name: { contains: 'Sales', mode: 'insensitive' } },
            { name: { contains: 'Executive', mode: 'insensitive' } },
            { name: { equals: 'EXECUTIVE', mode: 'insensitive' } }
          ]
        }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        role: { select: { name: true } }
      }
    })

    // Get leave requests for the target month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0) // Last day of the month

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        OR: [
          {
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart }
          }
        ]
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
        days: true,
        type: true
      }
    })

    // Get current assigned lead counts per executive for this month
    const assignedCounts = await prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        assignedTo: { not: null },
        deletedAt: null,
        status: { not: 'Trashed' },
        expiryDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _count: { id: true }
    })

    const assignedCountMap = new Map<string, number>()
    assignedCounts.forEach(ac => {
      if (ac.assignedTo) assignedCountMap.set(ac.assignedTo, ac._count.id)
    })

    // Build response with leave info
    const executivesWithInfo = executives.map(exec => {
      const execLeaves = leaveRequests.filter(lr => lr.userId === exec.id)
      const totalLeaveDays = execLeaves.reduce((sum, lr) => {
        // Calculate overlapping days with target month
        const leaveStart = new Date(lr.startDate) < monthStart ? monthStart : new Date(lr.startDate)
        const leaveEnd = new Date(lr.endDate) > monthEnd ? monthEnd : new Date(lr.endDate)
        const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, days)
      }, 0)

      // Check if currently on leave today
      const today = new Date()
      const isCurrentlyOnLeave = execLeaves.some(lr =>
        new Date(lr.startDate) <= today && new Date(lr.endDate) >= today
      )

      return {
        id: exec.id,
        fullName: exec.fullName,
        email: exec.email,
        roleName: exec.role?.name || 'Sales Executive',
        isActive: exec.isActive,
        leaveDays: totalLeaveDays,
        isOnExtendedLeave: totalLeaveDays >= 5,
        isCurrentlyOnLeave,
        leaveDetails: execLeaves.map(lr => ({
          startDate: lr.startDate,
          endDate: lr.endDate,
          days: lr.days,
          type: lr.type
        })),
        currentlyAssignedCount: assignedCountMap.get(exec.id) || 0
      }
    })

    return NextResponse.json({
      executives: executivesWithInfo,
      month,
      year,
      totalActive: executivesWithInfo.filter(e => !e.isOnExtendedLeave).length,
      totalOnLeave: executivesWithInfo.filter(e => e.isOnExtendedLeave).length
    })
  } catch (err: any) {
    console.error('[available-executives] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
