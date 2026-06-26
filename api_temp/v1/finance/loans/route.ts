import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'loan.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const where: any = {}
    if (status && status !== 'all') where.status = status

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true } },
        assignee: { select: { fullName: true } }
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Loans GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'loan.create')
  if (error) return error

  try {
    const body = await req.json()
    const loan = await prisma.loan.create({
      data: {
        leadId: body.leadId || body.lead_id,
        assignedTo: body.assignedTo || body.assigned_to,
        customerName: body.customerName || body.customer_name,
        loanType: body.loanType || body.loan_type,
        amount: body.amount,
        tenureMonths: body.tenureMonths || body.tenure_months,
        interestRate: body.interestRate || body.interest_rate,
        status: body.status || 'applied',
        conversionStatus: body.conversionStatus || 'Applied',
        bankName: body.bankName || body.bank_name
      }
    })
    return NextResponse.json(loan)
  } catch (error) {
    console.error('Loan POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await validateAuth(req, 'loan.edit')
  if (error) return error

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    if (updates.disbursementDate) updates.disbursementDate = new Date(updates.disbursementDate)

    const loan = await prisma.loan.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(loan)
  } catch (error) {
    console.error('Loan PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
