import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const VALID_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'clientName',
  'clientPhone',
  'clientEmail',
  'status',
  'vehicleNo',
  'expiryDate',
  'registrationDate',
  'gvw',
  'city',
  'importName',
  'existingAgent'
])

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const importName = searchParams.get('importName')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(5000, Math.max(1, parseInt(limitParam) || 100)) : 100
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const where: any = {
      status: { not: 'Trashed' },
      deletedAt: null
    }

    if (importName) {
      if (importName === 'direct_entry' || importName === 'Direct Entry') {
        where.importName = null
      } else {
        where.importName = importName
      }
    }

    // Agent filter support
    const agentParam = searchParams.get('agent') || searchParams.get('existingAgent')
    if (agentParam === 'true' || agentParam === 'Agent' || agentParam === 'agent') {
      where.existingAgent = 'Agent'
    } else if (agentParam === 'false' || agentParam === 'none') {
      where.existingAgent = null
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
    const isExecutive = !isAdminOrManager && (roleUpper.endsWith('EXECUTIVE') || roleUpper.includes('SALES') || roleUpper === 'VIEWER')
    
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
      const cleanSearch = search.startsWith('#') ? search.slice(1).trim() : search.trim()
      if (cleanSearch) {
        const searchFilter = [
          { clientName: { contains: cleanSearch, mode: 'insensitive' } },
          { clientPhone: { contains: cleanSearch, mode: 'insensitive' } },
          { vehicleNo: { contains: cleanSearch, mode: 'insensitive' } },
          { city: { contains: cleanSearch, mode: 'insensitive' } },
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

    // Safe sorting: Validate against known fields to eliminate Prisma runtime exceptions
    const rawSortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : 'desc'
    let orderBy: any = [{ expiryDate: 'desc' }, { createdAt: 'desc' }]

    if (rawSortBy && VALID_SORT_FIELDS.has(rawSortBy)) {
      if (rawSortBy === 'expiryDate') {
        orderBy = [{ expiryDate: sortOrder }, { createdAt: 'desc' }]
      } else {
        orderBy = [{ [rawSortBy]: sortOrder }]
      }
    }

    const [leads, total] = await Promise.all([
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

    return NextResponse.json({
      leads,
      pagination: {
        total,
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
      assignedTo = null
    } else if (!assignedTo && !isExecutive) {
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

    const validIds = ids.filter(id => typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id.trim()))
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid lead IDs provided' }, { status: 400 })
    }

    let updatedCount = 0
    const chunkSize = 500
    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize)
      const result = await prisma.lead.updateMany({
        where: { id: { in: chunk } },
        data: {
          deletedAt: new Date(),
          deletedBy: context!.userId,
          status: 'Trashed'
        }
      })
      updatedCount += result.count
    }

    return NextResponse.json({ success: true, count: updatedCount })
  } catch (error: any) {
    console.error('Leads Bulk DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
