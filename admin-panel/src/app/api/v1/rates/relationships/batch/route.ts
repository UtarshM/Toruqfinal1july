import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase() || ''
  const isSuperAdminEmail = context.email?.toLowerCase() === 'torqueautoadvisor@gmail.com'
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN' && !isSuperAdminEmail) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { updates = [], creates = [], deletes = [] } = body

    // 1. Resolve default category if needed for new rules
    let defaultCatId: string | null = null
    if (creates.length > 0) {
      const defaultCat = await prisma.categoryDetail.findFirst({ select: { id: true } })
      if (defaultCat) {
        defaultCatId = defaultCat.id
      } else {
        const createdCat = await prisma.categoryDetail.create({
          data: { name: 'Standard', status: 1 }
        })
        defaultCatId = createdCat.id
      }
    }

    // Process all modifications in a single atomic transaction
    const results = await prisma.$transaction(async (tx) => {
      // 1. Handle Deletions
      if (Array.isArray(deletes) && deletes.length > 0) {
        await tx.quotationRelationship.deleteMany({
          where: { id: { in: deletes } }
        })
      }

      // 2. Handle Updates
      if (Array.isArray(updates)) {
        for (const item of updates) {
          if (!item.id) continue
          const data: any = {
            updatedBy: context.userId
          }
          if (item.percentage !== undefined) {
            const p = parseFloat(item.percentage)
            if (!isNaN(p) && p >= 0 && p <= 100) data.percentage = p
          }
          if (item.profit !== undefined) {
            const pr = parseFloat(item.profit)
            if (!isNaN(pr) && pr >= 0) data.profit = pr
          }
          if (item.remarks !== undefined) {
            data.remarks = item.remarks ? String(item.remarks).trim() : null
          }
          if (item.status !== undefined) {
            data.status = parseInt(item.status)
          }

          await tx.quotationRelationship.update({
            where: { id: item.id },
            data
          })
        }
      }

      // 3. Handle Creates
      if (Array.isArray(creates)) {
        for (const item of creates) {
          let companyId = item.companyId
          if (!companyId && item.companyName && typeof item.companyName === 'string') {
            const trimmedName = item.companyName.trim()
            if (trimmedName) {
              let comp = await tx.companyDetail.findFirst({
                where: { name: { equals: trimmedName, mode: 'insensitive' } }
              })
              if (!comp) {
                comp = await tx.companyDetail.create({
                  data: { name: trimmedName, status: 1 }
                })
              }
              companyId = comp.id
            }
          }

          if (!companyId) continue
          const pct = parseFloat(item.percentage)
          const prof = parseFloat(item.profit)
          if (isNaN(pct) || isNaN(prof)) continue

          const catId = item.categoryId || defaultCatId
          if (!catId) continue

          // Check if already exists for this company
          const existing = await tx.quotationRelationship.findFirst({
            where: {
              companyId,
              categoryId: catId,
              status: { in: [1, 2] }
            }
          })

          if (existing) {
            // Update existing instead of throwing duplicate error
            await tx.quotationRelationship.update({
              where: { id: existing.id },
              data: {
                percentage: pct,
                profit: prof,
                remarks: item.remarks ? String(item.remarks).trim() : existing.remarks,
                status: item.status !== undefined ? parseInt(item.status) : existing.status,
                updatedBy: context.userId
              }
            })
          } else {
            await tx.quotationRelationship.create({
              data: {
                companyId,
                categoryId: catId,
                percentage: pct,
                profit: prof,
                remarks: item.remarks ? String(item.remarks).trim() : null,
                status: item.status !== undefined ? parseInt(item.status) : 1,
                addedBy: context.userId,
                updatedBy: context.userId
              }
            })
          }
        }
      }

      // Return fresh relationships and companies
      const [freshRelationships, freshCompanies] = await Promise.all([
        tx.quotationRelationship.findMany({
          where: { status: { in: [1, 2] } },
          include: {
            company: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        tx.companyDetail.findMany({
          where: { status: 1 },
          orderBy: { name: 'asc' }
        })
      ])

      return { relationships: freshRelationships, companies: freshCompanies }
    })

    return NextResponse.json({
      success: true,
      message: 'Batch changes saved successfully',
      data: results
    })
  } catch (err: any) {
    console.error('Batch save error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save batch changes' }, { status: 500 })
  }
}
