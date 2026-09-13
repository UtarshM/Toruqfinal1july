import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { getUploadDir } from '@/lib/upload-helper'

const STANDARD_HEADERS = [
  'Client Name',
  'Phone Number',
  'REG NO / Vehicle No',
  'Policy Expiry Date',
  'Lead Status',
  'Assigned To',
  'Import Batch',
  'Mo No. 2',
  'Registration Date',
  'GVW',
  'City',
  'Address'
]

const RENEWAL_HEADERS = [
  'Client Name',
  'Phone Number',
  'Vehicle No',
  'Policy Number',
  'Provider / Insurer',
  'Policy Type',
  'Premium Amount',
  'Policy Expiry Date',
  'Policy Start Date',
  'Renewal Status',
  'Sales Person',
  'Policy PDF',
  'Assigned To',
  'Assigned Month',
  'Assigned Year',
  'Renewed Date',
  'Refused Date',
  'Created At'
]

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Spreadsheets are only accessible to Admins' }, { status: 403 })
  }

  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // 1. Concurrently fetch aggregate statistics directly from DB (instant, no timeouts)
    const [dbBatches, agentBatches, totalRenewals, totalActiveLeads, totalActiveAgents] = await Promise.all([
      prisma.lead.groupBy({
        by: ['importName'],
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true, updatedAt: true },
        where: {
          status: { not: 'Trashed' },
          deletedAt: null
        }
      }),
      prisma.lead.groupBy({
        by: ['importName'],
        _count: { _all: true },
        where: {
          status: { not: 'Trashed' },
          deletedAt: null,
          existingAgent: 'Agent'
        }
      }),
      prisma.renewalRecord.count(),
      prisma.lead.count({
        where: {
          status: { not: 'Trashed' },
          deletedAt: null
        }
      }),
      prisma.lead.count({
        where: {
          status: { not: 'Trashed' },
          deletedAt: null,
          existingAgent: 'Agent'
        }
      })
    ])

    const agentCountMap = new Map<string | null, number>()
    agentBatches.forEach(b => {
      agentCountMap.set(b.importName, b._count._all)
    })

    // 2. Handle Lead Search across batches if requested
    const leadSearch = req.nextUrl.searchParams.get('leadSearch')?.trim()
    let matchingLeads: any[] = []
    let matchingBatchNames: string[] = []

    if (leadSearch) {
      const leads = await prisma.lead.findMany({
        where: {
          status: { not: 'Trashed' },
          deletedAt: null,
          OR: [
            { clientName: { contains: leadSearch, mode: 'insensitive' } },
            { clientPhone: { contains: leadSearch, mode: 'insensitive' } },
            { vehicleNo: { contains: leadSearch, mode: 'insensitive' } },
            { city: { contains: leadSearch, mode: 'insensitive' } },
            { importName: { contains: leadSearch, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          vehicleNo: true,
          city: true,
          status: true,
          importName: true,
          existingAgent: true,
          createdAt: true,
          expiryDate: true
        },
        take: 100,
        orderBy: { createdAt: 'desc' }
      })

      matchingLeads = leads
      matchingBatchNames = [...new Set(leads.map(l => l.importName || 'direct_entry'))]
    }

    // 3. Build virtual and real spreadsheet files directly from DB batches
    const files: any[] = []

    // A. Add Master Consolidated Leads Sheet
    if (totalActiveLeads > 0) {
      const now = new Date()
      files.push({
        fileName: 'import_leads.xlsx',
        displayName: 'Imported Leads (Master).xlsx',
        batchName: 'Imported Leads (Master)',
        sizeBytes: totalActiveLeads * 140,
        importedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dayOfWeek: days[now.getDay()] || 'Today',
        dateOnly: now.toISOString().split('T')[0],
        totalRows: totalActiveLeads,
        agentCount: totalActiveAgents,
        headers: STANDARD_HEADERS,
        downloadUrl: `/api/v1/import/sheets/download?file=import_leads.xlsx`
      })
    }

    // B. Add Policy Renewals Master Sheet
    if (totalRenewals > 0) {
      const now = new Date()
      files.push({
        fileName: 'import_renewals.xlsx',
        displayName: 'Policy Renewals.xlsx',
        batchName: 'Policy Renewals (Master)',
        sizeBytes: totalRenewals * 160,
        importedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dayOfWeek: days[now.getDay()] || 'Today',
        dateOnly: now.toISOString().split('T')[0],
        totalRows: totalRenewals,
        agentCount: 0,
        headers: RENEWAL_HEADERS,
        downloadUrl: `/api/v1/import/sheets/download?file=import_renewals.xlsx`
      })
    }

    // C. Add each distinct database batch (e.g., SAMPLE, Demo leads 1, etc.)
    for (const b of dbBatches) {
      const rawBatchName = b.importName || 'Direct Entry'
      const isDirect = !b.importName || b.importName.toLowerCase() === 'direct_entry'
      const cleanBatch = isDirect ? 'direct_entry' : rawBatchName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `import_${cleanBatch}.xlsx`
      const displayName = `${rawBatchName}.xlsx`

      const rawCreated = b._min.createdAt || new Date()
      const importedDate = new Date(rawCreated)
      const updatedAt = b._max.updatedAt || b._max.createdAt || importedDate
      const dayOfWeek = days[importedDate.getDay()] || 'Today'
      const dateOnly = !isNaN(importedDate.getTime()) ? importedDate.toISOString().split('T')[0] : ''

      const totalRows = b._count._all
      const agentCount = agentCountMap.get(b.importName) || 0

      files.push({
        fileName,
        displayName,
        batchName: rawBatchName,
        sizeBytes: totalRows * 128,
        importedAt: importedDate.toISOString(),
        updatedAt: new Date(updatedAt).toISOString(),
        dayOfWeek,
        dateOnly,
        totalRows,
        agentCount,
        headers: STANDARD_HEADERS,
        downloadUrl: `/api/v1/import/sheets/download?file=${fileName}`
      })
    }

    // Sort: Master renewals first, master leads second, then newest imported batches
    files.sort((a, b) => {
      if (a.fileName === 'import_renewals.xlsx') return -1
      if (b.fileName === 'import_renewals.xlsx') return 1
      if (a.fileName === 'import_leads.xlsx') return -1
      if (b.fileName === 'import_leads.xlsx') return 1
      return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
    })

    return NextResponse.json({ files, matchingLeads, matchingBatchNames })
  } catch (err: any) {
    console.error('[sheets GET] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete spreadsheets' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const fileNames: string[] = body.fileNames || (body.fileName ? [body.fileName] : [])
    const deleteLeads: boolean = body.deleteLeads !== false

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json({ error: 'No file names provided for deletion' }, { status: 400 })
    }

    const uploadDir = getUploadDir()
    let totalDeletedFiles = 0
    let totalDeletedLeads = 0

    // Fetch existing batches from DB to match actual importName precisely
    const dbBatches = await prisma.lead.groupBy({
      by: ['importName']
    })

    for (const rawName of fileNames) {
      const safeFileName = path.basename(String(rawName).trim())
      const filePath = path.join(uploadDir, safeFileName)

      const batchSlug = safeFileName
        .replace(/^import_/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads) {
        if (safeFileName === 'import_renewals.xlsx' || batchSlug === 'renewals') {
          const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
          totalDeletedLeads += delRenewals.count
        } else if (safeFileName === 'import_leads.xlsx' || batchSlug === 'leads' || batchSlug === 'all_leads') {
          // Master sheet delete: Soft-delete all leads to Trashed
          const softDelResult = await prisma.lead.updateMany({
            where: {
              status: { not: 'Trashed' },
              deletedAt: null
            },
            data: {
              status: 'Trashed',
              deletedAt: new Date(),
              deletedBy: context.userId
            }
          })
          totalDeletedLeads += softDelResult.count
        } else {
          // Find matching importName from DB
          let targetImportName: string | null = batchSlug
          let isDirectEntry = batchSlug === 'direct_entry'

          const matchedBatch = dbBatches.find(b => {
            if (!b.importName) return false
            const clean = String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
            return clean === batchSlug || b.importName === batchSlug || b.importName.toLowerCase() === batchSlug.toLowerCase()
          })

          if (matchedBatch && matchedBatch.importName) {
            targetImportName = matchedBatch.importName
          }

          // Build SQL condition
          const leadWhere = isDirectEntry
            ? { importName: null, status: { not: 'Trashed' }, deletedAt: null }
            : { importName: targetImportName, status: { not: 'Trashed' }, deletedAt: null }

          // Fetch leads in this batch to cleanly decouple foreign relations
          const batchLeads = await prisma.lead.findMany({
            where: leadWhere,
            select: { id: true }
          })
          const batchLeadIds = batchLeads.map(l => l.id)

          if (batchLeadIds.length > 0) {
            // Process in chunks of 500 to guarantee no parameter limit errors
            const chunkSize = 500
            for (let i = 0; i < batchLeadIds.length; i += chunkSize) {
              const chunk = batchLeadIds.slice(i, i + chunkSize)

              // 1. Decouple relations that reference Lead
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

              // 2. Delete dependent activity and logging tables
              await Promise.allSettled([
                prisma.leadAssignment.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.call.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.followUp.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.activityLog.deleteMany({ where: { entityId: { in: chunk } } })
              ])

              // 3. Delete leads
              const delResult = await prisma.lead.deleteMany({
                where: { id: { in: chunk } }
              }).catch(async () => {
                // Fallback soft-delete if foreign key constraint still complains
                return await prisma.lead.updateMany({
                  where: { id: { in: chunk } },
                  data: { status: 'Trashed', deletedAt: new Date(), deletedBy: context.userId }
                })
              })

              totalDeletedLeads += delResult.count
            }
          }
        }
      }

      // Remove physical file from disk if present
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (unlinkErr) {
        console.warn('[sheets DELETE] Failed to unlink file:', unlinkErr)
      }
      totalDeletedFiles++
    }

    return NextResponse.json({
      success: true,
      deletedFilesCount: totalDeletedFiles,
      deletedLeadsCount: totalDeletedLeads,
      message: `${totalDeletedFiles} spreadsheet(s) and ${totalDeletedLeads} associated lead(s) deleted successfully.`
    })
  } catch (err: any) {
    console.error('[sheets bulk DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Bulk deletion failed' }, { status: 500 })
  }
}
