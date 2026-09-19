const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TORQUE_ROLES = [
  "Accountant",
  "Admin",
  "Claims Executive",
  "CRM Executive",
  "Field Executive",
  "HR Manager",
  "Loan Executive",
  "Manager",
  "RTO Executive",
  "Sales Executive",
  "Super Admin",
  "Viewer"
]

async function main() {
  console.log('--- Cleaning and aligning roles for Torque Auto Advisor ---')

  // 1. Ensure Super Admin exists first
  let superAdmin = await prisma.role.findFirst({ where: { name: 'Super Admin' } })
  if (!superAdmin) {
    superAdmin = await prisma.role.create({ data: { name: 'Super Admin' } })
    console.log('✓ Created Super Admin role')
  }

  // 2. Ensure all 12 Torque roles exist
  for (const roleName of TORQUE_ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    })
    console.log(`✓ Ensured Torque role: ${roleName}`)
  }

  // 3. Reassign any existing users on legacy/movish roles to a proper Torque role
  const allUsers = await prisma.user.findMany({ include: { role: true } })
  for (const user of allUsers) {
    if (!user.role || !TORQUE_ROLES.includes(user.role.name)) {
      console.log(`Reassigning user ${user.email} (current role: ${user.role?.name}) to Super Admin...`)
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: superAdmin.id }
      })
    }
  }

  // If admin@movish.com exists, delete or re-align to torque
  const movishUser = await prisma.user.findFirst({ where: { email: { contains: 'movish', mode: 'insensitive' } } })
  if (movishUser) {
    console.log(`Removing legacy movish user: ${movishUser.email}`)
    await prisma.user.delete({ where: { id: movishUser.id } }).catch(e => console.log('Could not delete movish user:', e.message))
  }

  // 4. Delete any roles not in the 12 Torque roles
  const rolesToDelete = await prisma.role.findMany({
    where: {
      name: { notIn: TORQUE_ROLES }
    }
  })

  console.log(`Found ${rolesToDelete.length} non-Torque roles to delete:`, rolesToDelete.map(r => r.name))

  for (const r of rolesToDelete) {
    // Disconnect any lingering relations
    await prisma.$executeRawUnsafe(`DELETE FROM "_RolePermissions" WHERE "B" = $1::uuid`, r.id).catch(() => {})
    await prisma.role.delete({ where: { id: r.id } })
    console.log(`✓ Deleted non-Torque role: ${r.name}`)
  }

  // 5. Verify final roles
  const finalRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } })
  console.log('\n--- Final Torque Auto Advisor Roles in Database ---')
  finalRoles.forEach(r => console.log(`- ${r.name}`))

  console.log('\n✅ Torque roles cleanup complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
