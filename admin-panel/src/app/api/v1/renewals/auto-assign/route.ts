import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { notifyRole } from '@/lib/notify'

/**
 * POST /api/v1/renewals/auto-assign
 * Auto-assigns renewals that expire in the target month (default: next month)
 * to dedicated renewal personnel via round-robin.
 * 
 * Body: { month?: number, year?: number, dryRun?: boolean, salesExecutiveIds?: string[] }
 * 
 * If salesExecutiveIds not provided, uses dedicated renewal persons (sales3/sales4).
 * Admin can override month to assign early or late.
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    // Default: next month from now
    const now = new Date()
    const defaultMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2
    const defaultYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()

    const month = body.month || defaultMonth
    const year = body.year || defaultYear
    const dryRun = body.dryRun || false

    // Calculate the target month date range
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

    // Find unassigned renewals expiring in target month
    const unassignedRenewals = await prisma.renewalRecord.findMany({
      where: {
        renewalStatus: 'Active',
        assignedTo: null,
        policyEndDate: { gte: monthStart, lte: monthEnd }
      },
      orderBy: { policyEndDate: 'asc' },
      select: { id: true, clientName: true, policyEndDate: true }
    })

    if (unassignedRenewals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unassigned renewals found for the target month.',
        month, year,
        assigned: 0
      })
    }

    // Get renewal personnel
    let executives: { id: string; fullName: string }[]

    if (body.salesExecutiveIds && body.salesExecutiveIds.length > 0) {
      // Admin explicitly selected executives
      executives = await prisma.user.findMany({
        where: { id: { in: body.salesExecutiveIds }, isActive: true },
        select: { id: true, fullName: true }
      })
    } else {
      // Use dedicated renewal persons (fetch users with Sales Executive role)
      // Convention: dedicated renewal persons are identified by their role or a tag
      executives = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            OR: [
              { name: { contains: 'Sales', mode: 'insensitive' } },
              { name: { contains: 'Executive', mode: 'insensitive' } }
            ]
          }
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, fullName: true }
      })
    }

    if (executives.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active renewal personnel found',
        month, year
      }, { status: 400 })
    }

    if (dryRun) {
      // Just show what would happen
      const distribution: Record<string, number> = {}
      executives.forEach(e => { distribution[e.fullName] = 0 })
      unassignedRenewals.forEach((_, i) => {
        const exec = executives[i % executives.length]
        distribution[exec.fullName]++
      })

      return NextResponse.json({
        success: true,
        dryRun: true,
        month, year,
        totalToAssign: unassignedRenewals.length,
        executives: executives.map(e => e.fullName),
        distribution,
        message: `Would assign ${unassignedRenewals.length} renewals across ${executives.length} executives.`
      })
    }

    // Round-robin assignment
    const assignments: { id: string; execId: string; execName: string }[] = []
    const assignmentCounts: Record<string, number> = {}
    executives.forEach(e => { assignmentCounts[e.id] = 0 })

    for (let i = 0; i < unassignedRenewals.length; i++) {
      const renewal = unassignedRenewals[i]
      const exec = executives[i % executives.length]
      assignments.push({ id: renewal.id, execId: exec.id, execName: exec.fullName })
      assignmentCounts[exec.id]++
    }

    // Batch update
    const CHUNK = 500
    for (let i = 0; i < assignments.length; i += CHUNK) {
      const chunk = assignments.slice(i, i + CHUNK)
      await Promise.all(chunk.map(a =>
        prisma.renewalRecord.update({
          where: { id: a.id },
          data: {
            assignedTo: a.execId,
            assignedMonth: month,
            assignedYear: year,
            renewalStatus: 'PendingRenewal'
          }
        })
      ))
    }

    // Build distribution summary
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[month - 1]

    const distribution = executives.map(e => ({
      id: e.id,
      name: e.fullName,
      renewalsAssigned: assignmentCounts[e.id] || 0
    }))

    // Notify admins
    const distSummary = distribution.map(d => `${d.name}: ${d.renewalsAssigned}`).join(', ')
    await notifyRole('Admin', {
      title: `🔄 ${monthName} ${year} Renewals Auto-Assigned`,
      body: `${unassignedRenewals.length} renewals assigned. ${distSummary}`,
      type: 'info',
      entityType: 'renewal_assignment',
      data: { month, year, total: unassignedRenewals.length, distribution }
    }).catch(() => {})

    await notifyRole('Super Admin', {
      title: `🔄 ${monthName} ${year} Renewals Auto-Assigned`,
      body: `${unassignedRenewals.length} renewals assigned. ${distSummary}`,
      type: 'info',
      entityType: 'renewal_assignment',
      data: { month, year, total: unassignedRenewals.length, distribution }
    }).catch(() => {})

    // Notify each assigned executive
    for (const exec of executives) {
      const count = assignmentCounts[exec.id] || 0
      if (count > 0) {
        await prisma.notification.create({
          data: {
            userId: exec.id,
            title: `🔄 ${count} Renewals Assigned — ${monthName} ${year}`,
            body: `You have ${count} policy renewals due in ${monthName} ${year}. Check your Renewals section.`,
            type: 'info',
            entityType: 'renewal_assignment',
            data: { month, year, count }
          }
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      month, year, monthName,
      totalAssigned: unassignedRenewals.length,
      distribution,
      message: `${unassignedRenewals.length} renewals for ${monthName} ${year} assigned successfully.`
    })
  } catch (err: any) {
    console.error('[renewals auto-assign] Error:', err)
    return NextResponse.json({ error: err.message || 'Auto-assignment failed' }, { status: 500 })
  }
}
