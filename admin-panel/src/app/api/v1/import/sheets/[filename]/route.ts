import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    const filePath = path.join(uploadDir, safeFileName)

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
        downloadUrl: `/uploads/imports/${safeFileName}`
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
      downloadUrl: `/uploads/imports/${safeFileName}`,
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
  const { context, error } = await validateAuth(req, 'leads.delete')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete spreadsheets' }, { status: 403 })
  }

  try {
    const { filename } = await params
    const safeFileName = path.basename(filename)

    // Cannot delete the master aggregated sheet
    if (safeFileName === 'import_all_leads.xlsx') {
      return NextResponse.json({ error: 'Cannot delete the master aggregate spreadsheet' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    const filePath = path.join(uploadDir, safeFileName)

    // Extract batch name
    const batchName = safeFileName
      .replace(/^import_/, '')
      .replace(/_\d+\.(xlsx|csv)$/, '')
      .replace(/\.(xlsx|csv)$/, '')

    const deleteLeads = req.nextUrl.searchParams.get('deleteLeads') !== 'false'

    let deletedLeadsCount = 0
    if (deleteLeads && batchName && batchName !== 'all_leads') {
      // Find matching leads
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
        // Delete dependent records first
        await prisma.leadAssignment.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
        await prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
        await prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
        await prisma.call.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
        await prisma.followUp.deleteMany({ where: { leadId: { in: leadIds } } }).catch(() => {})
        await prisma.activityLog.deleteMany({ where: { entityId: { in: leadIds } } }).catch(() => {})

        const deleteResult = await prisma.lead.deleteMany({
          where: { id: { in: leadIds } }
        })
        deletedLeadsCount = deleteResult.count
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
      message: `Spreadsheet "${safeFileName}" and ${deletedLeadsCount} associated lead(s) deleted successfully.`
    })
  } catch (err: any) {
    console.error('[sheets DELETE] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete spreadsheet' }, { status: 500 })
  }
}
