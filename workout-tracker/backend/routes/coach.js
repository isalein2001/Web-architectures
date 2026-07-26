const express = require('express');
const { prisma } = require('../prismaClient');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const musclePatterns = [
  { group: 'Chest', patterns: [/bench|chest|push.?up|fly/i] },
  { group: 'Back', patterns: [/row|pulldown|pull.?up|lat|deadlift/i] },
  { group: 'Legs', patterns: [/squat|leg|lunge|quad|hamstring|calf|hip|glute/i] },
  { group: 'Shoulders', patterns: [/shoulder|press|lateral|rear delt|face pull/i] },
  { group: 'Arms', patterns: [/bicep|curl|tricep|extension|pushdown/i] },
  { group: 'Core', patterns: [/plank|crunch|sit.?up|core|abs|mountain/i] },
];

const defaultExercisesByGroup = {
  Chest: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly'],
  Back: ['Lat Pulldown', 'Seated Row', 'Romanian Deadlift'],
  Legs: ['Leg Press', 'Walking Lunges', 'Hamstring Curl'],
  Shoulders: ['Shoulder Press', 'Lateral Raise', 'Face Pull'],
  Arms: ['Biceps Curl', 'Triceps Pushdown', 'Hammer Curl'],
  Core: ['Plank Hold', 'Dead Bug', 'Cable Crunch'],
};

const parseDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDaysAgo = (date) => {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
};

const classifyExercise = (name = '') => {
  const match = musclePatterns.find((entry) => entry.patterns.some((pattern) => pattern.test(name)));
  return match?.group || 'Full Body';
};

const round = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const getExerciseStats = (sessions) => {
  const stats = new Map();

  sessions.forEach((session) => {
    const sessionDate = parseDate(session.date);

    (session.logs || []).forEach((log) => {
      const name = String(log.exerciseName || '').trim();
      if (!name) return;

      const key = name.toLowerCase();
      const current = stats.get(key) || {
        name,
        muscleGroup: classifyExercise(name),
        sets: 0,
        reps: 0,
        volume: 0,
        maxWeight: 0,
        sessionIds: new Set(),
        lastTrainedAt: null,
      };
      const reps = Number(log.reps) || 0;
      const weight = Number(log.weight) || 0;

      current.sets += 1;
      current.reps += reps;
      current.volume += reps * weight;
      current.maxWeight = Math.max(current.maxWeight, weight);
      current.sessionIds.add(session.id);
      if (!current.lastTrainedAt || (sessionDate && sessionDate > current.lastTrainedAt)) {
        current.lastTrainedAt = sessionDate;
      }

      stats.set(key, current);
    });
  });

  return Array.from(stats.values())
    .map((exercise) => ({
      ...exercise,
      sessions: exercise.sessionIds.size,
      sessionIds: undefined,
      daysSinceLastTrained: getDaysAgo(exercise.lastTrainedAt),
    }))
    .sort((a, b) => b.sets - a.sets);
};

const getMuscleBalance = (exerciseStats) => {
  const groups = {};

  exerciseStats.forEach((exercise) => {
    groups[exercise.muscleGroup] = (groups[exercise.muscleGroup] || 0) + exercise.sets;
  });

  return Object.entries(groups)
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
};

const pickExercisesForGroup = ({ group, exerciseStats, limit = 3 }) => {
  const existing = exerciseStats
    .filter((exercise) => exercise.muscleGroup === group)
    .map((exercise) => exercise.name);
  const fallback = defaultExercisesByGroup[group] || ['Goblet Squat', 'Push Up', 'Seated Row'];
  return Array.from(new Set([...existing, ...fallback])).slice(0, limit);
};

