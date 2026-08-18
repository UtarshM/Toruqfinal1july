const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({
    where: { customFields: { not: null } },
    select: { id: true, clientName: true, vehicleNo: true, customFields: true }
  });
  const subLeads = leads.filter(l => l.customFields && l.customFields.policySubmission);
  for (const l of subLeads) {
    console.log('ID:', l.id, 'Name:', l.clientName, 'Veh:', l.vehicleNo);
    console.log(JSON.stringify(l.customFields.policySubmission, null, 2));
  }
}

run().finally(() => prisma.$disconnect());
