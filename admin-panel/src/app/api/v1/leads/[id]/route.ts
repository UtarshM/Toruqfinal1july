import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteLeadsWithCascade } from '@/lib/lead-delete-helper'
import { formatDateDMY } from '@/lib/date-format'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await validateAuth(req, 'lead.view')
  if (authError) return authError

  try {
    const { id } = await params
    
    // Validate UUID format to prevent Prisma/DB crash
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid Lead ID format' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { fullName: true } },
        policies: true,
        quotations: true,
        claims: true,
        calls: { orderBy: { createdAt: 'desc' } },
        statusHistories: { orderBy: { changedAt: 'desc' } },
        followUps: { orderBy: { scheduledAt: 'asc' } }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error: any) {
    console.error('Lead Detail GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error: authError } = await validateAuth(req, 'lead.edit')
  if (authError || !context) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    
    const userRole = context.role?.toUpperCase()
    const isAdmin = userRole === 'SUPER ADMIN' || userRole === 'ADMIN'

    // Fetch the current lead state
    const currentLead = await prisma.lead.findUnique({ where: { id } })
    if (!currentLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const data: any = {}
    const pendingChanges: { field: string; oldValue: string; newValue: string }[] = []

    const checkAndAdd = (fieldName: string, newValue: any, dbFieldName: string = fieldName) => {
      if (newValue === undefined) return
      const oldValue = currentLead[dbFieldName as keyof typeof currentLead]
      const oldValueStr = oldValue !== null && oldValue !== undefined ? String(oldValue) : ''
      const newValueStr = newValue !== null && newValue !== undefined ? String(newValue) : ''

      if (oldValueStr !== newValueStr) {
        if (isAdmin) {
          data[dbFieldName] = newValue
        } else {
          pendingChanges.push({
            field: dbFieldName,
            oldValue: oldValueStr,
            newValue: newValueStr
          })
        }
      }
    }

    const clientNameVal = body.clientName !== undefined ? body.clientName : body.client_name
    checkAndAdd('clientName', clientNameVal)

    const clientEmailVal = body.clientEmail !== undefined ? body.clientEmail : body.client_email
    checkAndAdd('clientEmail', clientEmailVal)

    const clientPhoneVal = body.clientPhone !== undefined ? body.clientPhone : body.client_phone
    checkAndAdd('clientPhone', clientPhoneVal)

    const vehicleNoVal = body.vehicleNo !== undefined ? body.vehicleNo : body.vehicle_no
    checkAndAdd('vehicleNo', vehicleNoVal)

    const registrationDateVal = body.registrationDate !== undefined ? body.registrationDate : body.registration_date
    if (registrationDateVal !== undefined) {
      let newRegDate: Date | null = null
      if (registrationDateVal) {
        const str = String(registrationDateVal).trim()
        const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
        const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
        if (ymd) {
          newRegDate = new Date(Date.UTC(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]), 12, 0, 0))
        } else if (dmy) {
          newRegDate = new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]), 12, 0, 0))
        } else {
          const d = new Date(registrationDateVal)
          if (!isNaN(d.getTime())) newRegDate = d
        }
      }
      const oldRegDate = currentLead.registrationDate
      const oldRegDateStr = formatDateDMY(oldRegDate)
      const newRegDateStr = formatDateDMY(newRegDate)
      if (oldRegDateStr !== newRegDateStr) {
        if (isAdmin) {
          data.registrationDate = newRegDate
        } else {
          pendingChanges.push({
            field: 'registrationDate',
            oldValue: oldRegDateStr,
            newValue: newRegDateStr
          })
        }
      }
    }

    const expiryDateVal = body.expiryDate !== undefined ? body.expiryDate : body.expiry_date
    if (expiryDateVal !== undefined) {
      let newExpDate: Date | null = null
      if (expiryDateVal) {
        const str = String(expiryDateVal).trim()
        const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
        const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
        if (ymd) {
          newExpDate = new Date(Date.UTC(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]), 12, 0, 0))
        } else if (dmy) {
          newExpDate = new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]), 12, 0, 0))
        } else {
          const d = new Date(expiryDateVal)
          if (!isNaN(d.getTime())) newExpDate = d
        }
      }
      const oldExpDate = currentLead.expiryDate
      const oldExpDateStr = formatDateDMY(oldExpDate)
      const newExpDateStr = formatDateDMY(newExpDate)
      if (oldExpDateStr !== newExpDateStr) {
        if (isAdmin) {
          data.expiryDate = newExpDate
        } else {
          pendingChanges.push({
            field: 'expiryDate',
            oldValue: oldExpDateStr,
            newValue: newExpDateStr
          })
        }
      }
    }

    if (body.gvw !== undefined) {
      checkAndAdd('gvw', body.gvw ? String(body.gvw) : null)
    }

    const existingAgentVal = body.existingAgent !== undefined ? body.existingAgent : body.existing_agent
    checkAndAdd('existingAgent', existingAgentVal)

    if (body.city !== undefined) {
      checkAndAdd('city', body.city)
    }
    if (body.address !== undefined) {
      checkAndAdd('address', body.address)
    }

    // assignedTo and status can always be updated directly if they have permission
    if (body.assignedTo !== undefined || body.assigned_to !== undefined) {
      const newAssignee = body.assignedTo !== undefined ? body.assignedTo : body.assigned_to
      data.assignedTo = newAssignee === 'unassigned' ? null : (newAssignee || null)
    }
    if (body.status !== undefined) {
      data.status = body.status
    }

    let lead = currentLead
    if (Object.keys(data).length > 0) {
      lead = await prisma.lead.update({
        where: { id },
        data
      })

      // Sync status change history in Supabase DB
      if (data.status && data.status !== currentLead.status) {
        try {
          await prisma.leadStatusHistory.create({
            data: {
              leadId: id,
              userId: context.userId,
              oldStatus: currentLead.status,
              newStatus: data.status,
              notes: body.notes || `Status updated from ${currentLead.status} to ${data.status}`
            }
          })
        } catch (histErr) {
          console.warn('Failed to record status history in Supabase:', histErr)
        }
      }

      // Sync assignment history in Supabase DB
      if (data.assignedTo !== undefined && data.assignedTo !== currentLead.assignedTo && data.assignedTo !== null) {
        try {
          await prisma.leadAssignment.create({
            data: {
              leadId: id,
              userId: data.assignedTo
            }
          })
        } catch (asgnErr) {
          console.warn('Failed to record lead assignment in Supabase:', asgnErr)
        }
      }
    }

    if (pendingChanges.length > 0) {
      for (const change of pendingChanges) {
        await prisma.dataChangeRequest.create({
          data: {
            requestedBy: context.userId,
            entityType: 'Lead',
            entityId: id,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            reason: body.reason || 'Lead update correction request',
            status: 'pending'
          }
        })
      }
      return NextResponse.json({
        ...lead,
        pendingApproval: true,
        message: `${pendingChanges.length} field change requests submitted for Admin approval.`
      })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead Detail PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, context } = await validateAuth(req, 'lead.delete')
  if (authError) return authError

  try {
    const { id } = await params
    const isPermanent = req.nextUrl.searchParams.get('permanent') === 'true'

    if (isPermanent) {
      await deleteLeadsWithCascade([id])
      return NextResponse.json({ success: true, permanent: true })
    }

    try {
      await prisma.lead.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: context!.userId,
          status: 'Trashed'
        }
      })
    } catch {
      await prisma.lead.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'Trashed'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Lead Detail DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
