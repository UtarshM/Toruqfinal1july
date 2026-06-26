import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

// GET /api/v1/crm/revenue — Revenue analytics across CRM customers
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'crm.view_revenue')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().setMonth(new Date().getMonth() - 6))
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

    // Total revenue from transactions linked to policies
    const [
      totalRevenue,
      revenueByMonth,
      topCustomers,
      summaryStats
    ] = await Promise.all([

      // Total income in period
      prisma.transaction.aggregate({
        where: { type: 'income', date: { gte: from, lte: to } },
        _sum: { amount: true }
      }),

      // Revenue grouped by month
      prisma.transaction.groupBy({
        by: ['date'],
        where: { type: 'income', date: { gte: from, lte: to } },
        _sum: { amount: true },
        orderBy: { date: 'asc' }
      }),

      // Top customers by revenue (from customer.totalRevenue field)
      prisma.customer.findMany({
        where: { totalRevenue: { not: null } },
        orderBy: { totalRevenue: 'desc' },
        take: 10,
        select: {
          id: true, name: true, phone: true,
          totalRevenue: true, policyCount: true,
          loanCount: true, claimCount: true, lastSaleDate: true
        }
      }),

      // Summary counts
      Promise.all([
        prisma.customer.count(),
        prisma.customer.aggregate({ _sum: { totalRevenue: true } }),
        prisma.customer.count({ where: { totalRevenue: { gt: 0 } } })
      ])
    ])

    const [totalCustomers, revenueSum, payingCustomers] = summaryStats

    return NextResponse.json({
      period: { from, to },
      total_revenue: Number(totalRevenue._sum.amount || 0),
      total_customers: totalCustomers,
      paying_customers: payingCustomers,
      avg_revenue_per_customer: payingCustomers > 0
        ? Number((Number(revenueSum._sum.totalRevenue || 0) / payingCustomers).toFixed(2))
        : 0,
      top_customers: topCustomers,
      monthly_revenue: revenueByMonth.map(r => ({
        month: new Date(r.date).toLocaleString('default', { month: 'short', year: '2-digit' }),
        amount: Number(r._sum.amount || 0)
      }))
    })
  } catch (err: any) {
    console.error('CRM Revenue Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/v1/crm/revenue — Recalculate and update customer revenue totals
export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'crm.view_revenue')
  if (error) return error

  try {
    const body = await req.json()
    const { customerId, amount, saleDate, policyDelta, loanDelta, claimDelta } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalRevenue: { increment: amount || 0 },
        lastSaleDate: saleDate ? new Date(saleDate) : (amount > 0 ? new Date() : undefined),
        policyCount: { increment: policyDelta || 0 },
        loanCount: { increment: loanDelta || 0 },
        claimCount: { increment: claimDelta || 0 }
      }
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
