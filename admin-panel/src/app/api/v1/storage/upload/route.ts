import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'data.manage_documents')
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string || 'general'
    const entityId = formData.get('entityId') as string || context!.userId

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `${entityType}/${entityId}/${safeFileName}`

    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, Buffer.from(buffer), {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath)

    const doc = await prisma.document.create({
      data: {
        entityType,
        entityId,
        fileName: file.name,
        filePath: storagePath,
        uploadedBy: context!.userId
      }
    })

    logActivity(context!.userId, 'upload', entityType, entityId, {
      fileName: file.name, documentId: doc.id
    })

    return NextResponse.json({ id: doc.id, fileName: file.name, filePath: storagePath, publicUrl })
  } catch (err: any) {
    console.error('Storage Upload Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
