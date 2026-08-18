const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const mavji = await prisma.lead.findUnique({
    where: { id: '2fecd384-db31-4f16-abda-d61b1c35a5bd' }
  });

  const sandipLead = await prisma.lead.findUnique({
    where: { id: 'd8213426-45d2-4d51-b493-103fbd322311' }
  });

  if (mavji && sandipLead) {
    const mavjiSub = mavji.customFields.policySubmission;
    const cf = sandipLead.customFields || {};

    const populatedSubmission = {
      ...mavjiSub,
      status: 'Pending_Review',
      salesPersonName: 'Sales 1',
      managerName: 'Manager 1',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: {
        ...mavjiSub.formData,
        regNo: 'GJ18AV5577',
        mobileNo1: '9825460900',
        rsFromCustomer: '18500',
        rate: '18500',
        policyType: 'Comprehensive',
        insCompany: 'Go Digit'
      }
    };

    await prisma.lead.update({
      where: { id: 'd8213426-45d2-4d51-b493-103fbd322311' },
      data: {
        customFields: {
          ...cf,
          policySubmission: populatedSubmission
        }
      }
    });

    console.log('Successfully populated SANDIPBHAI with all 7 documents and full form data!');
  }
}

run().finally(() => prisma.$disconnect());
