import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'leads.edit')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, fullName: true, email: true, personalMobile: true, managerId: true }
        }
      }
    })

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const cf = (lead.customFields && typeof lead.customFields === 'object') ? (lead.customFields as any) : {}
    const submission = cf.policySubmission || null

    if (!submission) {
      return NextResponse.json({ error: 'No policy submission draft found for this lead' }, { status: 400 })
    }

    const formData = submission.formData || {}
    const documents = submission.documents || []

    if (documents.length === 0) {
      return NextResponse.json({ error: 'Please upload at least one document before converting to single PDF' }, { status: 400 })
    }

    // 1. Create a new merged PDF document for uploaded document files
    const mergedPdf = await PDFDocument.create()
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

    // 2. Append all uploaded Document Pages (PDFs & Images)
    const baseDir = process.cwd()
    for (let dIdx = 0; dIdx < documents.length; dIdx++) {
      const doc = documents[dIdx]
      const relPath = doc.filePath.startsWith('/') ? doc.filePath.slice(1) : doc.filePath
      const fullDiskPath = path.join(baseDir, 'public', relPath)

      if (!fs.existsSync(fullDiskPath)) {
        console.warn(`[compile-pdf] Document file not found on disk: ${fullDiskPath}`)
        continue
      }

      const fileBuffer = fs.readFileSync(fullDiskPath)
      const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf'

      if (isPdf) {
        try {
          const externalPdf = await PDFDocument.load(fileBuffer)
          const copiedPages = await mergedPdf.copyPages(externalPdf, externalPdf.getPageIndices())
          copiedPages.forEach(p => mergedPdf.addPage(p))
        } catch (pdfErr) {
          console.error(`[compile-pdf] Error copying pages from PDF ${doc.fileName}:`, pdfErr)
        }
      } else {
        // Image embedding (PNG, JPEG, etc.)
        try {
          const isJpg = doc.fileName?.toLowerCase().endsWith('.jpg') || doc.fileName?.toLowerCase().endsWith('.jpeg')
          const embeddedImage = isJpg ? await mergedPdf.embedJpg(fileBuffer) : await mergedPdf.embedPng(fileBuffer)

          const imgPage = mergedPdf.addPage([595.28, 841.89]) // A4
          const pSize = imgPage.getSize()

          // Header Banner on Image Page
          imgPage.drawRectangle({
            x: 0,
            y: pSize.height - 40,
            width: pSize.width,
            height: 40,
            color: rgb(0.08, 0.12, 0.2)
          })

          imgPage.drawText(`DOCUMENT ${dIdx + 1} OF ${documents.length}: ${(doc.categoryLabel || doc.category).toUpperCase()}`, {
            x: 25,
            y: pSize.height - 25,
            size: 10,
            font: fontBold,
            color: rgb(1, 1, 1)
          })

          // Calculate aspect-ratio fit
          const imgDims = embeddedImage.scale(1)
          const availWidth = pSize.width - 50
          const availHeight = pSize.height - 70

          const scale = Math.min(availWidth / imgDims.width, availHeight / imgDims.height, 1)
          const finalW = imgDims.width * scale
          const finalH = imgDims.height * scale

          const posX = (pSize.width - finalW) / 2
          const posY = (availHeight - finalH) / 2 + 20

          imgPage.drawImage(embeddedImage, {
            x: posX,
            y: posY,
            width: finalW,
            height: finalH
          })
        } catch (imgErr) {
          console.error(`[compile-pdf] Error embedding image ${doc.fileName}:`, imgErr)
        }
      }
    }

    // 4. Save consolidated PDF to disk
    const uploadDir = path.join(baseDir, 'public', 'uploads', 'lead-documents', id)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const compiledFileName = `policy_bundle_${id}_${Date.now()}.pdf`
    const compiledDiskPath = path.join(uploadDir, compiledFileName)
    const pdfBytes = await mergedPdf.save()
    fs.writeFileSync(compiledDiskPath, pdfBytes)

    const compiledPublicUrl = `/uploads/lead-documents/${id}/${compiledFileName}`

    // 5. Update lead state
    const updatedSubmission = {
      ...submission,
      compiledPdfUrl: compiledPublicUrl,
      compiledAt: new Date().toISOString(),
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
      compiledPdfUrl: compiledPublicUrl,
      submission: updatedSubmission
    })
  } catch (err: any) {
    console.error('[policy-submission compile-pdf] Error:', err)
    return NextResponse.json({ error: 'Failed to compile single PDF bundle', details: err?.message }, { status: 500 })
  }
}
