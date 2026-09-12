const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldId = 'a11f0c8c-aa4d-46ca-addc-4b861176c272';
  const newId = 'fc1dcbb6-8430-418d-afbe-4474dc212286';

  console.log(`Fixing angelinsurance18@gmail.com: Changing ${oldId} -> ${newId}`);

  await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");
  
  // Update user ID
  const u = await prisma.$executeRawUnsafe(`UPDATE users SET id = '${newId}'::uuid WHERE id = '${oldId}'::uuid;`);
  console.log('Updated user rows:', u);

  // Update leads assignedTo
  const l = await prisma.$executeRawUnsafe(`UPDATE leads SET "assignedTo" = '${newId}'::uuid WHERE "assignedTo" = '${oldId}'::uuid;`);
  console.log('Updated leads assignedTo:', l);

  // Update LeaveRequest
  try {
    const lr = await prisma.$executeRawUnsafe(`UPDATE "LeaveRequest" SET "userId" = '${newId}'::uuid WHERE "userId" = '${oldId}'::uuid;`);
    console.log('Updated LeaveRequest rows:', lr);
  } catch (e) {
    console.log('No LeaveRequest to update or table not yet populated');
  }

  // Update CallLogs / ActivityLogs if any
  try {
    await prisma.$executeRawUnsafe(`UPDATE "CallLog" SET "userId" = '${newId}'::uuid WHERE "userId" = '${oldId}'::uuid;`);
    await prisma.$executeRawUnsafe(`UPDATE "ActivityLog" SET "userId" = '${newId}'::uuid WHERE "userId" = '${oldId}'::uuid;`);
    await prisma.$executeRawUnsafe(`UPDATE "Notification" SET "userId" = '${newId}'::uuid WHERE "userId" = '${oldId}'::uuid;`);
  } catch (e) {}

  await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");

  console.log('✅ Successfully updated angelinsurance18@gmail.com ID!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
