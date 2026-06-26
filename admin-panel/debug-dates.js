const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, clientName: true }
  })
  console.log('--- LATEST 5 LEADS ---')
  leads.forEach(l => console.log(`${l.createdAt.toISOString()} - ${l.clientName}`))
  console.log('\n--- SYSTEM TIME ---')
  console.log(new Date().toISOString())
}

main().catch(console.error).finally(() => prisma.$disconnect())
