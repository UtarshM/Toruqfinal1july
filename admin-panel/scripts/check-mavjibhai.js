const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const lead = await prisma.lead.findFirst({
    where: { vehicleNo: 'GJ36W3103' }
  });
  console.log('Lead:', lead.clientName, lead.vehicleNo);
  console.log('customFields:', JSON.stringify(lead.customFields, null, 2));
}

run().finally(() => prisma.$disconnect());
