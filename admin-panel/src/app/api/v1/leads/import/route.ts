import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import { setImportJob, ImportJob } from './status/route'

function getRowValueByHeader(row: any, mappedHeader: string | undefined | null): any {
  if (!row || !mappedHeader) return null

  // 1. Try exact match first
  if (row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
    return row[mappedHeader]
  }

  // 2. Try trimmed match
  const trimmedHeader = String(mappedHeader).trim()
  if (row[trimmedHeader] !== undefined && row[trimmedHeader] !== null) {
    return row[trimmedHeader]
  }

  // 3. Try normalized fuzzy match (remove spaces, dots, dashes, underscores and lowercase)
  const normMapped = trimmedHeader.toLowerCase().replace(/[\s\.\-_]/g, '')
  const rowKeys = Object.keys(row)
  for (const key of rowKeys) {
    const normKey = key.toLowerCase().replace(/[\s\.\-_]/g, '')
    if (normKey === normMapped) {
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

function checkIsAgent(row: any, phone: string | null, agentPhoneSet: Set<string>, explicitAgentVal: any): boolean {
  if (phone) {
    const cleanP = phone.trim()
    const normP = normalizePhone(phone)
    if (agentPhoneSet.has(cleanP) || (normP && agentPhoneSet.has(normP))) {
      return true
    }
  }

  if (explicitAgentVal !== null && explicitAgentVal !== undefined) {
    const str = String(explicitAgentVal).trim().toLowerCase()
    const digitsOnly = str.replace(/\D/g, '')
    if (digitsOnly.length < 10 || str !== digitsOnly) {
      if (str.includes('agent') || str.includes('broker') || ['yes', 'true', '1', 'y'].includes(str)) {
        return true
      }
    }
  }

  // Check explicit agent columns only
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue
    const keyLower = k.toLowerCase().trim()
    const valStr = String(v).trim()
    if (!valStr) continue

    const valLower = valStr.toLowerCase()

    if (['existingagent', 'isagent', 'is_agent', 'agent', 'agent?', 'agent_status'].includes(keyLower)) {
      const digitsOnly = valStr.replace(/\D/g, '')
      if (digitsOnly.length >= 10 && valStr === digitsOnly) {
        continue
      }
      if (['yes', 'true', '1', 'y', 'agent', 'broker', 'direct agent'].includes(valLower)) {
        return true
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
    let mapping: any = null

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
          mapping = JSON.parse(mappingStr)
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
      mapping = body.mapping || null
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty or could not be read.' }, { status: 400 })
    }

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

    // Fetch existing vehicle numbers and known agent phone numbers using lightweight select
    const existingLeads = await prisma.lead.findMany({
      select: { vehicleNo: true, clientPhone: true, existingAgent: true }
    })
    const existingVehicles = new Set(existingLeads.map(l => l.vehicleNo).filter(Boolean))
    const agentPhoneSet = new Set<string>()
    existingLeads
      .filter(l => l.existingAgent === 'Agent' && l.clientPhone)
      .forEach(l => {
        agentPhoneSet.add(l.clientPhone!.trim())
        const norm = normalizePhone(l.clientPhone)
        if (norm) agentPhoneSet.add(norm)
      })

    const totalRaw = rawData.length
    for (let index = 0; index < totalRaw; index++) {
      const row = rawData[index]
      let vehicleNo = ''
      let ownerName = ''
      let contactNo = ''
      let email = null
      let expiryDateStr = ''
      let gvw = null
      let agentVal = null

      if (mapping) {
        vehicleNo = getRowValueByHeader(row, mapping.vehicleNo)
        ownerName = getRowValueByHeader(row, mapping.clientName)
        contactNo = getRowValueByHeader(row, mapping.clientPhone)
        email = getRowValueByHeader(row, mapping.clientEmail)
        expiryDateStr = getRowValueByHeader(row, mapping.expiryDate)
        gvw = getRowValueByHeader(row, mapping.gvw)
        agentVal = getRowValueByHeader(row, mapping.existingAgent || mapping.agent || mapping.Agent)
      } else {
        const normalizedRow: any = {}
        for (const key of Object.keys(row)) {
          if (row[key] !== undefined && row[key] !== null) {
            normalizedRow[key.toLowerCase().replace(/[\s\.\-_]/g, '')] = row[key]
          }
        }

        vehicleNo = normalizedRow['vehiclenumber'] || normalizedRow['vehicleno'] || normalizedRow['vehicle'] || normalizedRow['vehicalnumber'] || normalizedRow['vehical'] || normalizedRow['regno'] || row['Vehicle No'] || row['vehicleNo'] || row['VEHICAL NUMBER']
        ownerName = normalizedRow['ownername'] || normalizedRow['name'] || normalizedRow['clientname'] || row['Owner Name'] || row['clientName'] || row['OWNER NAME']
        contactNo = normalizedRow['phonenumber'] || normalizedRow['contactnumber'] || normalizedRow['phone'] || normalizedRow['contact'] || row['Contact Number'] || row['clientPhone'] || row['PHONE NUMBER']
        expiryDateStr = normalizedRow['insuranceexpirydate'] || normalizedRow['expirydate'] || normalizedRow['expiry'] || row['Insurance Expiry Date'] || row['expiryDate']
        email = normalizedRow['email'] || row['Email'] || row['clientEmail'] || row['EMAIL (OPTIONAL)'] || normalizedRow['emailoptional'] || normalizedRow['email(optional)']
        agentVal = normalizedRow['agent'] || normalizedRow['existingagent'] || row['Agent'] || row['agent'] || null
      }

      const cleanVehicleNo = vehicleNo !== undefined && vehicleNo !== null ? String(vehicleNo).trim() : ''
      const cleanOwnerName = ownerName !== undefined && ownerName !== null ? String(ownerName).trim() : ''
      const cleanContactNo = contactNo !== undefined && contactNo !== null ? String(contactNo).trim() : ''

      if (!cleanVehicleNo || !cleanOwnerName || !cleanContactNo) {
        errorRows.push({
          row: index + 1,
          error: `Missing fields: ${!cleanVehicleNo ? 'Vehicle No, ' : ''}${!cleanOwnerName ? 'Name, ' : ''}${!cleanContactNo ? 'Phone' : ''}`,
          data: row
        })
        continue
      }

      const vNo = cleanVehicleNo.toUpperCase()

      if (vehicleNumbers.has(vNo) || existingVehicles.has(vNo)) {
        errorRows.push({ row: index + 1, error: `Duplicate Vehicle No: ${vNo}` })
        continue
      }

      vehicleNumbers.add(vNo)

      const isAgent = checkIsAgent(row, cleanContactNo, agentPhoneSet, agentVal)
      if (isAgent) {
        agentPhoneSet.add(cleanContactNo)
      }

      let expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      if (expiryDateStr) {
        const parsed = new Date(expiryDateStr)
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed
        }
      }

      validLeads.push({
        vehicleNo: vNo,
        clientName: String(ownerName).trim(),
        clientPhone: cleanContactNo,
        clientEmail: email ? String(email).trim() : null,
        expiryDate: expiryDate,
        gvw: gvw ? String(gvw).trim() : null,
        existingAgent: isAgent ? 'Agent' : null,
        importName: importName ? importName.trim() : null,
        status: 'New'
      })

      // Update progress every 2,500 rows
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
          agentCount: 0,
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

    // 2. Fetch Active Sales Executives
    const salesExecutives = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          OR: [
            { name: { equals: 'Sales Executive', mode: 'insensitive' } },
            { name: { equals: 'EXECUTIVE', mode: 'insensitive' } }
          ]
        }
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })

    // Find the last assigned lead to continue the round-robin sequence
    const lastAssignedLead = await prisma.lead.findFirst({
      where: { assignedTo: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { assignedTo: true }
    })

    let nextIndex = 0
    if (salesExecutives.length > 0) {
      if (lastAssignedLead && lastAssignedLead.assignedTo) {
        const foundIndex = salesExecutives.findIndex(se => se.id === lastAssignedLead.assignedTo)
        if (foundIndex !== -1) {
          nextIndex = (foundIndex + 1) % salesExecutives.length
        }
      }
    }

    // 3. Fast In-Memory Round Robin Assignment
    const leadsWithAssignment = validLeads.map(lead => {
      if (lead.existingAgent === 'Agent' || salesExecutives.length === 0) {
        return { ...lead, assignedTo: null }
      }
      const assignee = salesExecutives[nextIndex]
      nextIndex = (nextIndex + 1) % salesExecutives.length
      return { ...lead, assignedTo: assignee.id }
    })

    // 4. Batch Create Leads in safe chunks of 3,000 records for maximum turbo speed
    const CHUNK_SIZE = 3000
    for (let i = 0; i < leadsWithAssignment.length; i += CHUNK_SIZE) {
      const chunk = leadsWithAssignment.slice(i, i + CHUNK_SIZE)
      await prisma.lead.createMany({
        data: chunk,
        skipDuplicates: true
      })
    }

    // 5. Non-blocking Async Spreadsheet Backup on disk
    try {
      const cleanBatch = (importName ? importName.trim() : 'batch').replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `import_${cleanBatch}.xlsx`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      const fullFilePath = path.join(uploadDir, fileName)

      const headers = ['Client Name', 'Phone Number', 'REG NO / Vehicle No', 'Policy Expiry Date', 'GVW', 'Agent', 'Import Batch']
      const rows: any[][] = [headers]
      leadsWithAssignment.forEach(l => {
        rows.push([
          l.clientName,
          l.clientPhone,
          l.vehicleNo,
          l.expiryDate ? new Date(l.expiryDate).toISOString().split('T')[0] : '',
          l.gvw || '',
          l.existingAgent === 'Agent' ? 'agent' : '',
          l.importName || ''
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leads')
      XLSX.writeFile(wb, fullFilePath)
    } catch (sheetErr) {
      console.error('[leads/import] Failed to write spreadsheet backup:', sheetErr)
    }

    // 6. Complete Job Tracking
    const duplicateCount = errorRows.filter(e => e.error.includes('Duplicate')).length
    const assignedCount = leadsWithAssignment.filter(l => l.assignedTo !== null).length
    const agentCount = leadsWithAssignment.filter(l => l.existingAgent === 'Agent').length

    setImportJob(jobId, {
      id: jobId,
      name: importName || 'Leads Batch',
      status: 'completed',
      totalRows: totalRaw,
      processedRows: totalRaw,
      validCount: validLeads.length,
      errorCount: errorRows.length - duplicateCount,
      duplicateCount,
      assignedCount,
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
        assignedCount,
        agentCount
      },
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
