import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getUploadDir } from '@/lib/upload-helper'
import path from 'path'
import fs from 'fs'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.import')
  if (error || !context) return error || apiError('Unauthorized', 'UNAUTHORIZED', 401)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const importName = (formData.get('importName') as string)?.trim()

    if (!file) {
      return apiError('Excel file is required', 'VALIDATION_ERROR', 400)
    }
    if (!importName) {
      return apiError('Import Batch Name is required', 'VALIDATION_ERROR', 400)
    }

    // Check concurrency: Ensure no other job is active for this importName
    const activeJob = await prisma.importJob.findFirst({
      where: {
        importName,
        status: { in: ['pending', 'processing', 'staged'] }
      }
    })

    if (activeJob) {
      return apiError(
        `An active import job is already running for batch "${importName}". Please wait for it to complete.`,
        'CONFLICT',
        409,
        { activeJobId: activeJob.id }
      )
    }

    const uploadDir = getUploadDir()
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const stagedPath = path.join(uploadDir, safeFileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(stagedPath, buffer)

    const job = await prisma.importJob.create({
      data: {
        fileName: file.name,
        importName,
        fileUrl: stagedPath,
        createdById: context.userId,
        status: 'pending'
      }
    })

    return apiSuccess({
      jobId: job.id,
      fileName: file.name,
      importName,
      status: job.status
    }, 201)
  } catch (err: any) {
    console.error('[imports-upload] Error:', err)
    return apiError(err?.message || 'Failed to upload import file', 'INTERNAL_ERROR', 500, null, req)
  }
}
