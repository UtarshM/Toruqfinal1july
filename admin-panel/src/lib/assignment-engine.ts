/**
 * src/lib/assignment-engine.ts
 * Deterministic, Date-Balanced, Auditable Assignment Engine for Torque Auto Advisors.
 * 
 * Rules:
 * 1. Sheet Isolation: Morbi vs Rajkot vs other sheets are independent scopes.
 * 2. Capacity Guard: Default 400 leads/month/employee/sheet (configurable).
 *    Remaining Capacity = Capacity - Existing Assigned Count.
 * 3. Leave Guard: Approved leave >= 5 days in period excludes executive from auto-assignment.
 * 4. Date-Balanced Rotation: Sort by expiryDate ASC, group by calendar date. Rotate across executives.
 * 5. Reversible Batches: Tracked via AssignmentBatch with rollback protection.
 */

import prisma from '@/lib/prisma'

export interface AssignmentScope {
  sheetName?: string
  city?: string
  month: number
  year: number
  targetCapacity?: number
  salesExecutiveIds?: string[]
}

export interface AssignmentPlan {
  totalEligibleLeads: number
  eligibleEmployees: {
    id: string
    fullName: string
    existingCount: number
    remainingCapacity: number
    allocatedCount: number
    allocatedLeadIds: string[]
  }[]
  excludedByLeave: {
    id: string
    fullName: string
    days: number
    reason?: string
  }[]
  unassignedRemainderCount: number
  dateGroupsCount: number
}

function toDateKey(date: Date | null | undefined): string {
  if (!date) return 'NO_EXPIRY'
  try {
    const d = new Date(date)
    return isNaN(d.getTime()) ? 'NO_EXPIRY' : d.toISOString().split('T')[0]
  } catch {
    return 'NO_EXPIRY'
  }
}

