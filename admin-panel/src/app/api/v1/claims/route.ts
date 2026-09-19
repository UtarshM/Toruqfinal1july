import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'claims.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const vehicleCategory = searchParams.get('vehicleCategory')
    const claimCoverageType = searchParams.get('claimCoverageType')
    const search = searchParams.get('search')
    
    const where: any = {}
    
    // RBAC: Dynamic filtering based on role if assigned
    if (context && context.role === 'EXECUTIVE') {
      where.assignedTo = context.userId
    } else if (context && context.role === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.OR = [
        { assignedTo: context.userId },
        { assignedTo: { in: teamIds } },
        { assignedTo: null }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (vehicleCategory && vehicleCategory !== 'all') {
      where.vehicleCategory = vehicleCategory
    }

    if (claimCoverageType && claimCoverageType !== 'all') {
      where.claimCoverageType = claimCoverageType
    }

    if (search && search.trim()) {
      const s = search.trim()
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { vehicleNumber: { contains: s, mode: 'insensitive' } },
            { claimNumber: { contains: s, mode: 'insensitive' } },
            { customerName: { contains: s, mode: 'insensitive' } },
            { contactPersonName: { contains: s, mode: 'insensitive' } },
            { contactPersonMobile: { contains: s, mode: 'insensitive' } },
            { policyNumber: { contains: s, mode: 'insensitive' } },
            { insuranceCompany: { contains: s, mode: 'insensitive' } },
            { surveyorName: { contains: s, mode: 'insensitive' } },
            { garageNameAddress: { contains: s, mode: 'insensitive' } },
            { email: { contains: s, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true, vehicleNo: true } },
        policy: { select: { policyNumber: true, provider: true } },
        assignee: { select: { fullName: true, email: true } }
      }
    })

    return NextResponse.json(claims)
  } catch (error) {
    console.error('Claims GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'claims.create')
  if (error) return error

  try {
    const body = await req.json()
    
    // Auto-link policy/lead info if policy_id / policyId is selected
    const policyId = body.policyId || body.policy_id || null
    let { customerName, policyNumber, vehicleNumber, leadId } = body
    
    if (policyId && (!customerName || !policyNumber || !vehicleNumber)) {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: { lead: true }
      })
      if (policy) {
        customerName = customerName || policy.lead?.clientName || body.contactPersonName || 'Customer'
        policyNumber = policyNumber || policy.policyNumber
        vehicleNumber = vehicleNumber || policy.lead?.vehicleNo || body.vehicleRegNumber
        leadId = leadId || policy.leadId
      }
    }

    // Standardize vehicle registration number
    const vehicleReg = (body.vehicleRegNumber || vehicleNumber || body.vehicleNumber || '').toUpperCase().trim()
    const customer = body.contactPersonName || customerName || body.customerName || 'Customer'
    const mobile = body.contactPersonMobile || body.mobile || ''
    const email = body.email || (context as any)?.email || ''

    // Dates
    const accidentDate = body.accidentDate ? new Date(body.accidentDate) : (body.incident_date ? new Date(body.incident_date) : null)
    
    // Amount & Loss
    const estimatedLoss = body.estimatedLoss !== undefined && body.estimatedLoss !== '' ? parseFloat(body.estimatedLoss) : (body.claimAmount ? parseFloat(body.claimAmount) : (body.amount ? parseFloat(body.amount) : null))
    const estimatedDays = body.estimatedTimeDays !== undefined && body.estimatedTimeDays !== '' ? parseInt(body.estimatedTimeDays, 10) : null

    // Documents aggregation
    const documents = {
      policyPdf: body.policyPdfUrl || null,
      claimInformDoc: body.claimInformDocUrl || null,
      claimIntimationDoc: body.claimIntimationDocUrl || null,
      spotPhotosVideos: body.spotPhotosVideosUrl || null,
      kycDocs: body.kycDocsUrl || null,
      policyCheckForm: body.policyCheckFormUrl || null,
      ...(body.documents || {})
    }

    const claim = await prisma.claim.create({
      data: {
        policyId: policyId || undefined,
        leadId: leadId || undefined,
        assignedTo: body.assigned_to || body.assignedTo || (context as any)?.userId || undefined,
        customerName: customer,
        policyNumber: policyNumber || body.policyNumber || null,
        vehicleNumber: vehicleReg,
        claimType: body.claimCoverageType || body.type || body.claimType || 'OD',
        claimAmount: estimatedLoss,
        status: body.status || 'filed',
        incidentDate: accidentDate,
        description: body.description || body.accidentLocation || null,
        documents: documents,
        
        // 24 Full Specification Fields
        email: email,
        vehicleCategory: body.vehicleCategory || null,
        insuranceCompany: body.insuranceCompany || null,
        policyPdfUrl: body.policyPdfUrl || null,
        contactPersonName: body.contactPersonName || customer,
        contactPersonMobile: mobile,
        accidentDate: accidentDate,
        accidentTime: body.accidentTime || null,
        accidentLocation: body.accidentLocation || null,
        claimCoverageType: body.claimCoverageType || 'OD',
        claimNumber: body.claimNumber || null,
        claimInformDocUrl: body.claimInformDocUrl || null,
        claimIntimationDocUrl: body.claimIntimationDocUrl || null,
        spotPhotosVideosUrl: body.spotPhotosVideosUrl || null,
        kycDocsUrl: body.kycDocsUrl || null,
        policyCheckFormUrl: body.policyCheckFormUrl || null,
        surveyorName: body.surveyorName || null,
        surveyorMobile: body.surveyorMobile || null,
        garageNameAddress: body.garageNameAddress || null,
        garageContactName: body.garageContactName || null,
        garageContactMobile: body.garageContactMobile || null,
        estimatedLoss: estimatedLoss,
        estimatedTimeDays: estimatedDays
      }
    })

    return NextResponse.json(claim)
  } catch (error: any) {
    console.error('Claim POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const keys = Object.keys(updates)
    const isStatusUpdate = keys.every(k => k === 'status')
    const isDocsUpdate = keys.every(k => k === 'documents' || k.endsWith('Url'))

    let requiredPermission = 'claims.edit'
    if (isStatusUpdate) {
      requiredPermission = 'claims.update_status'
    } else if (isDocsUpdate) {
      requiredPermission = 'claims.upload_documents'
    }

    const hasPermission = context.permissions.includes(requiredPermission) || context.permissions.includes('claims.edit')
    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    if (updates.incidentDate) updates.incidentDate = new Date(updates.incidentDate)
    if (updates.accidentDate) updates.accidentDate = new Date(updates.accidentDate)
    if (updates.settledDate) updates.settledDate = new Date(updates.settledDate)
    if (updates.estimatedLoss !== undefined && updates.estimatedLoss !== '') {
      updates.estimatedLoss = parseFloat(updates.estimatedLoss)
      updates.claimAmount = updates.estimatedLoss
    }
    if (updates.estimatedTimeDays !== undefined && updates.estimatedTimeDays !== '') {
      updates.estimatedTimeDays = parseInt(updates.estimatedTimeDays, 10)
    }

    const claim = await prisma.claim.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(claim)
  } catch (error: any) {
    console.error('Claim PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'claims.delete')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Missing Claim ID' }, { status: 400 })

    await prisma.claim.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Claim deleted successfully' })
  } catch (error: any) {
    console.error('Claim DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
