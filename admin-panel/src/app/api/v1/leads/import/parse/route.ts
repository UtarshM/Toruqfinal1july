import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Multipart/form-data required' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    let headers: string[] = []

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      if (rawAoa.length > 0) {
        const rawHeaders = rawAoa[0].map((h: any) => String(h || '').trim())
        headers = rawHeaders.map((h, c) => {
          if (h) return h
          // Check column values to infer header
          for (let r = 1; r < Math.min(rawAoa.length, 10); r++) {
            const val = String(rawAoa[r]?.[c] || '').trim().toLowerCase()
            if (val.includes('agent') || val.includes('broker')) {
              return 'Agent Number'
            }
          }
          return `Column_${c + 1}`
        })
      }
    } else {
      const text = await file.text()
      const parseResult = Papa.parse(text, { preview: 10 })
      const rawAoa = parseResult.data as any[][]
      if (rawAoa && rawAoa.length > 0) {
        const rawHeaders = (rawAoa[0] || []).map(h => String(h || '').trim())
        headers = rawHeaders.map((h, c) => {
          if (h) return h
          for (let r = 1; r < Math.min(rawAoa.length, 10); r++) {
            const val = String(rawAoa[r]?.[c] || '').trim().toLowerCase()
            if (val.includes('agent') || val.includes('broker')) {
              return 'Agent Number'
            }
          }
          return `Column_${c + 1}`
        })
      }
    }

    return NextResponse.json({ headers })
  } catch (err: any) {
    console.error('Import parse error:', err)
    return NextResponse.json({ error: err.message || 'Failed to parse file headers' }, { status: 500 })
  }
}