const buildSuggestedWeek = ({ exerciseStats, weakestGroups, sessionCount30 }) => {
  const primaryGroups = weakestGroups.length > 0 ? weakestGroups : ['Legs', 'Back', 'Chest'];
  const weeklyDays = sessionCount30 >= 12 ? 4 : 3;
  const templates = [
    { day: 'Day 1', title: `${primaryGroups[0]} strength`, goal: 'Controlled heavy work with two reps in reserve.' },
    { day: 'Day 2', title: 'Upper balance', goal: 'Pair push and pull work to keep posture and pressing strength aligned.' },
    { day: 'Day 3', title: `${primaryGroups[1] || 'Legs'} volume`, goal: 'Moderate load, clean reps and enough total sets to drive progress.' },
    { day: 'Day 4', title: 'Recovery pump', goal: 'Shorter session with shoulders, arms and core to stay fresh.' },
  ];

  return templates.slice(0, weeklyDays).map((template, index) => {
    const group = primaryGroups[index % primaryGroups.length] || 'Full Body';
    const secondaryGroup = index === 1 ? 'Back' : index === 3 ? 'Arms' : group;
    const exercises = pickExercisesForGroup({ group: secondaryGroup, exerciseStats, limit: 3 });

    return {
      ...template,
      exercises: exercises.map((name, exerciseIndex) => ({
        exercise_name: name,
        target_sets: exerciseIndex === 0 ? 4 : 3,
        target_reps: exerciseIndex === 0 ? '6-10' : '10-15',
      })),
    };
  });
};

const getCoachScore = ({ sessionCount30, totalSets30, uniqueExerciseCount, avgRpe }) => {
  const frequencyScore = Math.min(35, sessionCount30 * 3);
  const volumeScore = Math.min(30, Math.round(totalSets30 / 4));
  const diversityScore = Math.min(20, uniqueExerciseCount * 2);
  const recoveryScore = avgRpe && avgRpe > 8.5 ? 8 : 15;
  return Math.min(100, frequencyScore + volumeScore + diversityScore + recoveryScore);
};

