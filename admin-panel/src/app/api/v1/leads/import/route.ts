import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

function getRowValueByHeader(row: any, mappedHeader: string | undefined | null): any {
  if (!row || !mappedHeader) return null;

  // 1. Try exact match first
  if (row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
    return row[mappedHeader];
  }

  // 2. Try trimmed match
  const trimmedHeader = String(mappedHeader).trim();
  if (row[trimmedHeader] !== undefined && row[trimmedHeader] !== null) {
    return row[trimmedHeader];
  }

  // 3. Try normalized fuzzy match (remove spaces, dots, dashes, underscores and lowercase)
  const normMapped = trimmedHeader.toLowerCase().replace(/[\s\.\-_]/g, '');
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const normKey = key.toLowerCase().replace(/[\s\.\-_]/g, '');
    if (normKey === normMapped) {
      return row[key];
    }
  }

  return null;
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

  // Check explicit agent columns only (not general columns)
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue
    const keyLower = k.toLowerCase().trim()
    const valStr = String(v).trim()
    if (!valStr) continue

    const valLower = valStr.toLowerCase()

    // If column is explicitly mapped/named Agent and value is affirmative (not a 10 digit number)
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
  if (error) return error

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

    // 1. Process and Validate Leads
    const validLeads: any[] = []
    const errorRows: any[] = []
    const vehicleNumbers = new Set<string>()

    // Fetch existing vehicle numbers and known agent phone numbers
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

    rawData.forEach((row, index) => {
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
        // Normalize row keys to lowercase and remove spaces for fuzzy matching
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          if (row[key] !== undefined && row[key] !== null) {
            normalizedRow[key.toLowerCase().replace(/[\s\.\-_]/g, '')] = row[key]
          }
        })

        vehicleNo = normalizedRow['vehiclenumber'] || normalizedRow['vehicleno'] || normalizedRow['vehicle'] || normalizedRow['vehicalnumber'] || normalizedRow['vehical'] || normalizedRow['regno'] || row['Vehicle No'] || row['vehicleNo'] || row['VEHICAL NUMBER']
        ownerName = normalizedRow['ownername'] || normalizedRow['name'] || normalizedRow['clientname'] || row['Owner Name'] || row['clientName'] || row['OWNER NAME']
        contactNo = normalizedRow['phonenumber'] || normalizedRow['contactnumber'] || normalizedRow['phone'] || normalizedRow['contact'] || row['Contact Number'] || row['clientPhone'] || row['PHONE NUMBER']
        expiryDateStr = normalizedRow['insuranceexpirydate'] || normalizedRow['expirydate'] || normalizedRow['expiry'] || row['Insurance Expiry Date'] || row['expiryDate']
        email = normalizedRow['email'] || row['Email'] || row['clientEmail'] || row['EMAIL (OPTIONAL)'] || normalizedRow['emailoptional'] || normalizedRow['email(optional)']
        agentVal = normalizedRow['agent'] || normalizedRow['existingagent'] || row['Agent'] || row['agent'] || null
      }

      const cleanVehicleNo = vehicleNo !== undefined && vehicleNo !== null ? String(vehicleNo).trim() : '';
      const cleanOwnerName = ownerName !== undefined && ownerName !== null ? String(ownerName).trim() : '';
      const cleanContactNo = contactNo !== undefined && contactNo !== null ? String(contactNo).trim() : '';

      if (!cleanVehicleNo || !cleanOwnerName || !cleanContactNo) {
        errorRows.push({ 
          row: index + 1, 
          error: `Missing fields: ${!cleanVehicleNo ? 'Vehicle No, ' : ''}${!cleanOwnerName ? 'Name, ' : ''}${!cleanContactNo ? 'Phone' : ''}`,
          data: row 
        })
        return
      }

      const vNo = cleanVehicleNo.toUpperCase()

      if (vehicleNumbers.has(vNo) || existingVehicles.has(vNo)) {
        errorRows.push({ row: index + 1, error: `Duplicate Vehicle No in file or system: ${vNo}` })
        return
      }

      vehicleNumbers.add(vNo)
      
      // Check if this lead is marked as Agent or if contact number belongs to a known Agent
      const isAgent = checkIsAgent(row, cleanContactNo, agentPhoneSet, agentVal)

      if (isAgent) {
        agentPhoneSet.add(cleanContactNo)
      }

      // Default expiry date to 1 year from now if not provided
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
    })

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

      return NextResponse.json({ 
        error: errorMsg,
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
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true
      }
    })

    // Find the last assigned lead to continue the round-robin sequence from where it left off
    const lastAssignedLead = await prisma.lead.findFirst({
      where: {
        assignedTo: { not: null }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let nextIndex = 0
    if (salesExecutives.length > 0) {
      if (lastAssignedLead && lastAssignedLead.assignedTo) {
        const lastId = lastAssignedLead.assignedTo
        const foundIndex = salesExecutives.findIndex(se => se.id === lastId)
        if (foundIndex !== -1) {
          nextIndex = (foundIndex + 1) % salesExecutives.length
        }
      }
    }

    // 3. Round Robin Assignment (Agent leads are NEVER assigned to staff)
    const leadsWithAssignment = validLeads.map((lead) => {
      if (lead.existingAgent === 'Agent' || salesExecutives.length === 0) {
        return {
          ...lead,
          assignedTo: null
        }
      }
      const assignee = salesExecutives[nextIndex]
      nextIndex = (nextIndex + 1) % salesExecutives.length
      return {
        ...lead,
        assignedTo: assignee.id
      }
    })

    // 4. Batch Create Leads
    const result = await prisma.lead.createMany({
      data: leadsWithAssignment,
      skipDuplicates: true
    })

    // 5. Save spreadsheet file for this batch on disk
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
      console.error('[leads/import] Failed to write spreadsheet:', sheetErr)
    }

    // Fetch all user names to map assigned ids
    const allUsers = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true }
    })
    const userMap = new Map(allUsers.map(u => [u.id, u.fullName || u.email]))

    const importedLeads = leadsWithAssignment.map(l => ({
      clientName: l.clientName,
      vehicleNo: l.vehicleNo,
      clientPhone: l.clientPhone,
      isAgent: l.existingAgent === 'Agent',
      assignedToName: l.assignedTo ? (userMap.get(l.assignedTo) || 'Assigned') : 'Unassigned (Agent / Open)'
    }))

    return NextResponse.json({
      success: true,
      stats: {
        total: rawData.length,
        valid: validLeads.length,
        duplicates: rawData.length - validLeads.length - errorRows.length,
        errors: errorRows.length,
        assignedCount: leadsWithAssignment.filter(l => l.assignedTo !== null).length,
        agentCount: leadsWithAssignment.filter(l => l.existingAgent === 'Agent').length
      },
      importedLeads,
      errorDetails: errorRows.slice(0, 10)
    })

  } catch (error: any) {
    console.error('Lead Import Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
