import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
