import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import { formatDateDMY } from '@/lib/date-format'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.export')
  if (error) return error

  try {
    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: { not: 'Trashed' }
      },
      orderBy: [
        { expiryDate: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        assignee: { select: { fullName: true } }
      }
    })

    const csvData = leads.map(lead => ({
      ID: lead.id,
      'Client Name': lead.clientName,
      'Phone': lead.clientPhone || 'N/A',
      'Vehicle No': lead.vehicleNo || 'N/A',
      'Insurance Expiry Date': formatDateDMY(lead.expiryDate, 'N/A'),
      'Email': lead.clientEmail || 'N/A',
      'Status': lead.status,
      'Allotted To': lead.assignee?.fullName || 'Unallotted',
      'Created At': formatDateDMY(lead.createdAt),
    }))

    const csv = Papa.unparse(csvData)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=leads-export-${formatDateDMY(new Date()).replace(/\//g, '-')}.csv`
      }
    })
  } catch (error) {
    console.error('Lead Export Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
