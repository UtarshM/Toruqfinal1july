const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Assigning permissions to Torque Auto Advisor roles...\n')

  const allPermissions = await prisma.permission.findMany()
  const allPermNames = allPermissions.map(p => p.name)
  console.log(`Found ${allPermissions.length} permissions in database`)

  const allRoles = await prisma.role.findMany()
  console.log(`Found ${allRoles.length} roles in database:\n`, allRoles.map(r => r.name))

  const universalLoanPerms = [
    'loan.view', 'loan.create', 'loan.edit', 'loan.delete', 'loan.update_status', 'loan.track_conversion',
    'loan_inquiry.view', 'loan_inquiry.create', 'loan_inquiry.edit', 'loan_inquiry.delete'
  ]

  const hrManagerPerms = [
    'dashboard.view_admin', 'dashboard.view_manager', 'dashboard.view_agent', 'dashboard.export',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'role.view', 'role.create', 'role.edit', 'role.assign_permissions',
    'hr.view', 'hr.create', 'hr.edit', 'hr.delete', 'hr.manage_attendance', 'hr.manage_leave', 'hr.view_performance',
    'accounts.view', 'accounts.manage_salary',
    'notification.view', 'notification.send',
    'settings.view', 'settings.manage',
    ...universalLoanPerms
  ]

  const managerPerms = [
    'dashboard.view_manager', 'dashboard.view_agent', 'dashboard.export',
    'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'lead.import', 'lead.export', 'lead.change_status',
    'leads.view', 'leads.create', 'leads.edit', 'leads.assign', 'leads.import', 'leads.export', 'leads.change_status',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups', 'crm.view_revenue',
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.share', 'quotation.generate_pdf',
    'quotations.create', 'quotations.edit', 'quotations.share', 'quotations.approve',
    'claims.view', 'claims.create', 'claims.edit', 'claims.update_status', 'claims.upload_documents',
    'rto.view', 'rto.create', 'rto.edit', 'rto.update_status', 'rto.track_payment',
    'vahan.view', 'vahan.create', 'vahan.edit', 'vahan.update_status', 'vahan.track_payment',
    'fitness.view', 'fitness.create', 'fitness.edit', 'fitness.update_status', 'fitness.track_payment',
    'visit.view', 'visit.create', 'visit.edit', 'visit.manage_followups',
    'policy.view', 'policy.create', 'policy.edit',
    'data.view', 'data.create', 'data.manage_documents',
    'users.view', 'users.create', 'users.edit',
    'accounts.view', 'accounts.view_reports',
    'notification.view', 'notification.send',
    ...universalLoanPerms
  ]

  const salesExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'lead.create', 'lead.edit', 'lead.assign', 'lead.change_status',
    'leads.view', 'leads.create', 'leads.edit', 'leads.assign', 'leads.change_status',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups',
    'visit.view', 'visit.create', 'visit.manage_followups',
    'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.share', 'quotation.generate_pdf',
    'quotations.create', 'quotations.edit', 'quotations.share',
    'policy.view',
    'data.view',
    'notification.view',
    ...universalLoanPerms
  ]

  const fieldExecutivePerms = [
    'dashboard.view_agent',
    'lead.view', 'lead.create', 'lead.edit', 'lead.change_status',
    'visit.view', 'visit.create', 'visit.edit', 'visit.track_location', 'visit.manage_followups',
    'crm.view', 'crm.create',
    'data.view', 'data.manage_documents',
    'notification.view',
    ...universalLoanPerms
  ]

  const rtoExecutivePerms = [
    'dashboard.view_agent',
    'lead.view',
    'rto.view', 'rto.create', 'rto.edit', 'rto.update_status', 'rto.track_payment',
    'vahan.view', 'vahan.create', 'vahan.edit', 'vahan.update_status', 'vahan.track_payment',
    'fitness.view', 'fitness.create', 'fitness.edit', 'fitness.update_status', 'fitness.track_payment',
    'data.view', 'data.manage_documents',
    'notification.view',
    ...universalLoanPerms
  ]

  const claimsExecutivePerms = [
    'dashboard.view_agent',
    'lead.view',
    'claims.view', 'claims.create', 'claims.edit', 'claims.update_status', 'claims.upload_documents',
    'data.view', 'data.manage_documents',
    'notification.view',
    ...universalLoanPerms
  ]

  const loanExecutivePerms = [
    'dashboard.view_agent',
    'lead.view',
    'data.view', 'data.manage_documents',
    'notification.view',
    ...universalLoanPerms
  ]

  const crmExecutivePerms = [
    'dashboard.view_agent',
    'lead.view',
    'crm.view', 'crm.create', 'crm.edit', 'crm.manage_followups', 'crm.view_revenue',
    'visit.view', 'visit.create',
    'data.view',
    'notification.view',
    ...universalLoanPerms
  ]

  const accountantPerms = [
    'dashboard.view_admin', 'dashboard.view_agent',
    'accounts.view', 'accounts.create_entry', 'accounts.edit_entry', 'accounts.view_reports', 'accounts.export', 'accounts.manage_salary',
    'data.view',
    'notification.view',
    ...universalLoanPerms
  ]

  const viewerPerms = [
    'dashboard.view_agent',
    'lead.view',
    'crm.view',
    'data.view',
    'notification.view',
    ...universalLoanPerms
  ]

  const rolePermMap = {
    'Super Admin': allPermNames,
    'Admin': allPermNames.filter(p => !p.startsWith('system.')),
    'HR Manager': hrManagerPerms,
    'Manager': managerPerms,
    'Sales Executive': salesExecutivePerms,
    'Field Executive': fieldExecutivePerms,
    'RTO Executive': rtoExecutivePerms,
    'Claims Executive': claimsExecutivePerms,
    'Loan Executive': loanExecutivePerms,
    'CRM Executive': crmExecutivePerms,
    'Accountant': accountantPerms,
    'Viewer': viewerPerms,
  }

  for (const role of allRoles) {
    const desiredPerms = rolePermMap[role.name]
    if (!desiredPerms) {
      console.log(`⚠ No permission mapping for role: ${role.name}`)
      continue
    }

    const matchingPerms = allPermissions.filter(p => desiredPerms.includes(p.name))

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

  console.log('\n✅ All Torque Auto Advisor role permissions assigned successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
