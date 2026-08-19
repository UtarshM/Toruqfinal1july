import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

function formatDate(date: any): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

import { syncSpreadsheetForBatch } from '@/lib/spreadsheet-sync'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Spreadsheets are only accessible to Admins' }, { status: 403 })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Clean up outdated 2-row demo file if it has no matching DB batch
    const demo1Path = path.join(uploadDir, 'import_demo-1.xlsx')
    const demo1LeadsCount = await prisma.lead.count({ where: { importName: 'demo-1' } })
    if (demo1LeadsCount === 0 && fs.existsSync(demo1Path)) {
      try { fs.unlinkSync(demo1Path) } catch {}
    }

    const shouldSync = req.nextUrl.searchParams.get('sync') === 'true'

    // 1. Fetch all distinct import batches from Lead database table
    const dbBatches = await prisma.lead.groupBy({
      by: ['importName'],
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true, updatedAt: true },
      where: {
        status: { not: 'Trashed' }
      }
    })

    // Synchronize spreadsheet files only if missing or explicitly requested via sync=true
    for (const batch of dbBatches) {
      const cleanBatchName = batch.importName ? String(batch.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'direct_entry'
      const targetFile = path.join(uploadDir, `import_${cleanBatchName}.xlsx`)
      if (shouldSync || !fs.existsSync(targetFile)) {
        await syncSpreadsheetForBatch(batch.importName, uploadDir)
      }
    }

    // Also generate a master "All Leads" spreadsheet if missing or sync requested
    const masterFile = path.join(uploadDir, 'import_all_leads.xlsx')
    if (shouldSync || !fs.existsSync(masterFile)) {
      const totalLeadsCount = await prisma.lead.count({ where: { status: { not: 'Trashed' } } })
      if (totalLeadsCount > 0) {
        await syncSpreadsheetForBatch('all_leads', uploadDir)
      }
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

    // 2. Read all spreadsheet files from server storage
    const fileNames = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'))

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

      // Extract batch name from filename
      let batchName = fileName
        .replace(/^import_/, '')
        .replace(/_\d+\.(xlsx|csv)$/, '')
        .replace(/\.(xlsx|csv)$/, '')
        .replace(/_/g, '-')

      if (batchName === 'all-leads') {
        batchName = 'All Active Leads (Master)'
      }

      const matchingDbBatch = dbBatches.find(b => {
        const cleanB = b.importName ? String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'direct_entry'
        return fileName === `import_${cleanB}.xlsx` || fileName.includes(cleanB)
      })

      const rawImportedAt = matchingDbBatch?._min?.createdAt || stat.birthtime || stat.mtime
      const importedDate = new Date(rawImportedAt)
      const importedAt = !isNaN(importedDate.getTime()) ? importedDate.toISOString() : new Date().toISOString()
      const updatedAt = matchingDbBatch?._max?.updatedAt || stat.mtime

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayOfWeek = !isNaN(importedDate.getTime()) ? days[importedDate.getDay()] : 'Unknown'
      const dateOnly = !isNaN(importedDate.getTime()) ? importedDate.toISOString().split('T')[0] : ''

      return {
        fileName,
        batchName,
        sizeBytes: stat.size,
        importedAt,
        updatedAt,
        dayOfWeek,
        dateOnly,
        totalRows,
        agentCount,
        headers,
        downloadUrl: `/uploads/imports/${fileName}`
      }
    })

    // Sort by newest imported first
    files.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())

    return NextResponse.json({ files, matchingLeads, matchingBatchNames })
  } catch (err: any) {
    console.error('[sheets] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.delete')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete spreadsheets' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const fileNames: string[] = body.fileNames || []
    const deleteLeads: boolean = body.deleteLeads !== false

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json({ error: 'No file names provided for deletion' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    let totalDeletedFiles = 0
    let totalDeletedLeads = 0

    for (const rawName of fileNames) {
      const safeFileName = path.basename(rawName)
      if (safeFileName === 'import_all_leads.xlsx') continue

      const filePath = path.join(uploadDir, safeFileName)

      // Extract batch name
      const batchName = safeFileName
        .replace(/^import_/, '')
        .replace(/_\d+\.(xlsx|csv)$/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads && batchName && batchName !== 'all_leads') {
        const leads = await prisma.lead.findMany({
          where: {
            OR: [
              { importName: batchName },
              { importName: batchName.replace(/_/g, '-') },
              { importName: batchName.replace(/-/g, '_') }
            ]
          },
          select: { id: true }
        })

        const leadIds = leads.map(l => l.id)
        if (leadIds.length > 0) {
          await prisma.leadAssignment.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
          await prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
          await prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
          await prisma.call.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
          await prisma.followUp.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
          await prisma.activityLog.deleteMany({ where: { entityId: { in: leadIds } } }).catch(() => {})

          const delResult = await prisma.lead.deleteMany({
            where: { id: { in: leadIds } }
          })
          totalDeletedLeads += delResult.count
        }
      }

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
          totalDeletedFiles++
        } catch (err: any) {
          console.warn('[sheets bulk DELETE] Failed to unlink file:', err)
        }
      }
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
