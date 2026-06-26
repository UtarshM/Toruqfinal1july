const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    select: { id: true, vehicleNo: true, clientName: true }
  })
  
  const counts = {}
  leads.forEach(l => {
    const key = `${l.vehicleNo}-${l.clientName}`
    counts[key] = (counts[key] || 0) + 1
  })
  
  console.log('--- LEAD DUPLICATE CHECK ---')
  Object.entries(counts).forEach(([key, count]) => {
    if (count > 1) console.log(`${key}: ${count} copies`)
  })
  console.log(`Total Leads: ${leads.length}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
