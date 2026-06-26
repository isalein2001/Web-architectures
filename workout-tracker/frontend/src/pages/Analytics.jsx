import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  TrendingUp,
  Award,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  Trash2,
  PlusCircle,
  Flame,
  Activity,
  BarChart3,
  Bike,
  Flower2,
  Gauge,
  Layers3,
  Trophy,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  startOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { getUserDisplayName, getUserStorageKey } from '../userStorage';
import './Analytics.css';

const MotionG = motion.g;
const MotionPath = motion.path;
const MotionCircle = motion.circle;
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CUSTOM_WORKOUT_PLANS_STORAGE_KEY = 'customWorkoutPlans';
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
const DEMO_DIVERSITY_BUBBLES = [
  { name: 'Hip Thrust', initials: 'HT', setCount: 24, sessionCount: 7, size: 76, index: 0 },
  { name: 'Leg Press', initials: 'LP', setCount: 22, sessionCount: 6, size: 73, index: 1 },
  { name: 'Romanian Deadlift', initials: 'RD', setCount: 20, sessionCount: 6, size: 70, index: 2 },
  { name: 'Lat Pulldown', initials: 'LP', setCount: 18, sessionCount: 5, size: 66, index: 3 },
  { name: 'Shoulder Press', initials: 'SP', setCount: 16, sessionCount: 5, size: 61, index: 4 },
  { name: 'Cable Row', initials: 'CR', setCount: 15, sessionCount: 4, size: 58, index: 5 },
  { name: 'Bulgarian Split Squat', initials: 'BS', setCount: 14, sessionCount: 4, size: 55, index: 6 },
  { name: 'Glute Bridge', initials: 'GB', setCount: 13, sessionCount: 4, size: 52, index: 7 },
  { name: 'Chest Press', initials: 'CP', setCount: 12, sessionCount: 3, size: 50, index: 8 },
  { name: 'Lateral Raise', initials: 'LR', setCount: 11, sessionCount: 3, size: 48, index: 9 },
  { name: 'Hamstring Curl', initials: 'HC', setCount: 10, sessionCount: 3, size: 46, index: 10 },
  { name: 'Walking Lunges', initials: 'WL', setCount: 9, sessionCount: 3, size: 44, index: 11 },
  { name: 'Seated Row', initials: 'SR', setCount: 8, sessionCount: 2, size: 41, index: 12 },
  { name: 'Goblet Squat', initials: 'GS', setCount: 8, sessionCount: 2, size: 41, index: 13 },
  { name: 'Back Extension', initials: 'BE', setCount: 7, sessionCount: 2, size: 38, index: 14 },
  { name: 'Face Pull', initials: 'FP', setCount: 7, sessionCount: 2, size: 38, index: 15 },
  { name: 'Step Ups', initials: 'SU', setCount: 6, sessionCount: 2, size: 36, index: 16 },
  { name: 'Triceps Pushdown', initials: 'TP', setCount: 6, sessionCount: 2, size: 36, index: 17 },
  { name: 'Biceps Curl', initials: 'BC', setCount: 5, sessionCount: 1, size: 33, index: 18 },
  { name: 'Calf Raise', initials: 'CR', setCount: 5, sessionCount: 1, size: 33, index: 19 },
  { name: 'Plank Hold', initials: 'PH', setCount: 4, sessionCount: 1, size: 30, index: 20 },
  { name: 'Mountain Climbers', initials: 'MC', setCount: 4, sessionCount: 1, size: 30, index: 21 },
];
const DIVERSITY_BUBBLE_LAYOUT = [
  { x: 39, y: 42 },
  { x: 52, y: 36 },
  { x: 63, y: 44 },
  { x: 47, y: 52 },
  { x: 57, y: 55 },
  { x: 35, y: 56 },
  { x: 68, y: 55 },
  { x: 43, y: 65 },
  { x: 54, y: 67 },
  { x: 30, y: 47 },
  { x: 72, y: 47 },
  { x: 62, y: 31 },
  { x: 31, y: 67 },
  { x: 74, y: 66 },
  { x: 24, y: 56 },
  { x: 79, y: 56 },
  { x: 39, y: 29 },
  { x: 52, y: 76 },
  { x: 24, y: 39 },
  { x: 79, y: 38 },
  { x: 67, y: 76 },
  { x: 36, y: 78 },
];
const DIVERSITY_BUBBLE_SPREAD_LAYOUT = [
  { x: 23, y: 27 },
  { x: 44, y: 21 },
  { x: 63, y: 28 },
  { x: 78, y: 23 },
  { x: 35, y: 43 },
  { x: 54, y: 45 },
  { x: 72, y: 43 },
  { x: 87, y: 42 },
  { x: 16, y: 51 },
  { x: 38, y: 59 },
  { x: 58, y: 61 },
  { x: 78, y: 58 },
  { x: 91, y: 58 },
  { x: 25, y: 73 },
  { x: 45, y: 76 },
  { x: 65, y: 76 },
  { x: 84, y: 73 },
  { x: 13, y: 80 },
  { x: 33, y: 88 },
  { x: 52, y: 91 },
  { x: 70, y: 88 },
  { x: 89, y: 82 },
];
const MOST_TRAINED_IMAGES = [
  '/most-trained-1.jpg',
  '/most-trained-2.jpg',
  '/most-trained-3.jpg',
  '/most-trained-4.jpg',
  '/most-trained-5.jpg',
];

const getStableImageIndex = (value = '') => {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue || normalizedValue === 'no exercise yet') return 0;

  return Array.from(normalizedValue).reduce((sum, char, index) => (
    sum + (char.charCodeAt(0) * (index + 1))
  ), 0) % MOST_TRAINED_IMAGES.length;
};

const getMostTrainedExerciseImage = (exerciseName) => (
  MOST_TRAINED_IMAGES[getStableImageIndex(exerciseName)]
);

const isJonasArnoldAccount = (user) => {
  const displayName = getUserDisplayName(user).toLowerCase();
  const email = user?.email?.toLowerCase() || '';
  return displayName.includes('jonas arnold') || email.includes('jonas');
};

const createDemoAnalyticsSessions = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const exercisePool = [
    { name: 'Hip Thrust', base: 98, reps: 10, frequency: 18 },
    { name: 'Leg Press', base: 142, reps: 11, frequency: 14 },
    { name: 'Romanian Deadlift', base: 86, reps: 8, frequency: 12 },
    { name: 'Lat Pulldown', base: 58, reps: 10, frequency: 9 },
    { name: 'Shoulder Press', base: 34, reps: 9, frequency: 7 },
    { name: 'Cable Row', base: 62, reps: 10, frequency: 6 },
    { name: 'Bulgarian Split Squat', base: 42, reps: 10, frequency: 6 },
    { name: 'Glute Bridge', base: 78, reps: 12, frequency: 6 },
    { name: 'Chest Press', base: 52, reps: 10, frequency: 5 },
    { name: 'Lateral Raise', base: 12, reps: 14, frequency: 5 },
    { name: 'Hamstring Curl', base: 42, reps: 12, frequency: 5 },
    { name: 'Walking Lunges', base: 24, reps: 12, frequency: 4 },
    { name: 'Seated Row', base: 54, reps: 10, frequency: 4 },
    { name: 'Goblet Squat', base: 32, reps: 12, frequency: 4 },
    { name: 'Back Extension', base: 18, reps: 14, frequency: 3 },
    { name: 'Face Pull', base: 18, reps: 15, frequency: 3 },
    { name: 'Step Ups', base: 20, reps: 12, frequency: 3 },
    { name: 'Triceps Pushdown', base: 26, reps: 12, frequency: 3 },
    { name: 'Biceps Curl', base: 14, reps: 12, frequency: 2 },
    { name: 'Calf Raise', base: 58, reps: 15, frequency: 2 },
    { name: 'Plank Hold', base: 20, reps: 45, frequency: 2 },
    { name: 'Mountain Climbers', base: 10, reps: 30, frequency: 2 },
  ];
  const offsets = [2, 5, 8, 11, 15, 18, 22, 25, 29, 33, 37, 41, 45, 49, 53, 57];

  return offsets.map((offset, sessionIndex) => {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const progression = (offsets.length - sessionIndex) / offsets.length;
    const rotation = (sessionIndex * 3) % exercisePool.length;
    const selectedExercises = Array.from({ length: 5 }, (_, exerciseIndex) => (
      exercisePool[(rotation + exerciseIndex) % exercisePool.length]
    ));

    return {
      id: `demo-jonas-session-${sessionIndex + 1}`,
      date: date.toISOString(),
      duration_seconds: (46 + ((sessionIndex * 7) % 24)) * 60,
      calories_burned: 340 + ((sessionIndex * 31) % 190),
      logs: selectedExercises.flatMap((exercise, exerciseIndex) => (
        Array.from({ length: exerciseIndex === 0 ? 4 : 3 }, (_, setIndex) => ({
          id: `demo-jonas-log-${sessionIndex}-${exerciseIndex}-${setIndex}`,
          exercise_name: exercise.name,
          weight: Math.round(exercise.base + (progression * 12) + setIndex + (sessionIndex % 3)),
          reps: Math.max(6, exercise.reps - (setIndex % 2)),
          rest_seconds: 75 + (exerciseIndex * 15),
        }))
      )),
    };
  });
};

