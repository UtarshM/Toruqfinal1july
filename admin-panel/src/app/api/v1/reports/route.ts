import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'accounts.view_reports')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'summary'
    
    // Robust IST-aware date parsing (GMT+5:30)
    const parseDate = (dateStr: string | null, isEnd: boolean) => {
      if (!dateStr) return null
      
      const [year, month, day] = dateStr.split('-').map(Number)
      if (!year || !month || !day) return null
      
      if (!isEnd) {
        const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        d.setMinutes(d.getMinutes() - 330) // -5h 30m
        return d
      } else {
        const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
        d.setMinutes(d.getMinutes() - 330) // -5h 30m
        return d
      }
    }

    // Get dates from 'from'/'to' or 'startDate'/'endDate'
    const fromStr = searchParams.get('from') || searchParams.get('startDate')
    const toStr = searchParams.get('to') || searchParams.get('endDate')

    let from = parseDate(fromStr, false)
    let to = parseDate(toStr, true)

    // Defaults if NOT provided (last 30 days instead of 3 months for tighter default)
    if (!from) {
      from = new Date()
      from.setDate(from.getDate() - 30)
      from.setHours(0, 0, 0, 0)
    }
    if (!to) {
      to = new Date()
      to.setHours(23, 59, 59, 999)
    }

    const strictDateFilter = { gte: from, lte: to }

    // Revenue Report
    if (type === 'revenue') {
      const transactions = await prisma.transaction.findMany({
        where: { date: strictDateFilter },
        orderBy: { date: 'asc' },
        select: {
          id: true, type: true, category: true,
          amount: true, date: true, description: true, paymentMethod: true
        }
      })
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return NextResponse.json({ 
        type: 'revenue', 
        from: from.toISOString(),
        to: to.toISOString(),
        total_income: totalIncome, 
        total_expense: totalExpense, 
        net: totalIncome - totalExpense, 
        records: transactions 
      })
    }

    // Leads Report
    if (type === 'leads') {
      const leads = await prisma.lead.findMany({
        where: { createdAt: strictDateFilter },
        orderBy: { createdAt: 'desc' },
        include: { assignee: { select: { fullName: true } } }
      })
      const byStatus = await prisma.lead.groupBy({
        by: ['status'],
        where: { createdAt: strictDateFilter },
        _count: { _all: true }
      })
      return NextResponse.json({
        type: 'leads', 
        from: from.toISOString(),
        to: to.toISOString(),
        total: leads.length,
        by_status: byStatus.map(s => ({ status: s.status, count: s._count._all })),
        records: leads
      })
    }

    // HR Report (Employees who joined within date range)
    if (type === 'hr') {
      const employees = await prisma.user.findMany({
        where: { joiningDate: strictDateFilter },
        select: {
          id: true, fullName: true, email: true,
          joiningDate: true, highestQualification: true,
          isActive: true, role: { select: { name: true } }
        },
        orderBy: { fullName: 'asc' }
      })
      return NextResponse.json({ 
        type: 'hr', 
        from: from.toISOString(),
        to: to.toISOString(),
        total: employees.length, 
        records: employees 
      })
    }

    // Default summary
    const [leads, policies, claims, loans, users] = await Promise.all([
      prisma.lead.count({ where: { createdAt: strictDateFilter } }),
      prisma.policy.count({ where: { createdAt: strictDateFilter } }),
      prisma.claim.count({ where: { createdAt: strictDateFilter } }),
      prisma.loan.count({ where: { createdAt: strictDateFilter } }),
      prisma.user.count({ where: { isActive: true, joiningDate: strictDateFilter } })
    ])

    return NextResponse.json({ 
      type: 'summary', 
      from: from.toISOString(), 
      to: to.toISOString(), 
      leads, 
      policies, 
      claims, 
      loans, 
      active_users: users 
    })
  } catch (err: any) {
    console.error('Reports API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
