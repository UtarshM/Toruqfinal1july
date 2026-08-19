import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import prisma from '@/lib/prisma'

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
  const uploadDir = customUploadDir || path.join(process.cwd(), 'public', 'uploads', 'imports')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const isAll = batchName === 'all_leads' || batchName === 'All Active Leads (Master)'
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
    orderBy: { createdAt: 'desc' }
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
    'Agent',
    'Lead Status',
    'Assigned To',
    'Import Batch'
  ]

  const customKeyList = Array.from(customKeys).filter(k => !['phone2', 'mobile2', 'phone', 'contact'].includes(k.toLowerCase()))
  const allHeaders = [...standardHeaders, ...customKeyList]
  const rows: any[][] = [allHeaders]

  leads.forEach(l => {
    const cf = (l.customFields && typeof l.customFields === 'object') ? (l.customFields as any) : {}
    const phone2 = cf.phone2 || cf.mobile2 || cf['mo no 2'] || cf['Mo No 2'] || (l.clientEmail && /^[0-9\s+-]{7,15}$/.test(l.clientEmail.trim()) ? l.clientEmail : '')

    const isAgentLead = l.existingAgent === 'Agent' || (l.existingAgent && String(l.existingAgent).toLowerCase().includes('agent'))

    const row = [
      l.clientName || '',
      l.clientPhone || '',
      phone2 || '',
      l.vehicleNo || '',
      formatDate(l.expiryDate),
      formatDate(l.registrationDate),
      l.gvw || '',
      l.city || '',
      l.address || '',
      isAgentLead ? 'agent' : (l.existingAgent || ''),
      l.status || 'New',
      l.assignee?.fullName || (isAgentLead ? 'Pending Admin Approval' : 'Unassigned'),
      l.importName || 'Direct Entry'
    ]

    customKeyList.forEach(k => {
      row.push(cf[k] !== undefined && cf[k] !== null ? String(cf[k]) : '')
    })

    rows.push(row)
  })

  const cleanBatchName = isAll ? 'all_leads' : isDirect ? 'direct_entry' : String(batchName).trim().replace(/[^a-zA-Z0-9_-]/g, '_')
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
