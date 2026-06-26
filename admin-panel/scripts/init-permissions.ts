
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const permissions = [
    // Dashboard permissions
    'dashboard.view_admin',
    'dashboard.view_manager',
    'dashboard.view_agent',
    'dashboard.export',
    
    // Lead permissions
    'leads.view',
    'leads.create',
    'leads.edit',
    'leads.delete',
    'leads.assign',
    'leads.import',
    'leads.export',
    'leads.change_status',
    'lead.view', // Singular alias
    
    // CRM & Operations
    'crm.view',
    'crm.create',
    'crm.view_revenue',
    'crm.manage_customers',
    'claims.view',
    'claims.create',
    'claims.edit',
    'loan.view',
    'loan.create',
    'loan.edit',
    'rto.view',
    'rto.create',
    'rto.edit',
    'fitness.view',
    'fitness.edit',
    'visit.view',
    'visit.create',
    'visit.edit',
    
    // User/Role permissions
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'roles.view',
    'roles.manage',
    
    // Quotation permissions
    'quotations.create',
    'quotations.edit',
    'quotations.delete',
    'quotations.approve',
    'quotations.share',
    'quotation.share', // Singular alias
    
    // Communication & Tools
    'whatsapp.send',
    'whatsapp.manage_templates',
    'remarks.manage_presets',
    'notification.send',
    
    // Data & Documents
    'data.view',
    'data.create',
    'data.approve_changes',
    'data.manage_documents',
    
    // System Config & Reports
    'settings.view',
    'settings.manage',
    'finance.view',
    'hr.view',
    'accounts.view_reports'
  ]

  // Create permissions
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: `Permission for ${name}` }
    })
  }

  // Define role permissions
  const adminPerms = permissions // All

  const managerPerms = [
    'dashboard.view_manager',
    'leads.view',
    'lead.view',
    'leads.assign',
    'leads.change_status',
    'leads.export',
    'crm.view',
    'crm.create',
    'crm.view_revenue',
    'claims.view',
    'claims.create',
    'claims.edit',
    'loan.view',
    'loan.create',
    'loan.edit',
    'rto.view',
    'rto.create',
    'rto.edit',
    'fitness.view',
    'fitness.edit',
    'visit.view',
    'visit.create',
    'visit.edit',
    'quotations.approve',
    'quotations.create',
    'quotations.share',
    'quotation.share',
    'whatsapp.send',
    'accounts.view_reports',
    'data.view',
    'data.manage_documents',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete'
  ]

  const executivePerms = [
    'dashboard.view_agent',
    'leads.view',
    'lead.view',
    'leads.change_status',
    'crm.view',
    'claims.view',
    'loan.view',
    'rto.view',
    'fitness.view',
    'visit.view',
    'visit.create',
    'quotations.create',
    'quotations.share',
    'quotation.share',
    'whatsapp.send',
    'data.manage_documents'
  ]

  const roles = [
    { name: 'ADMIN', perms: adminPerms },
    { name: 'MANAGER', perms: managerPerms },
    { name: 'EXECUTIVE', perms: executivePerms }
  ]

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, description: `${r.name} Role` }
    })

    const dbPerms = await prisma.permission.findMany({
      where: { name: { in: r.perms } }
    })

    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: dbPerms.map(p => ({ id: p.id }))
        }
      }
    })
  }

  console.log('Role hierarchy fully updated with all operational permissions (Claims, Loans, RTO, Fitness, etc.).')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
