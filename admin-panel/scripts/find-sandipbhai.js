const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { clientName: { contains: 'SANDIP', mode: 'insensitive' } },
        { vehicleNo: { contains: '5577', mode: 'insensitive' } }
      ]
    },
    include: { assignee: true }
  });
  console.log('Found matching leads:', leads.length);
  for (const l of leads) {
    console.log('Lead ID:', l.id);
    console.log('Name:', l.clientName);
    console.log('Vehicle:', l.vehicleNo);
    console.log('Assignee:', l.assignee?.fullName);
    console.log('customFields:', JSON.stringify(l.customFields, null, 2));
  }
}

run().finally(() => prisma.$disconnect());
