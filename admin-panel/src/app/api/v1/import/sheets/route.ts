import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { syncSpreadsheetForBatch, syncRenewalsSpreadsheet } from '@/lib/spreadsheet-sync'
import { getUploadDir } from '@/lib/upload-helper'
import { deleteLeadsWithCascade } from '@/lib/lead-delete-helper'

function toDateOnlyIST(date: any): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Spreadsheets are only accessible to Admins' }, { status: 403 })
  }

  try {
    const uploadDir = getUploadDir()
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'

    // Clean up empty renewals sheet if 0 renewals exist
    const totalRenewals = await prisma.renewalRecord.count()
    const renewalsFile = path.join(uploadDir, 'import_renewals.xlsx')
    if (totalRenewals === 0 && fs.existsSync(renewalsFile)) {
      try { fs.unlinkSync(renewalsFile) } catch {}
    }

    // 1. Fetch all distinct active import batches from database
    const dbBatches = await prisma.lead.groupBy({
      by: ['importName'],
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true, updatedAt: true },
      where: {
        status: { not: 'Trashed' },
        deletedAt: null
      }
    })

    // Always synchronize the consolidated leads spreadsheet
    await syncSpreadsheetForBatch('leads', uploadDir).catch(e => console.warn('[sheets] leads sync warning:', e))

    // Always regenerate "Policy Renewals" if renewals exist to guarantee 100% fresh live data
    if (totalRenewals > 0) {
      await syncRenewalsSpreadsheet(uploadDir).catch(() => {})
    }

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

    // 2. Build list of sheets from DB batches + master files
    const totalActiveLeads = await prisma.lead.count({
      where: { status: { not: 'Trashed' }, deletedAt: null }
    })

    const files: any[] = []

    // A. Master Renewals Sheet
    if (totalRenewals > 0) {
      files.push({
        fileName: 'import_renewals.xlsx',
        displayName: 'Policy Renewals (Master)',
        batchName: 'Policy Renewals (Master)',
        sizeBytes: 0,
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dayOfWeek: 'Today',
        dateOnly: toDateOnlyIST(new Date()),
        totalRows: totalRenewals,
        agentCount: 0,
        headers: ['Client Name', 'Phone Number', 'Vehicle No', 'Policy Number', 'Provider / Insurer'],
        downloadUrl: '/api/v1/import/sheets/download?file=import_renewals.xlsx'
      })
    }

    // B. Master Leads Sheet (Consolidated)
    if (totalActiveLeads > 0) {
      const minDate = dbBatches.reduce((min, b) => {
        const d = b._min?.createdAt ? new Date(b._min.createdAt) : null
        return d && (!min || d < min) ? d : min
      }, null as Date | null) || new Date()

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      files.push({
        fileName: 'import_leads.xlsx',
        displayName: 'Imported Leads (Master)',
        batchName: 'Imported Leads (Master)',
        sizeBytes: 0,
        importedAt: minDate.toISOString(),
        updatedAt: new Date().toISOString(),
        dayOfWeek: days[minDate.getDay()] || 'Today',
        dateOnly: toDateOnlyIST(minDate),
        totalRows: totalActiveLeads,
        agentCount: 0,
        headers: ['Client Name', 'Phone Number', 'REG NO / Vehicle No', 'Policy Expiry Date', 'Lead Status'],
        downloadUrl: '/api/v1/import/sheets/download?file=import_leads.xlsx'
      })
    }

    // C. Individual Import Batches from Database
    for (const batch of dbBatches) {
      if (batch._count._all === 0) continue

      const rawImportName = batch.importName
      const isNullBatch = !rawImportName
      const isMasterLeads = rawImportName === 'leads' || rawImportName === 'all_leads'
      if (isMasterLeads) continue

      const cleanBatch = isNullBatch ? 'direct_entry' : String(rawImportName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `import_${cleanBatch}.xlsx`
      const displayName = isNullBatch ? 'Direct Entry / Initial Uploads' : String(rawImportName).trim()
      const batchName = isNullBatch ? 'Direct Entry' : String(rawImportName).trim()

      const batchDate = batch._min?.createdAt ? new Date(batch._min.createdAt) : new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

      files.push({
        fileName,
        displayName: displayName.endsWith('.xlsx') || displayName.endsWith('.csv') ? displayName : `${displayName}.xlsx`,
        batchName,
        sizeBytes: 0,
        importedAt: batchDate.toISOString(),
        updatedAt: (batch._max?.updatedAt ? new Date(batch._max.updatedAt) : batchDate).toISOString(),
        dayOfWeek: days[batchDate.getDay()] || 'Today',
        dateOnly: toDateOnlyIST(batchDate),
        totalRows: batch._count._all,
        agentCount: 0,
        headers: ['Client Name', 'Phone Number', 'REG NO / Vehicle No', 'Policy Expiry Date', 'Lead Status'],
        downloadUrl: `/api/v1/import/sheets/download?file=${fileName}`
      })
    }

    // Sort: Renewals first, Master Leads second, then newest batches first
    files.sort((a, b) => {
      if (a.fileName === 'import_renewals.xlsx') return -1
      if (b.fileName === 'import_renewals.xlsx') return 1
      if (a.fileName === 'import_leads.xlsx') return -1
      if (b.fileName === 'import_leads.xlsx') return 1
      return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
    })

    return NextResponse.json({ files, matchingLeads, matchingBatchNames })
  } catch (err: any) {
    console.error('[sheets] Error:', err)
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

    for (const rawName of fileNames) {
      const safeFileName = path.basename(rawName)
      const filePath = path.join(uploadDir, safeFileName)

      const batchName = safeFileName
        .replace(/^import_/, '')
        .replace(/_\d+\.(xlsx|csv)$/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads) {
        if (safeFileName === 'import_renewals.xlsx' || batchName === 'renewals') {
          const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
          totalDeletedLeads += delRenewals.count
        } else if (safeFileName === 'import_leads.xlsx' || batchName === 'leads' || batchName === 'all_leads') {
          // Master sheet deletion: purge all leads
          const allLeads = await prisma.lead.findMany({ select: { id: true } })
          if (allLeads.length > 0) {
            const count = await deleteLeadsWithCascade(allLeads.map(l => l.id))
            totalDeletedLeads += count
          }
        } else if (safeFileName === 'import_direct_entry.xlsx' || batchName === 'direct_entry') {
          const nullLeads = await prisma.lead.findMany({
            where: { importName: null },
            select: { id: true }
          })
          if (nullLeads.length > 0) {
            const count = await deleteLeadsWithCascade(nullLeads.map(l => l.id))
            totalDeletedLeads += count
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
            const count = await deleteLeadsWithCascade(targetIds)
            totalDeletedLeads += count
          }
        }
      }

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
          totalDeletedFiles++
        } catch (err: any) {
          console.warn('[sheets DELETE] Failed to unlink file:', err)
        }
      } else {
        totalDeletedFiles++
      }
    }

    return NextResponse.json({
      success: true,
      deletedFilesCount: totalDeletedFiles,
      deletedLeadsCount: totalDeletedLeads,
      message: `${totalDeletedFiles} spreadsheet(s) deleted successfully.${totalDeletedLeads > 0 ? ` (${totalDeletedLeads} leads permanently deleted)` : ''}`
    })
  } catch (err: any) {
    console.error('[sheets bulk DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Bulk deletion failed' }, { status: 500 })
  }
}
