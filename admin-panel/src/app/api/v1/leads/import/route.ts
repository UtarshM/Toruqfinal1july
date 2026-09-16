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

export const maxDuration = 60

function parseImportedDate(dateVal: any): Date | null {
  if (!dateVal) return null

  // If already a Date object
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null
    let ms = dateVal.getTime()
    const utcHours = dateVal.getUTCHours()
    const utcMins = dateVal.getUTCMinutes()
    // SheetJS IST artifact: 18:28-18:30 UTC represents midnight (00:00) IST
    if (utcHours === 18 && utcMins >= 28 && utcMins <= 30) {
      ms += (30 - utcMins) * 60 * 1000 + 1000
    }
    const d = new Date(ms)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d).split('-')
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    return new Date(Date.UTC(y, m, day, 12, 0, 0))
  }

  // If numeric Excel serial (e.g. 40644 or 40644.00011574074)
  if (typeof dateVal === 'number') {
    if (dateVal > 10000 && dateVal < 80000) {
      const p = XLSX.SSF.parse_date_code(Math.floor(dateVal))
      if (p && p.y && p.m && p.d) {
        return new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0))
      }
      const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000))
      if (!isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
      }
    }
  }

  const str = String(dateVal).trim()
  if (!str || str.toUpperCase() === 'N/A' || str.toUpperCase() === 'NA' || str === 'null' || str === 'undefined' || str === '—' || str === '-') return null

  // Numeric excel serial in string form (e.g. "46322" or "40644.00011574074")
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    if (num > 10000 && num < 80000) {
      const p = XLSX.SSF.parse_date_code(Math.floor(num))
      if (p && p.y && p.m && p.d) {
        return new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0))
      }
      const d = new Date(Math.round((num - 25569) * 86400 * 1000))
      if (!isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
      }
    }
  }

  // DDMMYYYY without delimiters (8 digits e.g. "11042011" or "16122026")
  const ddmmyyyyMatch = str.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10)
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1
    const year = parseInt(ddmmyyyyMatch[3], 10)
    if (month >= 0 && month < 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return new Date(Date.UTC(year, month, day, 12, 0, 0))
    }
  }

  // Pure YYYY-MM-DD or YYYY/MM/DD
  const pureYmdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:$|\s)/)
  if (pureYmdMatch) {
    const year = parseInt(pureYmdMatch[1], 10)
    const month = parseInt(pureYmdMatch[2], 10) - 1
    const day = parseInt(pureYmdMatch[3], 10)
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day, 12, 0, 0))
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY (or with 2-digit year)
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:$|\s)/)
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10)
    let p2 = parseInt(dmyMatch[2], 10)
    let year = parseInt(dmyMatch[3], 10)
    if (year < 100) year += year < 50 ? 2000 : 1900

    let day = p1
    let month = p2 - 1

    // Disambiguate: If p2 > 12 and p1 <= 12, it must be M/D/Y format (e.g. 4/19/2011)
    if (p2 > 12 && p1 >= 1 && p1 <= 12) {
      month = p1 - 1
      day = p2
    }

    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day, 12, 0, 0))
    }
  }

  // ISO string or other date formats (evaluate in Asia/Kolkata IST)
  const nativeParsed = new Date(str)
  if (!isNaN(nativeParsed.getTime())) {
    let ms = nativeParsed.getTime()
    const utcHours = nativeParsed.getUTCHours()
    const utcMins = nativeParsed.getUTCMinutes()
    if (utcHours === 18 && utcMins >= 28 && utcMins <= 30) {
      ms += (30 - utcMins) * 60 * 1000 + 1000
    }
    const d = new Date(ms)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d).split('-')
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    return new Date(Date.UTC(y, m, day, 12, 0, 0))
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

