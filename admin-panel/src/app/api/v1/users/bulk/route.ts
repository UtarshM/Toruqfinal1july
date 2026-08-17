import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateAuth } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'users.edit')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action, userIds } = body // action: 'activate' | 'deactivate' | 'retire' | 'delete' | 'sync_supabase'

    // ─────────────────────────────────────────────────────────────
    // Action 1: SYNC WITH SUPABASE AUTH
    // ─────────────────────────────────────────────────────────────
    if (action === 'sync_supabase') {
      // 1. Fetch all users from Supabase Auth
      let supabaseUsers: any[] = []
      try {
        let page = 1
        const perPage = 1000
        const { data, error: sbError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (!sbError && data?.users) {
          supabaseUsers = data.users
        }
      } catch (sbErr) {
        console.error('[bulk-users] Error fetching Supabase Auth users:', sbErr)
      }

      const supabaseUserIds = new Set(supabaseUsers.map(u => u.id))

      // 2. Fetch all users from Prisma DB
      const dbUsers = await prisma.user.findMany({ select: { id: true, email: true, fullName: true } })
      const orphanedUsers = dbUsers.filter(u => !supabaseUserIds.has(u.id))

      let cleanedCount = 0
      if (orphanedUsers.length > 0) {
        const orphanedIds = orphanedUsers.map(u => u.id)
        
        // Clean up references before deleting
        await prisma.document.deleteMany({ where: { OR: [{ entityId: { in: orphanedIds }, entityType: 'User' }, { uploadedBy: { in: orphanedIds } }] } })
        await prisma.notification.deleteMany({ where: { userId: { in: orphanedIds } } })
        await prisma.attendance.deleteMany({ where: { userId: { in: orphanedIds } } })
        await prisma.salary.deleteMany({ where: { userId: { in: orphanedIds } } })
        await prisma.leaveRequest.deleteMany({ where: { OR: [{ userId: { in: orphanedIds } }, { approvedBy: { in: orphanedIds } }] } })
        
        // Unassign leads, calls, visits assigned to orphaned users
        await prisma.lead.updateMany({ where: { assignedTo: { in: orphanedIds } }, data: { assignedTo: null } })
        await prisma.call.updateMany({ where: { userId: { in: orphanedIds } }, data: { userId: null as any } }).catch(() => {})
        await prisma.visit.updateMany({ where: { userId: { in: orphanedIds } }, data: { userId: null } })

        const deleteResult = await prisma.user.deleteMany({
          where: { id: { in: orphanedIds } }
        })
        cleanedCount = deleteResult.count
      }

      return NextResponse.json({
        success: true,
        message: cleanedCount > 0 
          ? `Synced with Supabase: Purged ${cleanedCount} orphaned users not present in Supabase Auth.`
          : 'Database is 100% in sync with Supabase Auth. No orphaned users found.',
        cleanedCount,
        totalSupabaseUsers: supabaseUsers.length,
        totalDbUsers: dbUsers.length - cleanedCount
      })
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 })
    }

    // ─────────────────────────────────────────────────────────────
    // Action 2: BULK ACTIVATE
    // ─────────────────────────────────────────────────────────────
    if (action === 'activate') {
      const res = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive: true, deletedAt: null }
      })
      return NextResponse.json({
        success: true,
        message: `Successfully activated ${res.count} users.`,
        count: res.count
      })
    }

    // ─────────────────────────────────────────────────────────────
    // Action 3: BULK DEACTIVATE / RETIRE
    // ─────────────────────────────────────────────────────────────
    if (action === 'deactivate' || action === 'retire') {
      const res = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive: false }
      })
      return NextResponse.json({
        success: true,
        message: `Successfully deactivated ${res.count} users.`,
        count: res.count
      })
    }

    // ─────────────────────────────────────────────────────────────
    // Action 4: BULK PERMANENT DELETE (From Supabase Auth & Prisma DB)
    // ─────────────────────────────────────────────────────────────
    if (action === 'delete') {
      // 1. Delete from Supabase Auth for each user
      let supabaseDeletedCount = 0
      for (const uid of userIds) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(uid)
          supabaseDeletedCount++
        } catch (authErr) {
          console.warn(`[bulk-users] Failed to delete Supabase user ${uid}:`, authErr)
        }
      }

      // 2. Clean up foreign keys in DB
      await prisma.document.deleteMany({ where: { OR: [{ entityId: { in: userIds }, entityType: 'User' }, { uploadedBy: { in: userIds } }] } })
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.attendance.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.salary.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.leaveRequest.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { approvedBy: { in: userIds } }] } })

      // Unassign leads & visits
      await prisma.lead.updateMany({ where: { assignedTo: { in: userIds } }, data: { assignedTo: null } })
      await prisma.visit.updateMany({ where: { userId: { in: userIds } }, data: { userId: null } })

      // 3. Delete from Prisma DB
      const res = await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      })

      return NextResponse.json({
        success: true,
        message: `Permanently deleted ${res.count} users from both Database and Supabase Auth.`,
        count: res.count,
        supabaseDeletedCount
      })
    }

    return NextResponse.json({ error: `Invalid action "${action}". Allowed: activate, deactivate, retire, delete, sync_supabase` }, { status: 400 })

  } catch (err: any) {
    console.error('[bulk-users] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
