const { prisma } = require('../prismaClient');

const run = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      productAnalyticsEvents: {
        select: {
          eventName: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  });

  const report = users
    .filter((user) => user.productAnalyticsEvents.length > 0)
    .map((user) => {
      const counts = user.productAnalyticsEvents.reduce((result, event) => {
        result[event.eventName] = (result[event.eventName] || 0) + 1;
        return result;
      }, {});

      return {
        userId: user.id,
        email: user.email,
        accountCreatedAt: user.createdAt,
        firstEventAt: user.productAnalyticsEvents[0]?.createdAt || null,
        lastEventAt: user.productAnalyticsEvents.at(-1)?.createdAt || null,
        totalEvents: user.productAnalyticsEvents.length,
        events: counts,
      };
    });

  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    accountsWithConsentEvents: report.length,
    accounts: report,
  }, null, 2)}\n`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
