import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
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
    const batchSlug = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    const url = new URL(req.url)
    const pageParam = url.searchParams.get('page')
    const limitParam = url.searchParams.get('limit')
    const searchParam = url.searchParams.get('search')?.toLowerCase().trim() || ''

    const page = Math.max(1, parseInt(pageParam || '1') || 1)
    // Cap limit at 200 to guarantee fast sub-100ms response time
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

    if (batchSlug === 'renewals') {
      const renewalWhere: any = {}
      if (searchParam) {
        renewalWhere.OR = [
          { clientName: { contains: searchParam, mode: 'insensitive' } },
          { clientPhone: { contains: searchParam, mode: 'insensitive' } },
          { vehicleNo: { contains: searchParam, mode: 'insensitive' } },
          { policyNumber: { contains: searchParam, mode: 'insensitive' } },
          { provider: { contains: searchParam, mode: 'insensitive' } }
        ]
      }

      const [totalRows, renewals] = await Promise.all([
        prisma.renewalRecord.count({ where: renewalWhere }),
        prisma.renewalRecord.findMany({
          where: renewalWhere,
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
          orderBy: { policyEndDate: 'asc' },
          skip: (page - 1) * limit,
          take: limit
        })
      ])

      const headers = [
        'Client Name', 'Phone Number', 'Vehicle No', 'Policy Number', 'Provider / Insurer',
        'Policy Type', 'Premium Amount', 'Policy Expiry Date', 'Policy Start Date',
        'Renewal Status', 'Sales Person', 'Policy PDF', 'Assigned To', 'Assigned Month',
        'Assigned Year', 'Renewed Date', 'Refused Date', 'Created At'
      ]

      const dataRows = renewals.map(r => {
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

      return NextResponse.json({
        fileName: safeFileName,
        downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
        headers,
        rows: dataRows,
        agentColIdx: -1,
        agentRowsCount: 0,
        totalRows,
        totalPages: Math.ceil(totalRows / limit) || 1,
        page,
        limit
      })
    }

    // Standard Leads Mode
    const whereClause: any = { status: { not: 'Trashed' }, deletedAt: null }

    if (batchSlug !== 'leads' && batchSlug !== 'all_leads' && batchSlug !== 'direct_entry') {
      const dbBatches = await prisma.lead.groupBy({
        by: ['importName'],
        where: { status: { not: 'Trashed' }, deletedAt: null }
      })
      let actualImportName = batchSlug
      for (const b of dbBatches) {
        if (!b.importName) continue
        const clean = String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
        if (clean === batchSlug || b.importName === batchSlug || b.importName.toLowerCase() === batchSlug.toLowerCase()) {
          actualImportName = b.importName
          whereClause.importName = actualImportName
          break
        }
      }
      if (!whereClause.importName) {
        whereClause.importName = actualImportName
      }
    } else if (batchSlug === 'direct_entry') {
      whereClause.importName = null
    }

    // Expiry Month and Year Filter
    const monthParam = url.searchParams.get('month')
    const yearParam = url.searchParams.get('year')
    if (monthParam && monthParam !== '0') {
      const m = parseInt(monthParam)
      const y = parseInt(yearParam || String(new Date().getFullYear()))
      
      const startDate = new Date(y, m - 1, 1)
      const endDate = new Date(y, m, 0, 23, 59, 59, 999)
      
      whereClause.expiryDate = {
        gte: startDate,
        lte: endDate
      }
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

    // Execute paginated queries in parallel
    const [totalRows, leadsList, agentRowsCount] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.findMany({
        where: whereClause,
        include: { assignee: { select: { fullName: true } } },
        orderBy: [
          { expiryDate: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.lead.count({
        where: {
          ...whereClause,
          existingAgent: 'Agent'
        }
      })
    ])

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
      agentColIdx,
      agentRowsCount,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
      page,
      limit
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

    const batchSlug = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    const deleteLeads = req.nextUrl.searchParams.get('deleteLeads') !== 'false'

    let deletedLeadsCount = 0
    if (deleteLeads) {
      if (safeFileName === 'import_renewals.xlsx' || batchSlug === 'renewals') {
        const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
        deletedLeadsCount = delRenewals.count
      } else if (safeFileName === 'import_leads.xlsx' || batchSlug === 'leads' || batchSlug === 'all_leads') {
        const softDel = await prisma.lead.updateMany({
          where: { status: { not: 'Trashed' }, deletedAt: null },
          data: { status: 'Trashed', deletedAt: new Date(), deletedBy: context.userId }
        })
        deletedLeadsCount = softDel.count
      } else {
        const dbBatches = await prisma.lead.groupBy({ by: ['importName'] })
        let targetImportName: string | null = batchSlug
        const isDirectEntry = batchSlug === 'direct_entry'

        const matchedBatch = dbBatches.find(b => {
          if (!b.importName) return false
          const clean = String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
          return clean === batchSlug || b.importName === batchSlug || b.importName.toLowerCase() === batchSlug.toLowerCase()
        })

        if (matchedBatch && matchedBatch.importName) {
          targetImportName = matchedBatch.importName
        }

        const leadWhere = isDirectEntry
          ? { importName: null, status: { not: 'Trashed' }, deletedAt: null }
          : { importName: targetImportName, status: { not: 'Trashed' }, deletedAt: null }

        const batchLeads = await prisma.lead.findMany({
          where: leadWhere,
          select: { id: true }
        })
        const batchLeadIds = batchLeads.map(l => l.id)

        if (batchLeadIds.length > 0) {
          const chunkSize = 500
          for (let i = 0; i < batchLeadIds.length; i += chunkSize) {
            const chunk = batchLeadIds.slice(i, i + chunkSize)

            await Promise.allSettled([
              prisma.policy.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.quotation.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.claim.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.customer.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.renewalRecord.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.fitnessWork.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.rTOWork.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.visit.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
              prisma.loan.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } })
            ])

            await Promise.allSettled([
              prisma.leadAssignment.deleteMany({ where: { leadId: { in: chunk } } }),
              prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: chunk } } }),
              prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: chunk } } }),
              prisma.call.deleteMany({ where: { leadId: { in: chunk } } }),
              prisma.followUp.deleteMany({ where: { leadId: { in: chunk } } }),
              prisma.activityLog.deleteMany({ where: { entityId: { in: chunk } } })
            ])

            const delResult = await prisma.lead.deleteMany({
              where: { id: { in: chunk } }
            }).catch(async () => {
              return await prisma.lead.updateMany({
                where: { id: { in: chunk } },
                data: { status: 'Trashed', deletedAt: new Date(), deletedBy: context.userId }
              })
            })

            deletedLeadsCount += delResult.count
          }
        }
      }
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch {}

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

    if (oldFileName === 'import_leads.xlsx' || oldFileName === 'import_renewals.xlsx') {
      return NextResponse.json({ error: 'Cannot rename master system spreadsheets' }, { status: 400 })
    }

    const oldBatchName = oldFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')
      .replace(/_/g, ' ')

    // 1. Update database leads importName field
    const updateResult = await prisma.lead.updateMany({
      where: {
        OR: [
          { importName: oldBatchName },
          { importName: { contains: oldBatchName, mode: 'insensitive' } }
        ]
      },
      data: { importName: trimmedNewName }
    })

    // 2. Rename file on disk if exists
    try {
      const uploadDir = getUploadDir()
      const oldFilePath = path.join(uploadDir, oldFileName)
      const cleanNewName = trimmedNewName.replace(/[^a-zA-Z0-9_-]/g, '_')
      const ext = path.extname(oldFileName) || '.xlsx'
      const newFileName = `import_${cleanNewName}${ext}`
      const newFilePath = path.join(uploadDir, newFileName)

      if (fs.existsSync(oldFilePath) && oldFilePath !== newFilePath) {
        fs.renameSync(oldFilePath, newFilePath)
      }
    } catch {}

    return NextResponse.json({
      success: true,
      oldFileName,
      newBatchName: trimmedNewName,
      updatedLeadsCount: updateResult.count,
      message: `Spreadsheet renamed successfully to "${trimmedNewName}". ${updateResult.count} leads updated.`
    })
  } catch (err: any) {
    console.error('[sheets PATCH] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to rename spreadsheet' }, { status: 500 })
  }
}
