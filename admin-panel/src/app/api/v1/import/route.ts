import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function parseImportedDate(dateVal: any): Date | null {
  if (!dateVal) return null

  // If it's already a Date object
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal
  }

  // If it is a string representing a Date
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim()
    if (!trimmed) return null

    // Check if it's in DD/MM/YYYY or DD-MM-YYYY format
    const slashOrDashRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/
    const match = trimmed.match(slashOrDashRegex)
    if (match) {
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1 // JS months are 0-11
      const year = parseInt(match[3], 10)
      
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) {
        return d
      }
    }

    // Try standard JavaScript date parsing
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return d
    }
  }

  // If it's a number (Excel serial date representation, e.g. 45138)
  if (typeof dateVal === 'number') {
    // Excel base date is Dec 30, 1899
    const d = new Date((dateVal - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) {
      return d
    }
  }

  return null
}

import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

import { notifyRole } from '@/lib/notify'
import { syncSpreadsheetForBatch } from '@/lib/spreadsheet-sync'

function normalizePhone(phone: any): string {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

function checkIsAgent(item: any, phone: string | null, agentPhoneSet: Set<string>): boolean {
  if (phone) {
    const cleanP = phone.trim()
    const normP = normalizePhone(phone)
    if (agentPhoneSet.has(cleanP) || (normP && normP.length >= 10 && agentPhoneSet.has(normP))) {
      return true
    }
  }

  // Check explicit agent column or cells on THIS row
  for (const [k, v] of Object.entries(item)) {
    if (v === null || v === undefined) continue
    const keyLower = k.toLowerCase().trim()
    const valStr = String(v).trim()
    if (!valStr) continue

    const valLower = valStr.toLowerCase()

    const isAgentCol = (
      keyLower === 'agent' ||
      keyLower === 'broker' ||
      keyLower.includes('agent') ||
      keyLower.includes('broker') ||
      ['existingagent', 'isagent', 'is_agent', 'agent?', 'agent_status', 'agent number', 'agent no'].includes(keyLower)
    )

    if (isAgentCol) {
      const digitsOnly = valStr.replace(/\D/g, '')
      if (digitsOnly.length < 10 || valStr !== digitsOnly) {
        if (
          valLower.includes('agent') ||
          valLower.includes('broker') ||
          ['yes', 'true', '1', 'y', 'direct agent'].includes(valLower)
        ) {
          return true
        }
      }
      if (valLower.includes('agent') || valLower.includes('broker')) {
        return true
      }
    } else {
      if (
        valLower === 'agent' ||
        valLower === 'agent number' ||
        valLower === 'broker' ||
        valLower === 'direct agent' ||
        valLower.startsWith('agent -') ||
        valLower.startsWith('agent:') ||
        valLower.startsWith('broker:')
      ) {
        return true
      }
    }
  }

  return false
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const body = await req.json()
    const { leads } = body

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: 'leads array is required' }, { status: 400 })
    }

    let importedCount = 0
    let updatedCount = 0

    // Fetch all active Sales Executives
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
      }
    })

    // Fetch all known Agent phone numbers from database (only leads flagged explicitly as Agent)
    const knownAgentLeads = await prisma.lead.findMany({
      where: {
        existingAgent: 'Agent',
        clientPhone: { not: null }
      },
      select: { clientPhone: true }
    })
    const agentPhoneSet = new Set<string>()
    knownAgentLeads.forEach(l => {
      if (l.clientPhone) {
        agentPhoneSet.add(l.clientPhone.trim())
        const norm = normalizePhone(l.clientPhone)
        if (norm) agentPhoneSet.add(norm)
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

    // Save spreadsheet file for this import batch on disk
    let batchName = 'default_batch'
    if (leads.length > 0 && leads[0].importName) {
      batchName = String(leads[0].importName).trim()
    }
    const cleanBatch = batchName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `import_${cleanBatch}.xlsx`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imports')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const fullFilePath = path.join(uploadDir, fileName)
    const relativeFilePath = `/uploads/imports/${fileName}`

    // Process leads sequentially to ensure unique checks
    for (const item of leads) {
      const rawName = item.clientName ? String(item.clientName).trim() : ''
      const clientPhoneStr = item.clientPhone ? String(item.clientPhone).trim() : null
      const vehicleNoStr = item.vehicleNo ? String(item.vehicleNo).trim() : null

      // Check if this contact number or row is an Agent
      const isAgent = checkIsAgent(item, clientPhoneStr, agentPhoneSet)
      const finalAgentTag = isAgent ? 'Agent' : (item.existingAgent ? String(item.existingAgent).trim() : null)

      if (isAgent && clientPhoneStr) {
        agentPhoneSet.add(clientPhoneStr)

        // Ensure any existing records in the DB with this agent phone number are unassigned and tagged
        await prisma.lead.updateMany({
          where: { clientPhone: clientPhoneStr },
          data: { existingAgent: 'Agent', assignedTo: null }
        }).catch(() => {})
      }

      // Fallback name if clientName is missing in spreadsheet: use vehicle number, phone, or 'Lead Customer'
      const clientNameStr = rawName || vehicleNoStr || clientPhoneStr || 'Lead Customer'

      // Check if a Lead already exists - only consider it a duplicate if BOTH vehicleNo AND clientPhone match
      let existingLead = null

      if (vehicleNoStr && clientPhoneStr) {
        // Both present: only match if BOTH match
        existingLead = await prisma.lead.findFirst({
          where: {
            AND: [
              { vehicleNo: { equals: vehicleNoStr, mode: 'insensitive' } },
              { clientPhone: { equals: clientPhoneStr } }
            ]
          }
        })
      } else if (vehicleNoStr) {
        // Only vehicleNo present: match by vehicleNo alone
        existingLead = await prisma.lead.findFirst({
          where: { vehicleNo: { equals: vehicleNoStr, mode: 'insensitive' } }
        })
      }

      // Build data payload and extract custom fields
      const standardFields = [
        'clientName', 'clientPhone', 'clientEmail', 'vehicleNo',
        'expiryDate', 'registrationDate', 'gvw', 'address', 'city',
        'existingAgent', 'messageTemplate', 'importName'
      ]

      const parsedExpiry = parseImportedDate(item.expiryDate)
      const parsedRegDate = parseImportedDate(item.registrationDate)

      // Gather custom fields (any fields not in standard lead schema list)
      const customFields: Record<string, any> = {}
      Object.keys(item).forEach(key => {
        if (!standardFields.includes(key) && key !== 'id' && key !== 'assignedTo' && key !== 'status') {
          customFields[key] = item[key]
        }
      })

      if (existingLead) {
        // If it is an agent lead, do NOT assign to any staff (keep assignedTo null)
        let assignedToUpdate = isAgent ? null : existingLead.assignedTo
        if (!isAgent && !assignedToUpdate && salesExecutives.length > 0) {
          assignedToUpdate = salesExecutives[nextIndex].id
          nextIndex = (nextIndex + 1) % salesExecutives.length
        }

        // Merge customFields
        let existingCustomFields: any = {}
        if (existingLead.customFields && typeof existingLead.customFields === 'object') {
          existingCustomFields = existingLead.customFields
        }
        const mergedCustomFields = {
          ...existingCustomFields,
          ...customFields,
          importFilePath: relativeFilePath
        }

        // Update existing lead
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            clientName: clientNameStr,
            clientEmail: item.clientEmail ? String(item.clientEmail).trim() : existingLead.clientEmail,
            clientPhone: clientPhoneStr || existingLead.clientPhone,
            vehicleNo: vehicleNoStr || existingLead.vehicleNo,
            expiryDate: parsedExpiry || existingLead.expiryDate,
            registrationDate: parsedRegDate || existingLead.registrationDate,
            gvw: item.gvw ? String(item.gvw).trim() : existingLead.gvw,
            address: item.address ? String(item.address).trim() : existingLead.address,
            city: item.city ? String(item.city).trim() : existingLead.city,
            existingAgent: finalAgentTag || existingLead.existingAgent,
            messageTemplate: item.messageTemplate ? String(item.messageTemplate).trim() : existingLead.messageTemplate,
            importName: item.importName ? String(item.importName).trim() : existingLead.importName,
            customFields: mergedCustomFields,
            status: existingLead.status === 'Trashed' ? 'New' : existingLead.status,
            deletedAt: null,
            assignedTo: assignedToUpdate,
            updatedAt: new Date()
          }
        })
        updatedCount++
      } else {
        // Assign new lead using round-robin only if NOT an agent lead
        let assignedToNew = null
        if (!isAgent && salesExecutives.length > 0) {
          assignedToNew = salesExecutives[nextIndex].id
          nextIndex = (nextIndex + 1) % salesExecutives.length
        }

        // Create new lead
        await prisma.lead.create({
          data: {
            clientName: clientNameStr,
            clientPhone: clientPhoneStr,
            clientEmail: item.clientEmail ? String(item.clientEmail).trim() : null,
            vehicleNo: vehicleNoStr,
            expiryDate: parsedExpiry,
            registrationDate: parsedRegDate,
            gvw: item.gvw ? String(item.gvw).trim() : null,
            address: item.address ? String(item.address).trim() : null,
            city: item.city ? String(item.city).trim() : null,
            existingAgent: finalAgentTag,
            messageTemplate: item.messageTemplate ? String(item.messageTemplate).trim() : null,
            importName: item.importName ? String(item.importName).trim() : null,
            customFields: {
              ...customFields,
              importFilePath: relativeFilePath
            },
            status: 'New',
            assignedTo: assignedToNew
          }
        })
        importedCount++
      }
    }

    // Create pending approval requests & notify Admins if agents were detected
    const cleanBatchName = batchName !== 'default_batch' ? batchName : 'batch'
    const agentLeads = await prisma.lead.findMany({
      where: {
        importName: batchName !== 'default_batch' ? batchName : null,
        existingAgent: 'Agent',
        status: { not: 'Trashed' },
        deletedAt: null
      },
      select: { id: true, clientName: true, clientPhone: true, vehicleNo: true }
    })

    if (agentLeads.length > 0) {
      for (const agLead of agentLeads) {
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
              requestedBy: context!.userId,
              entityType: 'Lead',
              entityId: agLead.id,
              field: 'existingAgent',
              oldValue: 'Unassigned',
              newValue: 'Agent',
              reason: `Detected Agent in import "${cleanBatchName}" (Contact: ${agLead.clientPhone || agLead.vehicleNo})`,
              status: 'pending'
            }
          }).catch(err => console.warn('[import POST] Failed to create approval request:', err))
        }
      }

      await notifyRole('Admin', {
        title: `🚨 ${agentLeads.length} Agent Leads Detected in "${cleanBatchName}"`,
        body: `${agentLeads.length} contact(s) detected as Agent/Broker. Held in Pending Approval for Admin review.`,
        type: 'warning',
        entityType: 'agent_approval',
        data: {
          importName: cleanBatchName,
          agentCount: agentLeads.length,
          leads: agentLeads.slice(0, 5)
        }
      }).catch(() => {})

      await notifyRole('Super Admin', {
        title: `🚨 ${agentLeads.length} Agent Leads Detected in "${cleanBatchName}"`,
        body: `${agentLeads.length} contact(s) detected as Agent/Broker. Held in Pending Approval for Admin review.`,
        type: 'warning',
        entityType: 'agent_approval',
        data: {
          importName: cleanBatchName,
          agentCount: agentLeads.length,
          leads: agentLeads.slice(0, 5)
        }
      }).catch(() => {})
    }

    // Direct sheet sync
    await syncSpreadsheetForBatch(batchName !== 'default_batch' ? batchName : null, uploadDir).catch(e => console.warn('[import] Batch sync warning:', e))
    await syncSpreadsheetForBatch('all_leads', uploadDir).catch(e => console.warn('[import] Master sync warning:', e))

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${leads.length} leads.`,
      importedCount,
      updatedCount,
      agentCount: agentLeads.length
    })
  } catch (err: any) {
    console.error('Lead Import POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
