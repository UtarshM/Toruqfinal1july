import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const DEFAULT_MAPPINGS = [
  { dbField: 'clientName', label: 'Client Name', required: true },
  { dbField: 'clientPhone', label: 'Phone Number', required: false },
  { dbField: 'clientEmail', label: 'Email Address', required: false },
  { dbField: 'vehicleNo', label: 'Vehicle Number', required: false },
  { dbField: 'expiryDate', label: 'Policy Expiry Date', required: false },
  { dbField: 'registrationDate', label: 'REG NO', required: false },
  { dbField: 'gvw', label: 'Gross Vehicle Weight (GVW)', required: false },
  { dbField: 'address', label: 'Address', required: false },
  { dbField: 'city', label: 'City', required: false }
]

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'lead_import_mappings' }
    })

    const mappings = setting ? setting.value : DEFAULT_MAPPINGS

    return NextResponse.json({ success: true, mappings })
  } catch (err: any) {
    console.error('Failed to fetch import mappings:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  const role = context?.role?.toUpperCase()
  if (role !== 'ADMIN' && role !== 'SUPER ADMIN') {
    return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { mappings } = body

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'mappings array is required' }, { status: 400 })
    }

    // Basic validation of mappings
    for (const m of mappings) {
      if (!m.dbField || !m.label) {
        return NextResponse.json({ error: 'Each mapping must contain a dbField and label' }, { status: 400 })
      }
    }

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: 'lead_import_mappings' },
      update: { value: mappings },
      create: { key: 'lead_import_mappings', value: mappings }
    })

    return NextResponse.json({ success: true, mappings: updatedSetting.value })
  } catch (err: any) {
    console.error('Failed to save import mappings:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
