import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'

// PATCH /api/v1/data/changes/[id] — approve or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req, 'data.approve_changes')
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const { action, reviewNote } = body // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const changeReq = await prisma.dataChangeRequest.findUnique({
    where: { id },
    include: { requester: { select: { fullName: true } } }
  })

  if (!changeReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (changeReq.status !== 'pending') {
    return NextResponse.json({ error: 'Request already reviewed' }, { status: 400 })
  }

  const updated = await prisma.dataChangeRequest.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: context!.userId,
      reviewNote: reviewNote || null,
      reviewedAt: new Date()
    }
  })

  if (action === 'approve') {
    await applyChange(changeReq.entityType, changeReq.entityId, changeReq.field, changeReq.newValue)
    logActivity(context!.userId, 'change_approved', changeReq.entityType, changeReq.entityId, {
      field: changeReq.field, newValue: changeReq.newValue
    })
  }

  await notify({
    userId: changeReq.requestedBy,
    title: action === 'approve' ? '✅ Change Approved' : '❌ Change Rejected',
    body: `Your request to change "${changeReq.field}" has been ${action === 'approve' ? 'approved' : 'rejected'}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    type: action === 'approve' ? 'success' : 'error',
    entityType: 'DataChangeRequest',
    entityId: id
  })

  return NextResponse.json(updated)
}

import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

/**
 * Applies the approved change to the actual database entity.
 */
async function applyChange(entityType: string, entityId: string, field: string, newValue: string) {
  const update = { [field]: newValue }
  try {
    switch (entityType.toLowerCase()) {
      case 'lead':
        if (field === 'existingAgent' && newValue === 'Agent') {
          const lead = await prisma.lead.findUnique({ where: { id: entityId } })
          if (lead) {
            // 1. Mark as Agent and unassign
            await prisma.lead.update({
              where: { id: entityId },
              data: { existingAgent: 'Agent', assignedTo: null }
            })

            // Update any matching leads with same phone number
            if (lead.clientPhone) {
              await prisma.lead.updateMany({
                where: { clientPhone: lead.clientPhone },
                data: { existingAgent: 'Agent', assignedTo: null }
              })
            }

            // 2. Update the spreadsheet file on disk
            try {
              const cleanBatch = (lead.importName || 'batch').replace(/[^a-zA-Z0-9_-]/g, '_')
              const fileName = `import_${cleanBatch}.xlsx`
              const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
              const fullFilePath = path.join(uploadDir, fileName)

              if (fs.existsSync(fullFilePath)) {
                const fileBuffer = fs.readFileSync(fullFilePath)
                const wb = XLSX.read(fileBuffer, { type: 'buffer' })
                const sheetName = wb.SheetNames[0] || 'Leads'
                const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 })

                if (rows && rows.length > 0) {
                  let agentColIdx = rows[0].findIndex((h: any) => String(h || '').toLowerCase().trim() === 'agent')
                  if (agentColIdx === -1) {
                    agentColIdx = rows[0].length
                    rows[0][agentColIdx] = 'Agent'
                  }

                  const leadVehicle = (lead.vehicleNo || '').toLowerCase().trim()
                  const leadPhone = (lead.clientPhone || '').trim()
                  const leadName = (lead.clientName || '').toLowerCase().trim()

                  for (let i = 1; i < rows.length; i++) {
                    const rowStr = JSON.stringify(rows[i] || []).toLowerCase()
                    if ((leadVehicle && rowStr.includes(leadVehicle)) || (leadPhone && rowStr.includes(leadPhone)) || (leadName && rowStr.includes(leadName))) {
                      rows[i][agentColIdx] = 'agent'
                    }
                  }

                  const newWs = XLSX.utils.aoa_to_sheet(rows)
                  const newWb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(newWb, newWs, 'Leads')
                  try {
                    XLSX.writeFile(newWb, fullFilePath)
                  } catch {
                    const buf = XLSX.write(newWb, { type: 'buffer', bookType: 'xlsx' })
                    const tempPath = `${fullFilePath}.tmp`
                    fs.writeFileSync(tempPath, buf)
                    try { fs.renameSync(tempPath, fullFilePath) } catch {}
                  }
                }
              }
            } catch (sheetErr) {
              console.error('[applyChange:existingAgent] Spreadsheet update error:', sheetErr)
            }
          }
        } else {
          await prisma.lead.update({ where: { id: entityId }, data: update })
        }
        break
      case 'customer':
        await prisma.customer.update({ where: { id: entityId }, data: update })
        break
      case 'policy':
        await prisma.policy.update({ where: { id: entityId }, data: update })
        break
      case 'claim':
        await prisma.claim.update({ where: { id: entityId }, data: update })
        break
      default:
        console.warn(`[DataChange] No auto-apply handler for entity type: ${entityType}`)
    }
  } catch (err) {
    console.error('[DataChange] Failed to apply change:', err)
  }
}
