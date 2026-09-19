import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const { error } = await validateAuth(req)
    if (error) return error
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'claims'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name
    const ext = path.extname(originalName) || ''
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${Date.now()}_${sanitizedBase}${ext}`
    const storagePath = `${folder}/${fileName}`

    let publicUrl = ''

    // Attempt 1: Upload via Supabase Storage
    try {
      if (supabaseAdmin) {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('documents')
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true
          })

        if (!uploadError) {
          const { data } = supabaseAdmin.storage.from('documents').getPublicUrl(storagePath)
          if (data?.publicUrl) {
            publicUrl = data.publicUrl
          }
        } else {
          console.warn('Supabase storage upload returned error, falling back to local:', uploadError.message)
        }
      }
    } catch (storageErr) {
      console.warn('Supabase storage exception, falling back to local:', storageErr)
    }

    // Attempt 2: Fallback to local public/uploads directory
    if (!publicUrl) {
      const localDir = path.join(process.cwd(), 'public', 'uploads', folder)
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true })
      }
      const localFilePath = path.join(localDir, fileName)
      fs.writeFileSync(localFilePath, buffer)
      publicUrl = `/uploads/${folder}/${fileName}`
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.type
    })
  } catch (err: any) {
    console.error('File upload error:', err)
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 })
  }
}
