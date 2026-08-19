import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { getUploadDir } from '@/lib/upload-helper'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Spreadsheets are only accessible to Admins' }, { status: 403 })
  }

  try {
    const { filename } = await params
    const safeFileName = path.basename(filename)

    // Extract batch name
    const batchName = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    const url = new URL(req.url)
    const pageParam = url.searchParams.get('page')
    const limitParam = url.searchParams.get('limit')
    const allParam = url.searchParams.get('all')
    const searchParam = url.searchParams.get('search')?.toLowerCase().trim() || ''

    const shouldPaginate = pageParam || allParam !== 'true'
    const page = Math.max(1, parseInt(pageParam || '1') || 1)
    const limit = Math.min(200, Math.max(10, parseInt(limitParam || '100') || 100))

    const formatDate = (date: any) => {
      if (!date) return '—'
      try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return '—'
        return d.toLocaleDateString('en-IN')
      } catch {
        return '—'
      }
    }

    if (batchName === 'renewals') {
      const renewals = await prisma.renewalRecord.findMany({
        include: {
          assignee: true,
          createdBy: true,
          lead: {
            include: {
              assignee: true
            }
          },
          policy: true
        },
        orderBy: { policyEndDate: 'asc' }
      })

      const headers = [
        'Client Name', 'Phone Number', 'Vehicle No', 'Policy Number', 'Provider / Insurer',
        'Policy Type', 'Premium Amount', 'Policy Expiry Date', 'Policy Start Date',
        'Renewal Status', 'Sales Person', 'Policy PDF', 'Assigned To', 'Assigned Month',
        'Assigned Year', 'Renewed Date', 'Refused Date', 'Created At'
      ]

      let dataRows = renewals.map(r => {
        const leadCf = r.lead?.customFields as any
        const pdfUrl = (Array.isArray(r.documents) && r.documents[0]) || 
                       leadCf?.policySubmission?.issuedPolicyPdfUrl || 
                       '';
        const salesPerson = r.createdBy?.fullName || r.lead?.assignee?.fullName || 'Unassigned'
        return [
          r.clientName || '',
          r.clientPhone || '',
          r.vehicleNo || '',
          r.policyNumber || r.policy?.policyNumber || '',
          r.provider || r.policy?.provider || '',
          r.policyType || r.policy?.type || '',
          r.premiumAmount ? Number(r.premiumAmount) : '',
          formatDate(r.policyEndDate),
          formatDate(r.policyStartDate),
          r.renewalStatus || 'Active',
          salesPerson,
          pdfUrl,
          r.assignee?.fullName || 'Unassigned',
          r.assignedMonth ? Number(r.assignedMonth) : '',
          r.assignedYear ? Number(r.assignedYear) : '',
          formatDate(r.renewedAt),
          formatDate(r.refusedAt),
          formatDate(r.createdAt)
        ]
      })

      if (searchParam) {
        dataRows = dataRows.filter(r =>
          r.some(c => String(c || '').toLowerCase().includes(searchParam))
        )
      }

      if (shouldPaginate) {
        const totalRows = dataRows.length
        const totalPages = Math.ceil(totalRows / limit)
        const start = (page - 1) * limit
        const paginatedRows = dataRows.slice(start, start + limit)

        return NextResponse.json({
          fileName: safeFileName,
          downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
          headers,
          rows: paginatedRows,
          agentColIdx: -1,
          agentRowsCount: 0,
          totalRows,
          totalPages,
          page,
          limit
        })
      }

      return NextResponse.json({
        fileName: safeFileName,
        downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
        headers,
        rows: dataRows,
        agentColIdx: -1,
        agentRowsCount: 0,
        totalRows: dataRows.length
      })
    }

    // Default leads mode
    const whereClause: any = { status: { not: 'Trashed' }, deletedAt: null }
    
    if (batchName !== 'leads' && batchName !== 'all_leads' && batchName !== 'direct_entry') {
      const dbBatches = await prisma.lead.groupBy({
        by: ['importName'],
        where: { status: { not: 'Trashed' }, deletedAt: null }
      })
      let actualImportName = batchName
      for (const b of dbBatches) {
        if (!b.importName) continue
        const clean = String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
        if (clean === batchName) {
          actualImportName = b.importName
          whereClause.importName = actualImportName
          break
        }
      }
    } else if (batchName === 'direct_entry') {
      whereClause.importName = null
    }

    if (searchParam) {
      whereClause.OR = [
        { clientName: { contains: searchParam, mode: 'insensitive' } },
        { clientPhone: { contains: searchParam, mode: 'insensitive' } },
        { vehicleNo: { contains: searchParam, mode: 'insensitive' } },
        { city: { contains: searchParam, mode: 'insensitive' } },
        { importName: { contains: searchParam, mode: 'insensitive' } }
      ]
    }

    let totalRows = 0
    let leadsList = []

    if (shouldPaginate) {
      const [count, leads] = await Promise.all([
        prisma.lead.count({ where: whereClause }),
        prisma.lead.findMany({
          where: whereClause,
          include: { assignee: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        })
      ])
      totalRows = count
      leadsList = leads
    } else {
      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: { assignee: true },
        orderBy: { createdAt: 'desc' }
      })
      totalRows = leads.length
      leadsList = leads
    }

    const standardHeaders = [
      'Client Name', 'Phone Number', 'Mo No. 2', 'REG NO / Vehicle No', 'Policy Expiry Date',
      'Registration Date', 'GVW', 'City', 'Address', 'Agent', 'Lead Status', 'Assigned To', 'Import Batch'
    ]

    const customKeys = new Set<string>()
    leadsList.forEach(l => {
      const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
      Object.keys(cf).forEach(k => {
        if (!['phone2', 'mobile2', 'phone', 'contact'].includes(k.toLowerCase())) {
          customKeys.add(k)
        }
      })
    })
    const customKeyList = Array.from(customKeys)
    const headers = [...standardHeaders, ...customKeyList]

    const rows = leadsList.map((l) => {
      const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
      const phone2 = cf.phone2 || cf.mobile2 || cf['mo no 2'] || cf['Mo No 2'] || (l.clientEmail && /^[0-9\s+-]{7,15}$/.test(l.clientEmail.trim()) ? l.clientEmail : '')
      const isAgentLead = l.existingAgent === 'Agent' || (l.existingAgent && String(l.existingAgent).toLowerCase().includes('agent'))

      const row = [
        l.clientName || '',
        l.clientPhone || '',
        phone2 || '',
        l.vehicleNo || '',
        formatDate(l.expiryDate),
        formatDate(l.registrationDate),
        l.gvw || '',
        l.city || '',
        l.address || '',
        isAgentLead ? 'agent' : (l.existingAgent || ''),
        l.status || 'New',
        l.assignee?.fullName || (isAgentLead ? 'Pending Admin Approval' : 'Unassigned'),
        l.importName || 'Direct Entry'
      ]

      customKeyList.forEach(k => {
        row.push(cf[k] !== undefined && cf[k] !== null ? String(cf[k]) : '')
      })

      return row
    })

    const agentColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'agent')
    const agentRowsCount = await prisma.lead.count({
      where: {
        ...whereClause,
        existingAgent: 'Agent'
      }
    })

    return NextResponse.json({
      fileName: safeFileName,
      downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
      headers,
      rows,
      agentColIdx,
      agentRowsCount,
      totalRows,
      totalPages: shouldPaginate ? Math.ceil(totalRows / limit) : 1,
      page: shouldPaginate ? page : 1,
      limit: shouldPaginate ? limit : totalRows
    })
  } catch (err: any) {
    console.error('[sheets-preview] Error:', err)
    return NextResponse.json({ error: 'Failed to query spreadsheet leads', details: err?.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete spreadsheets' }, { status: 403 })
  }

  try {
    const { filename } = await params
    const safeFileName = path.basename(filename)

    const uploadDir = getUploadDir()
    const filePath = path.join(uploadDir, safeFileName)

    // Extract batch name
    const batchName = safeFileName
      .replace(/^import_/, '')
      .replace(/_\d+\.(xlsx|csv)$/, '')
      .replace(/\.(xlsx|csv)$/, '')

    const deleteLeads = req.nextUrl.searchParams.get('deleteLeads') !== 'false'

    let deletedLeadsCount = 0
    if (deleteLeads && batchName && batchName !== 'all_leads') {
      if (batchName === 'renewals') {
        const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
        deletedLeadsCount = delRenewals.count
      } else {
        const cleanBatch = batchName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const allLeads = await prisma.lead.findMany({ select: { id: true, importName: true } })
        const matchedLeadIds = allLeads
          .filter(l => {
            if (!l.importName) return false
            const dbClean = l.importName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
            return dbClean === cleanBatch || dbClean.includes(cleanBatch) || cleanBatch.includes(dbClean)
          })
          .map(l => l.id)

        if (matchedLeadIds.length > 0) {
          await prisma.leadAssignment.deleteMany({ where: { leadId: { in: matchedLeadIds } } }).catch(() => {})
          await prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: matchedLeadIds } } }).catch(() => {})
          await prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: matchedLeadIds } } }).catch(() => {})
          await prisma.call.deleteMany({ where: { leadId: { in: matchedLeadIds } } }).catch(() => {})
          await prisma.followUp.deleteMany({ where: { leadId: { in: matchedLeadIds } } }).catch(() => {})
          await prisma.activityLog.deleteMany({ where: { entityId: { in: matchedLeadIds } } }).catch(() => {})

          const deleteResult = await prisma.lead.deleteMany({
            where: { id: { in: matchedLeadIds } }
          })
          deletedLeadsCount = deleteResult.count
        }
      }
    }

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (err: any) {
        console.warn('[sheets DELETE] Failed to unlink file:', err)
      }
    }

    return NextResponse.json({
      success: true,
      fileName: safeFileName,
      deletedLeadsCount,
      message: `Spreadsheet "${safeFileName}" and ${deletedLeadsCount} associated record(s) deleted successfully.`
    })
  } catch (err: any) {
    console.error('[sheets DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete spreadsheet' }, { status: 500 })
  }
}
