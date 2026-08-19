import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req, 'leads.change_status')
  if (error) return error
  const { id: leadId } = await params
  const userId = context!.userId

  try {
    const body = await req.json()
    const { status, notes, customNotes, followupDate, newExpiryDate } = body

    if (!status && !customNotes) {
      return NextResponse.json({ error: 'Status or custom notes are required' }, { status: 400 })
    }

    const finalStatus = status || 'Other / Custom Note'
    const combinedNotes = [notes, customNotes].filter(Boolean).join('\n') || null

    const oldLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true }
    })

    if (!oldLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = { status: finalStatus }
      if (newExpiryDate) {
        try {
          const parsedExp = new Date(newExpiryDate)
          if (!isNaN(parsedExp.getTime())) {
            updateData.expiryDate = parsedExp
          }
        } catch {}
      }

      await tx.lead.update({ where: { id: leadId }, data: updateData })

      await tx.leadStatusHistory.create({
        data: {
          leadId,
          userId,
          oldStatus: oldLead.status,
          newStatus: finalStatus,
          notes: combinedNotes
        }
      })

      await tx.call.create({
        data: {
          leadId,
          userId,
          outcome: finalStatus,
          notes: combinedNotes,
          type: 'outbound'
        }
      })

      if (followupDate) {
        await tx.followUp.create({
          data: {
            leadId,
            assignedTo: userId,
            scheduledAt: new Date(followupDate),
            notes: combinedNotes,
            status: 'pending'
          }
        })
      }
    })

    const nextLead = await prisma.lead.findFirst({
      where: { assignedTo: userId, status: 'New', id: { not: leadId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })

    return NextResponse.json({ success: true, nextLeadId: nextLead?.id || null })

  } catch (error: any) {
    console.error('Lead Response Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
