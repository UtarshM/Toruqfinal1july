import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notifyMany, notifyRole } from '@/lib/notify'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { assignee: true }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const roleName = (context.role || '').toUpperCase()
    const isAdmin = roleName === 'SUPER ADMIN' || roleName === 'ADMIN' || context.permissions.includes('data.approve_changes')

    // IF NON-ADMIN: Submit for Admin Approval (Do NOT touch spreadsheet until Admin approves)
    if (!isAdmin) {
      // Check if there is already a pending request for this lead
      const existingRequest = await prisma.dataChangeRequest.findFirst({
        where: {
          entityType: 'Lead',
          entityId: lead.id,
          field: 'existingAgent',
          status: 'pending'
        }
      })

      if (existingRequest) {
        return NextResponse.json({
          success: true,
          pendingApproval: true,
          message: 'An Agent approval request is already pending Admin review.'
        })
      }

      const request = await prisma.dataChangeRequest.create({
        data: {
          requestedBy: context.userId,
          entityType: 'Lead',
          entityId: lead.id,
          field: 'existingAgent',
          oldValue: lead.existingAgent || 'Regular',
          newValue: 'Agent',
          reason: 'Staff requested to mark as Agent',
          status: 'pending'
        }
      })

      // Notify Admins
      const senderName = context.email || 'Sales Executive'
      await notifyRole('Admin', {
        title: `Agent Approval Request: ${lead.clientName}`,
        body: `${senderName} requested to mark ${lead.clientName} (${lead.clientPhone || 'No Phone'}) as Agent.`,
        type: 'action',
        entityType: 'DataChangeRequest',
        entityId: request.id,
        data: {
          leadId: lead.id,
          requestId: request.id,
          clientName: lead.clientName,
          clientPhone: lead.clientPhone,
          vehicleNo: lead.vehicleNo,
          senderId: context.userId,
          senderName
        }
      })

      try {
        await prisma.activityLog.create({
          data: {
            userId: context.userId,
            action: 'FLAG_AGENT_REQUESTED',
            entityType: 'Lead',
            entityId: lead.id,
            metadata: {
              details: `Submitted agent approval request for lead "${lead.clientName}" (${lead.vehicleNo}) to Admin.`
            }
          }
        })
      } catch {}

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: 'Agent tag requested. Sent to Admin for approval. Spreadsheet will be updated once Admin approves.'
      })
    }

    // IF ADMIN: Approve and apply directly
    await prisma.lead.update({
      where: { id },
      data: {
        existingAgent: 'Agent',
        assignedTo: null
      }
    })

    if (lead.clientPhone) {
      await prisma.lead.updateMany({
        where: {
          clientPhone: lead.clientPhone,
          id: { not: id }
        },
        data: {
          existingAgent: 'Agent',
          assignedTo: null
        }
      })
    }

    // Update spreadsheet file
    const cleanBatch = (lead.importName || 'batch').replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `import_${cleanBatch}.xlsx`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const fullFilePath = path.join(uploadDir, fileName)
    const relativeFilePath = `/uploads/imports/${fileName}`

    try {
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
    } catch (err) {
      console.error('[flag-agent] Error updating spreadsheet:', err)
    }

    return NextResponse.json({
      success: true,
      message: 'Agent tag approved and spreadsheet updated successfully.',
      spreadsheetUrl: relativeFilePath
    })
  } catch (err: any) {
    console.error('[flag-agent] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}
