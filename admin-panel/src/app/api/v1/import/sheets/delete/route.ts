import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { getUploadDir } from '@/lib/upload-helper'

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

    // Fetch existing batches from DB
    const dbBatches = await prisma.lead.groupBy({
      by: ['importName']
    })

    for (const rawName of rawFileNames) {
      const safeFileName = path.basename(String(rawName).trim())
      const filePath = path.join(uploadDir, safeFileName)

      const batchSlug = safeFileName
        .replace(/^import_/, '')
        .replace(/\.(xlsx|csv)$/, '')

      if (deleteLeads) {
        if (safeFileName === 'import_renewals.xlsx' || batchSlug === 'renewals') {
          const delRenewals = await prisma.renewalRecord.deleteMany({}).catch(() => ({ count: 0 }))
          totalDeletedLeads += delRenewals.count
        } else if (safeFileName === 'import_leads.xlsx' || batchSlug === 'leads' || batchSlug === 'all_leads') {
          const softDel = await prisma.lead.updateMany({
            where: { status: { not: 'Trashed' }, deletedAt: null },
            data: { status: 'Trashed', deletedAt: new Date(), deletedBy: context.userId }
          })
          totalDeletedLeads += softDel.count
        } else {
          let targetImportName: string | null = batchSlug
          const isDirectEntry = batchSlug === 'direct_entry'

          const matchedBatch = dbBatches.find(b => {
            if (!b.importName) return false
            const clean = String(b.importName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
            return clean === batchSlug || b.importName === batchSlug || b.importName.toLowerCase() === batchSlug.toLowerCase()
          })

          if (matchedBatch && matchedBatch.importName) {
            targetImportName = matchedBatch.importName
          }

          const leadWhere = isDirectEntry
            ? { importName: null, status: { not: 'Trashed' }, deletedAt: null }
            : { importName: targetImportName, status: { not: 'Trashed' }, deletedAt: null }

          const batchLeads = await prisma.lead.findMany({
            where: leadWhere,
            select: { id: true }
          })
          const batchLeadIds = batchLeads.map(l => l.id)

          if (batchLeadIds.length > 0) {
            const chunkSize = 500
            for (let i = 0; i < batchLeadIds.length; i += chunkSize) {
              const chunk = batchLeadIds.slice(i, i + chunkSize)

              // Decouple foreign relations
              await Promise.allSettled([
                prisma.policy.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.quotation.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.claim.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.customer.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.renewalRecord.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.fitnessWork.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.rTOWork.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.visit.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } }),
                prisma.loan.updateMany({ where: { leadId: { in: chunk } }, data: { leadId: null } })
              ])

              // Delete activities and logs
              await Promise.allSettled([
                prisma.leadAssignment.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.leadStatusHistory.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.leadWhatsAppLog.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.call.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.followUp.deleteMany({ where: { leadId: { in: chunk } } }),
                prisma.activityLog.deleteMany({ where: { entityId: { in: chunk } } })
              ])

              // Delete leads
              const delResult = await prisma.lead.deleteMany({
                where: { id: { in: chunk } }
              }).catch(async () => {
                return await prisma.lead.updateMany({
                  where: { id: { in: chunk } },
                  data: { status: 'Trashed', deletedAt: new Date(), deletedBy: context.userId }
                })
              })

              totalDeletedLeads += delResult.count
            }
          }
        }
      }

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch {}
      totalDeletedFiles++
    }

    return NextResponse.json({
      success: true,
      deletedFilesCount: totalDeletedFiles,
      deletedLeadsCount: totalDeletedLeads,
      message: `${totalDeletedFiles} spreadsheet(s) and ${totalDeletedLeads} associated lead(s) deleted successfully.`
    })
  } catch (err: any) {
    console.error('[sheets delete endpoint] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete spreadsheet(s)' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req)
}
