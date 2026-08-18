const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({
    where: { customFields: { not: null } },
    select: { id: true, clientName: true, vehicleNo: true, customFields: true }
  });
  console.log('Total leads with customFields:', leads.length);
  for (const l of leads) {
    console.log('====================================');
    console.log('Lead:', l.id, l.clientName, l.vehicleNo);
    console.log('customFields:', JSON.stringify(l.customFields, null, 2));
  }
}

run().finally(() => prisma.$disconnect());
