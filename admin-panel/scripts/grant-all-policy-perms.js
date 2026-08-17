const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: { include: { permissions: true } },
      permissions: true
    }
  });

  let perm = await prisma.permission.findFirst({
    where: { name: 'policy.view' }
  });
  if (!perm) {
    perm = await prisma.permission.create({
      data: { name: 'policy.view', description: 'View policies' }
    });
  }

  // Also create policies.view just in case
  let permPlural = await prisma.permission.findFirst({
    where: { name: 'policies.view' }
  });
  if (!permPlural) {
    permPlural = await prisma.permission.create({
      data: { name: 'policies.view', description: 'View policies (plural)' }
    });
  }

  // Connect policy.view and policies.view to ALL roles
  const roles = await prisma.role.findMany();
  for (const r of roles) {
    await prisma.role.update({
      where: { id: r.id },
      data: {
        permissions: {
          connect: [{ id: perm.id }, { id: permPlural.id }]
        }
      }
    });
    console.log(`Granted policy.view to role: ${r.name}`);
  }

  // Also directly connect policy.view to all users' individual permissions so there is zero chance of missing it
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        permissions: {
          connect: [{ id: perm.id }, { id: permPlural.id }]
        }
      }
    });
    console.log(`Connected policy.view to user: ${u.email} (${u.fullName})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
