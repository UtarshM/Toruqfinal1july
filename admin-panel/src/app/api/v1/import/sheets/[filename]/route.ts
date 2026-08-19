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

    const uploadDir = getUploadDir()
    const filePath = path.join(uploadDir, safeFileName)

    // Extract batch name
    const batchName = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    if (!fs.existsSync(filePath)) {
      // Regenerate file from PostgreSQL on-the-fly if missing in ephemeral storage
      if (batchName === 'renewals') {
        const { syncRenewalsSpreadsheet } = await import('@/lib/spreadsheet-sync')
        await syncRenewalsSpreadsheet(uploadDir).catch(() => {})
      } else {
        // Find all distinct active import batches from database
        const dbBatches = await prisma.lead.groupBy({
          by: ['importName'],
          where: {
            status: { not: 'Trashed' },
            deletedAt: null
          }
        })

        let actualImportName = batchName
        let foundMatch = false

        // Check for exact sanitized match
        for (const batch of dbBatches) {
          if (!batch.importName) continue
          const clean = String(batch.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
          if (clean === batchName) {
            actualImportName = batch.importName
            foundMatch = true
            break
          }
        }

        // Fallback for special batches like 'all_leads', 'leads' or 'direct_entry'
        if (!foundMatch) {
          if (batchName === 'all_leads' || batchName === 'leads' || batchName === 'direct_entry') {
            foundMatch = true
            actualImportName = 'leads'
          }
        }

        if (foundMatch) {
          const { syncSpreadsheetForBatch } = await import('@/lib/spreadsheet-sync')
          await syncSpreadsheetForBatch(actualImportName, uploadDir).catch(() => {})
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Spreadsheet file not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0] || 'Leads'
    const rawRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({
        fileName: safeFileName,
        headers: [],
        rows: [],
        agentRowsCount: 0,
        downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`
      })
    }

    const headers = rawRows[0].map(h => String(h || ''))
    const dataRows = rawRows.slice(1).filter(r => r && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))

    let agentColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'agent')
    let agentRowsCount = 0

    if (agentColIdx !== -1) {
      dataRows.forEach(row => {
        const val = String(row[agentColIdx] || '').toLowerCase().trim()
        if (val === 'agent') agentRowsCount++
      })
    }

    return NextResponse.json({
      fileName: safeFileName,
      downloadUrl: `/api/v1/import/sheets/download?file=${safeFileName}`,
      headers,
      rows: dataRows,
      agentColIdx,
      agentRowsCount,
      totalRows: dataRows.length
    })
  } catch (err: any) {
    console.error('[sheets-preview] Error:', err)
    return NextResponse.json({ error: 'Failed to parse spreadsheet file', details: err?.message }, { status: 500 })
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
