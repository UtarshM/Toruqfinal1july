import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getFriendlyDocName, extractGoogleDriveId } from '@/lib/document-utils'
import { formatDateDMY, formatDateTimeDMY } from '@/lib/date-format'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const userRole = context.role?.toUpperCase()
    const isAllowedRole = userRole === 'SUPER ADMIN' || userRole === 'ADMIN' || userRole === 'HR MANAGER' || userRole === 'MANAGER'

    if (context.userId !== id && !context.permissions.includes('users.view') && !isAllowedRole) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        manager: { select: { fullName: true, email: true } }
      }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch all user KYC / attached documents
    const documents = await prisma.document.findMany({
      where: {
        entityType: 'User',
        entityId: id
      },
      orderBy: { createdAt: 'asc' }
    })

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents attached to compile for this user' }, { status: 400 })
    }

    // Initialize merged PDF
    const mergedPdf = await PDFDocument.create()
    const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

    // ==========================================
    // PAGE 1: COVER / EMPLOYEE KYC SUMMARY DOSSIER
    // ==========================================
    const coverPage = mergedPdf.addPage([595.28, 841.89]) // Standard A4
    const { width, height } = coverPage.getSize()

    // Top Dark Blue Header Banner
    coverPage.drawRectangle({
      x: 0,
      y: height - 110,
      width: width,
      height: 110,
      color: rgb(0.06, 0.09, 0.16) // #0f172a slate-900
    })

    // Accent line
    coverPage.drawRectangle({
      x: 0,
      y: height - 114,
      width: width,
      height: 4,
      color: rgb(0.15, 0.39, 0.92) // #2563eb blue-600
    })

    // Header Titles
    coverPage.drawText('TORQUE AUTO ADVISORS', {
      x: 40,
      y: height - 48,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1)
    })

    coverPage.drawText('OFFICIAL EMPLOYEE KYC & ONBOARDING DOSSIER', {
      x: 40,
      y: height - 70,
      size: 11,
      font: fontBold,
      color: rgb(0.58, 0.77, 1) // light blue
    })

    const generatedTimeIST = formatDateTimeDMY(new Date())
    coverPage.drawText(`Generated on: ${generatedTimeIST} (IST) | Confidential Record`, {
      x: 40,
      y: height - 92,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.9)
    })

    // Section 1: Employee Information
    let currentY = height - 145

    coverPage.drawText('EMPLOYEE PROFILE INFORMATION', {
      x: 40,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.09, 0.13, 0.24)
    })
    currentY -= 8

    // Draw card box for employee details
    coverPage.drawRectangle({
      x: 40,
      y: currentY - 145,
      width: width - 80,
      height: 145,
      borderColor: rgb(0.88, 0.91, 0.94),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 0.99)
    })

    const empInfoLeft = [
      { label: 'FULL NAME', value: user.fullName || '—' },
      { label: 'EMAIL ADDRESS', value: user.email || '—' },
      { label: 'ROLE / DESIGNATION', value: (user.role?.name || 'Sales Executive').toUpperCase() },
      { label: 'PERSONAL MOBILE', value: user.personalMobile || '—' },
      { label: 'HOME / EMERGENCY PHONE', value: user.homeMobile || '—' }
    ]

    const empInfoRight = [
      { label: 'DATE OF BIRTH', value: user.dateOfBirth ? formatDateDMY(user.dateOfBirth) : '—' },
      { label: 'DATE OF JOINING', value: user.joiningDate ? formatDateDMY(user.joiningDate) : '—' },
      { label: 'HIGHEST QUALIFICATION', value: user.highestQualification || '—' },
      { label: 'REPORTING MANAGER', value: user.manager?.fullName ? `${user.manager.fullName} (${user.manager.email})` : 'Direct / Management' },
      { label: 'ONBOARDING STATUS', value: user.isActive ? 'Active & Approved' : 'Pending Verification' }
    ]

    let fieldY = currentY - 24
    empInfoLeft.forEach(f => {
      coverPage.drawText(f.label, { x: 55, y: fieldY, size: 7.5, font: fontBold, color: rgb(0.4, 0.45, 0.55) })
      coverPage.drawText(f.value, { x: 55, y: fieldY - 11, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })
      fieldY -= 26
    })

    fieldY = currentY - 24
    empInfoRight.forEach(f => {
      coverPage.drawText(f.label, { x: 310, y: fieldY, size: 7.5, font: fontBold, color: rgb(0.4, 0.45, 0.55) })
      coverPage.drawText(f.value, { x: 310, y: fieldY - 11, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) })
      fieldY -= 26
    })

    currentY -= 175

    // Section 2: Attached Documents Index
    coverPage.drawText(`ATTACHED KYC DOCUMENTS (${documents.length})`, {
      x: 40,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.09, 0.13, 0.24)
    })
    currentY -= 12

    // Draw Table Header
    coverPage.drawRectangle({
      x: 40,
      y: currentY - 20,
      width: width - 80,
      height: 20,
      color: rgb(0.15, 0.23, 0.36) // slate-800
    })

    coverPage.drawText('#', { x: 50, y: currentY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) })
    coverPage.drawText('DOCUMENT NAME', { x: 75, y: currentY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) })
    coverPage.drawText('DOCUMENT CODE', { x: 280, y: currentY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) })
    coverPage.drawText('UPLOADED DATE', { x: 410, y: currentY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) })
    coverPage.drawText('STATUS', { x: 495, y: currentY - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) })

    currentY -= 20

    // Table Rows
    documents.forEach((doc, idx) => {
      const isEven = idx % 2 === 0
      const rowH = 22
      coverPage.drawRectangle({
        x: 40,
        y: currentY - rowH,
        width: width - 80,
        height: rowH,
        color: isEven ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.92, 0.95),
        borderWidth: 0.5
      })

      const friendlyName = getFriendlyDocName(doc.fileName)
      const uploadDateStr = doc.createdAt ? formatDateDMY(doc.createdAt) : '—'

      coverPage.drawText(`${idx + 1}`, { x: 50, y: currentY - 15, size: 8, font: fontBold, color: rgb(0.3, 0.35, 0.45) })
      coverPage.drawText(friendlyName, { x: 75, y: currentY - 15, size: 8.5, font: fontBold, color: rgb(0.1, 0.15, 0.25) })
      coverPage.drawText(doc.fileName || 'DOCUMENT', { x: 280, y: currentY - 15, size: 8, font: fontRegular, color: rgb(0.3, 0.35, 0.45) })
      coverPage.drawText(uploadDateStr, { x: 410, y: currentY - 15, size: 8, font: fontRegular, color: rgb(0.3, 0.35, 0.45) })
      coverPage.drawText('Attached', { x: 495, y: currentY - 15, size: 8, font: fontBold, color: rgb(0.1, 0.55, 0.3) })

      currentY -= rowH
    })

    // Bottom Verification Notice
    coverPage.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: 48,
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1)
    })

    coverPage.drawText('VERIFICATION & COMPLIANCE STATEMENT', {
      x: 55,
      y: 72,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.5)
    })
    coverPage.drawText('This compiled dossier contains all authenticated onboarding documents submitted by the employee.', {
      x: 55,
      y: 60,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55)
    })
    coverPage.drawText('Generated automatically for verification by Torque Auto Advisors Human Resources & Operations Management.', {
      x: 55,
      y: 49,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55)
    })

    // ==========================================
    // APPEND EACH ATTACHED DOCUMENT
    // ==========================================
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      const friendlyName = getFriendlyDocName(doc.fileName)
      let fileBuffer: Buffer | null = null

      try {
        const rawPath = doc.filePath || ''

        // 1. If Supabase Storage relative path
        if (rawPath && !rawPath.startsWith('http')) {
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('documents')
            .download(rawPath)

          if (!downloadError && fileData) {
            fileBuffer = Buffer.from(await fileData.arrayBuffer())
          }
        }

        // 2. If Google Drive URL
        const driveId = extractGoogleDriveId(rawPath)
        if (!fileBuffer && driveId) {
          const driveUrls = [
            `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`,
            `https://drive.google.com/uc?export=download&id=${driveId}`,
            `https://docs.google.com/uc?export=download&id=${driveId}`,
            `https://lh3.googleusercontent.com/d/${driveId}`
          ]

          for (const dUrl of driveUrls) {
            try {
              const res = await fetch(dUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                redirect: 'follow'
              })
              if (res.ok) {
                const b = Buffer.from(await res.arrayBuffer())
                if (b.length > 500) { // Valid file bytes
                  fileBuffer = b
                  break
                }
              }
            } catch {
              // Try next URL
            }
          }
        }

        // 3. If direct HTTP URL
        if (!fileBuffer && rawPath.startsWith('http')) {
          const res = await fetch(rawPath, { redirect: 'follow' })
          if (res.ok) {
            fileBuffer = Buffer.from(await res.arrayBuffer())
          }
        }
      } catch (err) {
        console.warn(`[compile-pdf] Could not fetch document ${doc.fileName}:`, err)
      }

      // Check if file buffer is a PDF
      const isPdfBuffer = fileBuffer && fileBuffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')

      if (isPdfBuffer && fileBuffer) {
        try {
          const extPdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
          const copiedPages = await mergedPdf.copyPages(extPdf, extPdf.getPageIndices())

          copiedPages.forEach((p, pageIdx) => {
            const pSize = p.getSize()
            // Top Header Bar
            p.drawRectangle({
              x: 0,
              y: pSize.height - 35,
              width: pSize.width,
              height: 35,
              color: rgb(0.06, 0.09, 0.16)
            })

            const bannerText = `${friendlyName.toUpperCase()}  |  Page ${pageIdx + 1} of ${copiedPages.length}  |  Employee: ${user.fullName}`
            p.drawText(bannerText, {
              x: 20,
              y: pSize.height - 22,
              size: 9,
              font: fontBold,
              color: rgb(1, 1, 1)
            })

            mergedPdf.addPage(p)
          })
          continue
        } catch (pdfErr) {
          console.error(`[compile-pdf] Error copying PDF pages for ${doc.fileName}:`, pdfErr)
        }
      }

      // Check if file buffer is an Image (JPG, PNG)
      if (fileBuffer) {
        try {
          const isJpg = fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8
          const isPng = fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50

          let embeddedImg: any = null
          if (isJpg || (!isPng && doc.fileName?.toLowerCase().includes('photo'))) {
            try {
              embeddedImg = await mergedPdf.embedJpg(fileBuffer)
            } catch {
              try { embeddedImg = await mergedPdf.embedPng(fileBuffer) } catch {}
            }
          } else {
            try {
              embeddedImg = await mergedPdf.embedPng(fileBuffer)
            } catch {
              try { embeddedImg = await mergedPdf.embedJpg(fileBuffer) } catch {}
            }
          }

          if (embeddedImg) {
            const imgPage = mergedPdf.addPage([595.28, 841.89])
            const pSize = imgPage.getSize()

            // Header bar
            imgPage.drawRectangle({
              x: 0,
              y: pSize.height - 35,
              width: pSize.width,
              height: 35,
              color: rgb(0.06, 0.09, 0.16)
            })

            const bannerText = `${friendlyName.toUpperCase()}  |  Employee: ${user.fullName}`
            imgPage.drawText(bannerText, {
              x: 20,
              y: pSize.height - 22,
              size: 9.5,
              font: fontBold,
              color: rgb(1, 1, 1)
            })

            // Scale image cleanly to fit page
            const dims = embeddedImg.scale(1)
            const maxW = pSize.width - 60
            const maxH = pSize.height - 70
            const scaleFactor = Math.min(maxW / dims.width, maxH / dims.height, 1)

            const finalW = dims.width * scaleFactor
            const finalH = dims.height * scaleFactor
            const posX = (pSize.width - finalW) / 2
            const posY = (maxH - finalH) / 2 + 20

            imgPage.drawImage(embeddedImg, {
              x: posX,
              y: posY,
              width: finalW,
              height: finalH
            })
            continue
          }
        } catch (imgErr) {
          console.error(`[compile-pdf] Image embedding error for ${doc.fileName}:`, imgErr)
        }
      }

      // If document could not be directly embedded (e.g. Google Drive auth protection)
      // Add an informative dedicated page with the direct link
      const fallbackPage = mergedPdf.addPage([595.28, 841.89])
      const fbSize = fallbackPage.getSize()

      fallbackPage.drawRectangle({
        x: 0,
        y: fbSize.height - 35,
        width: fbSize.width,
        height: 35,
        color: rgb(0.06, 0.09, 0.16)
      })

      fallbackPage.drawText(`${friendlyName.toUpperCase()}  |  Employee: ${user.fullName}`, {
        x: 20,
        y: fbSize.height - 22,
        size: 9.5,
        font: fontBold,
        color: rgb(1, 1, 1)
      })

      // Notice Box
      fallbackPage.drawRectangle({
        x: 50,
        y: fbSize.height / 2 - 80,
        width: fbSize.width - 100,
        height: 160,
        borderColor: rgb(0.85, 0.88, 0.93),
        borderWidth: 1.5,
        color: rgb(0.97, 0.98, 1)
      })

      fallbackPage.drawText(friendlyName, {
        x: 70,
        y: fbSize.height / 2 + 40,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.3)
      })

      fallbackPage.drawText(`Original Attachment Code: ${doc.fileName || 'DOCUMENT'}`, {
        x: 70,
        y: fbSize.height / 2 + 20,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.55)
      })

      fallbackPage.drawText('This document is hosted on an external drive or cloud storage repository.', {
        x: 70,
        y: fbSize.height / 2 - 5,
        size: 9,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35)
      })

      fallbackPage.drawText('Direct Document Link:', {
        x: 70,
        y: fbSize.height / 2 - 25,
        size: 8.5,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.7)
      })

      const displayUrl = doc.filePath?.substring(0, 75) + (doc.filePath?.length > 75 ? '...' : '')
      fallbackPage.drawText(displayUrl, {
        x: 70,
        y: fbSize.height / 2 - 42,
        size: 8,
        font: fontRegular,
        color: rgb(0.1, 0.35, 0.8)
      })
    }

    const pdfBytes = await mergedPdf.save()
    const safeUserName = (user.fullName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${safeUserName}_Complete_KYC_Dossier.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('[compile-pdf] Consolidated PDF error:', error)
    return NextResponse.json({ error: error.message || 'Failed to compile consolidated KYC PDF' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  return GET(req, props)
}
