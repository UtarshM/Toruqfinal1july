import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const fitness = await prisma.fitnessWork.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { clientName: true } } }
    })
    return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const data = await req.json()
    const fitness = await prisma.fitnessWork.create({
      data: {
        leadId: data.lead_id,
        assignedTo: data.assigned_to,
        customerName: data.customer_name,
        vehicleNumber: data.vehicle_number,
        status: data.status || 'pending',
        testDate: data.test_date ? new Date(data.test_date) : null,
        fees: data.fees
      }
    })
    return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
export async function PATCH(req: NextRequest) {
  const { error } = await validateAuth(req, 'fitness.edit')
  if (error) return error

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    if (updates.testDate) updates.testDate = new Date(updates.testDate)
    if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate)

    const fitness = await prisma.fitnessWork.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
