import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import { setImportJob, ImportJob } from './status/route'

import { notifyRole } from '@/lib/notify'
import { syncSpreadsheetForBatch } from '@/lib/spreadsheet-sync'
import { getUploadDir } from '@/lib/upload-helper'

function parseImportedDate(dateVal: any): Date | null {
  if (!dateVal) return null
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal
  }
  if (typeof dateVal === 'number') {
    if (dateVal > 10000 && dateVal < 80000) {
      const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000))
      return isNaN(d.getTime()) ? null : d
    }
  }

  const str = String(dateVal).trim()
  if (!str) return null

  // Check numeric excel serial in string form (e.g. "45678")
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10)
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime())) return d
  }

  // DD/MM/YYYY or DD-MM-YYYY (or with 2-digit year)
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    let year = parseInt(dmyMatch[3], 10)
    if (year < 100) year += year < 50 ? 2000 : 1900
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) return d
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10) - 1
    const day = parseInt(ymdMatch[3], 10)
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Fallback native Date.parse
  const nativeParsed = new Date(str)
  if (!isNaN(nativeParsed.getTime())) {
    return nativeParsed
  }

  return null
}

function normalizeMappingObject(rawMapping: any): Record<string, string> {
  if (!rawMapping) return {}
  if (Array.isArray(rawMapping)) {
    const obj: Record<string, string> = {}
    rawMapping.forEach((m: any) => {
      if (m && m.dbField && m.mappedHeader) {
        obj[m.dbField] = m.mappedHeader
      }
    })
    return obj
  }
  if (typeof rawMapping === 'object') {
    return rawMapping
  }
  return {}
}

function extractFieldValue(row: any, normalizedRow: any, mapHeader: string | undefined, aliases: string[]): any {
  if (mapHeader) {
    const val = getRowValueByHeader(row, mapHeader)
    if (val !== null && val !== undefined && String(val).trim() !== '') return val
  }
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return row[alias]
    }
    const norm = alias.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalizedRow[norm] !== undefined && normalizedRow[norm] !== null && String(normalizedRow[norm]).trim() !== '') {
      return normalizedRow[norm]
    }
  }
  return null
}

function getRowValueByHeader(row: any, mappedHeader: string | undefined | null): any {
  if (!row || !mappedHeader) return null

  // 1. Try exact match first
  if (row[mappedHeader] !== undefined && row[mappedHeader] !== null && String(row[mappedHeader]).trim() !== '') {
    return row[mappedHeader]
  }

  // 2. Try trimmed match
  const trimmedHeader = String(mappedHeader).trim()
  if (row[trimmedHeader] !== undefined && row[trimmedHeader] !== null && String(row[trimmedHeader]).trim() !== '') {
    return row[trimmedHeader]
  }

  // 3. Try normalized fuzzy match (remove non-alphanumerics and lowercase)
  const normMapped = trimmedHeader.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const key of Object.keys(row)) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normKey === normMapped && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key]
    }
  }

  return null
}

