import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { getUploadDir } from '@/lib/upload-helper'
import { deleteLeadsWithCascade } from '@/lib/lead-delete-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    const batchParam = url.searchParams.get('batch')?.trim() || ''
    const searchParam = url.searchParams.get('search')?.toLowerCase().trim() || ''

    const shouldPaginate = Boolean(pageParam)
    const page = Math.max(1, parseInt(pageParam || '1') || 1)
    const limit = Math.min(200, Math.max(10, parseInt(limitParam || '100') || 100))

    const formatDate = (date: any) => {
      if (!date) return '—'
      try {
        const d = new Date(date)
        if (isNaN(d.getTime())) return '—'
        let ms = d.getTime()
        const utcHours = d.getUTCHours()
        const utcMinutes = d.getUTCMinutes()
        if (utcHours === 18 && utcMinutes >= 28 && utcMinutes <= 30) {
          ms += (30 - utcMinutes) * 60 * 1000 + 1000
        }
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(new Date(ms))
      } catch {
        return '—'
      }
    }

    if (batchName === 'renewals') {
      const [totalCount, renewals] = await Promise.all([
        prisma.renewalRecord.count(),
        prisma.renewalRecord.findMany({
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            vehicleNo: true,
            policyNumber: true,
            provider: true,
            policyType: true,
            premiumAmount: true,
            policyEndDate: true,
            policyStartDate: true,
            renewalStatus: true,
            documents: true,
            assignedMonth: true,
            assignedYear: true,
            renewedAt: true,
            refusedAt: true,
            createdAt: true,
            assignee: { select: { fullName: true } },
            createdBy: { select: { fullName: true } },
            lead: {
              select: {
                assignee: { select: { fullName: true } },
                customFields: true
              }
            },
            policy: {
              select: {
                policyNumber: true,
                provider: true,
                type: true
              }
            }
          },
          orderBy: { policyEndDate: 'asc' },
          take: shouldPaginate ? limit : Math.min(parseInt(limitParam || '3000'), 5000),
          skip: shouldPaginate ? (page - 1) * limit : 0
        })
      ])

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

      return NextResponse.json({
        fileName: safeFileName,
        downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
        headers,
        rows: dataRows,
        agentColIdx: -1,
        agentRowsCount: 0,
        totalRows: totalCount,
        totalPages: shouldPaginate ? Math.ceil(totalCount / limit) : 1,
        page: shouldPaginate ? page : 1,
        limit: shouldPaginate ? limit : totalCount
      })
    }

    // Default leads mode
    const whereClause: any = { status: { not: 'Trashed' }, deletedAt: null }
    
    if (batchParam) {
      if (batchParam === 'direct_entry' || batchParam === 'Direct Entry') {
        whereClause.importName = null
      } else if (batchParam !== 'leads' && batchParam !== 'all_leads' && batchParam !== 'Imported Leads (Master)') {
        whereClause.importName = batchParam
      }
    } else if (batchName !== 'leads' && batchName !== 'all_leads' && batchName !== 'direct_entry') {
      whereClause.importName = batchName
    } else if (batchName === 'direct_entry') {
      whereClause.importName = null
    }

    // Expiry Month and Year Filter
    const monthParam = url.searchParams.get('month')
    const yearParam = url.searchParams.get('year')
    const m = monthParam ? parseInt(monthParam) : 0
    const y = yearParam ? parseInt(yearParam) : 0

    if (y > 0) {
      if (m > 0) {
        const startDate = new Date(y, m - 1, 1)
        const endDate = new Date(y, m, 0, 23, 59, 59, 999)
        whereClause.expiryDate = { gte: startDate, lte: endDate }
      } else {
        const startDate = new Date(y, 0, 1)
        const endDate = new Date(y, 11, 31, 23, 59, 59, 999)
        whereClause.expiryDate = { gte: startDate, lte: endDate }
      }
    } else if (m > 0) {
      // Default to current year if only month is specified
      const curYear = new Date().getFullYear()
      const startDate = new Date(curYear, m - 1, 1)
      const endDate = new Date(curYear, m, 0, 23, 59, 59, 999)
      whereClause.expiryDate = { gte: startDate, lte: endDate }
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

    const previewLimit = Math.min(parseInt(limitParam || '100'), 200)
    const [count, leads, agentRowsCount] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.findMany({
        where: whereClause,
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          clientEmail: true,
          vehicleNo: true,
          expiryDate: true,
          status: true,
          importName: true,
          registrationDate: true,
          gvw: true,
          city: true,
          address: true,
          customFields: true,
          existingAgent: true,
          assignee: { select: { fullName: true } }
        },
        orderBy: [
          { expiryDate: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: shouldPaginate ? (page - 1) * limit : 0,
        take: previewLimit
      }),
      prisma.lead.count({
        where: {
          ...whereClause,
          existingAgent: 'Agent'
        }
      }).catch(() => 0)
    ])

    const totalRows = count
    const leadsList = leads

    const standardHeaders = [
      'Client Name', 'Phone Number', 'REG NO / Vehicle No', 'Policy Expiry Date',
      'Lead Status', 'Assigned To', 'Import Batch', 'Mo No. 2', 'Registration Date', 'GVW', 'City', 'Address'
    ]

    const customKeys = new Set<string>()
    const excludedKeys = [
      'phone2', 'mobile2', 'phone', 'contact', 'clientname', 'client name', 'client_name',
      'clientphone', 'client phone', 'client_phone', 'clientemail', 'client email', 'client_email',
      'email', 'vehicle no', 'vehicle_no', 'vehicleno', 'reg no', 'reg_no', 'regno', 'vehicle number', 'vehiclenumber',
      'policy expiry date', 'expirydate', 'expiry date', 'insurance validity', 'insurance_validity', 'insurancevalidity', 'expiry_date',
      'registration date', 'registrationdate', 'registration_date', 'gvw', 'gvw (in kg)', 'gvw(in kg)', 'gvw_in_kg',
      'city', 'address', 'status', 'lead status', 'lead_status', 'assigned to', 'assigned_to', 'assignedto',
      'import batch', 'import_batch', 'importbatch', 'import name', 'import_name', 'importname',
      'agent', 'existingagent', 'isagent', 'agent number', 'agent no', 'agentname', 'agent name', 'agent_name', 'agent_no'
    ]
    leadsList.forEach(l => {
      const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
      Object.keys(cf).forEach(k => {
        const cleanK = k.toLowerCase().trim()
        if (!excludedKeys.includes(cleanK)) {
          customKeys.add(k)
        }
      })
    })
    const customKeyList = Array.from(customKeys)
    const headers = [...standardHeaders, ...customKeyList]

    const rows = leadsList.map((l) => {
      const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
      const phone2 = cf.phone2 || cf.mobile2 || cf['mo no 2'] || cf['Mo No 2'] || (l.clientEmail && /^[0-9\s+-]{7,15}$/.test(l.clientEmail.trim()) ? l.clientEmail : '')
      const subStatus = cf.policySubmission?.status
      const isInReviewOrWon = subStatus === 'Pending_Review' || subStatus === 'Approved' || subStatus === 'Reverted' || l.status === 'Won'
      const isAgentLead = !isInReviewOrWon && (l.existingAgent === 'Agent' || (l.existingAgent && String(l.existingAgent).toLowerCase().includes('agent')))

      const cleanPhone = l.clientPhone || ''
      const phoneVal = cleanPhone ? (isAgentLead ? `${cleanPhone} [Agent]` : cleanPhone) : ''

      const row = [
        l.clientName || '',
        phoneVal,
        l.vehicleNo || '',
        formatDate(l.expiryDate),
        l.status || 'New',
        l.assignee?.fullName || (isAgentLead ? 'Pending Admin Approval' : 'Unassigned'),
        l.importName || 'Direct Entry',
        phone2 || '',
        formatDate(l.registrationDate),
        l.gvw || '',
        l.city || '',
        l.address || ''
      ]

      customKeyList.forEach(k => {
        row.push(cf[k] !== undefined && cf[k] !== null ? String(cf[k]) : '')
      })

      return row
    })

    const agentColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'agent')

    return NextResponse.json({
      fileName: safeFileName,
      downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
      headers,
      rows,
      leadIds: leadsList.map(l => l.id),
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
    if (deleteLeads && batchName) {
      if (safeFileName === 'import_renewals.xlsx' || batchName === 'renewals') {
        const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
        deletedLeadsCount = delRenewals.count
      } else if (safeFileName === 'import_leads.xlsx' || batchName === 'leads' || batchName === 'all_leads') {
        const allLeads = await prisma.lead.findMany({ select: { id: true } })
        if (allLeads.length > 0) {
          deletedLeadsCount = await deleteLeadsWithCascade(allLeads.map(l => l.id))
        }
      } else if (safeFileName === 'import_direct_entry.xlsx' || batchName === 'direct_entry') {
        const nullLeads = await prisma.lead.findMany({
          where: { importName: null },
          select: { id: true }
        })
        if (nullLeads.length > 0) {
          deletedLeadsCount = await deleteLeadsWithCascade(nullLeads.map(l => l.id))
        }
      } else {
        const cleanBatch = batchName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const matchedLeads = await prisma.lead.findMany({
          where: {
            OR: [
              { importName: batchName },
              { importName: { contains: batchName, mode: 'insensitive' } },
              { importName: { contains: cleanBatch, mode: 'insensitive' } }
            ]
          },
          select: { id: true }
        })

        let targetIds = matchedLeads.map(l => l.id)

        if (targetIds.length === 0) {
          const allImportLeads = await prisma.lead.findMany({
            where: { importName: { not: null } },
            select: { id: true, importName: true }
          })
          targetIds = allImportLeads
            .filter(l => {
              const dbClean = (l.importName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
              return dbClean === cleanBatch || dbClean.includes(cleanBatch) || cleanBatch.includes(dbClean)
            })
            .map(l => l.id)
        }

        if (targetIds.length > 0) {
          deletedLeadsCount = await deleteLeadsWithCascade(targetIds)
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can rename spreadsheets' }, { status: 403 })
  }

  try {
    const { filename } = await params
    const oldFileName = path.basename(filename)
    const body = await req.json()
    const { newBatchName } = body

    if (!newBatchName || typeof newBatchName !== 'string' || !newBatchName.trim()) {
      return NextResponse.json({ error: 'New batch name is required' }, { status: 400 })
    }

    const trimmedNewName = newBatchName.trim()
    const uploadDir = getUploadDir()
    const oldFilePath = path.join(uploadDir, oldFileName)

    // Cannot rename master files
    if (oldFileName === 'import_leads.xlsx' || oldFileName === 'import_renewals.xlsx') {
      return NextResponse.json({ error: 'Cannot rename master system spreadsheets' }, { status: 400 })
    }

    if (!fs.existsSync(oldFilePath)) {
      return NextResponse.json({ error: 'Source spreadsheet file not found' }, { status: 404 })
    }

    // Extract old batch name
    const oldBatchName = oldFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')
      .replace(/_/g, ' ')

    const cleanNewName = trimmedNewName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const ext = path.extname(oldFileName)
    const newFileName = `import_${cleanNewName}${ext}`
    const newFilePath = path.join(uploadDir, newFileName)

    if (fs.existsSync(newFilePath) && oldFileName !== newFileName) {
      return NextResponse.json({ error: 'A spreadsheet with this name already exists' }, { status: 400 })
    }

    // 1. Update database leads importName field
    const updateResult = await prisma.lead.updateMany({
      where: { importName: oldBatchName },
      data: { importName: trimmedNewName }
    })

    // 2. Rename file on disk
    fs.renameSync(oldFilePath, newFilePath)

    return NextResponse.json({
      success: true,
      oldFileName,
      newFileName,
      oldBatchName,
      newBatchName: trimmedNewName,
      updatedLeadsCount: updateResult.count,
      message: `Spreadsheet renamed successfully to "${trimmedNewName}". ${updateResult.count} leads updated.`
    })
  } catch (err: any) {
    console.error('[sheets PATCH] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to rename spreadsheet' }, { status: 500 })
  }
}
