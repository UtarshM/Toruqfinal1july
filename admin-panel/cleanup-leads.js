const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up duplicate leads...')
  
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'asc' }
  })
  
  const seen = new Set()
  const toDelete = []
  
  for (const lead of leads) {
    const key = lead.vehicleNo?.toUpperCase() || lead.clientPhone
    if (seen.has(key)) {
      toDelete.push(lead.id)
    } else {
      seen.add(key)
    }
  }
  
  if (toDelete.length > 0) {
    await prisma.lead.deleteMany({
      where: { id: { in: toDelete } }
    })
    console.log(`Deleted ${toDelete.length} duplicate leads.`)
  } else {
    console.log('No duplicates found.')
  }
  
  const finalCount = await prisma.lead.count()
  console.log(`Total leads remaining: ${finalCount}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
