
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'dashboard.view_manager')
  if (error) return error

  try {
    const userId = context!.userId
    
    const team = await prisma.user.findMany({
      where: { managerId: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        personalMobile: true,
        _count: {
          select: {
            assignedLeads: true,
            calls: true,
            followUps: true
          }
        },
        assignedLeads: {
          where: { status: 'Won' },
          select: { id: true }
        }
      }
    })

    const teamData = team.map(member => ({
      id: member.id,
      name: member.fullName,
      email: member.email,
      phone: member.personalMobile,
      totalLeads: member._count.assignedLeads,
      totalCalls: member._count.calls,
      pendingFollowUps: member._count.followUps,
      wonLeads: member.assignedLeads.length,
      conversionRate: member._count.assignedLeads > 0 
        ? ((member.assignedLeads.length / member._count.assignedLeads) * 100).toFixed(1) + '%' 
        : '0%'
    }))

    return NextResponse.json(teamData)
  } catch (error) {
    console.error('Manager Team API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
