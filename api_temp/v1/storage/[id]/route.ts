import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600')

    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // Only uploader, admins, or data managers can access
    const canAccess =
      doc.uploadedBy === context!.userId ||
      context!.permissions.includes('data.manage_documents') ||
      context!.role === 'Super Admin' ||
      context!.role === 'Admin'

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied to this document' }, { status: 403 })
    }

    // Generate a signed URL
    const { data, error: signedError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.filePath, expiresIn)

    if (signedError) {
      return NextResponse.json({ error: signedError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl, 
      fileName: doc.fileName,
      id: doc.id
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'data.manage_documents')
  if (error) return error

  try {
    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    await supabaseAdmin.storage.from('documents').remove([doc.filePath])
    await prisma.document.delete({ where: { id } })

    logActivity(context!.userId, 'delete_document', doc.entityType, doc.entityId, {
      fileName: doc.fileName
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
