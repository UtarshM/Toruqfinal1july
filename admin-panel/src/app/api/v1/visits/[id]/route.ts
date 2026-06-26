import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'
import { notifyRole } from '@/lib/notify'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req, 'visit.view')
  if (error) return error
  const { id } = await params

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      customer: true,
      lead: { select: { clientName: true, clientPhone: true } },
      user: { select: { fullName: true } }
    }
  })
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
  return NextResponse.json(visit)
}

// PATCH — check-in, check-out, add GPS trail point, complete visit
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req, 'visit.edit')
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const { action, lat, lng, location, gpsTrailPoint } = body

  const visit = await prisma.visit.findUnique({ where: { id } })
  if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

  let updateData: any = {}

  if (action === 'check_in') {
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required for check-in' }, { status: 400 })
    updateData = {
      status: 'in_progress',
      checkInTime: new Date(),
      startLat: lat,
      startLng: lng,
      location: location || visit.location,
      gpsTrail: [{ lat, lng, timestamp: new Date().toISOString() }]
    }
    await notifyRole('Manager', {
      title: '📍 Field Check-In',
      body: `${context!.email} checked in for visit: ${visit.purpose}`,
      type: 'info',
      entityType: 'Visit',
      entityId: visit.id
    })
  }

  else if (action === 'track') {
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    const existing = (visit.gpsTrail as any[]) || []
    const newPoint = { lat, lng, timestamp: new Date().toISOString() }
    updateData = { gpsTrail: [...existing, newPoint] }
  }

  else if (action === 'check_out') {
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required for check-out' }, { status: 400 })

    let distanceKm = null
    if (visit.startLat && visit.startLng) {
      distanceKm = haversineDistance(visit.startLat, visit.startLng, lat, lng)
    }

    const existing = (visit.gpsTrail as any[]) || []
    updateData = {
      status: 'completed',
      completedAt: new Date(),
      checkOutTime: new Date(),
      endLat: lat,
      endLng: lng,
      distanceKm,
      gpsTrail: [...existing, { lat, lng, timestamp: new Date().toISOString() }]
    }
  }

  else if (action === 'complete') {
    updateData = { status: 'completed', completedAt: new Date() }
  }

  else {
    updateData = body
    delete updateData.action
  }

  const updated = await prisma.visit.update({ where: { id }, data: updateData })

  logActivity(context!.userId, `visit_${action || 'update'}`, 'Visit', id, { lat, lng })
  return NextResponse.json(updated)
}

/** Haversine formula to calculate distance between two GPS coordinates in km */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2))
}
function toRad(deg: number) { return deg * Math.PI / 180 }
