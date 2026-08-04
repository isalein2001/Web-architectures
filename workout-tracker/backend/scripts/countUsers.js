const { prisma } = require('../prismaClient');

async function main() {
  try {
    const count = await prisma.user.count();
    console.log('USERS_COUNT:' + count);
  } catch (err) {
    console.error('ERROR', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
