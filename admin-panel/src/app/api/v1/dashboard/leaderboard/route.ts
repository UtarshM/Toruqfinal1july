import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

// Baseline Staff Roster from Torque Auto Advisor's Official Production Flyer
interface StaffMember {
  name: string
  team: 'sales' | 'operation' | 'renewal'
  basePolicies: number
  roleTitle: string
}

const BENCHMARK_STAFF: StaffMember[] = [
  // --- SALES TEAM (Target: 82.5) ---
  { name: 'Perin', team: 'sales', basePolicies: 13.5, roleTitle: 'Sales Executive' },
  { name: 'Varsha', team: 'sales', basePolicies: 11.5, roleTitle: 'Sales Executive' },
  { name: 'Bharti', team: 'sales', basePolicies: 11.0, roleTitle: 'Sales Executive' },
  { name: 'Jinal', team: 'sales', basePolicies: 5.5, roleTitle: 'Sales Executive' },
  { name: 'Farzana', team: 'sales', basePolicies: 5.5, roleTitle: 'Sales Executive' },
  { name: 'Aljina', team: 'sales', basePolicies: 4.0, roleTitle: 'Sales Executive' },
  { name: 'Harsha', team: 'sales', basePolicies: 4.0, roleTitle: 'Sales Executive' },
  { name: 'Khushi', team: 'sales', basePolicies: 3.5, roleTitle: 'Sales Executive' },
  { name: 'Akshara', team: 'sales', basePolicies: 3.5, roleTitle: 'Sales Executive' },
  { name: 'Gazala', team: 'sales', basePolicies: 3.5, roleTitle: 'Sales Executive' },
  { name: 'Mukta', team: 'sales', basePolicies: 3.5, roleTitle: 'Sales Executive' },
  { name: 'Jinsi', team: 'sales', basePolicies: 3.0, roleTitle: 'Sales Executive' },
  { name: 'Archana', team: 'sales', basePolicies: 3.0, roleTitle: 'Sales Executive' },
  { name: 'Krishna', team: 'sales', basePolicies: 2.5, roleTitle: 'Sales Executive' },
  { name: 'Ishita', team: 'sales', basePolicies: 0.5, roleTitle: 'Sales Executive' },
  { name: 'Nisha', team: 'sales', basePolicies: 0.5, roleTitle: 'Sales Executive' },
  { name: 'Yasmin', team: 'sales', basePolicies: 0.5, roleTitle: 'Sales Executive' },
  { name: 'Janvi', team: 'sales', basePolicies: 0.0, roleTitle: 'Sales Executive' },
  { name: 'Other', team: 'sales', basePolicies: 3.5, roleTitle: 'Sales Support' },

  // --- OPERATION TEAM (Target: 31.5) ---
  { name: 'Payal', team: 'operation', basePolicies: 21.5, roleTitle: 'Operations Lead' },
  { name: 'Priya', team: 'operation', basePolicies: 9.5, roleTitle: 'Operations Specialist' },
  { name: 'Mustafa', team: 'operation', basePolicies: 0.5, roleTitle: 'Operations Support' },
  { name: 'Divyaba', team: 'operation', basePolicies: 0.0, roleTitle: 'Backoffice Executive' },
  { name: 'Faizan', team: 'operation', basePolicies: 0.0, roleTitle: 'Backoffice Executive' },
  { name: 'Parvez', team: 'operation', basePolicies: 0.0, roleTitle: 'Operations Executive' },
  { name: 'Anees', team: 'operation', basePolicies: 0.0, roleTitle: 'Backoffice Executive' },

  // --- RENEWAL TEAM (Target: 89.0) ---
  { name: 'Jalpa', team: 'renewal', basePolicies: 53.0, roleTitle: 'Renewal Manager' },
  { name: 'Sonali', team: 'renewal', basePolicies: 36.0, roleTitle: 'Renewal Specialist' },
]

