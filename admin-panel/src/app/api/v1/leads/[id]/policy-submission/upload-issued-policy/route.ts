import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'policies', id)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const originalName = file.name || 'issued_policy.pdf'
    const ext = path.extname(originalName) || '.pdf'
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `policy_${Date.now()}_${safeBaseName}${ext}`
    const filePath = path.join(uploadDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    const publicUrl = `/uploads/policies/${id}/${fileName}`

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
