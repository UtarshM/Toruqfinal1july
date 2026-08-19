import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export const DOCUMENT_CATEGORIES: Record<string, string> = {
  IMP_DATE_SS: 'IMP date Message Screenshot',
  NCB_CONFIRMATION_SS: 'NCB Confirmation Screenshot',
  PAN_CARD: 'Pan Card',
  PREVIOUS_POLICY: 'Previous Policy (If applicable)',
  QUOTATION: 'Quotation',
  RC_BOOK: 'RC book',
  VEHICLE_PHOTO: 'Vehicle Photo for body type'
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
    const { category, fileName, savedFileName, filePath, storagePath, fileSize, fileType } = body

    if (!category || !DOCUMENT_CATEGORIES[category]) {
      return NextResponse.json({ error: `Invalid document category: ${category}` }, { status: 400 })
    }

    if (!filePath) {
      return NextResponse.json({ error: 'Missing document file URL' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const docEntry = {
      id: uuidv4(),
      category,
      categoryLabel: DOCUMENT_CATEGORIES[category] || category,
      fileName: fileName || `${category}.jpg`,
      savedFileName: savedFileName || fileName || `${category}.jpg`,
      filePath,
      storagePath: storagePath || null,
      fileSize: fileSize || 0,
      fileType: fileType || 'image/jpeg',
      uploadedAt: new Date().toISOString(),
      uploadedBy: context.userId
    }

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || {
      status: 'Draft',
      formData: {},
      documents: [],
      compiledPdfUrl: null,
      history: []
    }

    // Allow multiple files per category up to 15 files
    const otherDocs = (submission.documents || []).filter((d: any) => d.category !== category)
    const categoryDocs = (submission.documents || []).filter((d: any) => d.category === category)
    if (categoryDocs.length >= 15) {
      return NextResponse.json({ error: `Cannot upload more than 15 files for ${DOCUMENT_CATEGORIES[category]}` }, { status: 400 })
    }
    const updatedDocuments = [...otherDocs, ...categoryDocs, docEntry]

    const updatedSubmission = {
      ...submission,
      documents: updatedDocuments,
      compiledPdfUrl: null,
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

    // Also register in Document table for tracking
    try {
      await prisma.document.create({
        data: {
          entityType: 'lead_policy_doc',
          entityId: id,
          fileName: docEntry.fileName,
          filePath: docEntry.filePath,
          uploadedBy: context.userId
        }
      })
    } catch {}

    return NextResponse.json({
      success: true,
      document: docEntry,
      submission: updatedSubmission
    })
  } catch (err: any) {
    console.error('[record-document] Error:', err)
    return NextResponse.json({ error: 'Failed to record document', details: err?.message }, { status: 500 })
  }
}
