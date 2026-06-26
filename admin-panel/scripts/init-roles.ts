
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const roles = [
    { name: 'ADMIN', description: 'System Administrator' },
    { name: 'MANAGER', description: 'Team Manager' },
    { name: 'EXECUTIVE', description: 'Sales Executive (Sales Agent)' }
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description }
    })
  }

  console.log('Roles initialized successfully.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