export async function calculateAssignmentPlan(scope: AssignmentScope): Promise<AssignmentPlan> {
  const { sheetName, city, month, year, targetCapacity = 400, salesExecutiveIds } = scope

  // 1. Build where clause for candidate leads
  const whereClause: any = {
    assignedTo: null,
    deletedAt: null,
    status: { not: 'Trashed' },
    OR: [
      { existingAgent: null },
      { existingAgent: { not: 'Agent' } }
    ]
  }

  if (sheetName && sheetName !== 'all') {
    whereClause.importName = sheetName
  }

  if (city && city !== 'all') {
    const isMorbiSheet = sheetName && sheetName.toLowerCase().includes('morbi')
    if (!isMorbiSheet) {
      whereClause.city = { contains: city, mode: 'insensitive' }
    }
  }

  if (year && year > 0) {
    if (month && month > 0) {
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
      whereClause.expiryDate = { gte: monthStart, lte: monthEnd }
    } else {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
      whereClause.expiryDate = { gte: yearStart, lte: yearEnd }
    }
  }

  // 2. Fetch candidate leads sorted by expiryDate ASC
  const candidateLeads = await prisma.lead.findMany({
    where: whereClause,
    orderBy: [
      { expiryDate: 'asc' },
      { createdAt: 'asc' }
    ],
    select: { id: true, expiryDate: true }
  })

  // 3. Fetch candidate active executives
  const execWhere: any = { isActive: true }
  if (salesExecutiveIds && salesExecutiveIds.length > 0) {
    execWhere.id = { in: salesExecutiveIds }
  } else {
    execWhere.role = {
      name: { in: ['sales_executive', 'Sales Executive', 'Executive', 'Sales', 'Telecaller'] }
    }
  }

  const allExecutives = await prisma.user.findMany({
    where: execWhere,
    select: { id: true, fullName: true }
  })

  // 4. Leave Guard: Exclude executives with approved leave >= 5 days in period
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: allExecutives.map(e => e.id) },
      status: { in: ['approved', 'Approved'] },
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart }
    }
  })

  const excludedByLeaveMap = new Map<string, { days: number; reason?: string }>()
  for (const leave of approvedLeaves) {
    // Check if total days >= 5
    const durationDays = leave.days || Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (durationDays >= 5) {
      excludedByLeaveMap.set(leave.userId, { days: durationDays, reason: leave.reason || 'Approved leave >= 5 days' })
    }
  }

  const eligibleExecs = allExecutives.filter(e => !excludedByLeaveMap.has(e.id))
  const excludedByLeave = allExecutives
    .filter(e => excludedByLeaveMap.has(e.id))
    .map(e => ({
      id: e.id,
      fullName: e.fullName,
      days: excludedByLeaveMap.get(e.id)!.days,
      reason: excludedByLeaveMap.get(e.id)!.reason
    }))

  if (eligibleExecs.length === 0 || candidateLeads.length === 0) {
    return {
      totalEligibleLeads: candidateLeads.length,
      eligibleEmployees: eligibleExecs.map(e => ({
        id: e.id,
        fullName: e.fullName,
        existingCount: 0,
        remainingCapacity: targetCapacity,
        allocatedCount: 0,
        allocatedLeadIds: []
      })),
      excludedByLeave,
      unassignedRemainderCount: candidateLeads.length,
      dateGroupsCount: 0
    }
  }

  // 5. Existing assigned count per employee in this month
  const existingAssignments = await prisma.lead.groupBy({
    by: ['assignedTo'],
    _count: { _all: true },
    where: {
      assignedTo: { in: eligibleExecs.map(e => e.id) },
      deletedAt: null,
      expiryDate: { gte: periodStart, lte: periodEnd },
      status: { not: 'Trashed' }
    }
  })

  const existingCountMap = new Map<string, number>()
  existingAssignments.forEach(ea => {
    if (ea.assignedTo) existingCountMap.set(ea.assignedTo, ea._count._all)
  })

  const employeeState = eligibleExecs.map(e => {
    const existing = existingCountMap.get(e.id) || 0
    const remaining = Math.max(0, targetCapacity - existing)
    return {
      id: e.id,
      fullName: e.fullName,
      existingCount: existing,
      remainingCapacity: remaining,
      allocatedCount: 0,
      allocatedLeadIds: [] as string[]
    }
  })

  // 6. Group leads by calendar date
  const dateGroups = new Map<string, { id: string }[]>()
  for (const lead of candidateLeads) {
    const dKey = toDateKey(lead.expiryDate)
    if (!dateGroups.has(dKey)) dateGroups.set(dKey, [])
    dateGroups.get(dKey)!.push(lead)
  }

  // 7. Date-Balanced Sequential Rotation
  let globalExecIndex = 0
  let unassignedCount = 0

  dateGroups.forEach((leadsInDate) => {
    for (const lead of leadsInDate) {
      // Find next executive with capacity
      let foundExec = false
      for (let attempt = 0; attempt < employeeState.length; attempt++) {
        const candidate = employeeState[globalExecIndex % employeeState.length]
        globalExecIndex++
        if (candidate.allocatedCount < candidate.remainingCapacity) {
          candidate.allocatedCount++
          candidate.allocatedLeadIds.push(lead.id)
          foundExec = true
          break
        }
      }

      if (!foundExec) {
        unassignedCount++
      }
    }
  })

  return {
    totalEligibleLeads: candidateLeads.length,
    eligibleEmployees: employeeState,
    excludedByLeave,
    unassignedRemainderCount: unassignedCount,
    dateGroupsCount: dateGroups.size
  }
}

