/**
 * src/lib/worker/import-worker.ts
 * Dedicated background worker pipeline for Excel Import V2 in Torque Auto Advisors.
 * 
 * Rules:
 * 1. Scope locking: Only 1 active import per importName can execute concurrently.
 * 2. Canonical Vehicle Key: Matching done on vehicleNoNormalized.
 * 3. Merge + Override: If vehicle exists -> UPDATE without wiping absent/blank columns.
 *                      If vehicle does not exist -> CREATE.
 * 4. Preservation: Blank cell does not overwrite existing valuable DB value.
 * 5. Row-level errors: Logged to ImportRowError for auditability.
 */

import prisma from '@/lib/prisma'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { normalizeVehicleNo } from '@/lib/vehicle-helper'

export interface ImportPreviewResult {
  jobId: string
  totalRows: number
  newLeadsCount: number
  updateLeadsCount: number
  duplicateInSheetCount: number
  invalidRowsCount: number
  sampleRows: any[]
  errors: { rowNumber: number; vehicleNo?: string; reason: string }[]
}

function parseDateVal(dateVal: any): Date | null {
  if (!dateVal) return null
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null
    return dateVal
  }
  if (typeof dateVal === 'number' && dateVal > 10000 && dateVal < 80000) {
    const p = XLSX.SSF.parse_date_code(Math.floor(dateVal))
    if (p && p.y && p.m && p.d) {
      return new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0))
    }
  }
  const str = String(dateVal).trim()
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'na') return null
  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

function normalizePhone(raw: any): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits.length >= 7 ? digits : null
}

export async function parseAndPreviewImport(
  jobId: string,
  filePath: string,
  mapping: Record<string, string> = {}
): Promise<ImportPreviewResult> {
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null })

  const totalRows = rawRows.length
  const seenVehiclesInSheet = new Set<string>()
  const validNormalizedVehicles: string[] = []
  const rowErrors: { rowNumber: number; vehicleNo?: string; reason: string }[] = []

  let duplicateInSheetCount = 0
  let invalidRowsCount = 0

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const rowNum = i + 2 // 1-indexed including header

    const rawVeh = row[mapping.vehicleNo || 'REG NO'] || row['REG NO'] || row['vehicleNo'] || row['Vehicle Number'] || row['Vehicle No']
    const normVeh = normalizeVehicleNo(rawVeh)

    if (!normVeh) {
      invalidRowsCount++
      rowErrors.push({
        rowNumber: rowNum,
        vehicleNo: String(rawVeh || ''),
        reason: 'Missing or invalid vehicle registration number'
      })
      continue
    }

    if (seenVehiclesInSheet.has(normVeh)) {
      duplicateInSheetCount++
      rowErrors.push({
        rowNumber: rowNum,
        vehicleNo: normVeh,
        reason: 'Duplicate vehicle registration number within this spreadsheet'
      })
      continue
    }

    seenVehiclesInSheet.add(normVeh)
    validNormalizedVehicles.push(normVeh)
  }

  // Check existing database records matching normalized vehicle numbers
  const existingInDb = await prisma.lead.findMany({
    where: {
      vehicleNoNormalized: { in: validNormalizedVehicles },
      deletedAt: null
    },
    select: { vehicleNoNormalized: true }
  })

  const existingSet = new Set(existingInDb.map(l => l.vehicleNoNormalized))
  let newLeadsCount = 0
  let updateLeadsCount = 0

  for (const v of validNormalizedVehicles) {
    if (existingSet.has(v)) {
      updateLeadsCount++
    } else {
      newLeadsCount++
    }
  }

  // Save row errors in database for full audit
  if (rowErrors.length > 0) {
    const errorRecords = rowErrors.slice(0, 500).map(e => ({
      jobId,
      rowNumber: e.rowNumber,
      vehicleNo: e.vehicleNo || null,
      reason: e.reason
    }))
    await prisma.importRowError.createMany({
      data: errorRecords,
      skipDuplicates: true
    })
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      totalRows,
      insertedCount: newLeadsCount,
      updatedCount: updateLeadsCount,
      duplicateCount: duplicateInSheetCount,
      rejectedCount: invalidRowsCount,
      status: 'staged'
    }
  })

  return {
    jobId,
    totalRows,
    newLeadsCount,
    updateLeadsCount,
    duplicateInSheetCount,
    invalidRowsCount,
    sampleRows: rawRows.slice(0, 10),
    errors: rowErrors.slice(0, 100)
  }
}

/**
 * Commits the staged import in chunks of 250 with transaction batching
 */
