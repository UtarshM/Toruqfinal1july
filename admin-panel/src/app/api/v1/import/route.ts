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

    // Process leads sequentially to ensure unique checks
    for (const item of leads) {
      const clientNameStr = item.clientName ? String(item.clientName).trim() : ''
      if (!clientNameStr) continue // Name is required in schema

      const clientPhoneStr = item.clientPhone ? String(item.clientPhone).trim() : null
      const vehicleNoStr = item.vehicleNo ? String(item.vehicleNo).trim() : null

      // Check if a Lead already exists with the same vehicle registration number or client phone
      let existingLead = null

      if (vehicleNoStr) {
        existingLead = await prisma.lead.findFirst({
          where: { vehicleNo: { equals: vehicleNoStr, mode: 'insensitive' } }
        })
      }

      if (!existingLead && clientPhoneStr) {
        existingLead = await prisma.lead.findFirst({
          where: { clientPhone: { equals: clientPhoneStr } }
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
        // If the existing lead doesn't have an assignee, assign it using round-robin
        let assignedToUpdate = existingLead.assignedTo
        if (!assignedToUpdate && salesExecutives.length > 0) {
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
          ...customFields
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
            existingAgent: item.existingAgent ? String(item.existingAgent).trim() : existingLead.existingAgent,
            messageTemplate: item.messageTemplate ? String(item.messageTemplate).trim() : existingLead.messageTemplate,
            importName: item.importName ? String(item.importName).trim() : existingLead.importName,
            customFields: mergedCustomFields,
            assignedTo: assignedToUpdate,
            updatedAt: new Date()
          }
        })
        updatedCount++
      } else {
        // Assign new lead using round-robin
        let assignedToNew = null
        if (salesExecutives.length > 0) {
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
            existingAgent: item.existingAgent ? String(item.existingAgent).trim() : null,
            messageTemplate: item.messageTemplate ? String(item.messageTemplate).trim() : null,
            importName: item.importName ? String(item.importName).trim() : null,
            customFields: customFields,
            status: 'New',
            assignedTo: assignedToNew
          }
        })
        importedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${leads.length} leads.`,
      importedCount,
      updatedCount
    })
  } catch (err: any) {
    console.error('Lead Import POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
