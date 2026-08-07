const { prisma } = require('../prismaClient');

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;

const parseWindowDays = (args = process.argv.slice(2)) => {
  const value = args.find((argument) => argument.startsWith('--days='))?.split('=')[1];
  if (value === undefined) return DEFAULT_WINDOW_DAYS;

  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > MAX_WINDOW_DAYS) {
    throw new Error(`--days must be an integer between 1 and ${MAX_WINDOW_DAYS}`);
  }
  return days;
};

const startOfUtcDay = (daysAgo, now = new Date()) => {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
};

const countByUtcDay = (rows) => rows.reduce((counts, row) => {
  const day = row.createdAt.toISOString().slice(0, 10);
  counts[day] = (counts[day] || 0) + 1;
  return counts;
}, {});

const toCountMap = (groups, key) => Object.fromEntries(
  groups.map((group) => [group[key], group._count._all])
);

const percentage = (part, total) => (total ? Number(((part / total) * 100).toFixed(1)) : 0);

const buildReport = async ({ days = DEFAULT_WINDOW_DAYS, now = new Date() } = {}) => {
  const windowStart = startOfUtcDay(days - 1, now);
  const sevenDaysStart = startOfUtcDay(6, now);
  const thirtyDaysStart = startOfUtcDay(29, now);

  const [
    totalAccounts,
    verifiedAccounts,
    onboardedAccounts,
    accountsLast7Days,
    accountsLast30Days,
    recentAccountDates,
    totalPlans,
    totalWorkoutSessions,
    accountsWithWorkouts,
    totalAnalyticsEvents,
    accountsWithAnalyticsEvents,
    windowAnalyticsEvents,
    windowAccountsWithAnalyticsEvents,
    eventsByName,
    windowEventsByName,
    windowEventsBySource,
    windowEventUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { onboardingCompleted: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysStart } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysStart } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.plan.count({ where: { userId: { not: null } } }),
    prisma.workoutSession.count({ where: { userId: { not: null } } }),
    prisma.workoutSession.groupBy({ by: ['userId'], where: { userId: { not: null } } }),
    prisma.productAnalyticsEvent.count(),
    prisma.productAnalyticsEvent.groupBy({ by: ['userId'] }),
    prisma.productAnalyticsEvent.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.productAnalyticsEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: windowStart } },
    }),
    prisma.productAnalyticsEvent.groupBy({ by: ['eventName'], _count: { _all: true } }),
    prisma.productAnalyticsEvent.groupBy({
      by: ['eventName'],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    prisma.productAnalyticsEvent.groupBy({
      by: ['source'],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    prisma.productAnalyticsEvent.groupBy({
      by: ['eventName', 'userId'],
      where: { createdAt: { gte: windowStart } },
    }),
  ]);

  const uniqueUsersByEvent = windowEventUsers.reduce((counts, row) => {
    counts[row.eventName] = (counts[row.eventName] || 0) + 1;
    return counts;
  }, {});
  const eventCounts = toCountMap(windowEventsByName, 'eventName');

  return {
    generatedAt: now.toISOString(),
    window: { days, startsAt: windowStart.toISOString() },
    privacy: {
      containsPersonalData: false,
      consentRateAvailable: false,
      note: 'Cookie choices stay in the browser. Accounts with recorded events are not equivalent to current consent.',
    },
    accounts: {
      total: totalAccounts,
      emailVerified: verifiedAccounts,
      onboardingCompleted: onboardedAccounts,
      newLast7Days: accountsLast7Days,
      newLast30Days: accountsLast30Days,
      newInWindow: recentAccountDates.length,
      registrationsByDayInWindow: countByUtcDay(recentAccountDates),
    },
    productUsage: {
      userCreatedPlans: totalPlans,
      savedWorkoutSessions: totalWorkoutSessions,
      accountsWithSavedWorkouts: accountsWithWorkouts.length,
    },
    analytics: {
      recordedEventsTotal: totalAnalyticsEvents,
      accountsWithRecordedEventsTotal: accountsWithAnalyticsEvents.length,
      accountCoveragePercent: percentage(accountsWithAnalyticsEvents.length, totalAccounts),
      recordedEventsInWindow: windowAnalyticsEvents,
      activeAccountsInWindow: windowAccountsWithAnalyticsEvents.length,
      eventsByNameTotal: toCountMap(eventsByName, 'eventName'),
      eventsByNameInWindow: eventCounts,
      uniqueAccountsByEventInWindow: uniqueUsersByEvent,
      sourcesInWindow: toCountMap(windowEventsBySource, 'source'),
      workoutEventFunnelInWindow: {
        started: eventCounts.workout_started || 0,
        completed: eventCounts.workout_completed || 0,
        completionPercent: percentage(
          eventCounts.workout_completed || 0,
          eventCounts.workout_started || 0
        ),
      },
    },
  };
};

const run = async () => {
  const report = await buildReport({ days: parseWindowDays() });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

if (require.main === module) {
  run()
    .catch((error) => {
      console.error(`Analytics summary failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = {
  buildReport,
  countByUtcDay,
  parseWindowDays,
  percentage,
  startOfUtcDay,
};
