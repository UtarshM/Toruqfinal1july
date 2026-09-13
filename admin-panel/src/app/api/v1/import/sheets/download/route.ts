import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { getUploadDir } from '@/lib/upload-helper'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can download spreadsheets' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const file = searchParams.get('file')
    if (!file) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 })
    }

    const safeFileName = path.basename(file)
    const uploadDir = getUploadDir()
    const filePath = path.join(uploadDir, safeFileName)

    // Extract batch name
    const batchSlug = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    let fileBuffer: Buffer | null = null

    if (fs.existsSync(filePath)) {
      try {
        fileBuffer = fs.readFileSync(filePath)
      } catch {}
    }

    if (!fileBuffer) {
      if (batchSlug === 'renewals' || safeFileName === 'import_renewals.xlsx') {
        const { syncRenewalsSpreadsheet } = await import('@/lib/spreadsheet-sync')
        const res = await syncRenewalsSpreadsheet(uploadDir)
        if (res && res.buffer) {
          fileBuffer = res.buffer
        }
      } else {
        const prisma = (await import('@/lib/prisma')).default
        const dbBatches = await prisma.lead.groupBy({
          by: ['importName'],
          where: { status: { not: 'Trashed' }, deletedAt: null }
        })

        let actualImportName: string | null = batchSlug

        if (batchSlug === 'leads' || batchSlug === 'all_leads') {
          actualImportName = 'leads'
        } else if (batchSlug === 'direct_entry') {
          actualImportName = 'direct_entry'
        } else {
          for (const batch of dbBatches) {
            if (!batch.importName) continue
            const clean = String(batch.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
            if (clean === batchSlug || batch.importName === batchSlug || batch.importName.toLowerCase() === batchSlug.toLowerCase()) {
              actualImportName = batch.importName
              break
            }
          }
        }

        const { syncSpreadsheetForBatch } = await import('@/lib/spreadsheet-sync')
        const res = await syncSpreadsheetForBatch(actualImportName, uploadDir)
        if (res && res.buffer) {
          fileBuffer = res.buffer
        }
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Spreadsheet file could not be generated' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
      },
    })
  } catch (err: any) {
    console.error('[sheets-download] Error:', err)
    return NextResponse.json({ error: 'Failed to download spreadsheet file', details: err?.message }, { status: 500 })
  }
}
