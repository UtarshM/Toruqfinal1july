import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getFriendlyDocName, extractGoogleDriveId } from '@/lib/document-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, docId } = await params
    const userRole = context.role?.toUpperCase()
    const isAllowedRole = userRole === 'SUPER ADMIN' || userRole === 'ADMIN' || userRole === 'HR MANAGER' || userRole === 'MANAGER'

    if (context.userId !== id && !context.permissions.includes('users.view') && !isAllowedRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const document = await prisma.document.findUnique({
      where: { id: docId }
    })
    if (!document || document.entityId !== id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { fullName: true }
    })
    const userName = (user?.fullName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_')
    const friendlyName = getFriendlyDocName(document.fileName).replace(/[^a-zA-Z0-9_-]/g, '_')

    const url = new URL(req.url)
    const isDownload = url.searchParams.get('download') === 'true'
    const rawPath = document.filePath || ''

    // 1. If Google Drive link
    const driveId = extractGoogleDriveId(rawPath)
    if (driveId) {
      if (isDownload) {
        // Direct download URL from Google Drive
        const downloadUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`
        return NextResponse.redirect(downloadUrl)
      } else {
        // Web preview URL
        const previewUrl = `https://drive.google.com/file/d/${driveId}/view`
        return NextResponse.redirect(previewUrl)
      }
    }

    // 2. If Supabase Storage
    if (rawPath && !rawPath.startsWith('http')) {
      const { data } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(rawPath, 3600, isDownload ? { download: `${userName}_${friendlyName}` } : undefined)

      if (data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl)
      }
    }

    // 3. If direct HTTP URL
    if (rawPath.startsWith('http')) {
      return NextResponse.redirect(rawPath)
    }

    return NextResponse.json({ error: 'File path unavailable' }, { status: 404 })
  } catch (err: any) {
    console.error('Document View/Download Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
