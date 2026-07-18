const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Registered Users:');
    console.log(JSON.stringify(users.map(u => ({ id: u.id, email: u.email, fullName: u.fullName })), null, 2));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