function cleanPhone(raw: any): string | null {
  if (!raw) return null
  const str = String(raw).trim()
  if (!str) return null
  const upper = str.toUpperCase()
  if (upper === 'NA' || upper === 'N/A' || upper === 'NULL' || upper === 'UNDEFINED' || upper === '—' || upper === '-' || upper === '0') {
    return null
  }
  if (str.toLowerCase().includes('torque customer')) return null
  if (str.toLowerCase().includes('agent')) return null

  // Extract digits only
  const digits = str.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 13) {
    return digits.slice(-10)
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
    let duplicateStrategy: 'skip' | 'overwrite' = 'skip'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const mappingStr = formData.get('mapping') as string | null
      importName = (formData.get('importName') as string) || ''
      const strat = (formData.get('duplicateStrategy') as string) || ''
      if (strat === 'overwrite') duplicateStrategy = 'overwrite'

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
              headers[c] = `Column_${c + 1}`
            }
          }
          rawData = rawAoa.slice(1).map(row => {
            const obj: any = {}
            headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : '' })
            return obj
          })
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
        const firstSheet = workbook.SheetNames[0]
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, defval: '', raw: false })
        if (rawAoa.length > 1) {
          const headers: string[] = rawAoa[0].map((h: any) => String(h || '').trim())
          for (let c = 0; c < headers.length; c++) {
            if (!headers[c] || headers[c] === '') {
              headers[c] = `Column_${c + 1}`
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
      if (body.duplicateStrategy === 'overwrite') duplicateStrategy = 'overwrite'
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
    const validLeadsToInsert: any[] = []
    const leadsToUpdate: { id: string; data: any }[] = []
    const errorRows: any[] = []

    // Collect candidate vehicle registration numbers and phones from THIS chunk only for indexed lookup
    const candidateVehicles = new Set<string>()
    const candidatePhones = new Set<string>()

    for (const r of rawData) {
      if (typeof r === 'object' && r !== null) {
        const normalizedRow: any = {}
        for (const key of Object.keys(r)) {
          if (r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== '') {
            normalizedRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = r[key]
          }
        }
        const rawVehicle = extractFieldValue(r, normalizedRow, mapping.vehicleNo, [
          'vehicleNo', 'vehicle_no', 'Vehicle Number', 'Vehicle No', 'REG NO / Vehicle No', 'REG NO', 'Registration No', 'Reg No', 'regno', 'vehicle', 'vehical', 'vehicle_number'
        ])
        const rawPhone = extractFieldValue(r, normalizedRow, mapping.clientPhone, [
          'clientPhone', 'client_phone', 'Phone Number', 'Mobile', 'Mobile No', 'Contact Number', 'Phone', 'phone_no', 'mobile_no', 'phone', 'contact', 'contact_no', 'CONTACT', 'contact number'
        ])

        if (rawVehicle) {
          const cleanV = String(rawVehicle).trim().toUpperCase()
          const normV = cleanV.replace(/[^A-Z0-9]/g, '')
          if (cleanV.length >= 4) candidateVehicles.add(cleanV)
          if (normV.length >= 4) candidateVehicles.add(normV)
        }
        const validCandPhone = cleanPhone(rawPhone)
        if (validCandPhone) {
          candidatePhones.add(validCandPhone)
        }
      }
    }

    const orClauses: any[] = []
    if (candidateVehicles.size > 0) {
      orClauses.push({ vehicleNo: { in: Array.from(candidateVehicles) } })
    }
    if (candidatePhones.size > 0) {
      orClauses.push({ clientPhone: { in: Array.from(candidatePhones) } })
    }

    // High-speed indexed query for this chunk only
    const existingLeads = orClauses.length > 0 ? await prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: { not: 'Trashed' },
        OR: orClauses
      },
      select: {
        id: true,
        vehicleNo: true,
        clientPhone: true,
        clientName: true,
        customFields: true,
        existingAgent: true
      }
    }) : []

    // Build fast lookup maps by registration number and phone
    const existingByVehicle = new Map<string, typeof existingLeads[0]>()
    const existingByPhone = new Map<string, typeof existingLeads[0]>()
    const agentPhoneSet = new Set<string>()

    for (const el of existingLeads) {
      if (el.vehicleNo) {
        const vClean = el.vehicleNo.trim().toUpperCase()
        const vNorm = vClean.replace(/[^A-Z0-9]/g, '')
        existingByVehicle.set(vClean, el)
        existingByVehicle.set(vNorm, el)
      }
      if (el.clientPhone) {
        const pClean = el.clientPhone.trim()
        const pNorm = normalizePhone(el.clientPhone)
        existingByPhone.set(pClean, el)
        if (pNorm) existingByPhone.set(pNorm, el)
      }
      if (el.existingAgent === 'Agent' || (el.existingAgent && el.existingAgent.toLowerCase().includes('agent'))) {
        if (el.clientPhone) {
          agentPhoneSet.add(el.clientPhone.trim())
          const norm = normalizePhone(el.clientPhone)
          if (norm) agentPhoneSet.add(norm)
        }
      }
    }

    const seenVehiclesInChunk = new Set<string>()
    const seenPhonesInChunk = new Set<string>()
    let duplicateSkippedCount = 0
    let duplicateOverwrittenCount = 0

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
        'vehicleNo', 'vehicle_no', 'Vehicle Number', 'Vehicle No', 'REG NO / Vehicle No', 'REG NO', 'Registration No', 'Reg No', 'regno', 'vehicle', 'vehical', 'vehicle_number'
      ])
      const rawName = extractFieldValue(row, normalizedRow, mapping.clientName, [
        'clientName', 'client_name', 'Client Name', 'Owner Name', 'Insured Name', 'Customer Name', 'Party Name', 'name', 'insured', 'customer', 'party', 'owner_name', 'owner'
      ])
      const rawPhone = extractFieldValue(row, normalizedRow, mapping.clientPhone, [
        'clientPhone', 'client_phone', 'Phone Number', 'Mobile', 'Mobile No', 'Contact Number', 'Phone', 'phone_no', 'mobile_no', 'phone', 'contact', 'contact_no', 'CONTACT', 'contact number'
      ])
      const rawEmail = extractFieldValue(row, normalizedRow, mapping.clientEmail, [
        'clientEmail', 'client_email', 'Email Address', 'Email', 'email_id', 'emailid', 'mail'
      ])
      const rawExpiry = extractFieldValue(row, normalizedRow, mapping.expiryDate, [
        'expiryDate', 'expiry_date', 'Policy Expiry Date', 'Expiry Date', 'Due Date', 'Policy End Date', 'expiry', 'due_date',
        'insurance validity', 'Insurance Validity', 'insurance_validity', 'insurancevalidity', 'insurance', 'Insurance', 'ins validity', 'policy validity'
      ])
      const rawRegDate = extractFieldValue(row, normalizedRow, mapping.registrationDate, [
        'registrationDate', 'registration_date', 'Registration Date', 'Reg Date', 'reg_date', 'registration', 'registrationdate', 'rc date', 'reg dt'
      ])
      const rawGvw = extractFieldValue(row, normalizedRow, mapping.gvw, [
        'gvw', 'Gross Vehicle Weight (GVW)', 'Gross Vehicle Weight', 'Gross Weight', 'Weight', 'gross_weight',
        'GVW (In Kg.)', 'gvw (in kg.)', 'gvw (in kg)', 'gvw in kg', 'gvwin kg', 'gvw_in_kg', 'gvweight', 'gross weight (in kg)'
      ])
      const rawAddress = extractFieldValue(row, normalizedRow, mapping.address, [
        'address', 'Address', 'Location', 'location'
      ])
      const rawCity = extractFieldValue(row, normalizedRow, mapping.city, [
        'city', 'City', 'State', 'state'
      ])
      const rawAgent = extractFieldValue(row, normalizedRow, mapping.existingAgent || mapping.agent || mapping.Agent, [
        'existingAgent', 'existing_agent', 'Agent', 'agent', 'Broker', 'broker', 'Agent Number', 'Agent No', 'is_agent', 'agent_status', 'agent_number', 'agent_no'
      ])
      const rawTemplate = extractFieldValue(row, normalizedRow, mapping.messageTemplate, [
        'messageTemplate', 'message_template', 'Message Template', 'template'
      ])

      const cleanVehicleNo = rawVehicle !== undefined && rawVehicle !== null ? String(rawVehicle).trim() : ''
      const validPhone = cleanPhone(rawPhone)
      const cleanContactNo = validPhone || ''
      const rawNameStr = rawName !== undefined && rawName !== null ? String(rawName).trim() : ''
      const isNameInvalid = !rawNameStr || ['NA', 'N/A', 'NULL', 'UNDEFINED', '—', '-'].includes(rawNameStr.toUpperCase())
      const cleanOwnerName = !isNameInvalid ? rawNameStr : (cleanVehicleNo || cleanContactNo || 'Lead Customer')

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
      const normV = vNo ? vNo.replace(/[^A-Z0-9]/g, '') : null

      // Simplified Agent Detection & Sanitization
      let cleanAgentVal = rawAgent !== undefined && rawAgent !== null ? String(rawAgent).trim() : null
      if (cleanAgentVal) {
        const u = cleanAgentVal.toUpperCase()
        if (u === 'NA' || u === 'N/A' || u === 'NULL' || u === 'UNDEFINED' || u === '—' || u === '-') {
          cleanAgentVal = null
        }
      }
      let isAgent = checkIsAgent(cleanContactNo || null, agentPhoneSet, cleanAgentVal)
      let finalContactNo = cleanContactNo
      if (cleanContactNo && (cleanContactNo.toLowerCase().includes('agent') || cleanContactNo.toLowerCase().includes('broker'))) {
        isAgent = true
        finalContactNo = ''
      }
      if (isAgent && finalContactNo) {
        agentPhoneSet.add(finalContactNo)
        const norm = normalizePhone(finalContactNo)
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

      // Collect custom fields
      const standardFields = [
        'clientName', 'clientPhone', 'clientEmail', 'vehicleNo', 'expiryDate',
        'registrationDate', 'gvw', 'address', 'city', 'existingAgent',
        'importName', 'messageTemplate', 'status', 'id', 'assignedTo', 'deletedAt'
      ]
      const customFields: Record<string, any> = {}

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

      // Check duplicate matching by Unique Registration Number (vehicleNo) or Phone Number
      const existingMatch = (vNo && (existingByVehicle.get(vNo) || (normV && existingByVehicle.get(normV)))) ||
        (!vNo && cleanContactNo && (existingByPhone.get(cleanContactNo) || existingByPhone.get(normalizePhone(cleanContactNo))))

      const isDuplicateInChunk = (vNo && (seenVehiclesInChunk.has(vNo) || (normV && seenVehiclesInChunk.has(normV)))) ||
        (!vNo && cleanContactNo && seenPhonesInChunk.has(cleanContactNo))

      if (existingMatch || isDuplicateInChunk) {
        if (duplicateStrategy === 'overwrite' && existingMatch) {
          // OVERWRITE / UPDATE existing lead by unique registration number
          duplicateOverwrittenCount++
          const existingCf = (existingMatch.customFields && typeof existingMatch.customFields === 'object')
            ? (existingMatch.customFields as Record<string, any>)
            : {}
          const mergedCf = { ...existingCf, ...customFields }

          leadsToUpdate.push({
            id: existingMatch.id,
            data: {
              ...(cleanOwnerName ? { clientName: cleanOwnerName } : {}),
              ...(finalContactNo ? { clientPhone: finalContactNo } : {}),
              ...(rawEmail ? { clientEmail: String(rawEmail).trim() } : {}),
              ...(parsedExpiry ? { expiryDate: parsedExpiry } : {}),
              ...(parsedRegDate ? { registrationDate: parsedRegDate } : {}),
              ...(rawGvw ? { gvw: String(rawGvw).trim() } : {}),
              ...(rawAddress ? { address: String(rawAddress).trim() } : {}),
              ...(rawCity ? { city: String(rawCity).trim() } : {}),
              ...(rawTemplate ? { messageTemplate: String(rawTemplate).trim() } : {}),
              ...(isAgent ? { existingAgent: 'Agent' } : (cleanAgentVal ? { existingAgent: cleanAgentVal } : {})),
              ...(importName ? { importName: importName.trim() } : {}),
              ...(Object.keys(mergedCf).length > 0 ? { customFields: mergedCf } : {}),
              updatedAt: new Date()
            }
          })
          continue
        } else {
          // SKIP duplicate lead
          duplicateSkippedCount++
          errorRows.push({
            row: index + 1,
            error: `Duplicate unique registration/phone (${vNo || cleanContactNo}) skipped`
          })
          continue
        }
      }

      // Mark as seen in this chunk
      if (vNo) {
        seenVehiclesInChunk.add(vNo)
        if (normV) seenVehiclesInChunk.add(normV)
      }
      if (cleanContactNo) {
        seenPhonesInChunk.add(cleanContactNo)
      }

      validLeadsToInsert.push({
        vehicleNo: vNo,
        clientName: cleanOwnerName,
        clientPhone: finalContactNo || null,
        clientEmail: rawEmail ? String(rawEmail).trim() : null,
        expiryDate: finalExpiryDate,
        registrationDate: parsedRegDate,
        gvw: rawGvw ? String(rawGvw).trim() : null,
        address: rawAddress ? String(rawAddress).trim() : null,
        city: rawCity ? String(rawCity).trim() : null,
        messageTemplate: rawTemplate ? String(rawTemplate).trim() : null,
        existingAgent: isAgent ? 'Agent' : (cleanAgentVal || null),
        importName: importName ? importName.trim() : null,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        status: 'New'
      })
    }

    // 2. Perform Inserts in fast batch
    if (validLeadsToInsert.length > 0) {
      const CHUNK_SIZE = 1000
      for (let i = 0; i < validLeadsToInsert.length; i += CHUNK_SIZE) {
        await prisma.lead.createMany({
          data: validLeadsToInsert.slice(i, i + CHUNK_SIZE),
          skipDuplicates: true
        })
      }
    }

    // 3. Perform Updates if overwrite strategy is enabled
    if (leadsToUpdate.length > 0) {
      const CONCURRENCY = 25
      for (let i = 0; i < leadsToUpdate.length; i += CONCURRENCY) {
        const batch = leadsToUpdate.slice(i, i + CONCURRENCY)
        await Promise.all(
          batch.map(u => prisma.lead.update({
            where: { id: u.id },
            data: u.data
          }).catch(err => console.warn(`[leads/import] Failed to update lead ${u.id}:`, err)))
        )
      }
    }

    // 4. Lightweight Async Agent Lead Processing for THIS chunk only
    const batchImportName = importName ? importName.trim() : 'batch'
    const newAgentVehicles = validLeadsToInsert
      .filter(l => l.existingAgent === 'Agent' && l.vehicleNo)
      .map(l => l.vehicleNo as string)

    if (newAgentVehicles.length > 0) {
      // Execute asynchronously in background so client HTTP response returns immediately (< 300ms)
      (async () => {
        try {
          const agentLeads = await prisma.lead.findMany({
            where: {
              importName: batchImportName,
              vehicleNo: { in: newAgentVehicles },
              existingAgent: 'Agent'
            },
            select: { id: true, clientPhone: true, vehicleNo: true }
          })
          for (const agLead of agentLeads) {
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
            }).catch(() => {})
          }
        } catch (err) {
          console.warn('[leads/import] Async agent processing warning:', err)
        }
      })()
    }

    // 5. Send Admin Notification Alert ONLY on the final batch (prevents 100+ alert spam)
    const isLastBatch = req.headers.get('x-is-last-batch') === 'true'
    if (isLastBatch) {
      notifyRole('Admin', {
        title: `✅ Import Completed: "${batchImportName}"`,
        body: `Import batch finished with ${validLeadsToInsert.length} new leads, ${duplicateOverwrittenCount} updated.`,
        type: 'info',
        entityType: 'lead_import',
        data: { importName: batchImportName }
      }).catch(() => {})
    }

    // 6. Spreadsheet Synchronization on Disk (non-blocking background task, never block HTTP response)
    const shouldSyncDisk = req.headers.get('x-sync-disk') === 'true'
    if (shouldSyncDisk) {
      const uploadDir = getUploadDir()
      syncSpreadsheetForBatch(batchImportName, uploadDir).catch(e => console.warn('[leads/import] Background batch sync warning:', e))
    }

    // 7. Complete Job Tracking
    const invalidCount = errorRows.length - duplicateSkippedCount
    const totalProcessed = validLeadsToInsert.length + duplicateOverwrittenCount

    setImportJob(jobId, {
      id: jobId,
      name: importName || 'Leads Batch',
      status: 'completed',
      totalRows: totalRaw,
      processedRows: totalRaw,
      validCount: totalProcessed,
      errorCount: invalidCount,
      duplicateCount: duplicateSkippedCount,
      assignedCount: 0,
      agentCount: validLeadsToInsert.filter(l => l.existingAgent === 'Agent').length,
      startTime: Date.now(),
      completedTime: Date.now()
    })

    return NextResponse.json({
      success: true,
      jobId,
      stats: {
        total: totalRaw,
        valid: validLeadsToInsert.length,
        imported: validLeadsToInsert.length,
        updated: duplicateOverwrittenCount,
        duplicates: duplicateSkippedCount,
        errors: invalidCount,
        agentCount: validLeadsToInsert.filter(l => l.existingAgent === 'Agent').length
      },
      message: `Batch processed: ${validLeadsToInsert.length} created, ${duplicateOverwrittenCount} updated, ${duplicateSkippedCount} duplicates skipped.`,
      agentLeadsCount: validLeadsToInsert.filter(l => l.existingAgent === 'Agent').length,
      errorDetails: errorRows.slice(0, 10)
    }, { status: 200 })
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

