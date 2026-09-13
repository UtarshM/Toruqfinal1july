import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notifyRole } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'

// GET — list change requests (admins see all, others see their own)
export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'data.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const roleUpper = (context.role || '').toUpperCase()
  const isAdmin = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || context.permissions.includes('data.approve_changes')

  const requests = await prisma.dataChangeRequest.findMany({
    where: {
      ...(isAdmin ? {} : { requestedBy: context.userId }),
      ...(status ? { status } : {})
    },
    orderBy: { requestedAt: 'desc' },
    include: {
      requester: { select: { fullName: true, email: true } },
      reviewer: { select: { fullName: true } }
    }
  })

  const leadIds = requests.filter(r => r.entityType === 'Lead').map(r => r.entityId)
  const leads = leadIds.length > 0 ? await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, clientName: true, vehicleNo: true, clientPhone: true }
  }) : []

  const serialized = requests.map((req: any) => {
    const reqJson = JSON.parse(JSON.stringify(req))
    if (reqJson.entityType === 'Lead') {
      const lead = leads.find(l => l.id === reqJson.entityId)
      if (lead) {
        reqJson.leadDetails = lead
      }
    }
    return reqJson
  })

  return NextResponse.json(serialized)
}

// POST — submit a new change request
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'data.create')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { entityType, entityId, field, oldValue, newValue, reason } = body

  if (!entityType || !entityId || !field || newValue === undefined) {
    return NextResponse.json({ error: 'entityType, entityId, field, newValue are required' }, { status: 400 })
  }

  const request = await prisma.dataChangeRequest.create({
    data: {
      requestedBy: context.userId,
      entityType,
      entityId,
      field,
      oldValue: oldValue?.toString(),
      newValue: newValue.toString(),
      reason,
      status: 'pending'
    }
  })

  // Notify admins and managers that a change request is pending
  await notifyRole('Admin', {
    title: '📋 New Change Request',
    body: `${context.email} wants to change ${field} on ${entityType}`,
    type: 'action',
    entityType: 'DataChangeRequest',
    entityId: request.id
  }).catch(() => {})

  logActivity(context.userId, 'change_request_submitted', entityType, entityId, {
    field, requestId: request.id
  })

  return NextResponse.json(request, { status: 201 })
}