const DEMO_ANALYTICS_SESSIONS = createDemoAnalyticsSessions();
const getSessionDateKey = (date) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return String(date).slice(0, 10);
  return format(parsedDate, 'yyyy-MM-dd');
};
const groupLogsByExercise = (logs = []) => logs.reduce((groups, log) => {
  const exerciseName = log.exercise_name || 'Workout';
  return {
    ...groups,
    [exerciseName]: [...(groups[exerciseName] || []), log],
  };
}, {});
const buildScheduleEntryFromSession = (session) => {
  const groupedLogs = groupLogsByExercise(session.logs || []);
  const exercises = Object.entries(groupedLogs).map(([exerciseName, logs]) => {
    const reps = logs
      .map((log) => log.reps)
      .filter((rep) => rep !== null && rep !== undefined && rep !== '')
      .join('/');
    return `${exerciseName}${logs.length ? ` (${logs.length}x${reps || '-'})` : ''}`;
  });

  return {
    workoutId: session.plan_id || `session-${session.id}`,
    title: session.plan_name || 'COMPLETED WORKOUT',
    image: '/hero-bg.jpg',
    badge: 'SAVED SESSION',
    iconKey: 'dumbbell',
    exercises,
  };
};
const readyMadeCalendarWorkouts = [
  {
    id: 'ready-push-pull-legs',
    title: 'PUSH PULL LEGS',
    badge: 'ADVANCED PLAN',
    image: '/slideshow-8.png',
    iconKey: 'dumbbell',
    exercises: ['Chest Press (3x12)', 'Incline Bench Press (3x12)', 'Shoulder Press (2x15)'],
    extraExercises: ['Lat Pulldown (3x12)', 'Romanian Deadlift (3x10)', 'Cable Row (4x12)'],
  },
  {
    id: 'ready-fat-loss',
    title: 'FAT LOSS',
    badge: 'BEGINNER PLAN',
    image: '/slideshow-3.png',
    iconKey: 'flame',
    exercises: ['HIIT Intervals (15m)', 'Bodyweight Squats (4x20)', 'Mountain Climbers (4x30s)'],
    extraExercises: [],
  },
  {
    id: 'ready-full-body-workout',
    title: 'FULL BODY WORKOUT',
    badge: 'BEGINNER PLAN',
    image: '/achievements-bg.jpg',
    iconKey: 'activity',
    exercises: ['Bench Press (3x12)', 'Lat Pulldown (3x12)', 'Lateral Raise (4x12)'],
    extraExercises: ['Leg Press (4x10)', 'Seated Row (3x12)', 'Hamstring Curl (3x15)', 'Plank Hold (3x45s)'],
  },
];
const workoutIconMap = {
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
  bike: Bike,
  yoga: Flower2,
};
const CHART_WIDTH = 392;
const CHART_HEIGHT = 280;
const CHART_TOP_PADDING = 10;
const CHART_BOTTOM_PADDING = 0;
const emptyChartSeries = {
  '1W': { change: 0, compareLabel: 'No workout data yet', labels: ['START', 'NOW', 'NEXT'], values: [0, 0, 0, 0, 0, 0, 0] },
  '1M': { change: 0, compareLabel: 'No workout data yet', labels: ['START', 'NOW', 'NEXT'], values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  '1Y': { change: 0, compareLabel: 'No workout data yet', labels: ['START', 'NOW', 'NEXT'], values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
};
const loadJsonFromStorage = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
};

const loadWorkoutScheduleFromStorage = (userScheduleKey) => {
  const legacySchedule = loadJsonFromStorage(WORKOUT_SCHEDULE_STORAGE_KEY, {});
  const userSchedule = userScheduleKey === WORKOUT_SCHEDULE_STORAGE_KEY
    ? {}
    : loadJsonFromStorage(userScheduleKey, {});
  return { ...legacySchedule, ...userSchedule };
};

const mergeScheduleWithSessions = (schedule = {}, sessionList = []) => {
  const nextSchedule = { ...schedule };

  sessionList.forEach((session) => {
    const dateKey = getSessionDateKey(session.date);
    if (!dateKey || nextSchedule[dateKey]) return;
    nextSchedule[dateKey] = buildScheduleEntryFromSession(session);
  });

  return nextSchedule;
};

const getEstimatedOneRepMax = (log) => {
  const weight = Number(log.weight);
  const reps = Number(log.reps);

  if (!Number.isFinite(weight) || weight <= 0) return 0;
  if (!Number.isFinite(reps) || reps <= 0) return weight;

  return weight * (1 + reps / 30);
};

const getSessionDate = (session) => {
  const parsedDate = new Date(session.date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getStrengthEntries = (sessions = []) => sessions.flatMap((session) => {
  const date = getSessionDate(session);
  if (!date) return [];

  return (session.logs || [])
    .map((log) => ({
      sessionId: session.id,
      date,
      exerciseName: log.exercise_name || '',
      score: getEstimatedOneRepMax(log),
    }))
    .filter((entry) => entry.score > 0);
});

const getLogEntries = (sessions = []) => sessions.flatMap((session) => {
  const date = getSessionDate(session);
  if (!date) return [];

  return (session.logs || []).map((log) => ({
    sessionId: session.id,
    date,
    exerciseName: log.exercise_name || '',
    reps: Number(log.reps) || 0,
    weight: Number(log.weight) || 0,
    score: getEstimatedOneRepMax(log),
  }));
});

const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

const addDaysNative = (date, amount) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const addMonthsNative = (date, amount) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
};

const buildPartitionBuckets = (startDate, endDate, count) => {
  const startTime = startDate.getTime();
  const step = (endDate.getTime() - startTime) / count;

  return Array.from({ length: count }, (_, index) => ({
    start: new Date(startTime + (step * index)),
    end: new Date(startTime + (step * (index + 1)) - 1),
  }));
};

const buildRangeBuckets = (range) => {
  const now = endOfDay(new Date());

  if (range === '1W') {
    const firstDay = startOfDay(addDaysNative(now, -6));
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDaysNative(firstDay, index);
      return { start: startOfDay(day), end: endOfDay(day) };
    });
  }

  if (range === '1Y') {
    const firstMonth = startOfMonth(addMonthsNative(now, -11));
    return Array.from({ length: 12 }, (_, index) => {
      const monthStart = startOfMonth(addMonthsNative(firstMonth, index));
      const nextMonthStart = startOfMonth(addMonthsNative(firstMonth, index + 1));
      return { start: monthStart, end: new Date(nextMonthStart.getTime() - 1) };
    });
  }

  const firstDay = startOfDay(addDaysNative(now, -29));
  return buildPartitionBuckets(firstDay, now, 12);
};

const getBucketLabels = (range, buckets) => {
  if (range === '1Y') {
    return [
      format(buckets[0].start, 'MMM').toUpperCase(),
      format(buckets[Math.floor(buckets.length / 2)].start, 'MMM').toUpperCase(),
      format(buckets[buckets.length - 1].start, 'MMM').toUpperCase(),
    ];
  }

  return [
    format(buckets[0].start, 'MMM dd').toUpperCase(),
    format(buckets[Math.floor(buckets.length / 2)].start, 'MMM dd').toUpperCase(),
    format(buckets[buckets.length - 1].start, 'MMM dd').toUpperCase(),
  ];
};

const normalizeChartValues = (rawValues) => {
  const positiveValues = rawValues.filter((value) => value > 0);
  if (positiveValues.length === 0) return rawValues.map(() => 0);

  const minValue = Math.min(...positiveValues);
  const maxValue = Math.max(...positiveValues);

  if (maxValue === minValue) {
    return rawValues.map((value) => (value > 0 ? 0.62 : 0));
  }

  return rawValues.map((value) => {
    if (value <= 0) return 0;
    return 0.14 + (((value - minValue) / (maxValue - minValue)) * 0.82);
  });
};

const buildStrengthSeriesForRange = (entries, range) => {
  const buckets = buildRangeBuckets(range);
  let carriedBest = 0;
  const rawValues = buckets.map((bucket) => {
    const bucketBest = entries
      .filter((entry) => entry.date >= bucket.start && entry.date <= bucket.end)
      .reduce((best, entry) => Math.max(best, entry.score), 0);

    carriedBest = Math.max(carriedBest, bucketBest);
    return carriedBest;
  });
  const firstValue = rawValues.find((value) => value > 0) || 0;
  const lastValue = [...rawValues].reverse().find((value) => value > 0) || 0;
  const change = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return {
    change,
    compareLabel: range === '1W' ? 'vs last week' : range === '1M' ? 'vs last month' : 'vs last year',
    labels: getBucketLabels(range, buckets),
    values: normalizeChartValues(rawValues),
  };
};

const buildStrengthAnalytics = (sessions = []) => {
  const entries = getStrengthEntries(sessions);
  const hasData = entries.length > 0;

  return {
    hasData,
    series: hasData
      ? {
        '1W': buildStrengthSeriesForRange(entries, '1W'),
        '1M': buildStrengthSeriesForRange(entries, '1M'),
        '1Y': buildStrengthSeriesForRange(entries, '1Y'),
      }
      : emptyChartSeries,
  };
};

