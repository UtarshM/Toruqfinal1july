const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Assigning permissions to all roles...\n')

  // Get all permissions
  const allPermissions = await prisma.permission.findMany()
  const allPermNames = allPermissions.map(p => p.name)
  console.log(`Found ${allPermissions.length} permissions in database`)

  // Get all roles
  const allRoles = await prisma.role.findMany()
  console.log(`Found ${allRoles.length} roles in database\n`)

  // Define permission sets for each role
  const adminFullAccess = allPermNames // Super Admin & Admin get everything

  const hrManagerPerms = [
    // Dashboard
    'dashboard.view_admin',
    // Users & Onboarding
    'users.view', 'users.create', 'users.edit',
    'roles.view',
    // HR, Attendance, Leaves & Salaries
    'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.manage_attendance', 'hr.manage_leave', 'hr.view_performance',
    'accounts.manage_salary',
    // Notifications & Settings
    'notification.view',
    'settings.view'
  ]

  const managerPerms = [
    'dashboard.view_manager',
    'leads.view', 'lead.view', 'leads.create', 'leads.edit', 'leads.assign', 'leads.change_status', 'leads.export',
    'lead.create', 'lead.edit', 'lead.assign', 'lead.change_status', 'lead.export',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups', 'crm.view_revenue',
    'claims.view', 'claims.create', 'claims.edit',
    'loan.view', 'loan.create', 'loan.edit',
    'rto.view', 'rto.create', 'rto.edit',
    'fitness.view', 'fitness.edit',
    'visit.view', 'visit.create', 'visit.edit',
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.share',
    'quotations.create', 'quotations.edit', 'quotations.share',
    'data.view', 'data.manage_documents',
    'users.view', 'users.create', 'users.edit',
    'accounts.view_reports',
    'notification.view', 'notification.send',
  ]

  const salesExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'lead.change_status',
    'leads.view', 'leads.create', 'leads.edit', 'leads.assign', 'leads.change_status',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups',
    'visit.view', 'visit.create', 'visit.manage_followups',
    'data.view',
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.generate_pdf', 'quotation.share',
    'quotations.create', 'quotations.edit', 'quotations.delete', 'quotations.share',
    'notification.view',
  ]

  const telecallerPerms = [
    'dashboard.view_agent',
    'lead.view', 'lead.create', 'lead.edit', 'lead.change_status',
    'leads.view', 'leads.create', 'leads.edit', 'leads.change_status',
    'crm.view', 'crm.manage_followups',
    'notification.view',
  ]

  const fieldExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'lead.create', 'lead.edit', 'lead.change_status',
    'leads.view', 'leads.create', 'leads.edit', 'leads.change_status',
    'visit.view', 'visit.create', 'visit.edit', 'visit.track_location', 'visit.manage_followups',
    'crm.view', 'crm.create',
    'data.view', 'data.manage_documents',
    'notification.view',
  ]

  const rtoExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'leads.view',
    'rto.view', 'rto.create', 'rto.edit', 'rto.update_status', 'rto.track_payment',
    'data.view', 'data.manage_documents',
    'notification.view',
  ]

  const claimsExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'leads.view',
    'claims.view', 'claims.create', 'claims.edit', 'claims.update_status', 'claims.upload_documents',
    'data.view', 'data.manage_documents',
    'notification.view',
  ]

  const loanExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'leads.view',
    'loan.view', 'loan.create', 'loan.edit', 'loan.update_status', 'loan.track_conversion',
    'data.view', 'data.manage_documents',
    'notification.view',
  ]

  const crmExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'leads.view',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups', 'crm.view_revenue',
    'visit.view', 'visit.create',
    'data.view',
    'notification.view',
  ]

  const accountantPerms = [
    'dashboard.view_admin',
    'accounts.view', 'accounts.create_entry', 'accounts.edit_entry', 'accounts.view_reports', 'accounts.export', 'accounts.manage_salary',
    'data.view',
    'notification.view',
  ]

  const viewerPerms = [
    'dashboard.view_agent',
    'lead.view', 'leads.view',
    'crm.view',
    'data.view',
    'notification.view',
  ]

  // Map role names to their permission sets
  const rolePermMap = {
    'Super Admin': adminFullAccess,
    'Admin': adminFullAccess,
    'HR Manager': hrManagerPerms,
    'Manager': managerPerms,
    'Sales Executive': salesExecutivePerms,
    'Telecaller': telecallerPerms,
    'Field Executive': fieldExecutivePerms,
    'RTO Executive': rtoExecutivePerms,
    'Claims Executive': claimsExecutivePerms,
    'Loan Executive': loanExecutivePerms,
    'CRM Executive': crmExecutivePerms,
    'Accountant': accountantPerms,
    'Viewer': viewerPerms,
  }

  for (const role of allRoles) {
    const permNames = rolePermMap[role.name]
    if (!permNames) {
      console.log(`⚠ No permission mapping for role: ${role.name}`)
      continue
    }

    // Find matching permissions in DB (filter out any that don't exist)
    const matchingPerms = allPermissions.filter(p => permNames.includes(p.name))

    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: matchingPerms.map(p => ({ id: p.id }))
        }
      }
    })

    console.log(`✓ ${role.name}: ${matchingPerms.length} permissions assigned`)
  }

  console.log('\n✅ All role permissions updated successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
