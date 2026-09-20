import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await props.params

  try {
    const body = await req.json()
    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = String(body.status).toLowerCase()
    }

    if (body.collected_amount !== undefined || body.collectedAmount !== undefined) {
      const val = Number(body.collected_amount ?? body.collectedAmount)
      if (!isNaN(val) && val >= 0) {
        updateData.collectedAmount = val
      }
    }

    if (body.collected_date !== undefined || body.collectedDate !== undefined) {
      const val = body.collected_date || body.collectedDate
      updateData.collectedDate = val ? new Date(val) : null
    }

    if (body.agent_id !== undefined || body.agentId !== undefined) {
      updateData.agentId = body.agent_id || body.agentId || null
    }

    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks ? String(body.remarks).trim() : null
    }

    const updated = await prisma.ughraniAssignment.update({
      where: { id },
      data: updateData,
      include: {
        book: { select: { bookName: true } },
        agent: { select: { fullName: true } }
      }
    })

    return NextResponse.json({
      id: updated.id,
      book_id: updated.bookId,
      bookId: updated.bookId,
      book_name: updated.book?.bookName || '',
      bookName: updated.book?.bookName || '',
      agent_id: updated.agentId,
      agentId: updated.agentId,
      agent_name: updated.agent?.fullName || '',
      agentName: updated.agent?.fullName || '',
      customer_id: updated.customerId,
      customerId: updated.customerId,
      customer_name: updated.customerName,
      customerName: updated.customerName,
      customer_phone: updated.customerPhone,
      customerPhone: updated.customerPhone,
      vehicle_no: updated.vehicleNo,
      vehicleNo: updated.vehicleNo,
      amount_due: Number(updated.amountDue),
      amountDue: Number(updated.amountDue),
      collected_amount: Number(updated.collectedAmount),
      collectedAmount: Number(updated.collectedAmount),
      status: updated.status,
      collected_date: updated.collectedDate ? updated.collectedDate.toISOString().split('T')[0] : null,
      collectedDate: updated.collectedDate ? updated.collectedDate.toISOString() : null,
      remarks: updated.remarks,
      updated_at: updated.updatedAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err: any) {
    console.error(`[API Ughrani Assignment PATCH ${id}] Error:`, err)
    return NextResponse.json({ error: err.message || 'Failed to update assignment' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await props.params

  try {
    await prisma.ughraniAssignment.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Assignment deleted successfully' })
  } catch (err: any) {
    console.error(`[API Ughrani Assignment DELETE ${id}] Error:`, err)
    return NextResponse.json({ error: err.message || 'Failed to delete assignment' }, { status: 500 })
  }
}
