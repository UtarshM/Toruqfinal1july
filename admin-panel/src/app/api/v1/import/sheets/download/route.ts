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
    const batchName = safeFileName
      .replace(/^import_/, '')
      .replace(/\.(xlsx|csv)$/, '')

    if (!fs.existsSync(filePath)) {
      if (batchName === 'renewals') {
        const { syncRenewalsSpreadsheet } = await import('@/lib/spreadsheet-sync')
        await syncRenewalsSpreadsheet(uploadDir).catch(() => {})
      } else {
        const cleanBatch = batchName.replace(/_/g, ' ')
        const prisma = (await import('@/lib/prisma')).default
        const count = await prisma.lead.count({
          where: {
            OR: [
              { importName: batchName },
              { importName: cleanBatch }
            ]
          }
        })
        if (count > 0) {
          const { syncSpreadsheetForBatch } = await import('@/lib/spreadsheet-sync')
          await syncSpreadsheetForBatch(batchName, uploadDir).catch(() => {})
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Spreadsheet file not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    return new NextResponse(fileBuffer, {
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
