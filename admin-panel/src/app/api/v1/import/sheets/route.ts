import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import { syncSpreadsheetForBatch, syncRenewalsSpreadsheet } from '@/lib/spreadsheet-sync'
import { getUploadDir } from '@/lib/upload-helper'

function formatDate(date: any): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
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

    // 2. Read only the master files from server storage
    const fileNames = ['import_leads.xlsx']
    if (totalRenewals > 0) {
      fileNames.push('import_renewals.xlsx')
    }

    const files = fileNames.map(fileName => {
      const filePath = path.join(uploadDir, fileName)
      const stat = fs.statSync(filePath)

      let totalRows = 0
      let agentCount = 0
      let headers: string[] = []

      try {
        const fileBuffer = fs.readFileSync(filePath)
        const wb = XLSX.read(fileBuffer, { type: 'buffer' })
        const sheetName = wb.SheetNames[0]
        if (sheetName) {
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
          if (rows.length > 0) {
            headers = rows[0].map(h => String(h || ''))
            totalRows = Math.max(0, rows.length - 1)

            const agentColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'agent')
            if (agentColIdx !== -1) {
              for (let i = 1; i < rows.length; i++) {
                const val = String(rows[i]?.[agentColIdx] || '').toLowerCase().trim()
                if (val === 'agent') agentCount++
              }
            }
          }
        }
      } catch (err) {
        console.error(`[sheets] Error reading file ${fileName}:`, err)
      }

      // Clean display name without synthetic "import_" prefix
      const displayName = fileName
        .replace(/^import_/, '')
        .replace(/\.(xlsx|csv)$/, '')
        .replace(/_/g, ' ')
        + path.extname(fileName)

      // Friendly batch name
      let batchName = fileName
        .replace(/^import_/, '')
        .replace(/\.(xlsx|csv)$/, '')
        .replace(/_/g, ' ')

      if (fileName === 'import_renewals.xlsx') {
        batchName = 'Policy Renewals (Master)'
      } else if (fileName === 'import_leads.xlsx') {
        batchName = 'Imported Leads (Master)'
      }

      const matchingDbBatch = dbBatches.find(b => {
        if (fileName === 'import_leads.xlsx') return true
        const cleanB = b.importName ? String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'direct_entry'
        return fileName === `import_${cleanB}.xlsx` || fileName.includes(cleanB)
      })

      // Robust date calculation (never 1970)
      let rawImportedAt = matchingDbBatch?._min?.createdAt || stat.birthtime || stat.mtime
      let importedDate = new Date(rawImportedAt)
      if (isNaN(importedDate.getTime()) || importedDate.getTime() < 946684800000) { // before year 2000
        importedDate = stat.mtime && stat.mtime.getTime() > 946684800000 ? stat.mtime : new Date()
      }
      const importedAt = importedDate.toISOString()
      const updatedAt = matchingDbBatch?._max?.updatedAt || stat.mtime || importedDate

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayOfWeek = days[importedDate.getDay()] || 'Today'
      const dateOnly = importedDate.toISOString().split('T')[0]

      return {
        fileName,
        displayName,
        batchName,
        sizeBytes: stat.size,
        importedAt,
        updatedAt: new Date(updatedAt).toISOString(),
        dayOfWeek,
        dateOnly,
        totalRows,
        agentCount,
        headers,
        downloadUrl: `/api/v1/import/sheets/download?file=${fileName}`
      }
    })

    // Filter out 0-row empty master sheets from display
    const nonDummyFiles = files.filter(f => {
      if (f.fileName === 'import_renewals.xlsx' && f.totalRows === 0) return false
      return true
    })

    // Sort by newest imported first
    nonDummyFiles.sort((a, b) => {
      if (a.fileName === 'import_renewals.xlsx') return -1
      if (b.fileName === 'import_renewals.xlsx') return 1
      return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
    })

    return NextResponse.json({ files: nonDummyFiles, matchingLeads, matchingBatchNames })
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

    const allLeads = deleteLeads ? await prisma.lead.findMany({ select: { id: true, importName: true } }) : []

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
        } else {
          const cleanBatch = batchName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
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

            const delResult = await prisma.lead.deleteMany({
              where: { id: { in: matchedLeadIds } }
            })
            totalDeletedLeads += delResult.count
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
      message: `${totalDeletedFiles} spreadsheet(s) deleted successfully.`
    })
  } catch (err: any) {
    console.error('[sheets bulk DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Bulk deletion failed' }, { status: 500 })
  }
}