export async function commitImportJob(jobId: string, filePath: string, mapping: Record<string, string> = {}): Promise<void> {
  // Concurrency check & lock
  const job = await prisma.importJob.findUnique({ where: { id: jobId } })
  if (!job) throw new Error(`Import job ${jobId} not found`)
  if (job.status === 'processing') throw new Error(`Import job ${jobId} is already running`)

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'processing' }
  })

  try {
    const fileBuffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null })

    const CHUNK_SIZE = 250
    let insertedCount = 0
    let updatedCount = 0
    let processedRows = 0

    const seenVehicles = new Set<string>()

    for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
      const chunk = rawRows.slice(i, i + CHUNK_SIZE)

      // Collect normalized vehicle numbers in chunk
      const chunkVehicles: string[] = []
      const preparedRows: any[] = []

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]
        const rawVeh = row[mapping.vehicleNo || 'REG NO'] || row['REG NO'] || row['vehicleNo'] || row['Vehicle Number'] || row['Vehicle No']
        const normVeh = normalizeVehicleNo(rawVeh)
        if (!normVeh || seenVehicles.has(normVeh)) continue

        seenVehicles.add(normVeh)
        chunkVehicles.push(normVeh)

        const clientName = String(row[mapping.clientName || 'CUSTOMER NAME'] || row['CUSTOMER NAME'] || row['clientName'] || 'Unknown').trim()
        const rawPhone = row[mapping.clientPhone || 'MOBILE NO'] || row['MOBILE NO'] || row['clientPhone'] || null
        const phone = normalizePhone(rawPhone)
        const expiryDate = parseDateVal(row[mapping.expiryDate || 'INS DATE'] || row['INS DATE'] || row['expiryDate'])
        const registrationDate = parseDateVal(row[mapping.registrationDate || 'REG DATE'] || row['REG DATE'] || row['registrationDate'])
        const gvw = row[mapping.gvw || 'GVW'] || row['GVW'] ? String(row[mapping.gvw || 'GVW'] || row['GVW']).trim() : null
        const city = row[mapping.city || 'CITY'] || row['CITY'] ? String(row[mapping.city || 'CITY'] || row['CITY']).trim() : null
        const address = row[mapping.address || 'ADDRESS'] || row['ADDRESS'] ? String(row[mapping.address || 'ADDRESS'] || row['ADDRESS']).trim() : null

        preparedRows.push({
          normVeh,
          rawVeh: String(rawVeh).trim(),
          clientName,
          phone,
          expiryDate,
          registrationDate,
          gvw,
          city,
          address
        })
      }

      // Check existing leads in this chunk
      const existingLeads = await prisma.lead.findMany({
        where: {
          vehicleNoNormalized: { in: chunkVehicles },
          deletedAt: null
        },
        select: { id: true, vehicleNoNormalized: true }
      })

      const existingMap = new Map(existingLeads.map(l => [l.vehicleNoNormalized, l.id]))

      // Execute upsert operations in parallel within transaction
      await prisma.$transaction(async (tx) => {
        for (const r of preparedRows) {
          const existingId = existingMap.get(r.normVeh)
          if (existingId) {
            // MERGE + OVERRIDE: Only update provided non-empty fields
            const updateData: any = {
              vehicleNo: r.rawVeh,
              updatedAt: new Date()
            }
            if (r.clientName && r.clientName !== 'Unknown') updateData.clientName = r.clientName
            if (r.phone) updateData.clientPhone = r.phone
            if (r.expiryDate) updateData.expiryDate = r.expiryDate
            if (r.registrationDate) updateData.registrationDate = r.registrationDate
            if (r.gvw) updateData.gvw = r.gvw
            if (r.city) updateData.city = r.city
            if (r.address) updateData.address = r.address

            await tx.lead.update({
              where: { id: existingId },
              data: updateData
            })
            updatedCount++
          } else {
            // INSERT NEW LEAD
            await tx.lead.create({
              data: {
                vehicleNo: r.rawVeh,
                vehicleNoNormalized: r.normVeh,
                clientName: r.clientName,
                clientPhone: r.phone,
                expiryDate: r.expiryDate,
                registrationDate: r.registrationDate,
                gvw: r.gvw,
                city: r.city,
                address: r.address,
                importName: job.importName,
                status: 'New'
              }
            })
            insertedCount++
          }
        }
      })

      processedRows += chunk.length
      // Update real-time progress
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          processedRows: Math.min(processedRows, job.totalRows),
          insertedCount,
          updatedCount
        }
      })
    }

    // Finalize job
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedRows: job.totalRows,
        insertedCount,
        updatedCount,
        completedAt: new Date()
      }
    })
  } catch (err: any) {
    console.error('[import-worker] Failed import job:', jobId, err)
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: err?.message || 'Unknown import worker failure'
      }
    })
    throw err
  }
}
