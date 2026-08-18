import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.view')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true, personalMobile: true, managerId: true }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || null

    // Get manager info if assignee has a managerId
    let managerInfo = null
    if (lead.assignee?.managerId) {
      managerInfo = await prisma.user.findUnique({
        where: { id: lead.assignee.managerId },
        select: { id: true, fullName: true, email: true, personalMobile: true }
      })
    }

    return NextResponse.json({
      lead: {
        id: lead.id,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        vehicleNo: lead.vehicleNo,
        expiryDate: lead.expiryDate,
        status: lead.status,
        assignee: lead.assignee,
        manager: managerInfo
      },
      submission: submission || {
        status: 'Draft',
        formData: {
          policyType: '',
          customerType: 'existing',
          customerCategory: 'MVC',
          regNo: lead.vehicleNo || '',
          rate: '',
          rateConfirmationSS: 'YES',
          rsFromCustomer: '',
          description: '',
          otherWorks: '',
          paymentMode: 'cash',
          ncb: 'with ncb',
          expDate: lead.expiryDate ? new Date(lead.expiryDate).toISOString().split('T')[0] : '',
          mobileNo1: lead.clientPhone || '',
          mobileNo2: cf.phone2 || cf.mobile2 || '',
          ncbConfirmation: 'Yes',
          impDateMsgSS: 'Yes',
          hpDetails: 'as per rc',
          vehiclePhoto: 'n.a.',
          bodyTypeMatched: 'n.a.',
          googleFormSubmitted: 'YES',
          noJackCoverConfirmationSS: 'N.A.',
          idvBreakup: '',
          newName: '',
          inspectionStatus: 'Not Required',
          mparivahanRcStatus: '',
          amountDueDateMsgSS: ''
        },
        documents: [],
        compiledPdfUrl: null,
        revertReason: null,
        submittedAt: null,
        reviewedAt: null,
        history: []
      }
    })
  } catch (err: any) {
    console.error('[policy-submission GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch policy submission', details: err?.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { formData, document, documents } = body

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const existingSubmission = cf.policySubmission || {
      status: 'Draft',
      formData: {},
      documents: [],
      compiledPdfUrl: null,
      history: []
    }

    let updatedDocs = existingSubmission.documents || []

    if (document && document.category) {
      const docEntry = {
        id: document.id || `doc_${Date.now()}`,
        category: document.category,
        categoryLabel: document.categoryLabel || document.category,
        fileName: document.fileName || 'document.jpg',
        savedFileName: document.savedFileName || document.fileName || 'document.jpg',
        filePath: document.filePath,
        storagePath: document.storagePath || null,
        fileSize: document.fileSize || 0,
        fileType: document.fileType || 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        uploadedBy: context.userId
      }
      updatedDocs = [...updatedDocs.filter((d: any) => d.category !== document.category), docEntry]
    } else if (Array.isArray(documents)) {
      updatedDocs = documents
    }

    const updatedSubmission = {
      ...existingSubmission,
      formData: formData ? {
        ...(existingSubmission.formData || {}),
        ...formData
      } : (existingSubmission.formData || {}),
      documents: updatedDocs,
      compiledPdfUrl: document ? null : existingSubmission.compiledPdfUrl,
      updatedAt: new Date().toISOString()
    }

    await prisma.lead.update({
      where: { id },
      data: {
        customFields: {
          ...cf,
          policySubmission: updatedSubmission
        }
      }
    })

    return NextResponse.json({ success: true, submission: updatedSubmission })
  } catch (err: any) {
    console.error('[policy-submission POST] Error:', err)
    return NextResponse.json({ error: 'Failed to save policy submission', details: err?.message }, { status: 500 })
  }
}
