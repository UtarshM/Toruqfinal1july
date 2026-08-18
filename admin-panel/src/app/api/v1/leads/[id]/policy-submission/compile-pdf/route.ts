import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
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

    const documents = submission.documents || []
    if (documents.length === 0) {
      return NextResponse.json({ error: 'Please upload at least one document before converting to single PDF' }, { status: 400 })
    }

    // 1. Create a new merged PDF document for uploaded document files
    const mergedPdf = await PDFDocument.create()
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

    // 2. Append all uploaded Document Pages (PDFs & Images)
    for (let dIdx = 0; dIdx < documents.length; dIdx++) {
      const doc = documents[dIdx]
      let fileBuffer: Buffer | null = null

      try {
        if (doc.storagePath) {
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('documents')
            .download(doc.storagePath)

          if (!downloadError && fileData) {
            fileBuffer = Buffer.from(await fileData.arrayBuffer())
          }
        }

        if (!fileBuffer && doc.filePath) {
          const fileUrl = doc.filePath.startsWith('http') ? doc.filePath : `https://admin-panel-delta-steel.vercel.app${doc.filePath}`
          const fetchRes = await fetch(fileUrl)
          if (fetchRes.ok) {
            fileBuffer = Buffer.from(await fetchRes.arrayBuffer())
          }
        }
      } catch (dlErr) {
        console.warn(`[compile-pdf] Could not download doc ${doc.fileName}:`, dlErr)
      }

      if (!fileBuffer) {
        console.warn(`[compile-pdf] Document buffer empty for ${doc.fileName}`)
        continue
      }

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

    // 4. Save consolidated PDF to Supabase Storage
    const compiledFileName = `policy_bundle_${id}_${Date.now()}.pdf`
    const compiledStoragePath = `lead-documents/${id}/${compiledFileName}`
    const pdfBytes = await mergedPdf.save()

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(compiledStoragePath, Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('[compile-pdf] Failed to upload compiled PDF:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl: compiledPublicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(compiledStoragePath)

    // 5. Update lead state
    const updatedSubmission = {
      ...submission,
      compiledPdfUrl: compiledPublicUrl,
      compiledStoragePath,
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
