import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    let totalDeletedFiles = 0
    let totalDeletedLeads = 0

    // Fetch all leads once to perform fuzzy matching
    const allLeads = deleteLeads ? await prisma.lead.findMany({ select: { id: true, importName: true } }) : []

    for (const rawName of rawFileNames) {
      const safeFileName = path.basename(String(rawName).trim())
      if (safeFileName === 'import_all_leads.xlsx') continue

      const filePath = path.join(uploadDir, safeFileName)

      // Extract batch name from filename
      const batchName = safeFileName
        .replace(/^import_/, '')
        .replace(/_\d+\.(xlsx|csv)$/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads && batchName && batchName !== 'all_leads') {
        if (batchName === 'renewals') {
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

      // Delete file from disk
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
          totalDeletedFiles++
        } catch (err: any) {
          console.warn('[sheets DELETE] Failed to unlink file:', err)
        }
      } else {
        // Even if file was already unlinked, count it as successfully processed
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
