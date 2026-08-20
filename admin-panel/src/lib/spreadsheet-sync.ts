import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import prisma from '@/lib/prisma'
import { getUploadDir } from './upload-helper'

function formatDate(date: any): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export async function syncSpreadsheetForBatch(batchName: string | null, customUploadDir?: string) {
  const uploadDir = customUploadDir || getUploadDir()
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const isAll = batchName === 'all_leads' || batchName === 'leads' || batchName === 'All Active Leads (Master)'
  const isDirect = batchName === null || batchName === '' || batchName === 'direct_entry'
  
  const whereClause: any = { status: { not: 'Trashed' }, deletedAt: null }
  if (!isAll) {
    if (isDirect) {
      whereClause.importName = null
    } else {
      whereClause.importName = batchName
    }
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: { assignee: true },
    orderBy: [
      { expiryDate: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  if (leads.length === 0 && !isAll) return null

  // Collect all unique custom fields keys across leads in this batch
  const customKeys = new Set<string>()
  leads.forEach(l => {
    if (l.customFields && typeof l.customFields === 'object') {
      Object.keys(l.customFields).forEach(k => {
        if (!['importFilePath', 'policySubmission', 'agentApproval'].includes(k)) {
          customKeys.add(k)
        }
      })
    }
  })

  const standardHeaders = [
    'Client Name',
    'Phone Number',
    'Mo No. 2',
    'REG NO / Vehicle No',
    'Policy Expiry Date',
    'Registration Date',
    'GVW',
    'City',
    'Address',
    'Lead Status',
    'Assigned To',
    'Import Batch'
  ]

  const excludedKeys = [
    'phone2', 'mobile2', 'phone', 'contact', 'clientname', 'client name', 'client_name',
    'clientphone', 'client phone', 'client_phone', 'clientemail', 'client email', 'client_email',
    'email', 'vehicle no', 'vehicle_no', 'vehicleno', 'reg no', 'reg_no', 'regno', 'vehicle number', 'vehiclenumber',
    'policy expiry date', 'expirydate', 'expiry date', 'insurance validity', 'insurance_validity', 'insurancevalidity', 'expiry_date',
    'registration date', 'registrationdate', 'registration_date', 'gvw', 'gvw (in kg)', 'gvw(in kg)', 'gvw_in_kg',
    'city', 'address', 'status', 'lead status', 'lead_status', 'assigned to', 'assigned_to', 'assignedto',
    'import batch', 'import_batch', 'importbatch', 'import name', 'import_name', 'importname',
    'agent', 'existingagent', 'isagent', 'agent number', 'agent no', 'agentname', 'agent name', 'agent_name', 'agent_no'
  ]
  const customKeyList = Array.from(customKeys).filter(k => 
    !excludedKeys.includes(k.toLowerCase().trim())
  )
  const allHeaders = [...standardHeaders, ...customKeyList]
  const rows: any[][] = [allHeaders]

  leads.forEach(l => {
    const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
    const phone2 = cf.phone2 || cf.mobile2 || cf['mo no 2'] || cf['Mo No 2'] || (l.clientEmail && /^[0-9\s+-]{7,15}$/.test(l.clientEmail.trim()) ? l.clientEmail : '')

    const isAgentLead = l.existingAgent === 'Agent' || (l.existingAgent && String(l.existingAgent).toLowerCase().includes('agent'))
    const cleanPhone = l.clientPhone || ''
    const phoneVal = cleanPhone ? (isAgentLead ? `${cleanPhone} [Agent]` : cleanPhone) : ''

    const row = [
      l.clientName || '',
      phoneVal,
      phone2 || '',
      l.vehicleNo || '',
      formatDate(l.expiryDate),
      formatDate(l.registrationDate),
      l.gvw || '',
      l.city || '',
      l.address || '',
      l.status || 'New',
      l.assignee?.fullName || (isAgentLead ? 'Pending Admin Approval' : 'Unassigned'),
      l.importName || 'Direct Entry'
    ]

    customKeyList.forEach(k => {
      row.push(cf[k] !== undefined && cf[k] !== null ? String(cf[k]) : '')
    })

    rows.push(row)
  })

  const cleanBatchName = isAll ? 'leads' : isDirect ? 'direct_entry' : String(batchName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `import_${cleanBatchName}.xlsx`
  const fullPath = path.join(uploadDir, fileName)

  try {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    
    try {
      XLSX.writeFile(wb, fullPath)
    } catch (writeErr: any) {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const tempPath = `${fullPath}.tmp`
      fs.writeFileSync(tempPath, buf)
      try {
        fs.renameSync(tempPath, fullPath)
      } catch {}
    }
  } catch (err) {
    console.warn(`[syncSpreadsheetForBatch] Skipped updating locked file ${fileName}:`, err)
  }

  const agentCount = leads.filter(l => l.existingAgent === 'Agent' || (l.existingAgent && String(l.existingAgent).toLowerCase().includes('agent'))).length

  return {
    fileName,
    totalRows: leads.length,
    agentCount
  }
}

export async function syncRenewalsSpreadsheet(customUploadDir?: string) {
  const uploadDir = customUploadDir || getUploadDir()
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const renewals = await prisma.renewalRecord.findMany({
    include: {
      assignee: true,
      createdBy: true,
      lead: {
        include: {
          assignee: true
        }
      },
      policy: true
    },
    orderBy: { policyEndDate: 'asc' }
  })

  const headers = [
    'Client Name',
    'Phone Number',
    'Vehicle No',
    'Policy Number',
    'Provider / Insurer',
    'Policy Type',
    'Premium Amount',
    'Policy Expiry Date',
    'Policy Start Date',
    'Renewal Status',
    'Sales Person',
    'Policy PDF',
    'Assigned To',
    'Assigned Month',
    'Assigned Year',
    'Renewed Date',
    'Refused Date',
    'Created At'
  ]

  const rows: any[][] = [headers]

  renewals.forEach(r => {
    // Robustly extract the PDF URL
    const leadCf = r.lead?.customFields as any
    const pdfUrl = (Array.isArray(r.documents) && r.documents[0]) || 
                   leadCf?.policySubmission?.issuedPolicyPdfUrl || 
                   '';

    // Robustly extract original salesperson (creator or lead assignee)
    const salesPerson = r.createdBy?.fullName || r.lead?.assignee?.fullName || 'Unassigned'

    rows.push([
      r.clientName || '',
      r.clientPhone || '',
      r.vehicleNo || '',
      r.policyNumber || r.policy?.policyNumber || '',
      r.provider || r.policy?.provider || '',
      r.policyType || r.policy?.type || '',
      r.premiumAmount ? Number(r.premiumAmount) : '',
      formatDate(r.policyEndDate),
      formatDate(r.policyStartDate),
      r.renewalStatus || 'Active',
      salesPerson,
      pdfUrl,
      r.assignee?.fullName || 'Unassigned',
      r.assignedMonth || '',
      r.assignedYear || '',
      formatDate(r.renewedAt),
      formatDate(r.refusedAt),
      formatDate(r.createdAt)
    ])
  })

  const fileName = 'import_renewals.xlsx'
  const fullPath = path.join(uploadDir, fileName)

  try {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Renewals')

    try {
      XLSX.writeFile(wb, fullPath)
    } catch {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const tempPath = `${fullPath}.tmp`
      fs.writeFileSync(tempPath, buf)
      try {
        fs.renameSync(tempPath, fullPath)
      } catch {}
    }
  } catch (err) {
    console.warn(`[syncRenewalsSpreadsheet] Error writing ${fileName}:`, err)
  }

  return {
    fileName,
    totalRows: renewals.length,
    agentCount: 0
  }
}

