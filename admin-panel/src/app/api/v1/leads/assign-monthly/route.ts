import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { notifyRole } from '@/lib/notify'

/**
 * POST /api/v1/leads/assign-monthly
 * Assigns unassigned leads for a specific month via round-robin to selected executives.
 * Body: { importName?: string, month: number, year: number, salesExecutiveIds: string[] }
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.assign')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { importName, month, year, salesExecutiveIds } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }
    if (!salesExecutiveIds || !Array.isArray(salesExecutiveIds) || salesExecutiveIds.length === 0) {
      return NextResponse.json({ error: 'At least one sales executive must be selected' }, { status: 400 })
    }

    // Calculate date range for the target month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999) // Last moment of last day

    // Fetch unassigned leads for the target month
    const whereClause: any = {
      assignedTo: null,
      deletedAt: null,
      status: { not: 'Trashed' },
      expiryDate: {
        gte: monthStart,
        lte: monthEnd
      },
      OR: [
        { existingAgent: null },
        { existingAgent: { not: 'Agent' } }
      ]
    }

    // If importName is provided, filter by it
    if (importName) {
      whereClause.importName = importName
    }

    const leadsToAssign = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { expiryDate: 'asc' }, // Nearest expiry first
      select: { id: true, expiryDate: true, clientName: true }
    })

    if (leadsToAssign.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No unassigned leads found for the selected month',
        assignedCount: 0
      }, { status: 400 })
    }

    // Verify selected executives exist and are active
    const executives = await prisma.user.findMany({
      where: {
        id: { in: salesExecutiveIds },
        isActive: true
      },
      select: { id: true, fullName: true }
    })

    if (executives.length === 0) {
      return NextResponse.json({ error: 'No valid active executives found' }, { status: 400 })
    }

    // Round-robin assignment — nearest expiry leads first
    const assignments: { leadId: string; executiveId: string; executiveName: string }[] = []
    const assignmentCounts: Record<string, number> = {}
    executives.forEach(e => { assignmentCounts[e.id] = 0 })

    for (let i = 0; i < leadsToAssign.length; i++) {
      const lead = leadsToAssign[i]
      const exec = executives[i % executives.length]
      assignments.push({
        leadId: lead.id,
        executiveId: exec.id,
        executiveName: exec.fullName
      })
      assignmentCounts[exec.id] = (assignmentCounts[exec.id] || 0) + 1
    }

    // Batch update leads with assignments
    const updatePromises = assignments.map(a =>
      prisma.lead.update({
        where: { id: a.leadId },
        data: {
          assignedTo: a.executiveId,
          status: 'Assigned'
        }
      })
    )

    // Process in chunks of 500 to avoid overloading
    const CHUNK = 500
    for (let i = 0; i < updatePromises.length; i += CHUNK) {
      await Promise.all(updatePromises.slice(i, i + CHUNK))
    }

    // Create LeadAssignment records
    const assignmentRecords = assignments.map(a => ({
      leadId: a.leadId,
      userId: a.executiveId,
    }))

    for (let i = 0; i < assignmentRecords.length; i += CHUNK) {
      await prisma.leadAssignment.createMany({
        data: assignmentRecords.slice(i, i + CHUNK),
        skipDuplicates: true
      })
    }

    // Build distribution summary
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[month - 1]
    
    const distribution = executives.map(e => ({
      id: e.id,
      name: e.fullName,
      leadsAssigned: assignmentCounts[e.id] || 0
    }))

    // Notify admins about the assignment
    const distSummary = distribution.map(d => `${d.name}: ${d.leadsAssigned} leads`).join(', ')
    await notifyRole('Admin', {
      title: `📋 ${monthName} ${year} Leads Assigned`,
      body: `${leadsToAssign.length} leads assigned via round-robin. ${distSummary}`,
      type: 'info',
      entityType: 'lead_assignment',
      data: {
        month, year,
        totalAssigned: leadsToAssign.length,
        distribution,
        importName: importName || 'all'
      }
    }).catch(() => {})

    await notifyRole('Super Admin', {
      title: `📋 ${monthName} ${year} Leads Assigned`,
      body: `${leadsToAssign.length} leads assigned via round-robin. ${distSummary}`,
      type: 'info',
      entityType: 'lead_assignment',
      data: {
        month, year,
        totalAssigned: leadsToAssign.length,
        distribution,
        importName: importName || 'all'
      }
    }).catch(() => {})

    // Notify each sales executive about their new leads
    for (const exec of executives) {
      const count = assignmentCounts[exec.id] || 0
      if (count > 0) {
        await prisma.notification.create({
          data: {
            userId: exec.id,
            title: `📋 ${count} New Leads Assigned — ${monthName} ${year}`,
            body: `You have been assigned ${count} leads for ${monthName} ${year}. Check your leads section.`,
            type: 'info',
            entityType: 'lead_assignment',
            data: { month, year, count }
          }
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      monthName,
      year,
      totalAssigned: leadsToAssign.length,
      distribution,
      importName: importName || null,
      message: `${leadsToAssign.length} leads for ${monthName} ${year} assigned successfully via round-robin.`
    })
  } catch (err: any) {
    console.error('[assign-monthly] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
