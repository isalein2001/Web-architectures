const bcrypt = require('bcrypt');
const { prisma } = require('../prismaClient');

async function upsertUser({ email, firstName, lastName, password, demo = false }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const name = `${firstName} ${lastName}`.trim();

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      firstName,
      lastName,
      passwordHash,
      emailVerified: true,
      verificationCode: null,
      onboardingCompleted: true,
      gender: demo ? 'Male' : 'Female',
      heightCm: demo ? 185 : 170,
      weightKg: demo ? 85 : 65,
      hydrationGoalLiters: demo ? 3.5 : 2.7,
      fitnessGoal: demo ? 'muscle_gain' : 'definition',
    },
    create: {
      email,
      name,
      firstName,
      lastName,
      passwordHash,
      emailVerified: true,
      verificationCode: null,
      onboardingCompleted: true,
      gender: demo ? 'Male' : 'Female',
      heightCm: demo ? 185 : 170,
      weightKg: demo ? 85 : 65,
      hydrationGoalLiters: demo ? 3.5 : 2.7,
      fitnessGoal: demo ? 'muscle_gain' : 'definition',
    },
  });
}

async function main() {
  const demoUser = await upsertUser({
    email: 'jonasarnold@gmail.com',
    firstName: 'Jonas',
    lastName: 'Arnold',
    password: '123',
    demo: true,
  });

  const testUser = await upsertUser({
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'Test12345',
  });

  console.log('Seed users ready:');
  console.log(`- Jonas demo: ${demoUser.email} / 123`);
  console.log(`- Test user: ${testUser.email} / Test12345`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