const buildAnalysis = ({ user, plans, sessions, activities }) => {
  const recentSessions = sessions.filter((session) => getDaysAgo(parseDate(session.date)) <= 30);
  const weekSessions = sessions.filter((session) => getDaysAgo(parseDate(session.date)) <= 7);
  const exerciseStats = getExerciseStats(recentSessions);
  const muscleBalance = getMuscleBalance(exerciseStats);
  const totalSets30 = exerciseStats.reduce((sum, exercise) => sum + exercise.sets, 0);
  const totalDurationSeconds = recentSessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);
  const rpeValues = recentSessions.map((session) => session.perceivedExertion).filter(Boolean);
  const avgRpe = rpeValues.length ? round(rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length, 1) : null;
  const avgDurationMin = recentSessions.length && totalDurationSeconds
    ? Math.round(totalDurationSeconds / recentSessions.length / 60)
    : null;
  const avgSteps = activities.length
    ? Math.round(activities.reduce((sum, item) => sum + item.steps, 0) / activities.length)
    : 0;
  const avgWaterMl = activities.length
    ? Math.round(activities.reduce((sum, item) => sum + item.waterIntakeMl, 0) / activities.length)
    : 0;
  const representedGroups = new Set(muscleBalance.map((entry) => entry.group));
  const missingGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
    .filter((group) => !representedGroups.has(group));
  const weakestGroups = [
    ...muscleBalance.slice(-2).map((entry) => entry.group),
    ...missingGroups,
  ].filter((group, index, groups) => groups.indexOf(group) === index).slice(0, 3);
  const topExercise = exerciseStats[0];
  const score = getCoachScore({
    sessionCount30: recentSessions.length,
    totalSets30,
    uniqueExerciseCount: exerciseStats.length,
    avgRpe,
  });

  const recommendations = [];
  if (weekSessions.length < 3) {
    recommendations.push('Aim for three logged sessions this week before increasing workout complexity.');
  } else {
    recommendations.push('Frequency is in a useful range. Keep the weekly rhythm and progress one lift at a time.');
  }
  if (weakestGroups.length) {
    recommendations.push(`Bring up ${weakestGroups.join(', ')} with 6-10 focused sets over the next seven days.`);
  }
  if (avgRpe && avgRpe > 8.5) {
    recommendations.push('Average effort is high. Add one lighter technique day or reduce one top set this week.');
  } else {
    recommendations.push('Keep most sets around two reps in reserve and reserve all-out sets for final working sets.');
  }
  if (avgWaterMl && user.hydrationGoalLiters && avgWaterMl < user.hydrationGoalLiters * 800) {
    recommendations.push('Hydration is behind your profile goal. Add one fixed water check before and after training.');
  }

  return {
    generatedAt: new Date().toISOString(),
    engine: 'NEXT_REPS_RULE_COACH_V1',
    summary: {
      headline: recentSessions.length
        ? `Your last 30 days show ${recentSessions.length} sessions and ${totalSets30} working sets.`
        : 'Start by logging your first sessions so the coach can personalize the plan.',
      score,
      sessionCount30: recentSessions.length,
      sessionCount7: weekSessions.length,
      totalSets30,
      uniqueExerciseCount: exerciseStats.length,
      avgDurationMin,
      avgRpe,
      avgSteps,
      avgWaterMl,
      planCount: plans.length,
    },
    insights: [
      {
        label: 'Training frequency',
        value: `${weekSessions.length}/7 days`,
        status: weekSessions.length >= 3 ? 'strong' : 'needs_work',
        detail: weekSessions.length >= 3
          ? 'Enough recent sessions to maintain momentum.'
          : 'A third weekly session would make the plan more reliable.',
      },
      {
        label: 'Main focus',
        value: topExercise?.name || 'No exercise yet',
        status: topExercise ? 'strong' : 'needs_data',
        detail: topExercise
          ? `${topExercise.sets} sets in the last 30 days, max logged weight ${round(topExercise.maxWeight, 1)}.`
          : 'Log workouts to unlock exercise-specific feedback.',
      },
      {
        label: 'Muscle balance',
        value: weakestGroups.length ? weakestGroups.join(', ') : 'Balanced',
        status: weakestGroups.length ? 'watch' : 'strong',
        detail: weakestGroups.length
          ? 'These areas need a little more attention compared with your current pattern.'
          : 'Your logged sets are spread well across major patterns.',
      },
      {
        label: 'Recovery signal',
        value: avgRpe ? `${avgRpe}/10 RPE` : 'No RPE data',
        status: avgRpe && avgRpe > 8.5 ? 'watch' : 'strong',
        detail: avgRpe ? 'Based on your perceived exertion entries.' : 'Add exertion ratings after sessions for sharper guidance.',
      },
    ],
    recommendations,
    muscleBalance,
    topExercises: exerciseStats.slice(0, 6).map((exercise) => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets,
      sessions: exercise.sessions,
      maxWeight: round(exercise.maxWeight, 1),
      volume: round(exercise.volume, 1),
      daysSinceLastTrained: exercise.daysSinceLastTrained,
    })),
    suggestedWeek: buildSuggestedWeek({
      exerciseStats,
      weakestGroups,
      sessionCount30: recentSessions.length,
    }),
  };
};

function createCoachRouter() {
  const router = express.Router();

  router.get('/analysis', async (req, res) => {
    try {
      const [user, plans, sessions, activities] = await Promise.all([
        prisma.user.findUnique({
          where: { id: req.user.userId },
          select: {
            firstName: true,
            lastName: true,
            hydrationGoalLiters: true,
            fitnessGoal: true,
          },
        }),
        prisma.plan.findMany({
          where: { userId: req.user.userId },
          include: { exercises: true },
          orderBy: { id: 'asc' },
        }),
        prisma.workoutSession.findMany({
          where: { userId: req.user.userId },
          include: { logs: { orderBy: { id: 'asc' } } },
          orderBy: { date: 'desc' },
          take: 120,
        }),
        prisma.dailyActivity.findMany({
          where: { userId: req.user.userId },
          orderBy: { date: 'desc' },
          take: 30,
        }),
      ]);

      if (!user) return res.status(404).json({ error: 'User not found' });

      res.status(200).json(buildAnalysis({ user, plans, sessions, activities }));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createCoachRouter;