export async function GET(req: NextRequest) {
  // Leaderboard is accessible to all verified members to drive motivation
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const category = (searchParams.get('category') || 'all').toLowerCase() // 'all' | 'new' | 'renewal' | 'operation'
    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    const monthParam = searchParams.get('month') // e.g. '2026-08' or 'current'

    // Build Date Filter
    const dateFilter: any = {}
    if (fromParam) {
      const d = new Date(fromParam)
      d.setHours(0, 0, 0, 0)
      if (!isNaN(d.getTime())) dateFilter.gte = d
    }
    if (toParam) {
      const d = new Date(toParam)
      d.setHours(23, 59, 59, 999)
      if (!isNaN(d.getTime())) dateFilter.lte = d
    }

    // 1. Fetch live policies created in database
    const policyWhere: any = {}
    if (Object.keys(dateFilter).length > 0) {
      policyWhere.createdAt = dateFilter
    }

    const livePolicies = await prisma.policy.findMany({
      where: policyWhere,
      select: {
        id: true,
        policyNumber: true,
        policyCount: true,
        premiumAmount: true,
        type: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            assignedTo: true,
            assignee: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { name: true } }
              }
            }
          }
        }
      }
    })

    // 2. Fetch live renewal records
    const renewalWhere: any = {
      renewalStatus: { in: ['Renewed', 'Active'] }
    }
    if (Object.keys(dateFilter).length > 0) {
      renewalWhere.updatedAt = dateFilter
    }

    const liveRenewals = await prisma.renewalRecord.findMany({
      where: renewalWhere,
      select: {
        id: true,
        policyNumber: true,
        policyCount: true,
        premiumAmount: true,
        renewalStatus: true,
        assignedTo: true,
        createdBySalesId: true,
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { name: true } }
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { name: true } }
          }
        }
      }
    })

    // 3. Fetch registered users from database to match names
    const dbUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { name: true } }
      }
    })

    // Map to accumulate policy counts: key = lower-cased first name or full name
    const liveCountsByName: Record<string, { newPolicies: number; renewals: number; total: number; matchedUser?: any }> = {}

    const recordUserCount = (userName: string, count: number, isRenewal: boolean, userInfo?: any) => {
      if (!userName) return
      const cleanName = userName.trim().toLowerCase()
      // find first token (e.g. "PERIN" from "PERIN LOLADIYA")
      const firstToken = cleanName.split(/[\s_]+/)[0]

      const targetKey = firstToken || cleanName
      if (!liveCountsByName[targetKey]) {
        liveCountsByName[targetKey] = { newPolicies: 0, renewals: 0, total: 0, matchedUser: userInfo }
      }
      if (isRenewal) {
        liveCountsByName[targetKey].renewals += count
      } else {
        liveCountsByName[targetKey].newPolicies += count
      }
      liveCountsByName[targetKey].total += count
      if (userInfo && !liveCountsByName[targetKey].matchedUser) {
        liveCountsByName[targetKey].matchedUser = userInfo
      }
    }

    // Process live policies
    livePolicies.forEach(p => {
      const pCount = p.policyCount !== undefined && p.policyCount !== null ? Number(p.policyCount) : 1.0
      const assigneeName = p.lead?.assignee?.fullName || 'Other'
      recordUserCount(assigneeName, pCount, false, p.lead?.assignee)
    })

    // Process live renewals
    liveRenewals.forEach(r => {
      const rCount = r.policyCount !== undefined && r.policyCount !== null ? Number(r.policyCount) : 1.0
      const renewalAgent = r.assignee?.fullName || r.createdBy?.fullName || 'Jalpa'
      recordUserCount(renewalAgent, rCount, true, r.assignee || r.createdBy)
    })

    // 4. Build leaderboard members combining benchmark baseline + live increments
    const buildTeamList = (teamKey: 'sales' | 'operation' | 'renewal') => {
      const benchmarkList = BENCHMARK_STAFF.filter(s => s.team === teamKey)
      
      return benchmarkList.map(staff => {
        const staffKey = staff.name.toLowerCase()
        const live = liveCountsByName[staffKey] || { newPolicies: 0, renewals: 0, total: 0 }

        // Determine effective policy count based on category filter
        let policyCount = staff.basePolicies
        if (category === 'new') {
          // If filtering new policies only, renewal team baseline doesn't apply
          policyCount = teamKey === 'renewal' ? live.newPolicies : (staff.basePolicies + live.newPolicies)
        } else if (category === 'renewal') {
          // If filtering renewals only, sales/ops baseline is reduced/focused on renewals
          policyCount = teamKey === 'renewal' ? (staff.basePolicies + live.renewals) : live.renewals
        } else {
          // All categories: full baseline + live additions
          policyCount = staff.basePolicies + live.total
        }

        return {
          name: staff.name,
          team: staff.team,
          teamLabel: teamKey === 'sales' ? 'Sales Team' : (teamKey === 'operation' ? 'Operation Team' : 'Renewal Team'),
          roleTitle: staff.roleTitle,
          policies: Math.round(policyCount * 10) / 10,
          newPolicies: live.newPolicies,
          renewals: live.renewals,
          isTopPerformer: false
        }
      })
      .sort((a, b) => b.policies - a.policies)
      .map((member, index) => ({
        ...member,
        rank: index + 1
      }))
    }

    // Also include any newly registered users from DB who made policies but aren't in the original flyer
    const existingFlyerKeys = new Set(BENCHMARK_STAFF.map(s => s.name.toLowerCase()))
    const additionalMembers: any[] = []

    Object.entries(liveCountsByName).forEach(([key, val]) => {
      if (!existingFlyerKeys.has(key) && key !== 'other') {
        const roleName = (val.matchedUser?.role?.name || '').toLowerCase()
        let team: 'sales' | 'operation' | 'renewal' = 'sales'
        if (roleName.includes('renew')) team = 'renewal'
        else if (roleName.includes('operat') || roleName.includes('backoffice')) team = 'operation'

        const count = category === 'new' ? val.newPolicies : (category === 'renewal' ? val.renewals : val.total)
        if (count > 0) {
          additionalMembers.push({
            name: val.matchedUser?.fullName || key.charAt(0).toUpperCase() + key.slice(1),
            team,
            teamLabel: team === 'sales' ? 'Sales Team' : (team === 'operation' ? 'Operation Team' : 'Renewal Team'),
            roleTitle: val.matchedUser?.role?.name || 'Executive',
            policies: Math.round(count * 10) / 10,
            newPolicies: val.newPolicies,
            renewals: val.renewals,
            isTopPerformer: false,
            rank: 99
          })
        }
      }
    })

    // Combine base lists with dynamic additions
    const salesListRaw = [...buildTeamList('sales'), ...additionalMembers.filter(m => m.team === 'sales')]
      .sort((a, b) => b.policies - a.policies)
      .map((m, i) => ({ ...m, rank: i + 1 }))

    const operationListRaw = [...buildTeamList('operation'), ...additionalMembers.filter(m => m.team === 'operation')]
      .sort((a, b) => b.policies - a.policies)
      .map((m, i) => ({ ...m, rank: i + 1 }))

    const renewalListRaw = [...buildTeamList('renewal'), ...additionalMembers.filter(m => m.team === 'renewal')]
      .sort((a, b) => b.policies - a.policies)
      .map((m, i) => ({ ...m, rank: i + 1 }))

    // Calculate Team Totals
    const salesTotal = Math.round(salesListRaw.reduce((sum, item) => sum + item.policies, 0) * 10) / 10
    const operationTotal = Math.round(operationListRaw.reduce((sum, item) => sum + item.policies, 0) * 10) / 10
    const renewalTotal = Math.round(renewalListRaw.reduce((sum, item) => sum + item.policies, 0) * 10) / 10
    const grandTotal = Math.round((salesTotal + operationTotal + renewalTotal) * 10) / 10

    // Top Performers Overall (excluding 'Other')
    const allMembersOverall = [...salesListRaw, ...operationListRaw, ...renewalListRaw]
      .filter(m => m.name.toLowerCase() !== 'other')
      .sort((a, b) => b.policies - a.policies)
      .map((m, i) => ({ ...m, overallRank: i + 1 }))

    const topPodium = allMembersOverall.slice(0, 3)
    const runnersUp = allMembersOverall.slice(3, 10)

    // Current formatted date or selected range label
    const now = new Date()
    const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const dateBadge = monthParam || currentMonthLabel

    return NextResponse.json({
      success: true,
      meta: {
        dateBadge: dateBadge || 'August 2026',
        category: category,
        grandTotalPolicies: grandTotal,
        teams: {
          sales: {
            title: 'Sales Team',
            totalPolicies: salesTotal,
            membersCount: salesListRaw.length
          },
          operation: {
            title: 'Operation Team',
            totalPolicies: operationTotal,
            membersCount: operationListRaw.length
          },
          renewal: {
            title: 'Renewal Team',
            totalPolicies: renewalTotal,
            membersCount: renewalListRaw.length
          }
        }
      },
      leaderboard: {
        salesTeam: salesListRaw,
        operationTeam: operationListRaw,
        renewalTeam: renewalListRaw
      },
      topPerformers: {
        podium: topPodium,
        runnersUp: runnersUp
      },
      branding: {
        company: 'TORQUE AUTO ADVISOR',
        tagline: 'DRIVE · INSURE · GROW TOGETHER',
        statusTitle: 'PERFORMANCE STATUS',
        statusSubtitle: 'People Performance Progress',
        quote: 'Consistent Efforts Create Extraordinary Results',
        pillars: [
          'No Credit No Tension',
          'Stronger Team',
          'Higher Performance',
          'Bigger Milestones'
        ],
        footerNote: 'TORQUE AUTO ADVISOR — MORE THAN INSURANCE, A STRONGER TOMORROW'
      }
    })
  } catch (error: any) {
    console.error('Leaderboard API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load leaderboard' }, { status: 500 })
  }
}
