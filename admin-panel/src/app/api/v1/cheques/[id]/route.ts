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

    if (body.deposit_date !== undefined || body.depositDate !== undefined) {
      const val = body.deposit_date || body.depositDate
      updateData.depositDate = val ? new Date(val) : null
    }

    if (body.clearance_date !== undefined || body.clearanceDate !== undefined) {
      const val = body.clearance_date || body.clearanceDate
      updateData.clearanceDate = val ? new Date(val) : null
    }

    if (body.bounce_reason !== undefined || body.bounceReason !== undefined) {
      updateData.bounceReason = body.bounce_reason || body.bounceReason || null
    }

    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks ? String(body.remarks).trim() : null
    }

    if (body.bank_name !== undefined || body.bankName !== undefined) {
      updateData.bankName = body.bank_name || body.bankName
    }

    if (body.cheque_no !== undefined || body.chequeNo !== undefined) {
      updateData.chequeNo = body.cheque_no || body.chequeNo
    }

    if (body.amount !== undefined) {
      const amt = Number(body.amount)
      if (!isNaN(amt) && amt > 0) updateData.amount = amt
    }

    const updated = await prisma.cheque.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: updated.id,
      bank_name: updated.bankName,
      bankName: updated.bankName,
      cheque_no: updated.chequeNo,
      chequeNo: updated.chequeNo,
      amount: Number(updated.amount),
      received_date: updated.receivedDate.toISOString().split('T')[0],
      receivedDate: updated.receivedDate.toISOString(),
      deposit_date: updated.depositDate ? updated.depositDate.toISOString().split('T')[0] : null,
      depositDate: updated.depositDate ? updated.depositDate.toISOString() : null,
      clearance_date: updated.clearanceDate ? updated.clearanceDate.toISOString().split('T')[0] : null,
      clearanceDate: updated.clearanceDate ? updated.clearanceDate.toISOString() : null,
      status: updated.status,
      bounce_reason: updated.bounceReason,
      bounceReason: updated.bounceReason,
      customer_id: updated.customerId,
      customerId: updated.customerId,
      customer_name: updated.customerName,
      customerName: updated.customerName,
      vehicle_no: updated.vehicleNo,
      vehicleNo: updated.vehicleNo,
      remarks: updated.remarks,
      updated_at: updated.updatedAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err: any) {
    console.error(`[API Cheque PATCH ${id}] Error:`, err)
    return NextResponse.json({ error: err.message || 'Failed to update cheque' }, { status: 500 })
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
    await prisma.cheque.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Cheque deleted successfully' })
  } catch (err: any) {
    console.error(`[API Cheque DELETE ${id}] Error:`, err)
    return NextResponse.json({ error: err.message || 'Failed to delete cheque' }, { status: 500 })
  }
}
