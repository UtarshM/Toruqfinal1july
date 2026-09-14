import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { getUploadDir } from '@/lib/upload-helper'
import { purgeAllLeadsWithCascade, deleteLeadsByBatchWithCascade, deleteLeadsWithCascade } from '@/lib/lead-delete-helper'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete spreadsheets' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const rawFileNames: string[] = Array.isArray(body.fileNames) 
      ? body.fileNames 
      : body.fileName 
      ? [body.fileName] 
      : []

    const deleteLeads: boolean = body.deleteLeads !== false

    if (rawFileNames.length === 0) {
      return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 })
    }

    const uploadDir = getUploadDir()
    let totalDeletedFiles = 0
    let totalDeletedLeads = 0

    for (const rawName of rawFileNames) {
      const safeFileName = path.basename(String(rawName).trim())
      const filePath = path.join(uploadDir, safeFileName)

      const batchName = safeFileName
        .replace(/^import_/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads) {
        if (safeFileName === 'import_renewals.xlsx' || batchName === 'renewals') {
          const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
          totalDeletedLeads += delRenewals.count
        } else if (safeFileName === 'import_leads.xlsx' || batchName === 'leads' || batchName === 'all_leads') {
          // Master sheet deletion: purge all leads in single atomic transaction (~1.3s)
          const count = await purgeAllLeadsWithCascade()
          totalDeletedLeads += count
        } else if (safeFileName === 'import_direct_entry.xlsx' || batchName === 'direct_entry') {
          // Direct entry leads (importName is NULL)
          const count = await deleteLeadsByBatchWithCascade(null)
          totalDeletedLeads += count
        } else {
          // Specific batch deletion by sheet name in single atomic transaction
          const count = await deleteLeadsByBatchWithCascade(batchName)
          totalDeletedLeads += count
        }
      }

      // Delete file from disk
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
    console.error('[sheets delete endpoint] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete spreadsheet(s)' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req)
}