const buildTopExerciseMetrics = (sessions = []) => {
  const entries = getStrengthEntries(sessions);
  const metricsByExercise = entries.reduce((groups, entry) => {
    const normalizedName = entry.exerciseName.trim().toLowerCase();
    if (!normalizedName) return groups;

    const currentMetric = groups[normalizedName] || {
      name: entry.exerciseName.trim(),
      best: 0,
      setCount: 0,
      sessionIds: new Set(),
    };

    currentMetric.best = Math.max(currentMetric.best, entry.score);
    currentMetric.setCount += 1;
    if (entry.sessionId) currentMetric.sessionIds.add(entry.sessionId);

    return {
      ...groups,
      [normalizedName]: currentMetric,
    };
  }, {});

  const topExercises = Object.values(metricsByExercise)
    .sort((firstExercise, secondExercise) => (
      secondExercise.sessionIds.size - firstExercise.sessionIds.size
      || secondExercise.setCount - firstExercise.setCount
      || secondExercise.best - firstExercise.best
    ))
    .slice(0, 3)
    .map((metric) => ({
      name: metric.name,
      best: Math.round(metric.best),
      sessionCount: metric.sessionIds.size,
      setCount: metric.setCount,
    }));

  return [
    ...topExercises,
    ...Array.from({ length: Math.max(0, 3 - topExercises.length) }, () => ({
      name: 'NO EXERCISE YET',
      best: 0,
      sessionCount: 0,
      setCount: 0,
    })),
  ];
};

const getExerciseInitials = (name = '') => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length || name === 'NO EXERCISE YET') return '--';

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};

const buildExerciseDiversityBubbles = (entries = [], limit = 22) => {
  const metricsByExercise = entries.reduce((groups, entry) => {
    const normalizedName = entry.exerciseName.trim().toLowerCase();
    if (!normalizedName) return groups;

    const currentMetric = groups[normalizedName] || {
      name: entry.exerciseName.trim(),
      setCount: 0,
      repCount: 0,
      sessionIds: new Set(),
    };

    currentMetric.setCount += 1;
    currentMetric.repCount += entry.reps;
    if (entry.sessionId) currentMetric.sessionIds.add(entry.sessionId);

    return {
      ...groups,
      [normalizedName]: currentMetric,
    };
  }, {});

  const metrics = Object.values(metricsByExercise)
    .sort((firstExercise, secondExercise) => (
      secondExercise.setCount - firstExercise.setCount
      || secondExercise.sessionIds.size - firstExercise.sessionIds.size
    ))
    .slice(0, limit);

  const highestSetCount = Math.max(...metrics.map((metric) => metric.setCount), 1);

  return metrics.map((metric, index) => {
    const intensity = metric.setCount / highestSetCount;

    return {
      name: metric.name,
      initials: getExerciseInitials(metric.name),
      setCount: metric.setCount,
      repCount: metric.repCount,
      sessionCount: metric.sessionIds.size,
      size: Math.round(24 + (intensity * 52)),
      index,
    };
  });
};

const getPercentChange = (currentValue, previousValue) => {
  if (!previousValue && currentValue > 0) return 100;
  if (!previousValue) return 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const isWithinRange = (date, startDate, endDate) => date >= startDate && date <= endDate;

const getTrainingVolume = (entries) => entries.reduce((sum, entry) => (
  sum + ((entry.weight || 0) * (entry.reps || 0))
), 0);

const getAverageDurationMinutes = (sessions = []) => {
  const durations = sessions
    .map((session) => Number(session.duration_seconds) || 0)
    .filter((duration) => duration > 0);

  if (!durations.length) return 0;

  return Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) / 60);
};

const buildDurationTrend = (sessions = [], limit = 6) => {
  const recentSessions = sessions
    .map((session) => ({
      date: getSessionDate(session),
      minutes: Math.round((Number(session.duration_seconds) || 0) / 60),
    }))
    .filter((session) => session.date && session.minutes > 0)
    .sort((firstSession, secondSession) => firstSession.date - secondSession.date)
    .slice(-limit);
  const maxDuration = Math.max(...recentSessions.map((session) => session.minutes), 0);
  const scaleMax = Math.max(60, Math.ceil(maxDuration / 15) * 15);

  return {
    scaleMax,
    sessions: recentSessions.map((session, index) => ({
      ...session,
      label: `S${index + 1}`,
      width: Math.max((session.minutes / scaleMax) * 100, 0),
    })),
  };
};

const getBestScoresByExercise = (entries = []) => entries.reduce((groups, entry) => {
  const key = entry.exerciseName.trim().toLowerCase();
  if (!key) return groups;

  const current = groups[key] || { name: entry.exerciseName.trim(), best: 0 };
  current.best = Math.max(current.best, entry.score);

  return {
    ...groups,
    [key]: current,
  };
}, {});

const getProgressiveOverloadScore = (currentEntries = [], previousEntries = []) => {
  const currentBestByExercise = getBestScoresByExercise(currentEntries);
  const previousBestByExercise = getBestScoresByExercise(previousEntries);
  const currentMetrics = Object.entries(currentBestByExercise);

  if (!currentMetrics.length) return 0;

  const score = currentMetrics.reduce((sum, [exerciseKey, currentMetric]) => {
    const previousBest = previousBestByExercise[exerciseKey]?.best || 0;

    if (!previousBest) return sum + 35;
    if (currentMetric.best > previousBest) return sum + 100;
    if (currentMetric.best === previousBest) return sum + 60;
    return sum + 20;
  }, 0);

  return Math.round(score / currentMetrics.length);
};

const buildLatestWeightMilestone = (sessions = []) => {
  const bestWeightByExercise = {};
  const milestones = sessions
    .flatMap((session) => {
      const date = getSessionDate(session);
      if (!date) return [];

      return (session.logs || [])
        .map((log) => ({
          sessionId: session.id,
          date,
          exerciseName: (log.exercise_name || '').trim(),
          weight: Number(log.weight) || 0,
        }))
        .filter((entry) => entry.exerciseName && entry.weight > 0);
    })
    .sort((firstEntry, secondEntry) => (
      firstEntry.date - secondEntry.date
      || (firstEntry.sessionId || 0) - (secondEntry.sessionId || 0)
    ))
    .reduce((foundMilestones, entry) => {
      const key = entry.exerciseName.toLowerCase();
      const previousBest = bestWeightByExercise[key] || 0;

      if (entry.weight > previousBest) {
        if (previousBest > 0) {
          foundMilestones.push({
            exerciseName: entry.exerciseName,
            weight: entry.weight,
            improvement: entry.weight - previousBest,
            date: entry.date,
          });
        }
        bestWeightByExercise[key] = entry.weight;
      }

      return foundMilestones;
    }, []);

  return milestones
    .sort((firstMilestone, secondMilestone) => (
      secondMilestone.date - firstMilestone.date
      || secondMilestone.improvement - firstMilestone.improvement
    ))[0] || null;
};

const formatRelativeMilestoneTime = (date) => {
  if (!date) return 'Log more workouts to unlock milestones';

  const minutesAgo = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutesAgo < 60) return minutesAgo <= 1 ? 'Unlocked just now' : `Unlocked ${minutesAgo}m ago`;

  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return `Unlocked ${hoursAgo}h ago`;

  const daysAgo = Math.round(hoursAgo / 24);
  return daysAgo === 1 ? 'Unlocked yesterday' : `Unlocked ${daysAgo}d ago`;
};

const buildWeeklyTrainingQuality = (sessions = [], workoutSchedule = {}, referenceDate = new Date()) => {
  const weekStart = startOfDay(startOfWeek(referenceDate, { weekStartsOn: 1 }));
  const weekEnd = endOfDay(addDaysNative(weekStart, 6));
  const todayEnd = endOfDay(referenceDate);
  const sessionsThisWeek = sessions.filter((session) => {
    const date = getSessionDate(session);
    return date && isWithinRange(date, weekStart, weekEnd);
  });
  const completedSessionCount = sessionsThisWeek.length;
  const plannedSessionCount = Object.keys(workoutSchedule).filter((dateKey) => {
    const plannedDate = new Date(`${dateKey}T00:00:00`);
    return !Number.isNaN(plannedDate.getTime()) && isWithinRange(plannedDate, weekStart, weekEnd);
  }).length;
  const targetSessions = Math.max(plannedSessionCount || 3, 1);
  const consistencyScore = Math.min((completedSessionCount / targetSessions) * 100, 100);
  const weeklyEntries = getLogEntries(sessionsThisWeek);
  const averageSetsPerSession = completedSessionCount
    ? weeklyEntries.length / completedSessionCount
    : 0;
  const setQualityScore = Math.min((averageSetsPerSession / 12) * 100, 100);
  const sessionsWithIntensity = sessionsThisWeek.filter((session) => session.intensity).length;
  const intensityScore = completedSessionCount
    ? (sessionsWithIntensity / completedSessionCount) * 100
    : 0;
  const previousWeekStart = startOfDay(addDaysNative(weekStart, -7));
  const previousWeekEnd = endOfDay(addDaysNative(weekStart, -1));
  const previousEntries = getStrengthEntries(sessions).filter((entry) => isWithinRange(entry.date, previousWeekStart, previousWeekEnd));
  const currentEntries = getStrengthEntries(sessionsThisWeek);
  const overloadScore = getProgressiveOverloadScore(currentEntries, previousEntries);
  const score = Math.round(
    (consistencyScore * 0.42)
    + (setQualityScore * 0.28)
    + (overloadScore * 0.22)
    + (intensityScore * 0.08)
  );
  const completedPlannedByToday = Object.keys(workoutSchedule).filter((dateKey) => {
    const plannedDate = new Date(`${dateKey}T00:00:00`);
    return !Number.isNaN(plannedDate.getTime()) && isWithinRange(plannedDate, weekStart, todayEnd);
  }).length;
  const targetLabel = plannedSessionCount
    ? `${completedSessionCount}/${Math.max(completedPlannedByToday, plannedSessionCount)} planned sessions completed`
    : `${completedSessionCount}/${targetSessions} weekly sessions completed`;

  return {
    score: Math.min(Math.max(score, 0), 100),
    completedSessionCount,
    targetSessions,
    averageSetsPerSession,
    label: targetLabel,
    message: completedSessionCount
      ? `${targetLabel} · ${Math.round(averageSetsPerSession)} sets per session`
      : 'Log your first workout this week to build a quality score',
  };
};

