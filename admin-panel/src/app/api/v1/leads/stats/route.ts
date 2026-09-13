import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const where: any = {
      status: { not: 'Trashed' },
      deletedAt: null
    }
    
    if (fromParam || toParam) {
      where.createdAt = {}
      if (fromParam) {
        const d = new Date(fromParam)
        d.setHours(0, 0, 0, 0)
        if (!isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (toParam) {
        const d = new Date(toParam)
        d.setHours(23, 59, 59, 999)
        if (!isNaN(d.getTime())) where.createdAt.lte = d
      }
    }

    const roleUpper = context?.role?.toUpperCase() || ''
    const isExecutive = roleUpper.endsWith('EXECUTIVE') || roleUpper === 'VIEWER'
    
    if (isExecutive) {
      where.assignedTo = context!.userId
    } else if (roleUpper === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context!.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.assignedTo = { in: [context!.userId, ...teamIds] }
    }

    const assignedWhere = isExecutive ? null : { ...where, assignedTo: where.assignedTo ?? { not: null } }
    const unassignedWhere = isExecutive ? null : { ...where, assignedTo: null }

    const [
      totalLeads,
      assignedRes,
      unassignedRes,
      convertedLeads,
      pendingFollowups,
      notInterestedLeads
    ] = await Promise.all([
      prisma.lead.count({ where }),
      assignedWhere ? prisma.lead.count({ where: assignedWhere }) : Promise.resolve(0),
      unassignedWhere ? prisma.lead.count({ where: unassignedWhere }) : Promise.resolve(0),
      prisma.lead.count({ where: { ...where, status: 'Converted' } }),
      prisma.lead.count({ where: { ...where, status: { in: ['Follow Up', 'Follow-up'] } } }),
      prisma.lead.count({ where: { ...where, status: 'Not Interested' } })
    ])

    const assignedLeads = isExecutive ? totalLeads : assignedRes
    const unassignedLeads = isExecutive ? 0 : unassignedRes
    
    const employeeWhere: any = {
      role: {
        name: { notIn: ['Super Admin', 'Admin', 'Viewer'] }
      }
    }
    
    if (roleUpper === 'MANAGER') {
      employeeWhere.managerId = context!.userId
    }

    const employeeStats = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedLeads: true,
            calls: true,
          }
        },
        assignedLeads: {
          select: {
            status: true
          }
        }
      }
    })

    const formattedEmployeeStats = employeeStats.map(emp => {
      const converted = emp.assignedLeads.filter(l => l.status === 'Converted').length
      const pending = emp.assignedLeads.filter(l => l.status === 'New' || l.status === 'Follow-up').length
      return {
        id: emp.id,
        name: emp.fullName,
        assigned: emp._count.assignedLeads,
        called: emp._count.calls,
        pending: pending,
        converted: converted
      }
    })

    return NextResponse.json({
      summary: {
        total: totalLeads,
        assigned: assignedLeads,
        unassigned: unassignedLeads,
        converted: convertedLeads,
        followups: pendingFollowups,
        notInterested: notInterestedLeads
      },
      employees: formattedEmployeeStats
    })
  } catch (error: any) {
    console.error('Leads Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 })
  }
}
