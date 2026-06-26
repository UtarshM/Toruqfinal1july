import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.role.findMany({ include: { _count: { select: { permissions: true } } } })
  console.log('Roles in DB:', JSON.stringify(roles, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