const buildPerformanceIntelligence = (sessions = [], referenceDate = new Date()) => {
  const now = endOfDay(referenceDate);
  const last30Start = startOfDay(addDaysNative(now, -29));
  const previous30Start = startOfDay(addDaysNative(now, -59));
  const previous30End = endOfDay(addDaysNative(now, -30));
  const entries = getLogEntries(sessions);
  const strengthEntries = getStrengthEntries(sessions);
  const last30Entries = entries.filter((entry) => isWithinRange(entry.date, last30Start, now));
  const previous30Entries = entries.filter((entry) => isWithinRange(entry.date, previous30Start, previous30End));
  const last30Sessions = sessions.filter((session) => {
    const date = getSessionDate(session);
    return date && isWithinRange(date, last30Start, now);
  });
  const previous30Sessions = sessions.filter((session) => {
    const date = getSessionDate(session);
    return date && isWithinRange(date, previous30Start, previous30End);
  });
  const last30StrengthEntries = strengthEntries.filter((entry) => isWithinRange(entry.date, last30Start, now));
  const previous30StrengthEntries = strengthEntries.filter((entry) => isWithinRange(entry.date, previous30Start, previous30End));
  const currentAverageDuration = getAverageDurationMinutes(last30Sessions);
  const previousAverageDuration = getAverageDurationMinutes(previous30Sessions);
  const durationTrend = buildDurationTrend(last30Sessions);
  const uniqueExercises = new Set(last30Entries
    .map((entry) => entry.exerciseName.trim().toLowerCase())
    .filter(Boolean));
  const exerciseBubbles = buildExerciseDiversityBubbles(last30Entries);
  const mostTrainedExercise = buildTopExerciseMetrics(sessions)[0] || {
    name: 'NO EXERCISE YET',
    best: 0,
    sessionCount: 0,
    setCount: 0,
  };

  return {
    averageDuration: currentAverageDuration,
    averageDurationChange: getPercentChange(currentAverageDuration, previousAverageDuration),
    durationTrend,
    progressiveOverloadScore: getProgressiveOverloadScore(last30StrengthEntries, previous30StrengthEntries),
    exerciseDiversity: uniqueExercises.size,
    exerciseBubbles,
    mostTrainedExercise,
  };
};

function getPointY(value) {
  return CHART_HEIGHT - (value * (CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING)) - CHART_BOTTOM_PADDING;
}

function getChartPoints(values) {
  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * CHART_WIDTH,
    y: getPointY(value),
  }));
}

function buildSmoothLinePath(points) {
  if (points.length < 2) return '';

  let path = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;

    path += ` Q${current.x},${current.y} ${midpointX},${midpointY}`;
  }

  const secondToLast = points[points.length - 2];
  const last = points[points.length - 1];
  path += ` Q${secondToLast.x},${secondToLast.y} ${last.x},${last.y}`;

  return path;
}

function MilestoneCard({ milestone }) {
  const { t } = useLanguage();
  const [fireworks, setFireworks] = useState([]);
  const fireworksTimer = useRef(null);
  const hasMilestone = Boolean(milestone);
  const milestoneTitle = hasMilestone
    ? `${milestone.exerciseName} +${Number(milestone.improvement).toLocaleString('de-DE', {
      maximumFractionDigits: 1,
    })}${t('KG')}`
    : t('No new milestone yet');
  const milestoneMeta = hasMilestone
    ? `${Number(milestone.weight).toLocaleString('de-DE', {
      maximumFractionDigits: 1,
    })}${t('KG')} ${t('new best')} · ${t(formatRelativeMilestoneTime(milestone.date))}`
    : t('Log a heavier set than before to unlock your next milestone');

  useEffect(() => () => {
    window.clearTimeout(fireworksTimer.current);
  }, []);

  const handleMouseEnter = () => {
    window.clearTimeout(fireworksTimer.current);

    const nextFireworks = Array.from({ length: 5 }, (_, burstIndex) => ({
      id: `${Date.now()}-${burstIndex}`,
      left: 16 + Math.random() * 68,
      top: 18 + Math.random() * 52,
      delay: burstIndex * 0.12,
      sparks: Array.from({ length: 16 }, (_, sparkIndex) => ({
        id: sparkIndex,
        angle: (360 / 16) * sparkIndex + Math.random() * 10,
        distance: 34 + Math.random() * 34,
        size: 3 + Math.random() * 3,
      })),
    }));

    setFireworks(nextFireworks);
    fireworksTimer.current = window.setTimeout(() => {
      setFireworks([]);
    }, 1300);
  };

  const handleMouseLeave = () => {
    window.clearTimeout(fireworksTimer.current);
    fireworksTimer.current = window.setTimeout(() => {
      setFireworks([]);
    }, 500);
  };

  return (
    <div
      className="milestone-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {fireworks.map((burst) => (
        <div
          key={burst.id}
          className="firework-burst"
          style={{
            left: `${burst.left}%`,
            top: `${burst.top}%`,
            animationDelay: `${burst.delay}s`,
          }}
        >
          <span className="firework-core" />
          {burst.sparks.map((spark) => (
            <span
              key={spark.id}
              className="firework-spark"
              style={{
                '--spark-angle': `${spark.angle}deg`,
                '--spark-distance': `${spark.distance}px`,
                '--spark-size': `${spark.size}px`,
              }}
            />
          ))}
        </div>
      ))}
      <div className="ms-badge">{t('NEW MILESTONE')}</div>
      <h3>{milestoneTitle}</h3>
      <p>{milestoneMeta}</p>
    </div>
  );
}

function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', className = '', as: elementType = 'span' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return undefined;

    let startTimestamp = null;
    let animationFrame;
    const duration = 1500;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(easeProgress * value);
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => { if (animationFrame) window.cancelAnimationFrame(animationFrame); };
  }, [value, isInView]);

  const visibleValue = isInView ? displayValue : 0;
  const formattedValue = visibleValue.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return React.createElement(elementType, { ref, className }, `${prefix}${formattedValue}${suffix}`);
}

