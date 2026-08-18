import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import path from 'path'
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
  const { context, error } = await validateAuth(req, 'leads.edit')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!category || !DOCUMENT_CATEGORIES[category]) {
      return NextResponse.json({ error: 'Invalid document category' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const originalName = file.name || 'document.png'
    const ext = path.extname(originalName) || '.png'
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${category.toLowerCase()}_${Date.now()}_${safeBaseName}${ext}`
    const storagePath = `lead-documents/${id}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      console.error('[upload document] Supabase storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath)

    const docEntry = {
      id: uuidv4(),
      category,
      categoryLabel: DOCUMENT_CATEGORIES[category],
      fileName: originalName,
      savedFileName: fileName,
      filePath: publicUrl,
      storagePath,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
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

    // Replace if this category already had a doc, or append if multiple allowed
    const existingDocs = (submission.documents || []).filter((d: any) => d.category !== category)
    const updatedDocuments = [...existingDocs, docEntry]

    const updatedSubmission = {
      ...submission,
      documents: updatedDocuments,
      // If single PDF was previously compiled, invalidate it so they recompile
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
          fileName: originalName,
          filePath: publicUrl,
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
    console.error('[policy-submission upload] Error:', err)
    return NextResponse.json({ error: 'Failed to upload document', details: err?.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.edit')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const docId = searchParams.get('docId')
    const category = searchParams.get('category')

    if (!docId && !category) {
      return NextResponse.json({ error: 'Document ID or Category required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || { documents: [] }

    const removedDoc = (submission.documents || []).find((d: any) => d.id === docId || d.category === category)
    const updatedDocuments = (submission.documents || []).filter((d: any) => d.id !== docId && d.category !== category)

    // Optionally remove file from disk
    if (removedDoc?.savedFileName) {
      const diskPath = path.join(process.cwd(), 'public', 'uploads', 'lead-documents', id, removedDoc.savedFileName)
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath) } catch {}
      }
    }

    const updatedSubmission = {
      ...submission,
      documents: updatedDocuments,
      compiledPdfUrl: null, // Reset compiled PDF
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
    console.error('[policy-submission delete] Error:', err)
    return NextResponse.json({ error: 'Failed to delete document', details: err?.message }, { status: 500 })
  }
}
