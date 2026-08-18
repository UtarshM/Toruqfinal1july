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
  // Validate that user is authenticated and active
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const url = new URL(req.url)
    const queryCategory = url.searchParams.get('category')
    const headerCategory = req.headers.get('x-document-category')

    let file: File | null = null
    let category: string | null = queryCategory || headerCategory || null

    try {
      const formData = await req.formData()
      file = formData.get('file') as File | null
      if (!category) {
        category = (formData.get('category') as string | null) || null
      }
    } catch (formErr) {
      console.warn('[upload] FormData parsing failed:', formErr)
    }

    if (!category) {
      return NextResponse.json({ error: 'Missing document category' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found in database' }, { status: 404 })

    // Ensure documents bucket exists in Supabase Storage
    try {
      await supabaseAdmin.storage.createBucket('documents', { public: true })
    } catch {}

    let fileBuffer: Buffer
    let originalName = 'document.jpg'
    let mimeType = 'image/jpeg'

    if (file) {
      originalName = file.name || `${category.toLowerCase()}.jpg`
      mimeType = file.type || 'application/octet-stream'
      fileBuffer = Buffer.from(await file.arrayBuffer())
    } else {
      const rawArray = await req.arrayBuffer()
      if (!rawArray || rawArray.byteLength === 0) {
        return NextResponse.json({ error: 'No file content received' }, { status: 400 })
      }
      fileBuffer = Buffer.from(rawArray)
      originalName = req.headers.get('x-file-name') || `${category.toLowerCase()}.jpg`
      mimeType = req.headers.get('content-type') || 'application/octet-stream'
    }

    const ext = path.extname(originalName) || '.jpg'
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${category.toLowerCase()}_${Date.now()}_${safeBaseName}${ext}`
    const storagePath = `lead-documents/${id}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('[upload document] Supabase storage error:', uploadError)
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath)

    const docEntry = {
      id: uuidv4(),
      category,
      categoryLabel: DOCUMENT_CATEGORIES[category] || category,
      fileName: originalName,
      savedFileName: fileName,
      filePath: publicUrl,
      storagePath,
      fileSize: fileBuffer.length,
      fileType: mimeType,
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

    // Replace if this category already had a doc, or append if new
    const existingDocs = (submission.documents || []).filter((d: any) => d.category !== category)
    const updatedDocuments = [...existingDocs, docEntry]

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

    // Remove file from Supabase Storage
    if (removedDoc?.storagePath) {
      try {
        await supabaseAdmin.storage.from('documents').remove([removedDoc.storagePath])
      } catch {}
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