export default function Analytics({ currentUser }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const customPlansStorageKey = getUserStorageKey(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, currentUser);
  const workoutScheduleStorageKey = getUserStorageKey(WORKOUT_SCHEDULE_STORAGE_KEY, currentUser);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeRange, setActiveRange] = useState('1M');
  const [customWorkouts, setCustomWorkouts] = useState(() => loadJsonFromStorage(customPlansStorageKey, []));
  const [workoutSchedule, setWorkoutSchedule] = useState(() => loadWorkoutScheduleFromStorage(workoutScheduleStorageKey));
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [sessions, setSessions] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [showReadyMadeOptions, setShowReadyMadeOptions] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [confirmingSessionId, setConfirmingSessionId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [activeInsightInfo, setActiveInsightInfo] = useState(null);
  const shouldUseDemoAnalytics = isJonasArnoldAccount(currentUser);
  const displaySessions = shouldUseDemoAnalytics ? DEMO_ANALYTICS_SESSIONS : sessions;
  const displayStats = shouldUseDemoAnalytics
    ? {
      totalSessions: DEMO_ANALYTICS_SESSIONS.length,
      sessionDates: DEMO_ANALYTICS_SESSIONS.map((session) => session.date),
    }
    : stats;
  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: false, amount: 0.4 });
  const durationRef = useRef(null);
  const isDurationInView = useInView(durationRef, { once: false, amount: 0.35 });
  const overloadRef = useRef(null);
  const isOverloadInView = useInView(overloadRef, { once: false, amount: 0.45 });
  const analyticsWindowKey = format(new Date(), 'yyyy-MM');
  const analyticsReferenceDate = useMemo(() => new Date(), [analyticsWindowKey]);
  const strengthAnalytics = useMemo(() => buildStrengthAnalytics(displaySessions), [displaySessions]);
  const topExerciseMetrics = useMemo(() => buildTopExerciseMetrics(displaySessions), [displaySessions]);
  const latestWeightMilestone = useMemo(
    () => buildLatestWeightMilestone(displaySessions),
    [displaySessions]
  );
  const performanceIntelligence = useMemo(
    () => buildPerformanceIntelligence(displaySessions, analyticsReferenceDate),
    [displaySessions, analyticsReferenceDate]
  );
  const weeklyTrainingQuality = useMemo(
    () => buildWeeklyTrainingQuality(displaySessions, workoutSchedule, analyticsReferenceDate),
    [displaySessions, workoutSchedule, analyticsReferenceDate]
  );
  const mostTrainedExerciseImage = shouldUseDemoAnalytics
    ? MOST_TRAINED_IMAGES[1]
    : getMostTrainedExerciseImage(performanceIntelligence.mostTrainedExercise.name);
  const displayDiversityBubbles = performanceIntelligence.exerciseBubbles.length
    ? performanceIntelligence.exerciseBubbles
    : (shouldUseDemoAnalytics ? DEMO_DIVERSITY_BUBBLES : []);
  const displayExerciseDiversity = performanceIntelligence.exerciseDiversity
    || (shouldUseDemoAnalytics ? DEMO_DIVERSITY_BUBBLES.length : 0);
  const totalDiversitySets = displayDiversityBubbles.reduce((sum, bubble) => sum + bubble.setCount, 0);
  const totalDiversityReps = displayDiversityBubbles.reduce((sum, bubble) => sum + (bubble.repCount || 0), 0);
  const topDiversityExercise = displayDiversityBubbles[0] || {
    name: 'NO EXERCISE YET',
    setCount: 0,
    repCount: 0,
  };
  const visibleChartSeries = strengthAnalytics.series;
  const activeChart = visibleChartSeries[activeRange];
  const chartPoints = getChartPoints(activeChart.values);
  const chartLinePath = buildSmoothLinePath(chartPoints);
  const chartAreaPath = `${chartLinePath} L${chartPoints[chartPoints.length - 1].x},${CHART_HEIGHT} L${chartPoints[0].x},${CHART_HEIGHT} Z`;
  const endPoint = chartPoints[chartPoints.length - 1];
  const chartChangePrefix = activeChart.change >= 0 ? '+ ' : '- ';
  const analyticsInsightInfo = {
    duration: {
      title: 'AVERAGE SESSION DURATION',
      kicker: 'TIME UNDER PLAN',
      intro: 'Average Session Duration shows how long your completed workouts usually last. It helps you understand whether your training sessions are getting shorter, longer or more consistent.',
      formula: 'total training time / sessions',
      formulaText: 'The widget uses saved session duration values from the last 30 days and compares the average with the previous 30 days.',
      cards: [
        { title: 'WHAT IT TELLS YOU', text: 'It reveals whether your workouts match the time commitment you expect from your plan.' },
        { title: 'HOW TO USE IT', text: 'Use it to keep sessions realistic. Very long sessions can signal too much volume or too much rest time.' },
      ],
    },
    overload: {
      title: 'PROGRESSIVE OVERLOAD SCORE',
      kicker: 'STRENGTH PRESSURE',
      intro: 'Progressive Overload Score estimates whether your exercises are moving forward compared with the previous training window.',
      formula: 'current best vs previous best',
      formulaText: 'For each exercise, the app compares the best estimated 1RM from the last 30 days with the previous 30 days and turns the result into a score.',
      cards: [
        { title: 'WHAT IT TELLS YOU', text: 'A high score means your recent training is creating measurable strength pressure.' },
        { title: 'HOW TO USE IT', text: 'If the score stalls, try adding reps, weight or cleaner execution to your key exercises.' },
      ],
    },
    diversity: {
      title: 'EXERCISE DIVERSITY',
      kicker: 'VARIETY CHECK',
      intro: 'Exercise Diversity counts how many different exercises appeared in your recent workouts.',
      formula: 'unique exercise names',
      formulaText: 'The widget looks at the last 30 days, normalizes exercise names and counts each distinct exercise once.',
      cards: [
        { title: 'WHAT IT TELLS YOU', text: 'It shows whether your plan has enough variety or repeats the same patterns too often.' },
        { title: 'HOW TO USE IT', text: 'Use it to keep training fresh without changing exercises so often that progress becomes hard to track.' },
      ],
    },
  };
  const selectedInsightInfo = activeInsightInfo ? analyticsInsightInfo[activeInsightInfo] : null;

  const openInsightInfo = (infoKey) => {
    setActiveInsightInfo(infoKey);
  };

  const handleInsightKeyDown = (event, infoKey) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openInsightInfo(infoKey);
    }
  };

  const refreshSessionData = async () => {
    const [nextStats, nextSessions] = await Promise.all([api.getStats(), api.getSessions()]);
    const normalizedSessions = Array.isArray(nextSessions) ? nextSessions : [];
    setStats(nextStats);
    setSessions(normalizedSessions);
    setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, normalizedSessions));
    return normalizedSessions;
  };

  useEffect(() => {
    window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify(workoutSchedule));
  }, [workoutSchedule, workoutScheduleStorageKey]);

  useEffect(() => {
    if (!sessions.length) return;
    setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, sessions));
  }, [sessions]);

  useEffect(() => {
    setCustomWorkouts(loadJsonFromStorage(customPlansStorageKey, []));
    setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions({
      ...loadWorkoutScheduleFromStorage(workoutScheduleStorageKey),
      ...currentSchedule,
    }, sessions));
  }, [customPlansStorageKey, workoutScheduleStorageKey, sessions]);

  useEffect(() => {
    const refreshWorkoutPlannerData = () => {
      setCustomWorkouts(loadJsonFromStorage(customPlansStorageKey, []));
      setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions({
        ...loadWorkoutScheduleFromStorage(workoutScheduleStorageKey),
        ...currentSchedule,
      }, sessions));
      refreshSessionData().catch(console.error);
    };

    refreshWorkoutPlannerData();
    window.addEventListener('focus', refreshWorkoutPlannerData);
    window.addEventListener('storage', refreshWorkoutPlannerData);

    return () => {
      window.removeEventListener('focus', refreshWorkoutPlannerData);
      window.removeEventListener('storage', refreshWorkoutPlannerData);
    };
  }, [customPlansStorageKey, workoutScheduleStorageKey, sessions]);

  const openWorkoutPlanner = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSelectedCalendarDate(date);
    setSelectedWorkoutId(workoutSchedule[dateKey]?.workoutId || '');
    setShowReadyMadeOptions(false);
    setShowWorkoutDetails(false);
    setConfirmingSessionId(null);
    setDeletingSessionId(null);
  };

  const closeWorkoutPlanner = () => {
    setSelectedCalendarDate(null);
    setSelectedWorkoutId('');
    setShowReadyMadeOptions(false);
    setShowWorkoutDetails(false);
    setConfirmingSessionId(null);
    setDeletingSessionId(null);
  };

  const saveScheduledWorkout = () => {
    if (!selectedCalendarDate || !selectedWorkoutId) return;

    const selectedWorkout = [...customWorkouts, ...readyMadeCalendarWorkouts].find((workout) => workout.id === selectedWorkoutId);
    if (!selectedWorkout) return;

    const dateKey = format(selectedCalendarDate, 'yyyy-MM-dd');
    setWorkoutSchedule((currentSchedule) => ({
      ...currentSchedule,
      [dateKey]: {
        workoutId: selectedWorkout.id,
        title: selectedWorkout.title,
        image: selectedWorkout.image,
        badge: selectedWorkout.badge,
        iconKey: selectedWorkout.iconKey,
        exercises: [...selectedWorkout.exercises, ...(selectedWorkout.extraExercises || [])],
      },
    }));
    closeWorkoutPlanner();
  };

  const removeScheduledWorkout = () => {
    if (!selectedCalendarDate) return;

    const dateKey = format(selectedCalendarDate, 'yyyy-MM-dd');
    setWorkoutSchedule((currentSchedule) => {
      const nextSchedule = { ...currentSchedule };
      delete nextSchedule[dateKey];
      return nextSchedule;
    });
    closeWorkoutPlanner();
  };

  const deleteCompletedSession = async (sessionToDelete) => {
    if (!sessionToDelete?.id) return;
    if (shouldUseDemoAnalytics && String(sessionToDelete.id).startsWith('demo-')) return;

    setDeletingSessionId(sessionToDelete.id);
    try {
      await api.deleteSession(sessionToDelete.id);
      await refreshSessionData();
      setShowWorkoutDetails(selectedDateSessions.length > 1);
      setConfirmingSessionId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  useEffect(() => {
    if (!selectedCalendarDate) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeWorkoutPlanner();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCalendarDate]);

  useEffect(() => {
    if (!activeInsightInfo) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveInsightInfo(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInsightInfo]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const dateFormat = 'd';
    const days = [];

    for (let i = 0; i < 42; i += 1) {
      const calendarDay = addDays(startDate, i);
      const formattedDate = format(calendarDay, dateFormat);
      const dateKey = format(calendarDay, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(calendarDay, monthStart);
      const isToday = isSameDay(calendarDay, new Date());
      const scheduledWorkout = workoutSchedule[dateKey];
      const isWorkoutCompleted = completedWorkoutDates.has(dateKey);

      let className = 'cal-day';
      if (!isCurrentMonth) className += ' text-muted';
      if (isToday) className += ' active';
      if (scheduledWorkout && isCurrentMonth) className += ' completed scheduled';
      if (isWorkoutCompleted && isCurrentMonth) className += ' trained';

      days.push(
        <button
          type="button"
          className={className}
          key={calendarDay.toISOString()}
          onClick={() => openWorkoutPlanner(calendarDay)}
          style={{ opacity: isCurrentMonth ? 1 : 0.3 }}
          aria-label={`${formattedDate}${scheduledWorkout ? `, ${scheduledWorkout.title}` : ''}${isWorkoutCompleted ? `, ${t('WORKOUT COMPLETED')}` : ''}`}
        >
          <span>{formattedDate}</span>
          {isWorkoutCompleted && isCurrentMonth && <span className="cal-completed-dot" title={t('WORKOUT COMPLETED')}></span>}
          {scheduledWorkout && isCurrentMonth && <span className="cal-workout-dot"></span>}
        </button>
      );
    }
    return days;
  };

  const scheduledWorkoutCount = Object.keys(workoutSchedule).filter((dateKey) =>
    isSameMonth(new Date(`${dateKey}T00:00:00`), startOfMonth(currentMonth))
  ).length;
  const completedWorkoutDates = new Set((displayStats.sessionDates || []).map(getSessionDateKey));
  const completedWorkoutCount = Array.from(completedWorkoutDates).filter((dateKey) =>
    isSameMonth(new Date(`${dateKey}T00:00:00`), startOfMonth(currentMonth))
  ).length;
  const availableWorkouts = customWorkouts.length > 0
    ? customWorkouts
    : (showReadyMadeOptions ? readyMadeCalendarWorkouts : []);
  const selectedDateKey = selectedCalendarDate ? format(selectedCalendarDate, 'yyyy-MM-dd') : '';
  const selectedScheduledWorkout = selectedDateKey ? workoutSchedule[selectedDateKey] : null;
  const isSelectedDateCompleted = selectedDateKey ? completedWorkoutDates.has(selectedDateKey) : false;
  const selectedDateSessions = selectedDateKey
    ? displaySessions.filter((session) => getSessionDateKey(session.date) === selectedDateKey)
    : [];
  const hasWorkoutDetails = selectedDateSessions.length > 0;

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>{t('STRENGTH')} <span>{t('INSIGHTS')}</span></h1>
        <p>{t('REAL-TIME PERFORMANCE TREND')}</p>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-card-top">
            <div className="chart-card-title">
              <span>{t('STRENGTH PROGRESS')}</span>
              <AnimatedNumber value={Math.abs(activeChart.change)} decimals={1} prefix={chartChangePrefix} suffix=" %" className="chart-card-title-h2" as="h2" />
              <p>{t(activeChart.compareLabel)}</p>
            </div>
            <div className="chart-filters">
              {Object.keys(visibleChartSeries).map((range) => (
                <button
                  key={range}
                  className={activeRange === range ? 'active' : ''}
                  onClick={() => setActiveRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-area">
            <div ref={chartRef} className="chart-visual">
            <svg viewBox="0 0 400 280" className="mock-chart" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="strengthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C5FE00" stopOpacity="0.18" />
                  <stop offset="22%" stopColor="#A8D900" stopOpacity="0.09" />
                  <stop offset="55%" stopColor="#5D6E18" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="strengthRightBlackFade" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#121212" stopOpacity="0" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0.98" />
                </linearGradient>
                <linearGradient id="strengthBottomBlackFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#121212" stopOpacity="0" />
                  <stop offset="100%" stopColor="#121212" stopOpacity="0.99" />
                </linearGradient>
              </defs>
              <line x1="0" y1="279" x2="400" y2="279" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <MotionG
                key={`area-${activeRange}`}
                initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                animate={isChartInView ? { clipPath: 'inset(0 0% 0 0)', opacity: 1 } : { clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <path
                  d={chartAreaPath}
                  fill="url(#strengthAreaGradient)"
                />
                <rect x="334" y="0" width="66" height="280" fill="url(#strengthRightBlackFade)" />
                <rect x="0" y="224" width="400" height="56" fill="url(#strengthBottomBlackFade)" />
              </MotionG>
              <MotionPath
                key={`line-${activeRange}`}
                d={chartLinePath}
                fill="none"
                stroke="#C5FE00"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={isChartInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 1 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <MotionCircle
                key={`point-${activeRange}`}
                cx={endPoint.x}
                cy={endPoint.y}
                r="6"
                fill="#C5FE00"
                initial={{ scale: 0, opacity: 0 }}
                animate={isChartInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ duration: 0.18, delay: 1.4, ease: 'easeOut' }}
              />
            </svg>
            </div>
            <div className="chart-x-axis">
              {activeChart.labels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="metrics-row">
          {topExerciseMetrics.map((metric, index) => {
            const MetricIcon = index === 2 ? TrendingUp : Dumbbell;
            const translatedName = t(metric.name);

            return (
              <div className="metric-card" key={`${metric.name}-${index}`}>
                <div className="metric-card-top">
                  <div className="metric-card-icon">
                    <MetricIcon size={20} />
                  </div>
                </div>
                <div className="metric-card-value">
                  {metric.best} <span>{t('KG')}</span>
                </div>
                <div className="metric-card-meta">
                  {metric.sessionCount > 0
                    ? `${t('TOP EXERCISE')} · ${metric.sessionCount}x`
                    : t('No workout data yet')}
                </div>
                <div className="metric-card-title-side">{translatedName}</div>
              </div>
            );
          })}

          <MilestoneCard milestone={latestWeightMilestone} />
        </div>

        <div className="analytics-intelligence-grid">
          <section
            className="analytics-insight-card duration-insight-card clickable-insight-card"
            ref={durationRef}
            role="button"
            tabIndex={0}
            onClick={() => openInsightInfo('duration')}
            onKeyDown={(event) => handleInsightKeyDown(event, 'duration')}
            aria-label={t('Open average session duration info')}
          >
            <div className="analytics-insight-top">
              <span className="analytics-insight-icon"><BarChart3 size={18} /></span>
              <span>{t('AVERAGE SESSION DURATION')}</span>
            </div>
            <div className="duration-display">
              <div className="duration-widget-panel">
                <div className="duration-widget-stat">
                  <AnimatedNumber
                    value={performanceIntelligence.averageDuration}
                    as="strong"
                  />
                  <span>{t('MIN AVG')}</span>
                  <em>{t('LAST SESSIONS')}</em>
                </div>
                <div className={`duration-widget-lanes ${performanceIntelligence.durationTrend.sessions.length === 0 ? 'empty' : ''}`} aria-hidden="true">
                  <div className="duration-lane-scale">
                    <small>0</small>
                    <small>{Math.round(performanceIntelligence.durationTrend.scaleMax / 2)}</small>
                    <small>{performanceIntelligence.durationTrend.scaleMax} {t('MIN')}</small>
                  </div>
                  {performanceIntelligence.durationTrend.sessions.map((session, index) => (
                    <div key={`${session.label}-${session.date.toISOString()}`} className="duration-lane-row">
                      <small>{session.label}</small>
                      <span className={session.minutes === Math.max(...performanceIntelligence.durationTrend.sessions.map((item) => item.minutes)) ? 'duration-lane peak' : 'duration-lane'}>
                        <motion.i
                          initial={false}
                          animate={{
                            opacity: isDurationInView ? 1 : 0,
                            width: `${isDurationInView ? session.width : 0}%`,
                          }}
                          transition={{
                            width: {
                              duration: 0.9,
                              delay: isDurationInView ? index * 0.16 : 0,
                              ease: [0.16, 1, 0.3, 1],
                            },
                            opacity: {
                              duration: 0.32,
                              delay: isDurationInView ? index * 0.16 : 0,
                            },
                          }}
                        />
                      </span>
                      <b>{session.minutes}m</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`analytics-trend-pill ${performanceIntelligence.averageDurationChange >= 0 ? 'positive' : 'negative'}`}>
              {performanceIntelligence.averageDurationChange >= 0 ? '+' : ''}
              {performanceIntelligence.averageDurationChange.toFixed(1)}% {t('vs last month')}
            </div>
            <div className="insight-micro-label">{t('SESSION FLOW')}</div>
          </section>

          <section
            className="analytics-insight-card consistency-insight-card clickable-insight-card"
            ref={overloadRef}
            role="button"
            tabIndex={0}
            onClick={() => openInsightInfo('overload')}
            onKeyDown={(event) => handleInsightKeyDown(event, 'overload')}
            aria-label={t('Open progressive overload score info')}
          >
            <div className="analytics-insight-top">
              <span className="analytics-insight-icon"><Gauge size={18} /></span>
              <span>{t('PROGRESSIVE OVERLOAD SCORE')}</span>
            </div>
            <div className="overload-console">
              <div className="consistency-ring">
                <svg viewBox="0 0 180 180" aria-hidden="true">
                  <circle className="consistency-ring-track" cx="90" cy="90" r="72" />
                  <MotionCircle
                    className="consistency-ring-progress"
                    cx="90"
                    cy="90"
                    r="72"
                    initial={false}
                    animate={{ pathLength: isOverloadInView ? performanceIntelligence.progressiveOverloadScore / 100 : 0 }}
                    transition={{ duration: 1.45, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
                <AnimatedNumber
                  value={performanceIntelligence.progressiveOverloadScore}
                  suffix="%"
                  as="span"
                />
              </div>
              <div className="overload-segments" aria-hidden="true">
                {[20, 40, 60, 80, 100].map((threshold) => (
                  <span
                    key={threshold}
                    className={performanceIntelligence.progressiveOverloadScore >= threshold - 19 ? 'active' : ''}
                  >
                    <motion.i
                      initial={false}
                      animate={{
                        scaleX: isOverloadInView
                          ? Math.min(Math.max((performanceIntelligence.progressiveOverloadScore - (threshold - 20)) / 20, 0), 1)
                          : 0,
                      }}
                      transition={{
                        duration: 0.8,
                        delay: isOverloadInView ? (threshold / 20) * 0.09 : 0,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                    <small>{threshold}</small>
                  </span>
                ))}
              </div>
            </div>
            <p>{t('OVERLOAD PRESSURE')}</p>
          </section>

          <section
            className="analytics-insight-card focus-insight-card clickable-insight-card"
            role="button"
            tabIndex={0}
            onClick={() => openInsightInfo('diversity')}
            onKeyDown={(event) => handleInsightKeyDown(event, 'diversity')}
            aria-label={t('Open exercise diversity info')}
          >
            <div className="analytics-insight-top">
              <span className="analytics-insight-icon"><Layers3 size={18} /></span>
              <span>{t('EXERCISE DIVERSITY')}</span>
            </div>
            <div className="diversity-bubble-field" aria-hidden="true">
              {displayDiversityBubbles.length > 0 ? (
                displayDiversityBubbles.map((bubble) => (
                  <span
                    key={`${bubble.name}-${bubble.index}`}
                    className={bubble.setCount > 0 ? 'diversity-bubble active' : 'diversity-bubble'}
                    style={{
                      '--bubble-size': `${bubble.size}px`,
                      '--bubble-index': bubble.index,
                      '--bubble-x': `${DIVERSITY_BUBBLE_LAYOUT[bubble.index % DIVERSITY_BUBBLE_LAYOUT.length].x}%`,
                      '--bubble-y': `${DIVERSITY_BUBBLE_LAYOUT[bubble.index % DIVERSITY_BUBBLE_LAYOUT.length].y}%`,
                      '--bubble-spread-x': `${DIVERSITY_BUBBLE_SPREAD_LAYOUT[bubble.index % DIVERSITY_BUBBLE_SPREAD_LAYOUT.length].x}%`,
                      '--bubble-spread-y': `${DIVERSITY_BUBBLE_SPREAD_LAYOUT[bubble.index % DIVERSITY_BUBBLE_SPREAD_LAYOUT.length].y}%`,
                    }}
                    title={`${t(bubble.name)} · ${bubble.setCount} ${t('SETS')}`}
                  >
                    <b>{t(bubble.name)}</b>
                  </span>
                ))
              ) : (
                <div className="diversity-empty-state">{t('No workout data yet')}</div>
              )}
            </div>
            <div className="diversity-bottom">
              <div className="analytics-insight-value">
                {displayExerciseDiversity} <small>{t('EXERCISES')}</small>
              </div>
              <div className="analytics-trend-pill positive">
                {t('LAST 30 DAYS')}
              </div>
            </div>
          </section>

          <section
            className="analytics-insight-card pr-insight-card"
            style={{ '--most-trained-image': `url(${mostTrainedExerciseImage})` }}
          >
            <div className="analytics-insight-top">
              <span className="analytics-insight-icon"><Trophy size={18} /></span>
              <span>{t('MOST TRAINED EXERCISE')}</span>
            </div>
            <div className="analytics-feature-exercise">
              <div className="exercise-spotlight-orbit" aria-hidden="true">
                <span></span>
                <span></span>
              </div>
              <strong>{t(performanceIntelligence.mostTrainedExercise.name)}</strong>
              <span>
                {performanceIntelligence.mostTrainedExercise.sessionCount > 0
                  ? `${performanceIntelligence.mostTrainedExercise.sessionCount}x ${t('SESSIONS')} · ${performanceIntelligence.mostTrainedExercise.setCount} ${t('SETS')}`
                  : t('No workout data yet')}
              </span>
              <div className="insight-micro-label pr-inline-label">{t('MAIN MOVEMENT')}</div>
            </div>
            <div className="most-trained-meta-grid" aria-hidden="true">
              <span>
                <small><Award size={13} />{t('RANK')}</small>
                <strong>#1</strong>
              </span>
              <span>
                <small><Gauge size={13} />{t('TOP SCORE')}</small>
                <strong>{performanceIntelligence.mostTrainedExercise.best || '-'}</strong>
              </span>
              <span>
                <small><Layers3 size={13} />{t('TOTAL SETS')}</small>
                <strong>{performanceIntelligence.mostTrainedExercise.setCount || '-'}</strong>
              </span>
            </div>
          </section>
        </div>

        <div className="schedule-card">
          <div className="calendar-header">
            <h3>{format(currentMonth, 'MMMM yyyy', { locale: lang === 'de' ? de : undefined }).toUpperCase()}</h3>
            <div className="calendar-nav">
              <ChevronLeft size={16} onClick={prevMonth} />
              <ChevronRight size={16} onClick={nextMonth} />
            </div>
          </div>
          <div className="calendar-grid">
            {weekdays.map((day, index) => (
              <div key={index} className="cal-day-name">
                {t(day)}
              </div>
            ))}
            {renderCalendarDays()}
          </div>
          <div className="schedule-footer">
            <span className="schedule-meta">
              <span className="status-dot"></span> {scheduledWorkoutCount} {t('PLANNED WORKOUTS')}
            </span>
            <span className="schedule-meta highlight">{completedWorkoutCount} {t('TRAINING DAYS')}</span>
          </div>
        </div>

        <div className="quality-card">
          <div className="quality-card-top">
            <div>
              <span>{t('WEEKLY TRAINING QUALITY')}</span>
              <h3>{weeklyTrainingQuality.score}<span>%</span></h3>
            </div>
            <Award size={24} />
          </div>
          <p>{t(weeklyTrainingQuality.message)}</p>
        </div>
      </div>

      {selectedInsightInfo && (
        <div
          className="analytics-info-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveInsightInfo(null);
          }}
        >
          <section className="analytics-info-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-info-title">
            <button className="analytics-info-close" type="button" onClick={() => setActiveInsightInfo(null)} aria-label={t('Close analytics info')}>
              <X size={18} />
            </button>

            <div className="analytics-info-header">
              <span className="analytics-insight-icon"><Activity size={20} /></span>
              <div>
                <span>{t(selectedInsightInfo.kicker)}</span>
                <h2 id="analytics-info-title">{t(selectedInsightInfo.title)}</h2>
              </div>
            </div>

            <p className="analytics-info-intro">{t(selectedInsightInfo.intro)}</p>

            <div className={`analytics-info-visual ${activeInsightInfo}`}>
              {activeInsightInfo === 'duration' && (
                <>
                  <div className="info-duration-dial">
                    <strong>{performanceIntelligence.averageDuration}</strong>
                    <span>{t('MIN AVG')}</span>
                  </div>
                  <div className="info-duration-lanes" aria-hidden="true">
                    {[36, 52, 74, 46, 88, 64].map((width, index) => (
                      <span key={index} style={{ width: `${width}%` }}></span>
                    ))}
                  </div>
                </>
              )}
              {activeInsightInfo === 'overload' && (
                <div className="info-overload-dashboard">
                  <div className="info-overload-impact-grid">
                    <div className="info-overload-impact-item">
                      <TrendingUp size={20} />
                      <h3>{t('BEAT YOUR BASELINE')}</h3>
                      <p>{t('The score rises when recent strength bests beat the previous 30-day window.')}</p>
                    </div>
                    <div className="info-overload-impact-item">
                      <Dumbbell size={20} />
                      <h3>{t('REPS OR LOAD')}</h3>
                      <p>{t('More clean reps or more weight can push the estimated best value forward.')}</p>
                    </div>
                    <div className="info-overload-impact-item">
                      <Activity size={20} />
                      <h3>{t('KEEP IT TRACKABLE')}</h3>
                      <p>{t('Repeated logged exercises create a clearer comparison than random one-off lifts.')}</p>
                    </div>
                  </div>

                  <div className="info-overload-score-panel">
                    <div className="info-overload-score-head">
                      <div>
                        <span>{t('SCORE WINDOW')}</span>
                        <strong>{performanceIntelligence.progressiveOverloadScore}%</strong>
                      </div>
                      <div className="info-overload-window-badge">
                        <Gauge size={16} />
                        {t('LAST 30 DAYS VS PREVIOUS 30 DAYS')}
                      </div>
                    </div>

                    <div className="info-overload-scale" aria-hidden="true">
                      {[20, 40, 60, 80, 100].map((threshold) => (
                        <span
                          key={threshold}
                          className={performanceIntelligence.progressiveOverloadScore >= threshold ? 'active' : ''}
                        >
                          <small>{threshold}</small>
                        </span>
                      ))}
                    </div>

                    <p>{t('The app compares each exercise by its best estimated strength value. New exercises start with a smaller base signal until a previous window exists.')}</p>
                  </div>
                </div>
              )}
              {activeInsightInfo === 'diversity' && (
                <div className="info-diversity-dashboard">
                  <div className="info-diversity-impact-grid">
                    <div className="info-diversity-impact-item">
                      <Layers3 size={20} />
                      <h3>{t('UNIQUE EXERCISES')}</h3>
                      <strong>{displayExerciseDiversity}</strong>
                      <p>{t('Different movements detected in the last 30 days.')}</p>
                    </div>
                    <div className="info-diversity-impact-item">
                      <Dumbbell size={20} />
                      <h3>{t('TOTAL SETS')}</h3>
                      <strong>{totalDiversitySets}</strong>
                      <p>{t('Logged working sets across your exercise mix.')}</p>
                    </div>
                    <div className="info-diversity-impact-item">
                      <TrendingUp size={20} />
                      <h3>{t('MAIN FOCUS')}</h3>
                      <strong>{t(topDiversityExercise.name)}</strong>
                      <p>{topDiversityExercise.setCount} {t('SETS')} · {topDiversityExercise.repCount || 0} {t('REPS')}</p>
                    </div>
                  </div>

                  <div className="info-diversity-chart-stack">
                    <div className="info-diversity-chart-head">
                      <div>
                        <span className="info-diversity-kicker">{t('LAST 30 DAYS')}</span>
                        <h3>{t('Exercise mix map')}</h3>
                      </div>
                      <div className="info-diversity-total">
                        <strong>{totalDiversityReps}</strong>
                        <span>{t('REPS')}</span>
                      </div>
                    </div>

                    <div className="info-diversity-explainer">
                      <Layers3 size={18} />
                      <div>
                        <h4>{t('HOW TO READ THE BUBBLES')}</h4>
                        <p>{t('Each bubble represents one exercise from the last 30 days. Bigger bubbles mean the exercise appears more often in your logged workout sets.')}</p>
                      </div>
                    </div>
                    <div className="info-diversity-content-grid list-only">
                      <div className="info-diversity-list-panel">
                        <div className="info-diversity-list-head">
                          <span>{t('EXERCISES')}</span>
                          <strong>{displayExerciseDiversity}</strong>
                        </div>
                        <div className="info-diversity-list">
                          {displayDiversityBubbles.length > 0 ? (
                            displayDiversityBubbles.map((bubble) => (
                              <div key={`${bubble.name}-row-${bubble.index}`} className="info-diversity-row">
                                <span>{t(bubble.name)}</span>
                                <strong>{bubble.setCount} {t('SETS')}</strong>
                                <em>{bubble.repCount || 0} {t('REPS')}</em>
                              </div>
                            ))
                          ) : (
                            <div className="info-diversity-empty-copy">
                              {t('Log workouts to build your exercise diversity map.')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="analytics-info-formula">
              <span>{t('HOW IT WORKS')}</span>
              <strong>{t(selectedInsightInfo.formula)}</strong>
              <p>{t(selectedInsightInfo.formulaText)}</p>
            </div>

            <div className="analytics-info-grid">
              {selectedInsightInfo.cards.map((card) => (
                <div key={card.title}>
                  <h3>{t(card.title)}</h3>
                  <p>{t(card.text)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedCalendarDate && (
        <div
          className="analytics-planner-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWorkoutPlanner();
          }}
        >
          <motion.div
            className="analytics-planner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-planner-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <button className="analytics-planner-close" type="button" onClick={closeWorkoutPlanner} aria-label={t('Close planner')}>
              <X size={18} />
            </button>

            <div className="analytics-planner-header">
              <div className="metric-card-icon analytics-planner-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <span>{format(selectedCalendarDate, 'EEEE, dd MMMM yyyy', { locale: lang === 'de' ? de : undefined }).toUpperCase()}</span>
                <h2 id="analytics-planner-title">{t('PLAN WORKOUT')}</h2>
              </div>
            </div>

            <div className={`analytics-current-workout ${isSelectedDateCompleted && !selectedScheduledWorkout ? 'completed' : ''}`}>
              {selectedScheduledWorkout ? (
                <div className="analytics-current-copy">
                  <span>{t('SCHEDULED WORKOUT')}</span>
                  <strong>{selectedScheduledWorkout.title}</strong>
                </div>
              ) : isSelectedDateCompleted ? (
                <div className="analytics-current-copy">
                  <span>{t('WORKOUT DONE')}</span>
                  <strong>{t('Ready for another round?')}</strong>
                </div>
              ) : (
                <div className="analytics-current-copy">
                  <span>{t('EMPTY DAY')}</span>
                  <strong>{t('No workout planned yet.')}</strong>
                </div>
              )}

              {isSelectedDateCompleted && hasWorkoutDetails && (
                <button
                  className="analytics-details-button"
                  type="button"
                  onClick={() => setShowWorkoutDetails((isOpen) => !isOpen)}
                >
                  {showWorkoutDetails ? t('HIDE DETAILS') : t('VIEW SESSION')}
                </button>
              )}
            </div>

            {showWorkoutDetails && hasWorkoutDetails && (
              <div className="analytics-session-details">
                {selectedDateSessions.map((session, sessionIndex) => {
                  const groupedLogs = groupLogsByExercise(session.logs || []);
                  const sessionTime = new Date(session.date).toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div className="analytics-session-card" key={session.id || `${session.date}-${sessionIndex}`}>
                      <div className="analytics-session-head">
                        <div>
                          <span>{t('SESSION DETAILS')}</span>
                          <strong>{session.plan_name || t('FREESTYLE WORKOUT')}</strong>
                        </div>
                        <small>{sessionTime}</small>
                      </div>

                      {confirmingSessionId === session.id && (
                        <div className="analytics-session-delete-confirm">
                          <p>{t('Delete this completed workout?')}</p>
                          <div>
                            <button
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setConfirmingSessionId(null);
                              }}
                            >
                              {t('CANCEL')}
                            </button>
                            <button
                              type="button"
                              className="danger"
                              disabled={deletingSessionId === session.id}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                deleteCompletedSession(session);
                              }}
                            >
                              {deletingSessionId === session.id ? t('DELETING') : t('DELETE')}
                            </button>
                          </div>
                        </div>
                      )}

                      {Object.keys(groupedLogs).length > 0 ? (
                        Object.entries(groupedLogs).map(([exerciseName, logs]) => (
                          <div className="analytics-session-exercise" key={exerciseName}>
                            <h3>{exerciseName}</h3>
                            <div className="analytics-session-log-grid">
                              <span>{t('SET')}</span>
                              <span>{t('REPS')}</span>
                              <span>{t('WEIGHT')}</span>
                              <span>{t('REST')}</span>
                              {logs.map((log) => (
                                <React.Fragment key={`${exerciseName}-${log.id || log.set_number}`}>
                                  <strong>{log.set_number || '-'}</strong>
                                  <strong>{log.reps ?? '-'}</strong>
                                  <strong>{log.weight ? `${log.weight} kg` : '-'}</strong>
                                  <strong>{log.rest_seconds ? `${log.rest_seconds} ${t('SEC')}` : '-'}</strong>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="analytics-session-empty">{t('No set details saved for this session.')}</p>
                      )}

                      {session.notes && (
                        <p className="analytics-session-notes">
                          <span>{t('SESSION NOTES')}</span>
                          {session.notes}
                        </p>
                      )}

                      <button
                        className="analytics-session-trash-button"
                        type="button"
                        aria-label={t('DELETE SESSION')}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setConfirmingSessionId(session.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="analytics-workout-select-list">
              {availableWorkouts.length > 0 ? (
                availableWorkouts.map((workout) => {
                  const WorkoutIcon = workoutIconMap[workout.iconKey] || Dumbbell;

                  return (
                    <button
                      className={`analytics-workout-select-card ${selectedWorkoutId === workout.id ? 'active' : ''}`}
                      type="button"
                      key={workout.id}
                      onClick={() => setSelectedWorkoutId(workout.id)}
                    >
                      <span
                        className="analytics-workout-select-cover"
                        style={{ backgroundImage: `url(${workout.image || '/hero-bg.jpg'})` }}
                      >
                        <WorkoutIcon size={18} />
                      </span>
                      <span className="analytics-workout-select-info">
                        <strong>{workout.title}</strong>
                        <small>{t(workout.badge)} · {[...workout.exercises, ...(workout.extraExercises || [])].length} {t('exercises')}</small>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="analytics-workout-empty-state">
                  <Dumbbell size={22} />
                  <p>{t('Create a workout first, then schedule it here.')}</p>
                  <button
                    className="analytics-empty-workout-add-button"
                    type="button"
                    aria-label={t('CREATE WORKOUT')}
                    onClick={() => navigate('/workouts')}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
              )}
            </div>

            {customWorkouts.length === 0 && !showReadyMadeOptions && (
              <button className="analytics-ready-made-suggestion" type="button" onClick={() => setShowReadyMadeOptions(true)}>
                <span>{t("No custom workout yet?")}</span>
                <strong>{t('Pick a ready-made workout instead.')}</strong>
              </button>
            )}

            <div className="analytics-planner-actions">
              {selectedScheduledWorkout && (
                <button className="analytics-planner-remove-button" type="button" onClick={removeScheduledWorkout}>
                  <Trash2 size={16} /> {t('REMOVE')}
                </button>
              )}
              <button className="analytics-planner-save-button" type="button" onClick={saveScheduledWorkout} disabled={!selectedWorkoutId}>
                {t('SAVE WORKOUT')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
