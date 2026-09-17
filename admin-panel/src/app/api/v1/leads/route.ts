import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteLeadsWithCascade } from '@/lib/lead-delete-helper'
import { normalizeVehicleNo } from '@/lib/vehicle-helper'
import { apiSuccess, apiError } from '@/lib/api-response'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const assignedParam = searchParams.get('assigned')
    const assignedToParam = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const importName = searchParams.get('importName')
    const pageParam = searchParams.get('page')
    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : null
    const cursor = searchParams.get('cursor')
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    const limit = Math.min(Math.max(rawLimit, 1), 100) // Default 50, strictly max 100
    const offset = page ? (page - 1) * limit : parseInt(searchParams.get('offset') || '0')

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

    // Specific Assignee filter
    if (assignedToParam && assignedToParam !== 'all') {
      if (assignedToParam === 'unassigned') {
        where.assignedTo = null
      } else {
        where.assignedTo = assignedToParam
      }
    }

    // Status & Assignment filtering
    if (status === 'assigned' || assignedParam === 'true') {
      where.assignedTo = { not: null }
    } else if (status === 'unassigned' || assignedParam === 'false') {
      where.assignedTo = null
    } else if (status === 'Follow Up' || status === 'Follow-up' || status?.toLowerCase() === 'followup') {
      where.status = { in: ['Follow Up', 'Follow-up'] }
    } else if (status && status !== 'all') {
      where.status = { equals: status, mode: 'insensitive' }
    }

    if (search) {
      const cleanSearch = search.startsWith('#') ? search.slice(1).trim() : search.trim()
      if (cleanSearch) {
        const normVeh = normalizeVehicleNo(cleanSearch)
        const digitsOnly = cleanSearch.replace(/\D/g, '')

        const searchFilter: any[] = [
          { clientName: { contains: cleanSearch, mode: 'insensitive' } },
          { city: { contains: cleanSearch, mode: 'insensitive' } },
          { importName: { contains: cleanSearch, mode: 'insensitive' } },
          { existingAgent: { contains: cleanSearch, mode: 'insensitive' } }
        ]

        if (normVeh && normVeh.length >= 4) {
          searchFilter.push({ vehicleNoNormalized: { startsWith: normVeh } })
          searchFilter.push({ vehicleNo: { contains: cleanSearch, mode: 'insensitive' } })
        } else {
          searchFilter.push({ vehicleNo: { contains: cleanSearch, mode: 'insensitive' } })
        }

        if (digitsOnly && digitsOnly.length >= 7) {
          const norm10 = digitsOnly.slice(-10)
          searchFilter.push({ clientPhone: { contains: norm10 } })
        } else {
          searchFilter.push({ clientPhone: { contains: cleanSearch, mode: 'insensitive' } })
        }

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: searchFilter }]
          delete where.OR
        } else {
          where.OR = searchFilter
        }
      }
    }

    const sortBy = searchParams.get('sortBy') || 'expiryDate'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let orderBy: any = [{ expiryDate: 'desc' }, { createdAt: 'desc' }]
    if (sortBy && sortBy !== 'expiryDate') {
      orderBy = [{ [sortBy]: sortOrder }]
    } else if (sortBy === 'expiryDate') {
      orderBy = [{ expiryDate: sortOrder }, { createdAt: 'desc' }]
    }

    const queryArgs: any = {
      where,
      take: limit + 1,
      orderBy,
      include: {
        assignee: {
          select: { fullName: true }
        }
      }
    }

    if (cursor) {
      queryArgs.cursor = { id: cursor }
      queryArgs.skip = 1
    } else {
      queryArgs.skip = offset
    }

    const needTotal = searchParams.get('includeTotal') === 'true' || Boolean(page && !cursor)
    let totalPromise: Promise<number> | null = null
    if (needTotal) {
      totalPromise = prisma.lead.count({ where })
    }

    const [rowsPlusOne, totalCount] = await Promise.all([
      prisma.lead.findMany(queryArgs),
      totalPromise ? totalPromise : Promise.resolve(null)
    ])

    const hasNextPage = rowsPlusOne.length > limit
    const leads = hasNextPage ? rowsPlusOne.slice(0, limit) : rowsPlusOne
    const nextCursor = hasNextPage && leads.length > 0 ? leads[leads.length - 1]?.id : null

    return NextResponse.json({
      success: true,
      leads,
      data: leads,
      pagination: {
        total: totalCount !== null ? totalCount : undefined,
        totalCount: totalCount !== null ? totalCount : undefined,
        limit,
        offset,
        page: page || (Math.floor(offset / limit) + 1),
        totalPages: totalCount !== null ? Math.ceil(totalCount / limit) : undefined,
        hasNextPage,
        hasPrevPage: Boolean(cursor || offset > 0),
        nextCursor
      }
    })
  } catch (error: any) {
    console.error('Leads GET Error:', error)
    return apiError(error?.message || 'Failed to fetch leads', 'INTERNAL_ERROR', 500, null, req)
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

    const rawVehicle = body.vehicleNo || body.vehicle_no || null
    const vehicleNoNormalized = normalizeVehicleNo(rawVehicle)

    const lead = await prisma.lead.create({
      data: {
        clientName: body.clientName || body.client_name,
        clientEmail: body.clientEmail || body.client_email,
        clientPhone: clientPhone || undefined,
        vehicleNo: rawVehicle,
        vehicleNoNormalized,
        gvw: body.gvw !== undefined ? String(body.gvw) : undefined,
        status,
        existingAgent,
        assignedTo
      }
    })
    return apiSuccess(lead, 201)
  } catch (error: any) {
    console.error('Lead POST Error:', error)
    return apiError(error?.message || 'Internal Server Error', 'INTERNAL_ERROR', 500, null, req)
  }
}

// Bulk delete (soft delete by default, or permanent if permanent=true)
export async function DELETE(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'lead.delete')
  if (error) return error

  try {
    const body = await req.json()
    const ids: string[] = body.ids
    const isPermanent: boolean = body.permanent === true

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    if (isPermanent) {
      const count = await deleteLeadsWithCascade(ids)
      return NextResponse.json({ success: true, count, permanent: true })
    }

    // Soft-delete in chunks of 500
    const CHUNK_SIZE = 500
    let totalUpdated = 0

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE)
      try {
        const res = await prisma.lead.updateMany({
          where: { id: { in: chunk } },
          data: {
            deletedAt: new Date(),
            deletedBy: context!.userId,
            status: 'Trashed'
          }
        })
        totalUpdated += res.count
      } catch {
        // Fallback without deletedBy if DB column does not exist
        const res = await prisma.lead.updateMany({
          where: { id: { in: chunk } },
          data: {
            deletedAt: new Date(),
            status: 'Trashed'
          }
        })
        totalUpdated += res.count
      }
    }

    return NextResponse.json({ success: true, count: totalUpdated })
  } catch (error: any) {
    console.error('Leads Bulk DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
