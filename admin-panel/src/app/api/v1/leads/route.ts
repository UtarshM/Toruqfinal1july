import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const importName = searchParams.get('importName')
    const limit = parseInt(searchParams.get('limit') || '5000')
    const offset = parseInt(searchParams.get('offset') || '0')

    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const where: any = {
      status: { not: 'Trashed' },
      deletedAt: null
    }
    if (importName) {
      where.importName = importName
    }
    
    if (fromParam || toParam) {
      where.createdAt = {}
      if (fromParam) {
        const d = new Date(fromParam)
        d.setHours(0, 0, 0, 0)
        if (!isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (toParam) {
        const d = new Date(toParam)
        d.setHours(23, 59, 59, 999)
        if (!isNaN(d.getTime())) where.createdAt.lte = d
      }
    }

    // RBAC: Dynamic filtering based on role
    const roleUpper = context?.role?.toUpperCase() || ''
    const isAdminOrManager = roleUpper.includes('ADMIN') || roleUpper.includes('MANAGER')
    const isExecutive = !isAdminOrManager && (roleUpper.endsWith('EXECUTIVE') || roleUpper.includes('SALES') || roleUpper.includes('EXECUTIVE') || roleUpper === 'VIEWER')
    
    console.log('[leads GET DEBUG] context.role:', context?.role, 'roleUpper:', roleUpper, 'isAdminOrManager:', isAdminOrManager, 'isExecutive:', isExecutive)
    
    if (isExecutive) {
      where.assignedTo = context!.userId
    } else if (roleUpper === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context!.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.assignedTo = { in: [context!.userId, ...teamIds] }
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      const cleanSearch = search.startsWith('#') ? search.slice(1).trim() : search
      if (cleanSearch) {
        const searchFilter = [
          { clientName: { contains: cleanSearch, mode: 'insensitive' } },
          { clientPhone: { contains: cleanSearch, mode: 'insensitive' } },
          { vehicleNo: { contains: cleanSearch, mode: 'insensitive' } },
          { importName: { contains: cleanSearch, mode: 'insensitive' } }
        ]
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: searchFilter }]
          delete where.OR
        } else {
          where.OR = searchFilter
        }
      }
    }

    const sortBy = searchParams.get('sortBy') || 'expiryDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    let orderBy: any = [{ expiryDate: 'asc' }, { createdAt: 'desc' }]
    if (sortBy && sortBy !== 'expiryDate') {
      orderBy = [{ [sortBy]: sortOrder }]
    } else if (sortBy === 'expiryDate') {
      orderBy = [{ expiryDate: sortOrder }, { createdAt: 'desc' }]
    }

    let [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          assignee: {
            select: { fullName: true }
          }
        }
      }),
      prisma.lead.count({ where })
    ])

    // Filter out trashed leads in memory to be 100% fail-safe
    leads = leads.filter((l: any) => l.status !== 'Trashed' && !l.deletedAt)

    return NextResponse.json({
      leads,
      pagination: {
        total: leads.length,
        limit,
        offset
      }
    })
  } catch (error: any) {
    console.error('Leads GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.create')
  if (error) return error

  try {
    const body = await req.json()
    const roleUpper = context?.role?.toUpperCase() || ''
    const isExecutive = roleUpper.includes('EXECUTIVE') || roleUpper.includes('SALES') || roleUpper === 'VIEWER'

    if (isExecutive) {
      return NextResponse.json({ error: 'Forbidden: Sales Executives are not permitted to add new leads. Only Admins and Managers can add leads.' }, { status: 403 })
    }

    let status = body.status || 'New'
    let assignedTo = body.assignedTo || body.assigned_to || null
    const clientPhone = (body.clientPhone || body.client_phone) ? String(body.clientPhone || body.client_phone).trim() : null
    let existingAgent = body.existingAgent || body.existing_agent || null

    // Check if this contact number is already known as an Agent or if marked as Agent
    let isAgentLead = false
    if (existingAgent && String(existingAgent).toLowerCase().trim() === 'agent') {
      isAgentLead = true
      existingAgent = 'Agent'
    } else if (clientPhone) {
      const cleanDigits = clientPhone.replace(/\D/g, '')
      const norm10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits
      const knownAgent = await prisma.lead.findFirst({
        where: {
          existingAgent: 'Agent',
          OR: [
            { clientPhone: clientPhone },
            ...(norm10.length >= 7 ? [{ clientPhone: { contains: norm10 } }] : [])
          ]
        }
      })
      if (knownAgent) {
        isAgentLead = true
        existingAgent = 'Agent'
      }
    }

    if (isAgentLead) {
      // Agent contact numbers MUST NOT be assigned to any staff
      assignedTo = null
    } else if (!assignedTo && !isExecutive) {
      // Round-robin assignment for regular (non-agent) leads
      try {
        const salesExecutives = await prisma.user.findMany({
          where: {
            isActive: true,
            role: {
              OR: [
                { name: { equals: 'Sales Executive', mode: 'insensitive' } },
                { name: { equals: 'EXECUTIVE', mode: 'insensitive' } }
              ]
            }
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true }
        })

        if (salesExecutives.length > 0) {
          const lastAssignedLead = await prisma.lead.findFirst({
            where: { assignedTo: { not: null } },
            orderBy: { createdAt: 'desc' }
          })

          let nextIndex = 0
          if (lastAssignedLead?.assignedTo) {
            const foundIndex = salesExecutives.findIndex(se => se.id === lastAssignedLead.assignedTo)
            if (foundIndex !== -1) {
              nextIndex = (foundIndex + 1) % salesExecutives.length
            }
          }
          assignedTo = salesExecutives[nextIndex].id
        }
      } catch (rrErr) {
        console.error('Round-robin assignment error:', rrErr)
      }
    }

    const lead = await prisma.lead.create({
      data: {
        clientName: body.clientName || body.client_name,
        clientEmail: body.clientEmail || body.client_email,
        clientPhone: clientPhone || undefined,
        vehicleNo: body.vehicleNo || body.vehicle_no,
        gvw: body.gvw !== undefined ? String(body.gvw) : undefined,
        status,
        existingAgent,
        assignedTo
      }
    })
    return NextResponse.json(lead)
  } catch (error: any) {
    console.error('Lead POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// Bulk soft-delete
export async function DELETE(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'lead.delete')
  if (error) return error

  try {
    const body = await req.json()
    const ids: string[] = body.ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    const formattedIds = ids.map(id => `'${id}'`).join(',')
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "deletedAt" = NOW(), "deletedBy" = '${context!.userId}', "status" = 'Trashed' WHERE "id"::text IN (${formattedIds})`
    )

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error: any) {
    console.error('Leads Bulk DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
