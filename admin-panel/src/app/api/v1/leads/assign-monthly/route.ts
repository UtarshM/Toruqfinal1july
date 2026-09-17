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
    const { importName, month, year, salesExecutiveIds, leadIds, maxPerExecutive, city } = body

    if (!salesExecutiveIds || !Array.isArray(salesExecutiveIds) || salesExecutiveIds.length === 0) {
      return NextResponse.json({ error: 'At least one sales executive must be selected' }, { status: 400 })
    }

    // Fetch unassigned leads
    const whereClause: any = {
      assignedTo: null,
      deletedAt: null,
      status: { not: 'Trashed' },
      OR: [
        { existingAgent: null },
        { existingAgent: { not: 'Agent' } }
      ]
    }

    // If specific selected leadIds are provided, assign those directly
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      whereClause.id = { in: leadIds }
    } else {
      if (year && Number(year) > 0) {
        if (month && Number(month) > 0) {
          const monthStart = new Date(year, Number(month) - 1, 1)
          const monthEnd = new Date(year, Number(month), 0, 23, 59, 59, 999)
          whereClause.expiryDate = { gte: monthStart, lte: monthEnd }
        } else {
          const yearStart = new Date(year, 0, 1)
          const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
          whereClause.expiryDate = { gte: yearStart, lte: yearEnd }
        }
      } else if (month && Number(month) > 0) {
        const curYear = new Date().getFullYear()
        const monthStart = new Date(curYear, Number(month) - 1, 1)
        const monthEnd = new Date(curYear, Number(month), 0, 23, 59, 59, 999)
        whereClause.expiryDate = { gte: monthStart, lte: monthEnd }
      }

      // If importName is provided, filter by it
      if (importName) {
        whereClause.importName = importName
      }

      // If city is provided (Morbi Branch), filter by city or address unless already a Morbi batch
      if (city && city !== 'all' && city !== 'All') {
        const isMorbiImport = importName && importName.toLowerCase().includes('morbi')
        if (!isMorbiImport) {
          whereClause.AND = [
            {
              OR: [
                { city: { contains: city, mode: 'insensitive' } },
                { address: { contains: city, mode: 'insensitive' } }
              ]
            }
          ]
        }
      }
    }

    const allCandidateLeads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: [
        { expiryDate: 'asc' }, // Nearest insurance expiry first
        { createdAt: 'asc' }
      ],
      select: { id: true, expiryDate: true, clientName: true }
    })

    if (allCandidateLeads.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No unassigned leads found matching the selected filters.',
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

    // Smart Leave Guard: Filter out executives who are on approved leave for this month
    let activeExecutivesForAssignment = executives
    let skippedExecutivesOnLeave: string[] = []

    if (month && year && Number(month) > 0 && Number(year) > 0) {
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
      const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
          userId: { in: executives.map(e => e.id) },
          status: { in: ['approved', 'Approved'] },
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart }
        },
        select: { userId: true, user: { select: { fullName: true } } }
      })

      const onLeaveUserIds = new Set(approvedLeaves.map(l => l.userId))
      if (onLeaveUserIds.size > 0 && executives.length > onLeaveUserIds.size) {
        activeExecutivesForAssignment = executives.filter(e => !onLeaveUserIds.has(e.id))
        skippedExecutivesOnLeave = executives.filter(e => onLeaveUserIds.has(e.id)).map(e => e.fullName)
      }
    }

    const execCount = activeExecutivesForAssignment.length
    const capacityPerExec = (maxPerExecutive && Number(maxPerExecutive) > 0) ? Number(maxPerExecutive) : null

    // Group lead IDs by executive ID for fast bulk updates (1 query per executive)
    const execLeadIds: Record<string, string[]> = {}
    const assignmentCounts: Record<string, number> = {}
    activeExecutivesForAssignment.forEach(e => {
      execLeadIds[e.id] = []
      assignmentCounts[e.id] = 0
    })

    const assignments: { leadId: string; executiveId: string; executiveName: string }[] = []

    // Balanced Expiry Group Distribution Algorithm
    if (capacityPerExec) {
      const totalTarget = execCount * capacityPerExec

      if (allCandidateLeads.length <= totalTarget) {
        // Less than target: distribute all available leads round-robin
        for (let i = 0; i < allCandidateLeads.length; i++) {
          const lead = allCandidateLeads[i]
          const exec = activeExecutivesForAssignment[i % execCount]
          execLeadIds[exec.id].push(lead.id)
          assignments.push({
            leadId: lead.id,
            executiveId: exec.id,
            executiveName: exec.fullName
          })
          assignmentCounts[exec.id] = (assignmentCounts[exec.id] || 0) + 1
        }
      } else {
        // More leads than target: balance across Early, Mid, Late expiry groups
        const totalCandidates = allCandidateLeads.length
        const t1 = Math.floor(totalCandidates / 3)
        const t2 = Math.floor((totalCandidates * 2) / 3)

        const earlyPool = allCandidateLeads.slice(0, t1)
        const midPool = allCandidateLeads.slice(t1, t2)
        const latePool = allCandidateLeads.slice(t2)

        const earlyPerExec = Math.floor(capacityPerExec / 3)
        const midPerExec = Math.floor(capacityPerExec / 3)
        const latePerExec = capacityPerExec - (earlyPerExec + midPerExec)

        const targetGroupQuotas = [
          { pool: earlyPool, perExec: earlyPerExec },
          { pool: midPool, perExec: midPerExec },
          { pool: latePool, perExec: latePerExec }
        ]

        for (const group of targetGroupQuotas) {
          const needed = group.perExec * execCount
          const selectedFromGroup = group.pool.slice(0, needed)
          for (let i = 0; i < selectedFromGroup.length; i++) {
            const lead = selectedFromGroup[i]
            const exec = activeExecutivesForAssignment[i % execCount]
            execLeadIds[exec.id].push(lead.id)
            assignments.push({
              leadId: lead.id,
              executiveId: exec.id,
              executiveName: exec.fullName
            })
            assignmentCounts[exec.id] = (assignmentCounts[exec.id] || 0) + 1
          }
        }
      }
    } else {
      // No capacity limit: round-robin all leads
      for (let i = 0; i < allCandidateLeads.length; i++) {
        const lead = allCandidateLeads[i]
        const exec = activeExecutivesForAssignment[i % execCount]
        execLeadIds[exec.id].push(lead.id)
        assignments.push({
          leadId: lead.id,
          executiveId: exec.id,
          executiveName: exec.fullName
        })
        assignmentCounts[exec.id] = (assignmentCounts[exec.id] || 0) + 1
      }
    }

    // Perform bulk updates sequentially (maximum 1 connection used)
    for (const exec of executives) {
      const leadIds = execLeadIds[exec.id] || []
      if (leadIds.length > 0) {
        await prisma.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            assignedTo: exec.id,
            status: 'Assigned'
          }
        })
      }
    }

    // Create LeadAssignment records in chunks of 500
    const assignmentRecords = assignments.map(a => ({
      leadId: a.leadId,
      userId: a.executiveId,
    }))

    const CHUNK = 500
    for (let i = 0; i < assignmentRecords.length; i += CHUNK) {
      await prisma.leadAssignment.createMany({
        data: assignmentRecords.slice(i, i + CHUNK),
        skipDuplicates: true
      })
    }

    // Build distribution summary
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = (month && Number(month) > 0) ? monthNames[Number(month) - 1] : 'All Months'
    const totalAssigned = assignments.length
    
    const distribution = executives.map(e => ({
      id: e.id,
      name: e.fullName,
      leadsAssigned: assignmentCounts[e.id] || 0
    }))

    // Notify admins about the allotment
    const distSummary = distribution.map(d => `${d.name}: ${d.leadsAssigned} leads`).join(', ')
    await notifyRole('Admin', {
      title: `📋 ${monthName} ${year || ''} Leads Allotted`,
      body: `${totalAssigned} leads allotted via balanced round-robin. ${distSummary}`,
      type: 'info',
      entityType: 'lead_assignment',
      data: {
        month, year,
        totalAssigned,
        distribution,
        importName: importName || 'all'
      }
    }).catch(() => {})

    await notifyRole('Super Admin', {
      title: `📋 ${monthName} ${year || ''} Leads Allotted`,
      body: `${totalAssigned} leads allotted via balanced round-robin. ${distSummary}`,
      type: 'info',
      entityType: 'lead_assignment',
      data: {
        month, year,
        totalAssigned,
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
            title: `📋 ${count} New Leads Allotted — ${monthName} ${year || ''}`,
            body: `You have been allotted ${count} leads for ${monthName} ${year || ''} with balanced expiry date distribution.`,
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
      totalAssigned,
      distribution,
      skippedOnLeave: skippedExecutivesOnLeave,
      importName: importName || null,
      message: `${totalAssigned} leads for ${monthName} ${year || ''} allotted successfully with balanced expiry date groups.${skippedExecutivesOnLeave.length > 0 ? ` (Skipped ${skippedExecutivesOnLeave.join(', ')} due to approved leave)` : ''}`
    })
  } catch (err: any) {
    console.error('[assign-monthly] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
