const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const authUsers = await prisma.$queryRawUnsafe(
    "SELECT id, email FROM auth.users"
  )
  console.log('--- CHECKING ALL USERS ---')
  const publicUsers = await prisma.user.findMany()

  for (const au of authUsers) {
    const pu = publicUsers.find(p => p.email.toLowerCase() === au.email.toLowerCase())
    if (!pu) {
      console.log('❌ MISSING IN PUBLIC:', au.email, au.id)
    } else if (pu.id !== au.id) {
      console.log('⚠️ MISMATCH:', au.email, '| Auth ID:', au.id, '| Public ID:', pu.id)
    } else {
      console.log('✅ MATCH:', au.email, au.id)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
