import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

interface SheetFilterOptions {
  month?: string | null
  startDate?: string | null
  endDate?: string | null
  singleDate?: string | null
}

// Master function to generate Excel sheet for any Month, Single Date, or Custom Date & Time Range
export async function generateMasterSheet(options: SheetFilterOptions) {
  try {
    const { month, startDate, endDate, singleDate } = options
    const where: any = {}
    let fileSlug = 'custom_range'

    if (singleDate) {
      const d = new Date(singleDate)
      if (!isNaN(d.getTime())) {
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        where.createdAt = { gte: start, lte: end }
        fileSlug = `date_${singleDate.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      }
    } else if (startDate || endDate) {
      where.createdAt = {}
      let startStr = 'start'
      let endStr = 'end'

      if (startDate) {
        const s = new Date(startDate)
        if (!isNaN(s.getTime())) {
          where.createdAt.gte = s
          startStr = startDate.split('T')[0] || startDate
        }
      }
      if (endDate) {
        const e = new Date(endDate)
        if (!isNaN(e.getTime())) {
          // If time is not explicitly included in string, default to end of day
          if (!endDate.includes('T') && !endDate.includes(':')) {
            e.setHours(23, 59, 59, 999)
          }
          where.createdAt.lte = e
          endStr = endDate.split('T')[0] || endDate
        }
      }
      fileSlug = `range_${startStr}_to_${endStr}`
    } else if (month && month !== 'all') {
      const [year, m] = month.split('-').map(Number)
      if (year && m) {
        const startOfMonth = new Date(year, m - 1, 1, 0, 0, 0, 0)
        const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999)
        where.createdAt = { gte: startOfMonth, lte: endOfMonth }
        fileSlug = `month_${month}`
      }
    } else {
      // Default to current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      where.createdAt = { gte: startOfMonth, lte: endOfMonth }
      fileSlug = `month_${now.toISOString().slice(0, 7)}`
    }

    // Fetch all policies in the specified date/time range
    const policies = await prisma.policy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          where: { type: 'income' }
        },
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            clientEmail: true,
            vehicleNo: true,
            gvw: true,
            city: true,
            address: true,
            customFields: true,
            assignee: {
              select: { fullName: true, email: true }
            }
          }
        }
      }
    })

    const headers = [
      'Policy Number',
      'Client Name',
      'Phone Number',
      'Email',
      'Vehicle Number',
      'GVW',
      'City',
      'Insurance Provider',
      'Policy Type',
      'Total Premium (INR)',
      'Paid Amount (INR)',
      'Pending Due (INR)',
      'Payment Status',
      'Payment Mode',
      'Policy Start Date',
      '1-Year Expiry Date',
      'Issued Policy PDF Link',
      '7-Doc Merged PDF Link',
      'Sales Executive',
      'Approving Manager',
      'Created Timestamp'
    ]

    const rows: any[][] = [headers]

    policies.forEach(p => {
      const cf = (p.lead?.customFields && typeof p.lead.customFields === 'object') ? (p.lead.customFields as any) : {}
      const submission = cf.policySubmission || {}
      const formData = submission.formData || {}

      const totalPremium = Number(p.premiumAmount) || 0
      const incomeTotal = p.transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const paidAmount = incomeTotal > 0 ? incomeTotal : (parseFloat(formData.paidAmount) || totalPremium)
      const pendingAmount = Math.max(0, totalPremium - paidAmount)
      const paymentStatus = pendingAmount === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending')

      rows.push([
        p.policyNumber,
        p.lead?.clientName || 'N/A',
        p.lead?.clientPhone || 'N/A',
        p.lead?.clientEmail || '',
        p.lead?.vehicleNo || 'N/A',
        p.lead?.gvw || '',
        p.lead?.city || '',
        p.provider || '',
        p.type || '',
        totalPremium,
        paidAmount,
        pendingAmount,
        paymentStatus,
        formData.paymentMode || 'Cash',
        p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '',
        p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : '',
        submission.issuedPolicyPdfUrl || submission.compiledPdfUrl || '',
        submission.compiledPdfUrl || '',
        p.lead?.assignee?.fullName || 'Direct / Unassigned',
        submission.reviewedByName || 'Manager',
        new Date(p.createdAt).toISOString()
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Master Policies')

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'monthly-sheets')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const fileName = `master_policies_${fileSlug}_${Date.now()}.xlsx`
    const fullFilePath = path.join(uploadDir, fileName)
    XLSX.writeFile(wb, fullFilePath)

    const relativeUrl = `/uploads/monthly-sheets/${fileName}`
    return { fileName, fullFilePath, relativeUrl, count: policies.length }
  } catch (err) {
    console.error('[generateMasterSheet] Error:', err)
    return null
  }
}

// Backward compatibility helper
export async function updateMonthlyMasterSheet(monthStr: string) {
  return generateMasterSheet({ month: monthStr })
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'accounts.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const startDate = searchParams.get('startDate') || searchParams.get('from')
    const endDate = searchParams.get('endDate') || searchParams.get('to')
    const singleDate = searchParams.get('date') || searchParams.get('singleDate')

    const sheetResult = await generateMasterSheet({
      month,
      startDate,
      endDate,
      singleDate
    })

    return NextResponse.json({
      success: true,
      sheetUrl: sheetResult?.relativeUrl || null,
      fileName: sheetResult?.fileName || null,
      totalPolicies: sheetResult?.count || 0
    })
  } catch (err: any) {
    console.error('[monthly-sheet GET] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