export async function executeAssignmentBatch(
  plan: AssignmentPlan,
  scope: AssignmentScope,
  adminUserId: string,
  idempotencyKey?: string
): Promise<{ batchId: string; assignedCount: number }> {
  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } })
    if (existing) {
      return existing.responseBody as any
    }
  }

  // Calculate total leads to assign
  let totalToAssign = 0
  plan.eligibleEmployees.forEach(e => totalToAssign += e.allocatedCount)

  if (totalToAssign === 0) {
    throw new Error('No leads available to assign under current capacity constraints.')
  }

  // Create AssignmentBatch audit record
  const batch = await prisma.assignmentBatch.create({
    data: {
      sheetName: scope.sheetName || 'all',
      month: scope.month,
      year: scope.year,
      totalLeads: plan.totalEligibleLeads,
      totalEmployees: plan.eligibleEmployees.filter(e => e.allocatedCount > 0).length,
      status: 'active',
      createdById: adminUserId,
      filters: {
        sheetName: scope.sheetName,
        city: scope.city,
        targetCapacity: scope.targetCapacity
      }
    }
  })

  // Bulk update leads per employee in transaction
  await prisma.$transaction(async (tx) => {
    for (const emp of plan.eligibleEmployees) {
      if (emp.allocatedLeadIds.length === 0) continue

      await tx.lead.updateMany({
        where: { id: { in: emp.allocatedLeadIds } },
        data: {
          assignedTo: emp.id,
          status: 'Assigned',
          updatedAt: new Date()
        }
      })

      const assignmentRecords = emp.allocatedLeadIds.map(leadId => ({
        leadId,
        userId: emp.id,
        batchId: batch.id
      }))

      await tx.leadAssignment.createMany({
        data: assignmentRecords,
        skipDuplicates: true
      })
    }

    // Emit sync events so mobile clients receive assigned leads
    const syncEvents = plan.eligibleEmployees.flatMap(emp =>
      emp.allocatedLeadIds.map(leadId => ({
        entityType: 'lead' as const,
        entityId: leadId,
        action: 'update' as const,
        payload: { assignedTo: emp.id, status: 'Assigned' },
        userId: emp.id
      }))
    )
    if (syncEvents.length > 0) {
      await tx.syncEvent.createMany({
        data: syncEvents.map(e => ({
          entityType: e.entityType,
          entityId: e.entityId,
          action: e.action,
          payload: e.payload,
          userId: e.userId
        }))
      })
    }
  })

  const result = { batchId: batch.id, assignedCount: totalToAssign }

  if (idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        handler: 'assignment.execute',
        responseStatus: 200,
        responseBody: result as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }).catch(() => {})
  }

  return result
}

export async function revertAssignmentBatch(batchId: string, adminUserId: string): Promise<{ revertedCount: number }> {
  const batch = await prisma.assignmentBatch.findUnique({
    where: { id: batchId },
    include: { assignments: true }
  })

  if (!batch) throw new Error(`Assignment batch ${batchId} not found`)
  if (batch.status === 'reverted') throw new Error(`Batch ${batchId} has already been reverted`)

  // Find assignments for this batch
  const assignments = await prisma.leadAssignment.findMany({
    where: { batchId },
    select: { leadId: true, userId: true }
  })

  const leadIds = assignments.map(a => a.leadId)

  // Protect manual reassignments: Only revert if lead is STILL assigned to the batch's assignee
  let revertedCount = 0
  await prisma.$transaction(async (tx) => {
    for (const a of assignments) {
      const updated = await tx.lead.updateMany({
        where: {
          id: a.leadId,
          assignedTo: a.userId
        },
        data: {
          assignedTo: null,
          status: 'New',
          updatedAt: new Date()
        }
      })
      revertedCount += updated.count
    }

    // Emit sync events for unassigned leads
    const revertSyncEvents = assignments.map(a => ({
      entityType: 'lead' as const,
      entityId: a.leadId,
      action: 'update' as const,
      payload: { assignedTo: null, status: 'New' },
      userId: a.userId
    }))
    if (revertSyncEvents.length > 0) {
      await tx.syncEvent.createMany({
        data: revertSyncEvents.map(e => ({
          entityType: e.entityType,
          entityId: e.entityId,
          action: e.action,
          payload: e.payload,
          userId: e.userId
        }))
      })
    }

    await tx.assignmentBatch.update({
      where: { id: batchId },
      data: {
        status: 'reverted',
        revertedAt: new Date(),
        revertedById: adminUserId
      }
    })
  })

  return { revertedCount }
}
