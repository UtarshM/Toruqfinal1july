import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'accounts.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // e.g. "2026-08"
    const startDateParam = searchParams.get('startDate') || searchParams.get('from')
    const endDateParam = searchParams.get('endDate') || searchParams.get('to')
    const paymentStatus = searchParams.get('paymentStatus') || searchParams.get('status') // 'Paid', 'Partial', 'Pending', 'all'
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const roleUpper = (context.role || '').toUpperCase()
    const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
    const isManager = roleUpper.includes('MANAGER')
    const isAccountant = roleUpper.includes('ACCOUNTANT') || roleUpper.includes('HR')

    const where: any = {}

    // Date filtering (by month or custom date range)
    if (month && month !== 'all') {
      const [y, m] = month.split('-').map(Number)
      if (y && m) {
        const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0)
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)
        where.createdAt = {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    } else if (startDateParam || endDateParam) {
      where.createdAt = {}
      if (startDateParam) {
        const d = new Date(startDateParam)
        d.setHours(0, 0, 0, 0)
        if (!isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (endDateParam) {
        const d = new Date(endDateParam)
        d.setHours(23, 59, 59, 999)
        if (!isNaN(d.getTime())) where.createdAt.lte = d
      }
    }

    // Role-based scope (Accountant, Admin have global view; Manager sees team)
    if (isManager && !isAdmin && !isAccountant) {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamMemberIds = [context.userId, ...team.map(t => t.id)]
      where.lead = {
        assignedTo: { in: teamMemberIds }
      }
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        },
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            vehicleNo: true,
            customFields: true,
            expiryDate: true,
            assignee: {
              select: { id: true, fullName: true, email: true }
            }
          }
        }
      }
    })

    // Process policies and calculate real-time financials
    const processed = policies.map(p => {
      const totalPremium = Number(p.premiumAmount) || 0
      const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {}
      const submission = cf.policySubmission || {}
      const formData = submission.formData || {}

      // Calculate total collected from linked income transactions
      const incomeTxns = p.transactions.filter(t => t.type === 'income')
      let collectedFromTxns = incomeTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      // If no explicit transactions exist yet, check formData initial paid amounts
      let paidAmount = collectedFromTxns
      if (incomeTxns.length === 0) {
        if (formData.paidAmount !== undefined && formData.paidAmount !== null && formData.paidAmount !== '') {
          paidAmount = Math.min(totalPremium, Math.max(0, parseFloat(formData.paidAmount) || 0))
        } else if (formData.paymentStatus === 'Paid' || p.status === 'Active') {
          // Default to full paid if not explicitly partial
          paidAmount = totalPremium
        }
      }

      const pendingAmount = Math.max(0, totalPremium - paidAmount)
      let status: 'Paid' | 'Partial' | 'Pending' = 'Pending'
      if (pendingAmount === 0 && totalPremium > 0) {
        status = 'Paid'
      } else if (paidAmount > 0) {
        status = 'Partial'
      } else {
        status = 'Pending'
      }

      const paymentMode = formData.paymentMode || incomeTxns[0]?.paymentMethod || 'Cash'

      return {
        id: p.id,
        policyNumber: p.policyNumber,
        provider: p.provider,
        type: p.type,
        totalPremium,
        paidAmount,
        pendingAmount,
        paymentStatus: status,
        paymentMode,
        issueDate: p.startDate ? new Date(p.startDate).toISOString() : p.createdAt.toISOString(),
        expiryDate: p.endDate ? new Date(p.endDate).toISOString() : (p.lead?.expiryDate ? new Date(p.lead.expiryDate).toISOString() : null),
        leadId: p.lead?.id || null,
        clientName: p.lead?.clientName || 'Unknown Customer',
        clientPhone: p.lead?.clientPhone || '',
        vehicleNo: p.lead?.vehicleNo || 'N/A',
        salesPersonName: p.lead?.assignee?.fullName || 'Direct / Unassigned',
        salesPersonId: p.lead?.assignee?.id || null,
        compiledPdfUrl: submission.compiledPdfUrl || null,
        documentsCount: submission.documents?.length || 0,
        transactions: p.transactions.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type,
          category: t.category,
          paymentMethod: t.paymentMethod,
          referenceNumber: t.referenceNumber,
          description: t.description,
          date: t.date
        }))
      }
    })

    // Filter by search & paymentStatus in-memory
    let filtered = processed
    if (search) {
      filtered = filtered.filter(item =>
        item.policyNumber.toLowerCase().includes(search) ||
        item.clientName.toLowerCase().includes(search) ||
        item.vehicleNo.toLowerCase().includes(search) ||
        item.clientPhone.toLowerCase().includes(search) ||
        item.salesPersonName.toLowerCase().includes(search) ||
        item.provider.toLowerCase().includes(search)
      )
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filtered = filtered.filter(item => item.paymentStatus.toLowerCase() === paymentStatus.toLowerCase())
    }

    // Aggregated KPI Stats
    const totalInvoiced = filtered.reduce((acc, curr) => acc + curr.totalPremium, 0)
    const totalCollected = filtered.reduce((acc, curr) => acc + curr.paidAmount, 0)
    const totalPending = filtered.reduce((acc, curr) => acc + curr.pendingAmount, 0)
    const paidCount = filtered.filter(i => i.paymentStatus === 'Paid').length
    const partialCount = filtered.filter(i => i.paymentStatus === 'Partial').length
    const pendingCount = filtered.filter(i => i.paymentStatus === 'Pending').length

    return NextResponse.json({
      items: filtered,
      summary: {
        totalPolicies: filtered.length,
        totalInvoiced,
        totalCollected,
        totalPending,
        paidCount,
        partialCount,
        pendingCount,
        collectionRate: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '100.0'
      }
    })
  } catch (err: any) {
    console.error('[finance/receivables GET] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'accounts.create_entry')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { 
      policyId, leadId, amount, paymentMethod, referenceNumber, description, date 
    } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'A valid payment amount is required' }, { status: 400 })
    }

    const payAmount = parseFloat(amount)
    const txnDate = date ? new Date(date) : new Date()

    let targetPolicy = null
    if (policyId) {
      targetPolicy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: { lead: true }
      })
    } else if (leadId) {
      targetPolicy = await prisma.policy.findFirst({
        where: { leadId },
        include: { lead: true }
      })
    }

    // 1. Create Transaction Ledger Entry
    const txn = await prisma.transaction.create({
      data: {
        userId: context.userId,
        policyId: targetPolicy?.id || policyId || null,
        leadId: targetPolicy?.leadId || leadId || null,
        type: 'income',
        category: 'Policy Premium Installment',
        amount: payAmount,
        status: 'completed',
        paymentMethod: paymentMethod || 'Cash',
        referenceNumber: referenceNumber || null,
        description: description || `Payment received for policy ${targetPolicy?.policyNumber || ''}`.trim(),
        date: txnDate
      }
    })

    // 2. Update Lead customFields payment state if lead exists
    const actualLeadId = targetPolicy?.leadId || leadId
    if (actualLeadId) {
      const lead = await prisma.lead.findUnique({ where: { id: actualLeadId } })
      if (lead) {
        const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
        const submission = cf.policySubmission || {}
        const formData = submission.formData || {}

        const prevPaid = parseFloat(formData.paidAmount || '0') || 0
        const totalPrem = parseFloat(formData.rsFromCustomer || formData.rate || (targetPolicy?.premiumAmount ? String(targetPolicy.premiumAmount) : '0')) || 0
        const newPaid = prevPaid + payAmount
        const newPending = Math.max(0, totalPrem - newPaid)

        const updatedSubmission = {
          ...submission,
          formData: {
            ...formData,
            paidAmount: newPaid,
            pendingAmount: newPending,
            paymentStatus: newPending === 0 ? 'Paid' : 'Partial'
          },
          financeHistory: [
            ...(submission.financeHistory || []),
            {
              amount: payAmount,
              paymentMethod: paymentMethod || 'Cash',
              referenceNumber: referenceNumber || null,
              recordedBy: context.name || context.fullName || 'Staff',
              recordedById: context.userId,
              date: txnDate.toISOString()
            }
          ],
          updatedAt: new Date().toISOString()
        }

        await prisma.lead.update({
          where: { id: actualLeadId },
          data: {
            customFields: {
              ...cf,
              policySubmission: updatedSubmission
            }
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${payAmount.toLocaleString()} recorded successfully`,
      transaction: txn
    })
  } catch (err: any) {
    console.error('[finance/receivables POST] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
