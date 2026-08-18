import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import path from 'path'

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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const originalName = file.name || 'issued_policy.pdf'
    const ext = path.extname(originalName) || '.pdf'
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `policy_${Date.now()}_${safeBaseName}${ext}`
    const storagePath = `policies/${id}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('[upload-issued-policy] Supabase storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName
    })
  } catch (err: any) {
    console.error('[upload-issued-policy POST] Error:', err)
    return NextResponse.json({ error: 'Failed to upload policy PDF', details: err?.message }, { status: 500 })
  }
}