function normalizePhone(phone: any): string {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

/**
 * Simplified Agent Detector:
 * ONLY marks as agent if:
 * 1. This contact number is already a confirmed agent in the database
 * 2. The explicitly mapped agent column on THIS row has an affirmative value
 * Does NOT scan random cells — prevents false positives.
 */
function checkIsAgent(phone: string | null, agentPhoneSet: Set<string>, explicitAgentVal: any): boolean {
  // 1. Check if contact number on this row matches a confirmed known agent
  if (phone) {
    const cleanP = phone.trim()
    const normP = normalizePhone(phone)
    if (agentPhoneSet.has(cleanP) || (normP && normP.length >= 10 && agentPhoneSet.has(normP))) {
      return true
    }
  }

  // 2. Check explicitly mapped agent column value on THIS row
  if (explicitAgentVal !== null && explicitAgentVal !== undefined) {
    const valStr = String(explicitAgentVal).trim()
    if (valStr) {
      const valLower = valStr.toLowerCase()
      const digitsOnly = valStr.replace(/\D/g, '')
      // Don't treat a plain unrelated 10-digit number as an affirmative agent flag
      if (digitsOnly.length < 10 || valStr !== digitsOnly) {
        if (
          valLower.includes('agent') ||
          valLower.includes('broker') ||
          ['yes', 'true', '1', 'y', 'direct agent'].includes(valLower)
        ) {
          return true
        }
      }
    }
  }

  return false
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.import')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = req.headers.get('x-import-job-id') || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  try {
    const contentType = req.headers.get('content-type') || ''
    let rawData: any[] = []
    let importName = ''
    let rawMapping: any = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const mappingStr = formData.get('mapping') as string | null
      importName = (formData.get('importName') as string) || ''

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (mappingStr) {
        try {
          rawMapping = JSON.parse(mappingStr)
        } catch (e) {
          console.error('Failed to parse mapping JSON', e)
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.csv')) {
        const text = buffer.toString('utf-8')
        const parseResult = Papa.parse(text, { header: false, skipEmptyLines: true })
        const rawAoa = parseResult.data as any[][]
        if (rawAoa.length > 1) {
          const headers: string[] = rawAoa[0].map(h => String(h || '').trim())
          for (let c = 0; c < headers.length; c++) {
            if (!headers[c] || headers[c] === '') {
              for (let r = 1; r < rawAoa.length; r++) {
                const val = String(rawAoa[r][c] || '').trim().toLowerCase()
                if (val.includes('agent') || val.includes('broker')) {
                  headers[c] = 'Agent Number'
                  break
                }
              }
              if (!headers[c]) headers[c] = `Column_${c + 1}`
            }
          }
          rawData = rawAoa.slice(1).map(row => {
            const obj: any = {}
            headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : '' })
            return obj
          })
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const firstSheet = workbook.SheetNames[0]
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, defval: '' })
        if (rawAoa.length > 1) {
          const headers: string[] = rawAoa[0].map((h: any) => String(h || '').trim())
          for (let c = 0; c < headers.length; c++) {
            if (!headers[c] || headers[c] === '') {
              for (let r = 1; r < rawAoa.length; r++) {
                const val = String(rawAoa[r][c] || '').trim().toLowerCase()
                if (val.includes('agent') || val.includes('broker')) {
                  headers[c] = 'Agent Number'
                  break
                }
              }
              if (!headers[c]) headers[c] = `Column_${c + 1}`
            }
          }
          rawData = rawAoa.slice(1).map(row => {
            const obj: any = {}
            headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : '' })
            return obj
          })
        }
      } else {
        return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
      }
    } else {
      const body = await req.json()
      rawData = body.leads || []
      importName = body.importName || ''
      rawMapping = body.mapping || null
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty or could not be read.' }, { status: 400 })
    }

    const mapping = normalizeMappingObject(rawMapping)

    // Initialize background job tracker
    setImportJob(jobId, {
      id: jobId,
      name: importName || 'Leads Batch',
      status: 'processing',
      totalRows: rawData.length,
      processedRows: 0,
      validCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      assignedCount: 0,
      agentCount: 0,
      startTime: Date.now()
    })

    // 1. Process and Validate Leads in High-Speed Memory Pipeline
    const validLeads: any[] = []
    const errorRows: any[] = []
    const vehicleNumbers = new Set<string>()

    // Fetch active existing vehicle numbers and known agent phone numbers using lightweight select
    const existingLeads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: { not: 'Trashed' }
      },
      select: { vehicleNo: true, clientPhone: true, existingAgent: true }
    })
    const existingVehicles = new Set(existingLeads.map(l => l.vehicleNo).filter(Boolean))
    const agentPhoneSet = new Set<string>()
    existingLeads
      .filter(l => (l.existingAgent === 'Agent' || (l.existingAgent && l.existingAgent.toLowerCase().includes('agent'))) && l.clientPhone)
      .forEach(l => {
        agentPhoneSet.add(l.clientPhone!.trim())
        const norm = normalizePhone(l.clientPhone)
        if (norm) agentPhoneSet.add(norm)
      })

    const totalRaw = rawData.length
    for (let index = 0; index < totalRaw; index++) {
      const row = rawData[index]

      // Build normalized dictionary of row keys for fallback matching
      const normalizedRow: any = {}
      for (const key of Object.keys(row)) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          normalizedRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key]
        }
      }

      // Extract all core and optional fields cleanly
      const rawVehicle = extractFieldValue(row, normalizedRow, mapping.vehicleNo, [
        'vehicleNo', 'vehicle_no', 'Vehicle Number', 'Vehicle No', 'REG NO / Vehicle No', 'REG NO', 'Registration No', 'Reg No', 'regno', 'vehicle', 'vehical'
      ])
      const rawName = extractFieldValue(row, normalizedRow, mapping.clientName, [
        'clientName', 'client_name', 'Client Name', 'Owner Name', 'Insured Name', 'Customer Name', 'Party Name', 'name', 'insured', 'customer', 'party'
      ])
      const rawPhone = extractFieldValue(row, normalizedRow, mapping.clientPhone, [
        'clientPhone', 'client_phone', 'Phone Number', 'Mobile', 'Mobile No', 'Contact Number', 'Phone', 'phone_no', 'mobile_no', 'phone', 'contact', 'contact_no'
      ])
      const rawEmail = extractFieldValue(row, normalizedRow, mapping.clientEmail, [
        'clientEmail', 'client_email', 'Email Address', 'Email', 'email_id', 'emailid', 'mail'
      ])
      const rawExpiry = extractFieldValue(row, normalizedRow, mapping.expiryDate, [
        'expiryDate', 'expiry_date', 'Policy Expiry Date', 'Expiry Date', 'Due Date', 'Policy End Date', 'expiry', 'due_date'
      ])
      const rawRegDate = extractFieldValue(row, normalizedRow, mapping.registrationDate, [
        'registrationDate', 'registration_date', 'Registration Date', 'Reg Date', 'reg_date', 'registration'
      ])
      const rawGvw = extractFieldValue(row, normalizedRow, mapping.gvw, [
        'gvw', 'Gross Vehicle Weight (GVW)', 'Gross Vehicle Weight', 'Gross Weight', 'Weight', 'gross_weight'
      ])
      const rawAddress = extractFieldValue(row, normalizedRow, mapping.address, [
        'address', 'Address', 'Location', 'location'
      ])
      const rawCity = extractFieldValue(row, normalizedRow, mapping.city, [
        'city', 'City', 'State', 'state'
      ])
      const rawAgent = extractFieldValue(row, normalizedRow, mapping.existingAgent || mapping.agent || mapping.Agent, [
        'existingAgent', 'existing_agent', 'Agent', 'agent', 'Broker', 'broker', 'Agent Number', 'Agent No', 'is_agent', 'agent_status'
      ])
      const rawTemplate = extractFieldValue(row, normalizedRow, mapping.messageTemplate, [
        'messageTemplate', 'message_template', 'Message Template', 'template'
      ])

      const cleanVehicleNo = rawVehicle !== undefined && rawVehicle !== null ? String(rawVehicle).trim() : ''
      const cleanContactNo = rawPhone !== undefined && rawPhone !== null ? String(rawPhone).trim() : ''
      const cleanOwnerName = rawName !== undefined && rawName !== null && String(rawName).trim() !== ''
        ? String(rawName).trim()
        : (cleanVehicleNo || cleanContactNo || 'Lead Customer')

      // Must have at least a Vehicle Number OR a Contact Phone Number to be a valid lead
      if (!cleanVehicleNo && !cleanContactNo) {
        errorRows.push({
          row: index + 1,
          error: 'Missing required identifier (Both Vehicle No and Phone Number are empty)',
          data: row
        })
        continue
      }

      const vNo = cleanVehicleNo ? cleanVehicleNo.toUpperCase() : null

      if (vNo && (vehicleNumbers.has(vNo) || existingVehicles.has(vNo))) {
        errorRows.push({ row: index + 1, error: `Duplicate Vehicle No: ${vNo}` })
        continue
      }

      if (vNo) {
        vehicleNumbers.add(vNo)
      }

      // Simplified Agent Detection (only explicit column + known agents)
      const isAgent = checkIsAgent(cleanContactNo || null, agentPhoneSet, rawAgent)
      if (isAgent && cleanContactNo) {
        agentPhoneSet.add(cleanContactNo)
        const norm = normalizePhone(cleanContactNo)
        if (norm) agentPhoneSet.add(norm)
      }

      // Parse Dates safely
      const parsedExpiry = parseImportedDate(rawExpiry)
      const parsedRegDate = parseImportedDate(rawRegDate)

      let finalExpiryDate = parsedExpiry
      if (!finalExpiryDate) {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        finalExpiryDate = d
      }

      // Collect all custom fields so none of the user's mapped/custom data is lost
      const standardFields = [
        'clientName', 'clientPhone', 'clientEmail', 'vehicleNo', 'expiryDate',
        'registrationDate', 'gvw', 'address', 'city', 'existingAgent',
        'importName', 'messageTemplate', 'status', 'id', 'assignedTo', 'deletedAt'
      ]
      const customFields: Record<string, any> = {}

      // 1. Include mapped custom columns
      if (Object.keys(mapping).length > 0) {
        for (const [dbKey, headerName] of Object.entries(mapping)) {
          if (!standardFields.includes(dbKey)) {
            const val = getRowValueByHeader(row, headerName)
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              customFields[dbKey] = val
            }
          }
        }
      }

      // 2. Include any other non-standard columns directly on row
      Object.keys(row).forEach(k => {
        if (
          !standardFields.includes(k) &&
          customFields[k] === undefined &&
          row[k] !== undefined &&
          row[k] !== null &&
          String(row[k]).trim() !== ''
        ) {
          customFields[k] = row[k]
        }
      })

      validLeads.push({
        vehicleNo: vNo,
        clientName: cleanOwnerName,
        clientPhone: cleanContactNo || null,
        clientEmail: rawEmail ? String(rawEmail).trim() : null,
        expiryDate: finalExpiryDate,
        registrationDate: parsedRegDate,
        gvw: rawGvw ? String(rawGvw).trim() : null,
        address: rawAddress ? String(rawAddress).trim() : null,
        city: rawCity ? String(rawCity).trim() : null,
        messageTemplate: rawTemplate ? String(rawTemplate).trim() : null,
        existingAgent: isAgent ? 'Agent' : (rawAgent ? String(rawAgent).trim() : null),
        importName: importName ? importName.trim() : null,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        status: 'New'
      })

      // Update progress periodically
      if (index % 2500 === 0 || index === totalRaw - 1) {
        const duplicateCount = errorRows.filter(e => e.error.includes('Duplicate')).length
        setImportJob(jobId, {
          id: jobId,
          name: importName || 'Leads Batch',
          status: 'processing',
          totalRows: totalRaw,
          processedRows: index + 1,
          validCount: validLeads.length,
          errorCount: errorRows.length - duplicateCount,
          duplicateCount,
          assignedCount: 0,
          agentCount: validLeads.filter(l => l.existingAgent === 'Agent').length,
          startTime: Date.now()
        })
      }
    }

    if (validLeads.length === 0) {
      const duplicateCount = errorRows.filter(e => e.error.includes('Duplicate')).length
      const invalidCount = errorRows.length - duplicateCount
      const headersFound = rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'None'

      let errorMsg = 'No new leads were imported.'
      if (duplicateCount > 0 && invalidCount === 0) {
        errorMsg = `All leads in the file already exist in the system (${duplicateCount} duplicates found).`
      } else if (invalidCount > 0) {
        errorMsg = `No valid leads found. ${invalidCount} rows had missing information.\n\nDetected Headers: ${headersFound}\nRequired: Name, Phone, and Vehicle No.`
      }

      setImportJob(jobId, {
        id: jobId,
        name: importName || 'Leads Batch',
        status: 'failed',
        totalRows: totalRaw,
        processedRows: totalRaw,
        validCount: 0,
        errorCount: invalidCount,
        duplicateCount,
        assignedCount: 0,
        agentCount: 0,
        startTime: Date.now(),
        completedTime: Date.now(),
        errorMessage: errorMsg
      })

      return NextResponse.json({
        error: errorMsg,
        jobId,
        stats: { total: rawData.length, valid: 0, errors: errorRows.length, duplicates: duplicateCount },
        errorDetails: errorRows.slice(0, 10)
      }, { status: 400 })
    }

    // 2. Data Merge Only — NO assignment at import time
    // All leads are stored as unassigned (assignedTo: null)
    // Assignment happens separately via Monthly Lead Assignment from Imported Spreadsheets

    // 3. Batch Create Leads in safe chunks of 3,000 records
    const CHUNK_SIZE = 3000
    for (let i = 0; i < validLeads.length; i += CHUNK_SIZE) {
      const chunk = validLeads.slice(i, i + CHUNK_SIZE)
      await prisma.lead.createMany({
        data: chunk,
        skipDuplicates: true
      })
    }

    // 5. Create Pending DataChangeRequests and Send Admin Alert for Detected Agents
    const batchImportName = importName ? importName.trim() : 'batch'
    const agentLeadsInBatch = await prisma.lead.findMany({
      where: {
        importName: batchImportName,
        existingAgent: 'Agent',
        status: { not: 'Trashed' },
        deletedAt: null
      },
      select: { id: true, clientName: true, clientPhone: true, vehicleNo: true }
    })

    if (agentLeadsInBatch.length > 0) {
      // Create pending approval records for each agent lead
      for (const agLead of agentLeadsInBatch) {
        const existingReq = await prisma.dataChangeRequest.findFirst({
          where: {
            entityType: 'Lead',
            entityId: agLead.id,
            field: 'existingAgent',
            status: 'pending'
          }
        })
        if (!existingReq) {
          await prisma.dataChangeRequest.create({
            data: {
              requestedBy: context.userId,
              entityType: 'Lead',
              entityId: agLead.id,
              field: 'existingAgent',
              oldValue: 'Unassigned',
              newValue: 'Agent',
              reason: `Detected Agent in import "${batchImportName}" (Contact: ${agLead.clientPhone || agLead.vehicleNo})`,
              status: 'pending'
            }
          }).catch(err => console.warn('[leads/import] Failed to create approval request:', err))
        }
      }

      // Send In-App + Push Notification Alert to all Admins and Super Admins
      await notifyRole('Admin', {
        title: `🚨 ${agentLeadsInBatch.length} Agent Leads Detected in "${batchImportName}"`,
        body: `${agentLeadsInBatch.length} contact(s) detected as Agent/Broker. Held in Pending Approval for Admin review.`,
        type: 'warning',
        entityType: 'agent_approval',
        data: {
          importName: batchImportName,
          agentCount: agentLeadsInBatch.length,
          leads: agentLeadsInBatch.slice(0, 5)
        }
      }).catch(() => {})

      await notifyRole('Super Admin', {
        title: `🚨 ${agentLeadsInBatch.length} Agent Leads Detected in "${batchImportName}"`,
        body: `${agentLeadsInBatch.length} contact(s) detected as Agent/Broker. Held in Pending Approval for Admin review.`,
        type: 'warning',
        entityType: 'agent_approval',
        data: {
          importName: batchImportName,
          agentCount: agentLeadsInBatch.length,
          leads: agentLeadsInBatch.slice(0, 5)
        }
      }).catch(() => {})
    }

    // 6. Direct Spreadsheet Synchronization on Disk
    const uploadDir = getUploadDir()
    await syncSpreadsheetForBatch(batchImportName, uploadDir).catch(e => console.warn('[leads/import] Batch sync warning:', e))
    await syncSpreadsheetForBatch('all_leads', uploadDir).catch(e => console.warn('[leads/import] Master sync warning:', e))

    // 7. Complete Job Tracking
    const duplicateCount = errorRows.filter(e => e.error.includes('Duplicate')).length
    const agentCount = agentLeadsInBatch.length

    setImportJob(jobId, {
      id: jobId,
      name: importName || 'Leads Batch',
      status: 'completed',
      totalRows: totalRaw,
      processedRows: totalRaw,
      validCount: validLeads.length,
      errorCount: errorRows.length - duplicateCount,
      duplicateCount,
      assignedCount: 0,
      agentCount,
      startTime: Date.now(),
      completedTime: Date.now()
    })

    return NextResponse.json({
      success: true,
      jobId,
      stats: {
        total: totalRaw,
        valid: validLeads.length,
        duplicates: duplicateCount,
        errors: errorRows.length - duplicateCount,
        imported: validLeads.length,
        agentCount
      },
      message: `${validLeads.length} leads imported into master database (unassigned). Use Monthly Assignment to distribute leads.`,
      agentLeadsCount: agentCount,
      errorDetails: errorRows.slice(0, 10)
    })
  } catch (err: any) {
    console.error('[leads/import POST] Error:', err)
    setImportJob(jobId, {
      id: jobId,
      name: 'Import Batch',
      status: 'failed',
      totalRows: 0,
      processedRows: 0,
      validCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      assignedCount: 0,
      agentCount: 0,
      startTime: Date.now(),
      completedTime: Date.now(),
      errorMessage: err?.message || 'Server error during import'
    })
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 })
  }
}

