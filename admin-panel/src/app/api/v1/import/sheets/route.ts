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

async function syncSpreadsheetForBatch(batchName: string | null, uploadDir: string) {
  const isAll = batchName === 'all_leads'
  const isDirect = batchName === null || batchName === '' || batchName === 'direct_entry'
  
  const whereClause: any = { status: { not: 'Trashed' } }
  if (!isAll) {
    if (isDirect) {
      whereClause.importName = null
    } else {
      whereClause.importName = batchName
    }
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: { assignee: true },
    orderBy: { createdAt: 'desc' }
  })

  if (leads.length === 0) return null

  // Collect all unique custom fields keys across leads in this batch
  const customKeys = new Set<string>()
  leads.forEach(l => {
    if (l.customFields && typeof l.customFields === 'object') {
      Object.keys(l.customFields).forEach(k => {
        if (k !== 'importFilePath') customKeys.add(k)
      })
    }
  })

  const standardHeaders = [
    'Client Name',
    'Phone Number',
    'Mo No. 2',
    'REG NO / Vehicle No',
    'Policy Expiry Date',
    'Registration Date',
    'GVW',
    'City',
    'Address',
    'Agent',
    'Lead Status',
    'Assigned To',
    'Import Batch'
  ]

  const customKeyList = Array.from(customKeys).filter(k => !['phone2', 'mobile2'].includes(k))
  const allHeaders = [...standardHeaders, ...customKeyList]
  const rows: any[][] = [allHeaders]

  leads.forEach(l => {
    const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
    const phone2 = cf.phone2 || cf.mobile2 || (l.clientEmail && /^[0-9\s+-]{7,15}$/.test(l.clientEmail.trim()) ? l.clientEmail : '')

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
      l.existingAgent === 'Agent' ? 'agent' : (l.existingAgent || ''),
      l.status || 'New',
      l.assignee?.fullName || 'Unassigned',
      l.importName || 'Direct Entry'
    ]

    customKeyList.forEach(k => {
      row.push(cf[k] !== undefined && cf[k] !== null ? String(cf[k]) : '')
    })

    rows.push(row)
  })

  const cleanBatchName = isAll ? 'all_leads' : isDirect ? 'direct_entry' : String(batchName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `import_${cleanBatchName}.xlsx`
  const fullPath = path.join(uploadDir, fileName)

  try {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    
    try {
      XLSX.writeFile(wb, fullPath)
    } catch (writeErr: any) {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const tempPath = `${fullPath}.tmp`
      fs.writeFileSync(tempPath, buf)
      try {
        fs.renameSync(tempPath, fullPath)
      } catch {}
    }
  } catch (err) {
    console.warn(`[syncSpreadsheetForBatch] Skipped updating locked file ${fileName}:`, err)
  }

  return {
    fileName,
    totalRows: leads.length,
    agentCount: leads.filter(l => l.existingAgent === 'Agent').length
  }
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
