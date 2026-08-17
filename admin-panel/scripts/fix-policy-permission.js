const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    include: { permissions: true }
  });
  console.log('Roles in DB:');
  for (const r of roles) {
    console.log(r.name, '->', r.permissions.map(p => p.name));
  }

  // Ensure policy.view permission exists
  let perm = await prisma.permission.findFirst({
    where: { name: 'policy.view' }
  });
  if (!perm) {
    perm = await prisma.permission.create({
      data: { name: 'policy.view', description: 'View policies' }
    });
    console.log('Created permission policy.view');
  }

  // Assign policy.view to Sales Executive and Executive roles if not already present
  const execRoles = roles.filter(r => r.name.toUpperCase().includes('EXECUTIVE') || r.name.toUpperCase().includes('SALES'));
  for (const r of execRoles) {
    const has = r.permissions.some(p => p.name === 'policy.view' || p.name === 'policies.view');
    if (!has) {
      await prisma.role.update({
        where: { id: r.id },
        data: {
          permissions: {
            connect: { id: perm.id }
          }
        }
      });
      console.log(`Connected policy.view to ${r.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
