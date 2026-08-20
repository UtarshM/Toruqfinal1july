const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup of transactional database...');

  // Delete all transactional tables to avoid foreign key constraints
  // We want to keep User, Role, Permission records intact so they can log in.
  
  const tables = [
    'LeadAssignment',
    'LeadWhatsAppLog',
    'LeadStatusHistory',
    'Call',
    'FollowUp',
    'Visit',
    'RTOWork',
    'FitnessWork',
    'Loan',
    'Claim',
    'Policy',
    'Quotation',
    'Customer',
    'Transaction',
    'Notification',
    'RenewalRecord',
    'LeaveRequest',
    'Attendance',
    'Salary',
    'ActivityLog',
    'Document',
    'Lead'
  ];

  // Attempt using Prisma Client model clearings
  for (const table of tables) {
    try {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      if (prisma[modelName]) {
        const count = await prisma[modelName].deleteMany();
        console.log(`Cleared ${count.count} rows from ${table}`);
      }
    } catch (e) {
      console.warn(`Prisma delete failed for ${table}:`, e.message);
    }
  }

  // Raw SQL Truncate CASCADE for absolute completeness
  try {
    const rawQuery = `
      TRUNCATE TABLE 
        "lead_assignments", 
        "lead_whatsapp_logs", 
        "lead_status_histories", 
        "calls", 
        "follow_ups", 
        "visits", 
        "rto_work", 
        "fitness_work", 
        "loans", 
        "claims", 
        "policies", 
        "quotations", 
        "customers", 
        "transactions", 
        "notifications", 
        "renewal_records", 
        "leave_requests", 
        "attendance", 
        "salaries", 
        "activity_logs", 
        "documents", 
        "leads" 
      CASCADE;
    `;
    await prisma.$executeRawUnsafe(rawQuery);
    console.log('Successfully completed raw TRUNCATE CASCADE of all transactional tables!');
  } catch (err) {
    console.error('Error during raw truncate cascade:', err.message);
  }

  console.log('Cleanup finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
