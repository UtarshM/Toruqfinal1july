import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

// Helper function to update or generate the Monthly Master Excel Sheet on disk
export async function updateMonthlyMasterSheet(monthStr: string) {
  try {
    const [year, month] = monthStr.split('-').map(Number)
    if (!year || !month) return null

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

    // Fetch all policies created in this month
    const policies = await prisma.policy.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
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
    XLSX.utils.book_append_sheet(wb, ws, `Policies_${monthStr}`)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'monthly-sheets')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const fileName = `master_policies_${monthStr}.xlsx`
    const fullFilePath = path.join(uploadDir, fileName)
    XLSX.writeFile(wb, fullFilePath)

    const relativeUrl = `/uploads/monthly-sheets/${fileName}`
    return { fileName, fullFilePath, relativeUrl, count: policies.length }
  } catch (err) {
    console.error('[updateMonthlyMasterSheet] Error:', err)
    return null
  }
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'accounts.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const currentMonthStr = new Date().toISOString().slice(0, 7)
    const month = searchParams.get('month') || currentMonthStr

    const sheetResult = await updateMonthlyMasterSheet(month)

    return NextResponse.json({
      success: true,
      month,
      sheetUrl: sheetResult?.relativeUrl || null,
      fileName: sheetResult?.fileName || null,
      totalPolicies: sheetResult?.count || 0
    })
  } catch (err: any) {
    console.error('[monthly-sheet GET] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
