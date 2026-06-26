const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } }
  })
  console.log('--- ROLES ---')
  roles.forEach(r => {
    console.log(`${r.name}: ${r._count.users} users`)
  })

  const users = await prisma.user.findMany({
    include: { role: true },
    take: 10
  })
  console.log('\n--- USERS ---')
  users.forEach(u => {
    console.log(`${u.fullName} (${u.email}) - Role: ${u.role?.name || 'NONE'} - Active: ${u.isActive}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
