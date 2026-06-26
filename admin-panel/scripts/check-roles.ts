
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.role.findMany()
  console.log('Roles:', JSON.stringify(roles, null, 2))
  
  const users = await prisma.user.findMany({
    include: { role: true }
  })
  console.log('Users:', JSON.stringify(users.map(u => ({ email: u.email, role: u.role?.name })), null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
