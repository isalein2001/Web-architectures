import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView, motion } from 'framer-motion';
import { api } from '../api';
import { getUserDisplayName, getUserFirstName, getUserStorageKey, loadStoredWorkoutSessions, saveStoredWorkoutSessions } from '../userStorage';
import { getTodayHealthDateKey, isHealthKitRuntime, isHealthMetricsFromToday, syncAppleHealthActivity } from '../healthKit';
import { Activity, Flame, Clock, Droplets, ChevronLeft, ChevronRight, Award, X, Zap, Brain, Target, Minus, Plus, Dumbbell, CalendarDays, Trash2, Bike, Flower2, PlusCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  startOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays 
} from 'date-fns';
import { de } from 'date-fns/locale';
import './Dashboard.css';

const MotionDiv = motion.div;
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
const DAILY_STEP_GOAL_STORAGE_KEY = 'dailyStepGoal';
const DAILY_CALORIE_GOAL_STORAGE_KEY = 'dailyCalorieGoal';
const DAILY_TRAINING_MINUTES_GOAL_STORAGE_KEY = 'dailyTrainingMinutesGoal';
const isJonasArnoldAccount = (user) => {
  const displayName = getUserDisplayName(user).toLowerCase();
  const email = user?.email?.toLowerCase() || '';
  return displayName.includes('jonas arnold') || email.includes('jonas');
};
const createDemoDashboardSessions = () => {
  const today = new Date();
  today.setHours(20, 0, 0, 0);
  return [1, 3, 6, 9, 13, 17, 21, 25].map((offset, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    return {
      id: `demo-dashboard-session-${index + 1}`,
      date: date.toISOString(),
      calories_burned: 330 + (index * 24),
      duration_seconds: (42 + (index % 4) * 8) * 60,
      logs: [
        { id: `demo-dashboard-log-${index}-1`, exercise_name: 'Hip Thrust', weight: 100 + index, reps: 10 },
        { id: `demo-dashboard-log-${index}-2`, exercise_name: 'Leg Press', weight: 140 + index, reps: 12 },
        { id: `demo-dashboard-log-${index}-3`, exercise_name: 'Lat Pulldown', weight: 58 + index, reps: 10 },
      ],
    };
  });
};
const DEMO_DASHBOARD_SESSIONS = createDemoDashboardSessions();
const getSessionDateKey = (date) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return String(date).slice(0, 10);
  return format(parsedDate, 'yyyy-MM-dd');
};
const exertionOptions = Array.from({ length: 10 }, (_, index) => index + 1);
const getExertionZone = (value) => {
  const exertion = Math.min(10, Math.max(1, Math.round(Number(value) || 6)));
  if (exertion <= 3) return { label: 'LIGHT', description: 'Easy pace', intensity: 'light' };
  if (exertion <= 6) return { label: 'MODERATE', description: 'Controlled effort', intensity: 'moderate' };
  if (exertion <= 9) return { label: 'HARD', description: 'Demanding sets', intensity: 'intense' };
  return { label: 'MAX EFFORT', description: 'All-out session', intensity: 'hiit' };
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

const mapBackendPlanToCalendarWorkout = (plan) => {
  const formattedExercises = (plan.exercises || []).map((exercise) =>
    `${exercise.exercise_name} (${exercise.target_sets || 1}x${exercise.target_reps || ''})`
  );

  return {
    id: plan.id,
    backendPlanId: plan.id,
    title: plan.name,
    badge: 'SAVED PLAN',
    image: plan.image || '/hero-bg.jpg',
    iconKey: plan.icon_key || 'dumbbell',
    exercises: formattedExercises.slice(0, 3),
    extraExercises: formattedExercises.slice(3),
    editable: true,
  };
};

const createBackfillExerciseFromLabel = (label) => {
  const match = String(label || '').match(/^(.*?)\s*\((\d+)x([^)]*)\)$/);
  const setCount = Number.parseInt(match?.[2] || '3', 10) || 3;
  const parsedReps = String(match?.[3] || '10').split('/').map((rep) => rep.trim()).filter(Boolean);
  const targetRepsBySet = Array.from({ length: setCount }, (_, index) => parsedReps[index] || parsedReps[0] || '10');

  return {
    exercise_name: (match?.[1] || label || 'Exercise').trim(),
    sets: String(setCount),
    targetRepsBySet,
    repsBySet: Array.from({ length: setCount }, () => ''),
    weightsBySet: Array.from({ length: setCount }, () => ''),
    restBySet: Array.from({ length: setCount }, () => ''),
  };
};

const createBackfillExercisesFromWorkout = (workout) => {
  const exerciseLabels = [...(workout?.exercises || []), ...(workout?.extraExercises || [])];
  return (exerciseLabels.length ? exerciseLabels : ['Exercise'])
    .map(createBackfillExerciseFromLabel);
};

const idsMatch = (left, right) => String(left ?? '') === String(right ?? '');

const mergeScheduleWithSessions = (schedule = {}, sessionList = []) => {
  const nextSchedule = { ...schedule };

  sessionList.forEach((session) => {
    const dateKey = getSessionDateKey(session.date);
    if (!dateKey) return;
    nextSchedule[dateKey] = buildScheduleEntryFromSession(session);
  });

  return nextSchedule;
};

const loadTodayHealthMetricsFromStorage = (key) => {
  const savedMetrics = loadJsonFromStorage(key, null);
  return isHealthMetricsFromToday(savedMetrics) ? savedMetrics : null;
};

function AnimatedNumber({ value, useComma }) {
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
      setDisplayValue(Math.floor(easeProgress * value));
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => { if (animationFrame) window.cancelAnimationFrame(animationFrame); };
  }, [value, isInView]);

  const visibleValue = isInView ? displayValue : 0;

  return <span ref={ref}>{useComma ? visibleValue.toLocaleString('en-US') : visibleValue}</span>;
}

function CircularProgress({ percentage }) {
  const { t } = useLanguage();
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  
  const displayPercentage = isInView ? percentage : 0;
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

  return (
    <div className="circular-progress-container" ref={ref}>
      <svg className="circular-progress-svg" viewBox="0 0 200 200">
        <circle 
          className="circular-progress-bg" 
          cx="100" cy="100" r={radius} 
          strokeWidth="12" fill="none" 
        />
        <circle 
          className="circular-progress-fill" 
          cx="100" cy="100" r={radius} 
          strokeWidth="12" fill="none" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.165, 0.84, 0.44, 1)" }}
        />
      </svg>
      <div className="circular-progress-content">
        <span className="circular-progress-value">
          <AnimatedNumber value={percentage} useComma={false} />%
        </span>
        <span className="circular-progress-label">{t('COMPLETED')}</span>
      </div>
    </div>
  );
}

const getSessionTimestamp = (session) => {
  const timestamp = new Date(session?.date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getSessionVolume = (session) => (session.logs || []).reduce((sum, log) => {
  const weight = Number(log.weight) || 0;
  const reps = Number(log.reps) || 0;
  return sum + (weight * reps);
}, 0);

const getBestWeightMilestone = (sessions = []) => {
  const bestByExercise = new Map();
  const milestones = [];

  [...sessions]
    .sort((left, right) => getSessionTimestamp(left) - getSessionTimestamp(right))
    .forEach((session) => {
      (session.logs || []).forEach((log) => {
        const exerciseName = log.exercise_name || log.exerciseName;
        const weight = Number(log.weight);
        if (!exerciseName || !Number.isFinite(weight) || weight <= 0) return;

        const previousBest = bestByExercise.get(exerciseName) || 0;
        if (weight > previousBest) {
          if (previousBest > 0) {
            milestones.push({
              exerciseName,
              weight,
              improvement: weight - previousBest,
              date: session.date,
            });
          }
          bestByExercise.set(exerciseName, weight);
        }
      });
    });

  return milestones.sort((left, right) => (
    getSessionTimestamp(right) - getSessionTimestamp(left)
    || right.improvement - left.improvement
  ))[0] || null;
};

const getCurrentWorkoutStreak = (sessionDates = []) => {
  const sortedDays = [...new Set(sessionDates.map(getSessionDateKey).filter(Boolean))]
    .sort((left, right) => new Date(right) - new Date(left));
  if (!sortedDays.length) return 0;

  let streak = 1;
  for (let index = 1; index < sortedDays.length; index += 1) {
    const previous = new Date(sortedDays[index - 1]);
    const current = new Date(sortedDays[index]);
    const diffDays = Math.round((previous - current) / (24 * 60 * 60 * 1000));
    if (diffDays <= 7) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

const buildPersonalInsight = ({
  sessions,
  stats,
  stepsValue,
  caloriesValue,
  minutesValue,
  dailyGoalCompletion,
  currentUser,
}) => {
  const totalSessions = stats.totalSessions || sessions.length || 0;
  const totalVolume = sessions.reduce((sum, session) => sum + getSessionVolume(session), 0);
  const latestSession = [...sessions].sort((left, right) => getSessionTimestamp(right) - getSessionTimestamp(left))[0];
  const latestVolume = latestSession ? getSessionVolume(latestSession) : 0;
  const bestWeightMilestone = getBestWeightMilestone(sessions);
  const workoutStreak = getCurrentWorkoutStreak(stats.sessionDates || sessions.map((session) => session.date));
  const firstName = getUserFirstName(currentUser);
  const candidates = [];

  if (bestWeightMilestone) {
    candidates.push({
      type: 'PERSONAL RECORD',
      title: `${bestWeightMilestone.exerciseName} ${Math.round(bestWeightMilestone.weight)}kg`,
      description: `New best: +${Math.round(bestWeightMilestone.improvement)}kg compared to your previous logged top set.`,
      badge: 'NEW PR',
      Icon: Award,
      metrics: [
        { label: 'EXERCISE', value: bestWeightMilestone.exerciseName },
        { label: 'BEST SET', value: `${Math.round(bestWeightMilestone.weight)}kg` },
        { label: 'GAIN', value: `+${Math.round(bestWeightMilestone.improvement)}kg` },
      ],
    });
  }

  if (workoutStreak >= 2) {
    candidates.push({
      type: 'CONSISTENCY',
      title: `${workoutStreak} training weeks connected`,
      description: 'You are building a real rhythm. Keep one session in the calendar this week to protect the streak.',
      badge: 'STREAK',
      Icon: Flame,
      metrics: [
        { label: 'STREAK', value: `${workoutStreak}x` },
        { label: 'WORKOUTS', value: totalSessions.toLocaleString('en-US') },
        { label: 'NEXT', value: '+1' },
      ],
    });
  }

  if (latestSession && latestVolume > 0) {
    candidates.push({
      type: 'WEEKLY HIGHLIGHT',
      title: `${Math.round(latestVolume).toLocaleString('en-US')}kg moved last session`,
      description: `${latestSession.plan_name || 'Your last workout'} is now part of your training history and dashboard analytics.`,
      badge: 'LOGGED',
      Icon: Dumbbell,
      metrics: [
        { label: 'VOLUME', value: `${Math.round(latestVolume / 100) / 10}t` },
        { label: 'SETS', value: `${latestSession.logs?.length || 0}` },
        { label: 'TIME', value: `${Math.round((latestSession.duration_seconds || 0) / 60) || '-'}m` },
      ],
    });
  }

  if (totalVolume >= 1000) {
    candidates.push({
      type: 'FUN FACT',
      title: `${Math.round(totalVolume).toLocaleString('en-US')}kg lifetime volume`,
      description: `That is roughly ${Math.max(1, Math.round(totalVolume / 20000))} fully loaded 20-ton training block${Math.max(1, Math.round(totalVolume / 20000)) === 1 ? '' : 's'} worth of effort in your logbook.`,
      badge: 'DID YOU KNOW?',
      Icon: Zap,
      metrics: [
        { label: 'TOTAL', value: `${Math.round(totalVolume / 100) / 10}t` },
        { label: 'SESSIONS', value: totalSessions.toLocaleString('en-US') },
        { label: 'AVG', value: `${Math.round(totalVolume / Math.max(totalSessions, 1)).toLocaleString('en-US')}kg` },
      ],
    });
  }

  if (stepsValue > 0 || caloriesValue > 0 || minutesValue > 0) {
    candidates.push({
      type: 'DAILY MOMENTUM',
      title: `${dailyGoalCompletion}% of today's movement target`,
      description: `${stepsValue.toLocaleString('en-US')} steps, ${caloriesValue.toLocaleString('en-US')} kcal and ${minutesValue} active minutes are already synced into Next Reps.`,
      badge: dailyGoalCompletion >= 100 ? 'GOAL COMPLETE' : 'IN PROGRESS',
      Icon: Activity,
      metrics: [
        { label: 'STEPS', value: stepsValue.toLocaleString('en-US') },
        { label: 'KCAL', value: caloriesValue.toLocaleString('en-US') },
        { label: 'MIN', value: `${minutesValue}` },
      ],
    });
  }

  if (totalSessions > 0) {
    const nextMilestone = Math.ceil((totalSessions + 1) / 5) * 5;
    candidates.push({
      type: 'NEXT GOAL',
      title: `${nextMilestone - totalSessions} workout${nextMilestone - totalSessions === 1 ? '' : 's'} to ${nextMilestone}`,
      description: `One clean entry at a time. Your next milestone is ${nextMilestone} completed workouts.`,
      badge: 'MILESTONE',
      Icon: Target,
      metrics: [
        { label: 'DONE', value: `${totalSessions}` },
        { label: 'GOAL', value: `${nextMilestone}` },
        { label: 'LEFT', value: `${nextMilestone - totalSessions}` },
      ],
    });
  }

  if (!candidates.length) {
    return {
      type: 'FIRST MILESTONE',
      title: firstName ? `${firstName}, log your first session` : 'Log your first session',
      description: 'Create a workout, finish it once, and this card will turn into personalized highlights from your own training.',
      badge: 'READY',
      Icon: CalendarDays,
      metrics: [
        { label: 'WORKOUTS', value: '0' },
        { label: 'GOAL', value: '1' },
        { label: 'STATUS', value: 'START' },
      ],
    };
  }

  const dayKey = format(new Date(), 'yyyy-MM-dd');
  const userSeed = String(currentUser?.id || currentUser?.email || 'next-reps')
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const dateSeed = dayKey.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return candidates[(userSeed + dateSeed) % candidates.length];
};

function AnimatedMedal({ Icon = Award }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <div className="achievements-medal-area" ref={ref}>
      <div className="medal-glow-bg"></div>
      <MotionDiv 
        className="medal-icon"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: [0, 1.3, 0.85, 1.15, 0.95, 1] } : { scale: 0 }}
        transition={{ 
          duration: 1.5, 
          times: [0, 0.4, 0.65, 0.8, 0.9, 1], 
          ease: "easeInOut" 
        }}
      >
        <Icon size={40} color="#000" />
      </MotionDiv>
    </div>
  );
}

export default function Dashboard({ currentUser, dailyActivity, onOpenQuickLog }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const workoutScheduleStorageKey = getUserStorageKey(WORKOUT_SCHEDULE_STORAGE_KEY, currentUser);
  const hydrationGoalStorageKey = getUserStorageKey('hydrationGoalLiters', currentUser);
  const appleWatchConnectedStorageKey = getUserStorageKey('appleWatchConnected', currentUser);
  const appleHealthMetricsStorageKey = getUserStorageKey('appleHealthMetrics', currentUser);
  const dailyStepGoalStorageKey = getUserStorageKey(DAILY_STEP_GOAL_STORAGE_KEY, currentUser);
  const dailyCalorieGoalStorageKey = getUserStorageKey(DAILY_CALORIE_GOAL_STORAGE_KEY, currentUser);
  const dailyTrainingMinutesGoalStorageKey = getUserStorageKey(DAILY_TRAINING_MINUTES_GOAL_STORAGE_KEY, currentUser);
  const firstName = getUserFirstName(currentUser);
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [sessions, setSessions] = useState(() => loadStoredWorkoutSessions(currentUser));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isHydrationModalOpen, setIsHydrationModalOpen] = useState(false);
  const [customWorkouts, setCustomWorkouts] = useState([]);
  const [workoutSchedule, setWorkoutSchedule] = useState(() => loadWorkoutScheduleFromStorage(workoutScheduleStorageKey));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [plannerMode, setPlannerMode] = useState('schedule');
  const [backfillWorkoutId, setBackfillWorkoutId] = useState(null);
  const [backfillExercises, setBackfillExercises] = useState(() => createBackfillExercisesFromWorkout(null));
  const [backfillDurationMinutes, setBackfillDurationMinutes] = useState('45');
  const [backfillCalories, setBackfillCalories] = useState('');
  const [backfillExertion, setBackfillExertion] = useState(6);
  const [backfillNotes, setBackfillNotes] = useState('');
  const [backfillError, setBackfillError] = useState('');
  const [isSavingBackfill, setIsSavingBackfill] = useState(false);
  const [focusedBackfillRep, setFocusedBackfillRep] = useState(null);
  const [showReadyMadeOptions, setShowReadyMadeOptions] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [isDailyGoalsModalOpen, setIsDailyGoalsModalOpen] = useState(false);
  const [confirmingSessionId, setConfirmingSessionId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [todayActivity, setTodayActivity] = useState(dailyActivity || null);
  const [appleHealthMetrics, setAppleHealthMetrics] = useState(() => loadTodayHealthMetricsFromStorage(appleHealthMetricsStorageKey));
  const [hydrationGoal, setHydrationGoal] = useState(() => {
    const savedGoal = window.localStorage.getItem(hydrationGoalStorageKey);
    return savedGoal ? Number(savedGoal) : (currentUser?.hydrationGoalLiters || 3.5);
  });
  const [dailyGoals, setDailyGoals] = useState(() => ({
    steps: Number(window.localStorage.getItem(dailyStepGoalStorageKey)) || 10000,
    calories: Number(window.localStorage.getItem(dailyCalorieGoalStorageKey)) || 450,
    trainingMinutes: Number(window.localStorage.getItem(dailyTrainingMinutesGoalStorageKey)) || 45,
  }));
  const [draftDailyGoals, setDraftDailyGoals] = useState(dailyGoals);
  const shouldUseDemoValues = isJonasArnoldAccount(currentUser);
  const displaySessions = shouldUseDemoValues ? DEMO_DASHBOARD_SESSIONS : sessions;
  const displayStats = shouldUseDemoValues
    ? {
      totalSessions: DEMO_DASHBOARD_SESSIONS.length,
      sessionDates: DEMO_DASHBOARD_SESSIONS.map((session) => session.date),
    }
    : stats;
  const displayActivity = shouldUseDemoValues
    ? {
      water_intake_ml: 2400,
      water_goal_ml: Math.round(hydrationGoal * 1000),
      steps: 7840,
      step_goal: dailyGoals.steps || 10000,
    }
    : todayActivity;
  const hasWorkoutData = displayStats.totalSessions > 0;
  const waterIntakeMl = displayActivity?.water_intake_ml || 0;
  const waterGoalMl = displayActivity?.water_goal_ml || Math.round(hydrationGoal * 1000);
  const stepGoal = dailyGoals.steps || displayActivity?.step_goal || 10000;
  const currentHydration = waterIntakeMl / 1000;
  const remainingHydration = Math.max(hydrationGoal - currentHydration, 0);
  const healthSteps = Number(appleHealthMetrics?.steps) || 0;
  const stepsValue = healthSteps || displayActivity?.steps || 0;
  const waterProgress = Math.min(100, Math.round((waterIntakeMl / Math.max(waterGoalMl, 1)) * 100));
  const healthCalories = Number(appleHealthMetrics?.activeEnergyKcal) || Number(displayActivity?.active_energy_kcal) || 0;
  const healthMinutes = Number(appleHealthMetrics?.exerciseMinutes) || Number(displayActivity?.exercise_minutes) || 0;
  const todayDateKey = getSessionDateKey(new Date());
  const dailyMetricSessions = shouldUseDemoValues
    ? displaySessions
    : displaySessions.filter((session) => getSessionDateKey(session.date) === todayDateKey);
  const workoutCalories = dailyMetricSessions.reduce((sum, session) => sum + (Number(session.calories_burned) || 0), 0);
  const stepCalories = Math.round(stepsValue * (Number(currentUser?.weightKg) || 75) * 0.00055);
  const caloriesValue = healthCalories || (workoutCalories + stepCalories);
  const minutesValue = healthMinutes || Math.round(dailyMetricSessions.reduce((sum, session) => sum + (Number(session.duration_seconds) || 0), 0) / 60);
  const stepsProgress = Math.min(100, Math.round((stepsValue / Math.max(stepGoal, 1)) * 100));
  const caloriesProgress = Math.min(100, Math.round((caloriesValue / Math.max(dailyGoals.calories || 1, 1)) * 100));
  const minutesProgress = Math.min(100, Math.round((minutesValue / Math.max(dailyGoals.trainingMinutes || 1, 1)) * 100));
  const dailyGoalCompletion = Math.round((stepsProgress + caloriesProgress + minutesProgress) / 3);
  const dailyGoalStatus = dailyGoalCompletion >= 100
    ? 'GOAL COMPLETE'
    : dailyGoalCompletion >= 60
      ? 'ON TRACK'
      : dailyGoalCompletion >= 25
        ? 'BUILDING MOMENTUM'
        : 'GETTING STARTED';
  const personalInsight = useMemo(() => buildPersonalInsight({
    sessions: displaySessions,
    stats: displayStats,
    stepsValue,
    caloriesValue,
    minutesValue,
    dailyGoalCompletion,
    currentUser,
  }), [
    displaySessions,
    displayStats,
    stepsValue,
    caloriesValue,
    minutesValue,
    dailyGoalCompletion,
    currentUser,
  ]);

  const completedWorkoutDates = new Set((displayStats.sessionDates || []).map(getSessionDateKey));

  const mergeSessionsWithStorage = (backendSessions = [], storedSessions = []) => {
    const mergedSessions = [...backendSessions, ...storedSessions].filter(Boolean);
    const seenKeys = new Set();

    return mergedSessions.filter((session) => {
      const sessionKey = session.client_session_id
        ? `client:${session.client_session_id}`
        : (session.id ? `id:${session.id}` : `date:${getSessionDateKey(session.date)}:${session.plan_name || ''}`);
      if (seenKeys.has(sessionKey)) return false;
      seenKeys.add(sessionKey);
      return true;
    }).sort((left, right) => new Date(right.date) - new Date(left.date));
  };

  const buildStatsFromSessions = (sessionList) => ({
    totalSessions: sessionList.length,
    sessionDates: sessionList.map((session) => session.date),
  });

  const refreshCalendarWorkouts = async () => {
    try {
      const backendPlans = await api.getPlans();
      const backendWorkouts = (Array.isArray(backendPlans) ? backendPlans : [])
        .map(mapBackendPlanToCalendarWorkout);
      setCustomWorkouts(backendWorkouts);
      return backendWorkouts;
    } catch {
      setCustomWorkouts([]);
      return [];
    }
  };

  const refreshSessionData = async () => {
    const storedSessions = loadStoredWorkoutSessions(currentUser);

    try {
      const [nextStats, nextSessions] = await Promise.all([api.getStats(), api.getSessions()]);
      const normalizedSessions = Array.isArray(nextSessions) ? nextSessions : [];
      const mergedSessions = mergeSessionsWithStorage(normalizedSessions, storedSessions);
      saveStoredWorkoutSessions(currentUser, mergedSessions);
      setStats({
        ...nextStats,
        ...buildStatsFromSessions(mergedSessions),
      });
      setSessions(mergedSessions);
      setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, mergedSessions));
      return mergedSessions;
    } catch (error) {
      const fallbackSessions = mergeSessionsWithStorage([], storedSessions);
      saveStoredWorkoutSessions(currentUser, fallbackSessions);
      setStats(buildStatsFromSessions(fallbackSessions));
      setSessions(fallbackSessions);
      setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, fallbackSessions));
      return fallbackSessions;
    }
  };

  useEffect(() => {
    const refreshStats = () => {
      refreshSessionData().catch(console.error);
      refreshCalendarWorkouts().catch(console.error);
      api.getTodayActivity().then(setTodayActivity).catch(console.error);
    };

    refreshStats();
    window.addEventListener('focus', refreshStats);
    return () => window.removeEventListener('focus', refreshStats);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(hydrationGoalStorageKey, hydrationGoal.toString());
    api.updateTodayActivity({ water_goal_ml: Math.round(hydrationGoal * 1000) })
      .then(setTodayActivity)
      .catch(() => null);
  }, [hydrationGoal, hydrationGoalStorageKey]);

  useEffect(() => {
    if (dailyActivity) setTodayActivity(dailyActivity);
  }, [dailyActivity]);

  useEffect(() => {
    const savedMetrics = loadTodayHealthMetricsFromStorage(appleHealthMetricsStorageKey);
    setAppleHealthMetrics(savedMetrics);
    if (savedMetrics) {
      window.localStorage.setItem(appleWatchConnectedStorageKey, 'true');
    }
  }, [appleHealthMetricsStorageKey, appleWatchConnectedStorageKey, currentUser?.id]);

  useEffect(() => {
    const handleDailyActivityChange = (event) => {
      setTodayActivity(event.detail);
    };
    const handleAppleHealthSync = (event) => {
      if (!event.detail) return;
      if (!isHealthMetricsFromToday(event.detail)) return;
      setAppleHealthMetrics(event.detail);
      window.localStorage.setItem(appleWatchConnectedStorageKey, 'true');
    };

    window.addEventListener('daily-activity-change', handleDailyActivityChange);
    window.addEventListener('apple-health-sync', handleAppleHealthSync);
    return () => {
      window.removeEventListener('daily-activity-change', handleDailyActivityChange);
      window.removeEventListener('apple-health-sync', handleAppleHealthSync);
    };
  }, [appleWatchConnectedStorageKey]);

  useEffect(() => {
    if (!isHealthKitRuntime()) return undefined;
    const hasSavedHealthMetrics = Boolean(loadJsonFromStorage(appleHealthMetricsStorageKey, null));
    if (window.localStorage.getItem(appleWatchConnectedStorageKey) !== 'true' && !hasSavedHealthMetrics) return undefined;
    window.localStorage.setItem(appleWatchConnectedStorageKey, 'true');

    const syncConnectedAppleHealth = async () => {
      try {
        const { metrics, activity } = await syncAppleHealthActivity(currentUser);
        setAppleHealthMetrics(metrics);
        if (activity) setTodayActivity(activity);
      } catch (error) {
        console.error('[HealthKit] Dashboard sync failed:', error);
      }
    };

    syncConnectedAppleHealth();
    window.addEventListener('focus', syncConnectedAppleHealth);
    const midnightGuard = window.setInterval(() => {
      if (!isHealthMetricsFromToday(loadJsonFromStorage(appleHealthMetricsStorageKey, null))) {
        setAppleHealthMetrics(null);
        api.getTodayActivity(getTodayHealthDateKey()).then(setTodayActivity).catch(console.error);
        syncConnectedAppleHealth();
      }
    }, 60000);
    return () => {
      window.removeEventListener('focus', syncConnectedAppleHealth);
      window.clearInterval(midnightGuard);
    };
  }, [appleHealthMetricsStorageKey, appleWatchConnectedStorageKey, currentUser?.id]);

  useEffect(() => {
    const handleDailyGoalsChange = (event) => {
      const nextGoals = {
        steps: Number(event.detail?.steps) || Number(window.localStorage.getItem(dailyStepGoalStorageKey)) || 10000,
        calories: Number(event.detail?.calories) || Number(window.localStorage.getItem(dailyCalorieGoalStorageKey)) || 450,
        trainingMinutes: Number(event.detail?.trainingMinutes) || Number(window.localStorage.getItem(dailyTrainingMinutesGoalStorageKey)) || 45,
      };
      setDailyGoals(nextGoals);
      setDraftDailyGoals(nextGoals);
    };

    window.addEventListener('daily-goals-change', handleDailyGoalsChange);
    return () => window.removeEventListener('daily-goals-change', handleDailyGoalsChange);
  }, [dailyStepGoalStorageKey, dailyCalorieGoalStorageKey, dailyTrainingMinutesGoalStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify(workoutSchedule));
  }, [workoutSchedule, workoutScheduleStorageKey]);

  useEffect(() => {
    if (!sessions.length) return;
    setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, sessions));
  }, [sessions]);

  useEffect(() => {
    refreshCalendarWorkouts().catch(console.error);
    setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions({
      ...loadWorkoutScheduleFromStorage(workoutScheduleStorageKey),
      ...currentSchedule,
    }, sessions));
    const savedGoal = window.localStorage.getItem(hydrationGoalStorageKey);
    setHydrationGoal(savedGoal ? Number(savedGoal) : (currentUser?.hydrationGoalLiters || 3.5));
    const nextDailyGoals = {
      steps: Number(window.localStorage.getItem(dailyStepGoalStorageKey)) || 10000,
      calories: Number(window.localStorage.getItem(dailyCalorieGoalStorageKey)) || 450,
      trainingMinutes: Number(window.localStorage.getItem(dailyTrainingMinutesGoalStorageKey)) || 45,
    };
    setDailyGoals(nextDailyGoals);
    setDraftDailyGoals(nextDailyGoals);
  }, [
    workoutScheduleStorageKey,
    hydrationGoalStorageKey,
    dailyStepGoalStorageKey,
    dailyCalorieGoalStorageKey,
    dailyTrainingMinutesGoalStorageKey,
    currentUser?.hydrationGoalLiters,
    sessions,
  ]);

  useEffect(() => {
    const refreshWorkoutPlannerData = async () => {
      const nextSessions = await refreshSessionData().catch(() => sessions);
      await refreshCalendarWorkouts().catch(() => null);
      setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions({
        ...loadWorkoutScheduleFromStorage(workoutScheduleStorageKey),
        ...currentSchedule,
      }, nextSessions || sessions));
    };

    window.addEventListener('focus', refreshWorkoutPlannerData);
    window.addEventListener('storage', refreshWorkoutPlannerData);
    window.addEventListener('workout-session-saved', refreshWorkoutPlannerData);
    window.addEventListener('workout-plans-changed', refreshWorkoutPlannerData);

    return () => {
      window.removeEventListener('focus', refreshWorkoutPlannerData);
      window.removeEventListener('storage', refreshWorkoutPlannerData);
      window.removeEventListener('workout-session-saved', refreshWorkoutPlannerData);
      window.removeEventListener('workout-plans-changed', refreshWorkoutPlannerData);
    };
  }, [workoutScheduleStorageKey, sessions]);

  useEffect(() => {
    if (!isHydrationModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsHydrationModalOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHydrationModalOpen]);

  const changeHydrationGoal = (amount) => {
    setHydrationGoal((goal) => Number(Math.min(7, Math.max(1.5, goal + amount)).toFixed(1)));
  };

  const openDailyGoalsModal = () => {
    setDraftDailyGoals(dailyGoals);
    setIsDailyGoalsModalOpen(true);
  };

  const updateDraftDailyGoal = (field, value) => {
    setDraftDailyGoals((currentGoals) => ({
      ...currentGoals,
      [field]: value,
    }));
  };

  const saveDailyGoals = async () => {
    const nextGoals = {
      steps: Math.max(1000, Math.min(100000, Math.round(Number(draftDailyGoals.steps) || 10000))),
      calories: Math.max(100, Math.min(8000, Math.round(Number(draftDailyGoals.calories) || 450))),
      trainingMinutes: Math.max(5, Math.min(300, Math.round(Number(draftDailyGoals.trainingMinutes) || 45))),
    };

    window.localStorage.setItem(dailyStepGoalStorageKey, String(nextGoals.steps));
    window.localStorage.setItem(dailyCalorieGoalStorageKey, String(nextGoals.calories));
    window.localStorage.setItem(dailyTrainingMinutesGoalStorageKey, String(nextGoals.trainingMinutes));
    setDailyGoals(nextGoals);
    setDraftDailyGoals(nextGoals);
    window.dispatchEvent(new CustomEvent('daily-goals-change', { detail: nextGoals }));
    setIsDailyGoalsModalOpen(false);

    try {
      const activity = await api.updateTodayActivity({ step_goal: nextGoals.steps });
      setTodayActivity(activity);
    } catch {
      // Local goals still apply if the API is temporarily unavailable.
    }
  };

  const openWorkoutPlanner = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSelectedCalendarDate(date);
    setSelectedWorkoutId(workoutSchedule[dateKey]?.workoutId || '');
    setPlannerMode(getSessionDateKey(date) <= getSessionDateKey(new Date()) ? 'backfill' : 'schedule');
    setBackfillWorkoutId(null);
    setBackfillExercises(createBackfillExercisesFromWorkout(null));
    setBackfillDurationMinutes('45');
    setBackfillCalories('');
    setBackfillExertion(6);
    setBackfillNotes('');
    setBackfillError('');
    setIsSavingBackfill(false);
    setFocusedBackfillRep(null);
    setShowReadyMadeOptions(false);
    setShowWorkoutDetails(false);
    setConfirmingSessionId(null);
    setDeletingSessionId(null);
  };

  const closeWorkoutPlanner = () => {
    setSelectedCalendarDate(null);
    setSelectedWorkoutId('');
    setPlannerMode('schedule');
    setBackfillWorkoutId(null);
    setBackfillExercises(createBackfillExercisesFromWorkout(null));
    setBackfillDurationMinutes('45');
    setBackfillCalories('');
    setBackfillNotes('');
    setBackfillError('');
    setIsSavingBackfill(false);
    setFocusedBackfillRep(null);
    setShowReadyMadeOptions(false);
    setShowWorkoutDetails(false);
    setConfirmingSessionId(null);
    setDeletingSessionId(null);
  };

  const saveScheduledWorkout = () => {
    if (!selectedCalendarDate || !selectedWorkoutId) return;

    const selectedWorkout = [...customWorkouts, ...readyMadeCalendarWorkouts].find((workout) => idsMatch(workout.id, selectedWorkoutId));
    if (!selectedWorkout) return;

    const dateKey = format(selectedCalendarDate, 'yyyy-MM-dd');
    setWorkoutSchedule((currentSchedule) => ({
      ...currentSchedule,
      [dateKey]: {
        workoutId: selectedWorkout.id,
        title: selectedWorkout.title,
        image: selectedWorkout.image,
        badge: selectedWorkout.badge,
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

  const selectBackfillWorkout = (workoutId) => {
    const selectedWorkout = customWorkouts.find((workout) => idsMatch(workout.id, workoutId));
    setBackfillWorkoutId(workoutId || 'freestyle');
    setBackfillExercises(createBackfillExercisesFromWorkout(selectedWorkout));
    setBackfillError('');
  };

  const updateBackfillExercise = (index, field, value) => {
    setBackfillExercises((currentExercises) => currentExercises.map((exercise, exerciseIndex) => (
      exerciseIndex === index ? (() => {
        if (field !== 'sets') return { ...exercise, [field]: value };

        const nextSetCount = Math.max(1, Math.min(20, Math.round(Number(value) || 1)));
        const resizeSetValues = (values, fallback) => Array.from(
          { length: nextSetCount },
          (_, setIndex) => values?.[setIndex] ?? fallback
        );

        return {
          ...exercise,
          sets: String(nextSetCount),
          targetRepsBySet: resizeSetValues(exercise.targetRepsBySet, exercise.targetRepsBySet?.[0] || '10'),
          repsBySet: resizeSetValues(exercise.repsBySet, ''),
          weightsBySet: resizeSetValues(exercise.weightsBySet, ''),
          restBySet: resizeSetValues(exercise.restBySet, ''),
        };
      })() : exercise
    )));
  };

  const updateBackfillSet = (exerciseIndex, setIndex, field, value) => {
    setBackfillExercises((currentExercises) => currentExercises.map((exercise, currentExerciseIndex) => {
      if (currentExerciseIndex !== exerciseIndex) return exercise;
      const keyMap = {
        reps: 'repsBySet',
        weight: 'weightsBySet',
        rest: 'restBySet',
      };
      const key = keyMap[field];
      if (!key) return exercise;
      const nextValues = [...(exercise[key] || [])];
      nextValues[setIndex] = value;
      return { ...exercise, [key]: nextValues };
    }));
  };

  const addBackfillExercise = () => {
    setBackfillExercises((currentExercises) => [
      ...currentExercises,
      {
        exercise_name: '',
        sets: '3',
        targetRepsBySet: ['10', '10', '10'],
        repsBySet: ['', '', ''],
        weightsBySet: ['', '', ''],
        restBySet: ['', '', ''],
      },
    ]);
  };

  const removeBackfillExercise = (index) => {
    setBackfillExercises((currentExercises) => (
      currentExercises.length <= 1
        ? currentExercises
        : currentExercises.filter((_, exerciseIndex) => exerciseIndex !== index)
    ));
  };

  const saveBackfilledWorkout = async () => {
    if (!selectedCalendarDate || isSavingBackfill) return;

    const selectedWorkout = customWorkouts
      .find((workout) => idsMatch(workout.id, backfillWorkoutId));
    const validExercises = backfillExercises
      .map((exercise) => ({
        ...exercise,
        exercise_name: String(exercise.exercise_name || '').trim(),
        sets: Math.max(1, Math.min(20, Math.round(Number(exercise.sets) || 1))),
      }))
      .filter((exercise) => exercise.exercise_name);

    if (!validExercises.length) {
      setBackfillError(t('Please add at least one exercise.'));
      return;
    }

    const sessionDate = new Date(selectedCalendarDate);
    sessionDate.setHours(12, 0, 0, 0);

    const logs = validExercises.flatMap((exercise) => Array.from({ length: exercise.sets }, (_, setIndex) => {
      const repsValue = exercise.repsBySet?.[setIndex]
        || exercise.targetRepsBySet?.[setIndex]
        || exercise.targetRepsBySet?.[0]
        || '1';
      const weightValue = exercise.weightsBySet?.[setIndex];
      const restValue = exercise.restBySet?.[setIndex];

      return {
        exercise_name: exercise.exercise_name,
        set_number: setIndex + 1,
        reps: Math.max(1, Math.min(200, Math.round(Number(repsValue) || 1))),
        weight: weightValue === '' || weightValue === null || weightValue === undefined
          ? null
          : Math.max(0, Math.min(1000, Number(weightValue) || 0)),
        rest_seconds: restValue === '' || restValue === null || restValue === undefined
          ? null
          : Math.max(0, Math.min(3600, Math.round(Number(restValue) || 0))),
      };
    }));

    setIsSavingBackfill(true);
    setBackfillError('');
    try {
      const savedSession = await api.logSession({
        date: sessionDate.toISOString(),
        client_session_id: `backfill-${currentUser?.id || 'user'}-${selectedDateKey}-${Date.now()}`,
        plan_id: selectedWorkout?.backendPlanId || null,
        plan_name: selectedWorkout?.title || t('FREESTYLE WORKOUT'),
        duration_seconds: Math.max(0, Math.min(86400, Math.round(Number(backfillDurationMinutes) || 0) * 60)),
        calories_burned: backfillCalories === '' ? null : Math.max(0, Math.min(3000, Math.round(Number(backfillCalories) || 0))),
        intensity: getExertionZone(backfillExertion).intensity,
        perceived_exertion: backfillExertion,
        notes: backfillNotes,
        logs,
      });

      const mergedSessions = mergeSessionsWithStorage([savedSession], loadStoredWorkoutSessions(currentUser));
      saveStoredWorkoutSessions(currentUser, mergedSessions);
      setSessions(mergedSessions);
      setStats(buildStatsFromSessions(mergedSessions));
      setWorkoutSchedule((currentSchedule) => mergeScheduleWithSessions(currentSchedule, mergedSessions));
      window.dispatchEvent(new CustomEvent('workout-session-saved'));
      closeWorkoutPlanner();
    } catch (error) {
      setBackfillError(error.message || t('Could not save workout. Please try again.'));
    } finally {
      setIsSavingBackfill(false);
    }
  };

  const deleteCompletedSession = async (sessionToDelete) => {
    if (!sessionToDelete?.id) return;
    if (shouldUseDemoValues && String(sessionToDelete.id).startsWith('demo-')) return;

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

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);

    const dateFormat = "dd";
    const days = [];

    for (let i = 0; i < 42; i++) {
      const calendarDay = addDays(startDate, i);
      const formattedDate = format(calendarDay, dateFormat);
      const dateKey = format(calendarDay, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(calendarDay, monthStart);
      const isToday = isSameDay(calendarDay, new Date());
      const scheduledWorkout = workoutSchedule[dateKey];
      const isWorkoutCompleted = completedWorkoutDates.has(dateKey);
      
      let className = "cal-day";
      if (!isCurrentMonth) className += " text-muted";
      if (isToday) className += " active";
      if (scheduledWorkout) className += " scheduled";
      if (isWorkoutCompleted && isCurrentMonth) className += " trained";

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
          {scheduledWorkout && <span className="cal-workout-dot" title={scheduledWorkout.title}></span>}
        </button>
      );
    }
    return days;
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    '/slideshow-1.jpg',
    '/slideshow-2.png',
    '/slideshow-3.png',
    '/slideshow-4.png',
    '/slideshow-5.png',
    '/slideshow-6.png',
    '/slideshow-7.png',
    '/slideshow-8.png',
    '/slideshow-9.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { text: t("GOOD MORNING") };
    if (hour >= 11 && hour < 18) return { text: t("HELLO") };
    if (hour >= 18 && hour < 22) return { text: t("GOOD EVENING") };
    return { text: t("HELLO") };
  };

  const greeting = getGreetingData();
  const availableWorkouts = customWorkouts.length > 0
    ? customWorkouts
    : (showReadyMadeOptions ? readyMadeCalendarWorkouts : []);
  const selectedBackfillWorkout = customWorkouts.find((workout) => idsMatch(workout.id, backfillWorkoutId));
  const hasBackfillSource = backfillWorkoutId !== null;
  const selectedDateKey = selectedCalendarDate ? format(selectedCalendarDate, 'yyyy-MM-dd') : '';
  const selectedScheduledWorkout = selectedDateKey ? workoutSchedule[selectedDateKey] : null;
  const isSelectedDateCompleted = selectedDateKey ? completedWorkoutDates.has(selectedDateKey) : false;
  const selectedDateSessions = selectedDateKey
    ? displaySessions.filter((session) => getSessionDateKey(session.date) === selectedDateKey)
    : [];
  const hasWorkoutDetails = selectedDateSessions.length > 0;

  return (
    <div className="dashboard-container">
      
      {/* Hero Banner Slideshow */}
      <div className="hero-banner">
        {slides.map((slide, index) => (
          <div
            key={slide}
            className="hero-slide"
            style={{
              backgroundImage: `url('${slide}')`,
              opacity: index === currentSlide ? 0.4 : 0,
              transition: 'opacity 2.5s ease-in-out'
            }}
          />
        ))}
        <div className="hero-gradient-overlay" />

        <div className="hero-content">
          <h1>{greeting.text}, <span>{firstName.toUpperCase()}</span></h1>
          <p>{t('WELCOME BACK, ATHLETE. YOUR DAILY TARGET IS SYNCHRONIZED.')}</p>
        </div>
        <button className="hero-quick-log-button" type="button" onClick={() => onOpenQuickLog?.('water')}>
          <span className="hero-quick-log-icon">
            <PlusCircle size={20} />
          </span>
          <span className="hero-quick-log-copy">
            <strong>{t('QUICK LOG')}</strong>
            <small>{t('WATER & STEPS')}</small>
          </span>
        </button>
      </div>

      {/* Top Grid: Daily Goal & Widgets */}
      <div className="top-grid">
        {/* Daily Goal */}
        <div className="card daily-goal-card">
          <div className="card-header-flex">
            <h2>{t('DAILY GOAL')}</h2>
            <div className="goal-badges">
              <span className="badge badge-outline">{t(dailyGoalStatus)}</span>
              <span className="badge badge-solid">{t('DAILY BALANCE')}</span>
            </div>
          </div>
          
          <div className="daily-goal-chart">
            <CircularProgress percentage={dailyGoalCompletion} />
          </div>

          <div className="daily-goal-actions">
            <button type="button" onClick={openDailyGoalsModal}>{t('EDIT GOALS')}</button>
          </div>

          <div className="daily-goal-breakdown">
            <div>
              <span>{t('STEPS')}</span>
              <strong>{stepsValue.toLocaleString()} / {stepGoal.toLocaleString()}</strong>
              <small>{stepsProgress}%</small>
            </div>
            <div>
              <span>{t('CALORIES')}</span>
              <strong>{caloriesValue.toLocaleString()} / {dailyGoals.calories.toLocaleString()} kcal</strong>
              <small>{caloriesProgress}%</small>
            </div>
            <div>
              <span>{t('MINUTES')}</span>
              <strong>{minutesValue} / {dailyGoals.trainingMinutes} min</strong>
              <small>{minutesProgress}%</small>
            </div>
          </div>
        </div>

        {/* Right Stack */}
        <div className="top-grid-right-stack">
          {/* Hydration */}
          <button
            className="card hydration-card"
            type="button"
            onClick={() => setIsHydrationModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isHydrationModalOpen}
          >
            <div className="hydration-content">
              <div className="icon-circle solid-green">
                <Droplets size={24} color="#000" />
              </div>
              <div className="hydration-text">
                <h3>{t('STAY HYDRATED')}</h3>
                <p>{t('{amount}L more for peak efficiency.', { amount: remainingHydration.toFixed(1) })}</p>
              </div>
            </div>
            <div className="hydration-goal">
              <Droplets size={16} /> {(currentHydration).toFixed(2)}L / {hydrationGoal.toFixed(1)}L
            </div>
            {/* Background decorative drop */}
            <Droplets className="bg-icon-drop" size={120} />
          </button>

          {/* Calendar */}
          <div className="card calendar-card">
            <div className="calendar-header">
              <h3>{format(currentMonth, "MMMM yyyy", { locale: lang === 'de' ? de : undefined }).toUpperCase()}</h3>
              <div className="calendar-nav">
                <ChevronLeft size={16} onClick={prevMonth} />
                <ChevronRight size={16} onClick={nextMonth} />
              </div>
            </div>
            <div className="calendar-grid">
              <div className="cal-day-name">{t('SUN')}</div>
              <div className="cal-day-name">{t('MON')}</div>
              <div className="cal-day-name">{t('TUE')}</div>
              <div className="cal-day-name">{t('WED')}</div>
              <div className="cal-day-name">{t('THU')}</div>
              <div className="cal-day-name">{t('FRI')}</div>
              <div className="cal-day-name">{t('SAT')}</div>
              
              {renderCalendarDays()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Steps */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={stepsValue} useComma={true} />
            </div>
            <div className="stat-details">
              <span>{t('ACTIVE FLOW')}</span>
              <span className="stat-badge">{stepsProgress}%</span>
            </div>
          </div>
          <div className="stat-title-side">{t('STEPS')}</div>
        </div>

        {/* Calories */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Flame size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={caloriesValue} useComma={true} />
            </div>
            <div className="stat-details">
              <span>{t('BURN RATE')}</span>
              <span className="stat-badge">{hasWorkoutData ? t('OPTIMAL') : t('NEW')}</span>
            </div>
          </div>
          <div className="stat-title-side">{t('CALORIES')}</div>
        </div>

        {/* Minutes */}
        <div className="stat-card horizontal">
          <div className="icon-circle glow-green">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              <AnimatedNumber value={minutesValue} useComma={false} />
            </div>
            <div className="stat-details">
              <span>{t('TIME IN ZONE')}</span>
              <span className="stat-badge">{t('MIN')}</span>
            </div>
          </div>
          <div className="stat-title-side">{t('MINUTES')}</div>
        </div>
      </div>

      {/* Personal Insight Card */}
      <div className="card achievements-card">
        <div className="achievements-content">
          <div className="achievements-text-area">
            <div className="achievements-label">{t(personalInsight.type)}</div>
            <h2>{t(personalInsight.title)}</h2>
            <p className="achievements-desc">
              {t(personalInsight.description)}
            </p>
            
            <div className="lifts-grid">
              {personalInsight.metrics.map((metric, index) => (
                <div className="lift-item" key={`${metric.label}-${metric.value}`}>
                  <span className="lift-name">{t(metric.label)}</span>
                  <span className="lift-weight">{metric.value}</span>
                  <span className={`badge ${index === 0 ? 'badge-solid' : 'badge-outline'}`}>
                    {index === 0 ? t(personalInsight.badge) : t('LIVE')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <AnimatedMedal Icon={personalInsight.Icon} />
        </div>
      </div>

      {isHydrationModalOpen && (
        <div
          className="hydration-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsHydrationModalOpen(false);
          }}
        >
          <MotionDiv
            className="hydration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hydration-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <button className="hydration-modal-close" type="button" onClick={() => setIsHydrationModalOpen(false)} aria-label={t('Close hydration info')}>
              <X size={18} />
            </button>

            <div className="hydration-modal-hero">
              <div className="icon-circle solid-green">
                <Droplets size={26} color="#000" />
              </div>
              <div>
                <span className="hydration-kicker">{t('WATER FUELS PERFORMANCE')}</span>
                <h2 id="hydration-modal-title">{t('STAY HYDRATED')}</h2>
              </div>
            </div>

            <p className="hydration-modal-intro">
              {t('Your body depends on hydration for muscle performance, recovery, focus and efficient energy use. Even slight dehydration can lower your output before you notice it.')}
            </p>

            <div className="hydration-impact-grid">
              <div className="hydration-impact-item">
                <Zap size={20} />
                <h3>{t('MUSCLE PERFORMANCE')}</h3>
                <p>{t('Water supports strength, recovery and clean training output from warm-up to last set.')}</p>
              </div>
              <div className="hydration-impact-item">
                <Flame size={20} />
                <h3>{t('FAT METABOLISM')}</h3>
                <p>{t('Hydration helps your body process nutrients and burn energy more efficiently.')}</p>
              </div>
              <div className="hydration-impact-item">
                <Brain size={20} />
                <h3>{t('FOCUS & ENERGY')}</h3>
                <p>{t('Low hydration can reduce concentration, mood and physical performance.')}</p>
              </div>
            </div>

            <div className="hydration-goal-editor">
              <div className="hydration-goal-editor-head">
                <div>
                  <span className="hydration-kicker">{t('DAILY TARGET')}</span>
                  <h3>{hydrationGoal.toFixed(1)}L</h3>
                </div>
                <div className="hydration-target-badge">
                  <Target size={16} />
                  {t('Recommended: 2.5L - 3.5L')}
                </div>
              </div>

              <div className="hydration-goal-controls">
                <button type="button" onClick={() => changeHydrationGoal(-0.1)} aria-label={t('Decrease hydration goal')}>
                  <Minus size={16} />
                </button>
                <input
                  type="range"
                  min="1.5"
                  max="7"
                  step="0.1"
                  value={hydrationGoal}
                  onChange={(event) => setHydrationGoal(Number(event.target.value))}
                  aria-label={t('Hydration goal in liters')}
                />
                <button type="button" onClick={() => changeHydrationGoal(0.1)} aria-label={t('Increase hydration goal')}>
                  <Plus size={16} />
                </button>
              </div>

              <p>{t('Go higher on intense training days, hot days or long cardio sessions.')}</p>
            </div>
          </MotionDiv>
        </div>
      )}

      {isDailyGoalsModalOpen && (
        <div
          className="daily-goals-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDailyGoalsModalOpen(false);
          }}
        >
          <MotionDiv
            className="daily-goals-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-goals-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <button className="daily-goals-modal-close" type="button" onClick={() => setIsDailyGoalsModalOpen(false)} aria-label={t('Close daily goals')}>
              <X size={18} />
            </button>
            <div className="daily-goals-modal-header">
              <span>{t('DAILY GOALS')}</span>
              <h2 id="daily-goals-modal-title">{t('TUNE YOUR TARGETS')}</h2>
              <p>{t('Your completion circle averages steps, calories and training minutes.')}</p>
            </div>
            <div className="daily-goals-form">
              <label>
                <span><Activity size={15} /> {t('STEPS')}</span>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="500"
                  value={draftDailyGoals.steps}
                  onChange={(event) => updateDraftDailyGoal('steps', event.target.value)}
                />
              </label>
              <label>
                <span><Flame size={15} /> {t('CALORIES')}</span>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  step="50"
                  value={draftDailyGoals.calories}
                  onChange={(event) => updateDraftDailyGoal('calories', event.target.value)}
                />
              </label>
              <label>
                <span><Clock size={15} /> {t('MINUTES')}</span>
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  value={draftDailyGoals.trainingMinutes}
                  onChange={(event) => updateDraftDailyGoal('trainingMinutes', event.target.value)}
                />
              </label>
            </div>
            <button className="daily-goals-save-button" type="button" onClick={saveDailyGoals}>
              {t('SAVE GOALS')}
            </button>
          </MotionDiv>
        </div>
      )}

      {selectedCalendarDate && (
        <div
          className="workout-planner-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWorkoutPlanner();
          }}
        >
          <MotionDiv
            className="workout-planner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-planner-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <button className="workout-planner-close" type="button" onClick={closeWorkoutPlanner} aria-label={t('Close planner')}>
              <X size={18} />
            </button>

            <div className="workout-planner-header">
              <div className="icon-circle solid-green">
                <CalendarDays size={24} color="#000" />
              </div>
              <div>
                <span>{format(selectedCalendarDate, 'EEEE, dd MMMM yyyy', { locale: lang === 'de' ? de : undefined }).toUpperCase()}</span>
                <h2 id="workout-planner-title">{t(plannerMode === 'backfill' ? 'LOG PAST WORKOUT' : 'PLAN WORKOUT')}</h2>
              </div>
            </div>

            <div className="planner-mode-tabs">
              <button
                type="button"
                className={plannerMode === 'schedule' ? 'active' : ''}
                onClick={() => {
                  setPlannerMode('schedule');
                  setBackfillError('');
                }}
              >
                {t('PLAN')}
              </button>
              <button
                type="button"
                className={plannerMode === 'backfill' ? 'active' : ''}
                onClick={() => {
                  setPlannerMode('backfill');
                  setBackfillError('');
                }}
              >
                {t('LOG PAST')}
              </button>
            </div>

            <div className={`scheduled-workout-current ${isSelectedDateCompleted && !selectedScheduledWorkout ? 'completed' : ''}`}>
              {selectedScheduledWorkout ? (
                <div className="scheduled-workout-copy">
                  <span>{t('SCHEDULED WORKOUT')}</span>
                  <strong>{selectedScheduledWorkout.title}</strong>
                </div>
              ) : isSelectedDateCompleted ? (
                <div className="scheduled-workout-copy">
                  <span>{t('WORKOUT DONE')}</span>
                  <strong>{t('Ready for another round?')}</strong>
                </div>
              ) : (
                <div className="scheduled-workout-copy">
                  <span>{t('EMPTY DAY')}</span>
                  <strong>{t('No workout planned yet.')}</strong>
                </div>
              )}

              {isSelectedDateCompleted && hasWorkoutDetails && (
                <button
                  className="planner-details-button"
                  type="button"
                  onClick={() => setShowWorkoutDetails((isOpen) => !isOpen)}
                >
                  {showWorkoutDetails ? t('HIDE DETAILS') : t('VIEW SESSION')}
                </button>
              )}
            </div>

            {showWorkoutDetails && hasWorkoutDetails && (
              <div className="workout-session-details">
                {selectedDateSessions.map((session, sessionIndex) => {
                  const groupedLogs = groupLogsByExercise(session.logs || []);
                  const sessionTime = new Date(session.date).toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div className="workout-session-card" key={session.id || `${session.date}-${sessionIndex}`}>
                      <div className="workout-session-head">
                        <div>
                          <span>{t('SESSION DETAILS')}</span>
                          <strong>{session.plan_name || t('FREESTYLE WORKOUT')}</strong>
                        </div>
                        <small>{sessionTime}</small>
                      </div>

                      {session.perceived_exertion && (
                        <div className="session-exertion-pill">
                          <span>{t('EFFORT')}</span>
                          <strong>{session.perceived_exertion}/10</strong>
                          <small>{t(getExertionZone(session.perceived_exertion).label)}</small>
                        </div>
                      )}

                      {confirmingSessionId === session.id && (
                        <div className="session-delete-confirm">
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
                          <div className="workout-session-exercise" key={exerciseName}>
                            <h3>{exerciseName}</h3>
                            <div className="workout-session-log-grid">
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
                        <p className="session-empty-details">{t('No set details saved for this session.')}</p>
                      )}

                      {session.notes && (
                        <p className="session-notes">
                          <span>{t('SESSION NOTES')}</span>
                          {session.notes}
                        </p>
                      )}

                      <button
                        className="session-trash-button"
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

            {plannerMode === 'schedule' ? (
              <>
                <div className="workout-select-list">
                  {availableWorkouts.length > 0 ? (
                    availableWorkouts.map((workout) => {
                      const WorkoutIcon = workoutIconMap[workout.iconKey] || Dumbbell;

                      return (
                        <button
                          className={`workout-select-card ${idsMatch(selectedWorkoutId, workout.id) ? 'active' : ''}`}
                          type="button"
                          key={workout.id}
                          onClick={() => setSelectedWorkoutId(workout.id)}
                        >
                          <span
                            className="workout-select-cover"
                            style={{ backgroundImage: `url(${workout.image || '/hero-bg.jpg'})` }}
                          >
                            <WorkoutIcon size={18} />
                          </span>
                          <span className="workout-select-info">
                            <strong>{workout.title}</strong>
                            <small>{t(workout.badge)} · {[...workout.exercises, ...(workout.extraExercises || [])].length} {t('exercises')}</small>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="workout-empty-state">
                      <Dumbbell size={22} />
                      <p>{t('Create a workout first, then schedule it here.')}</p>
                      <button
                        className="empty-workout-add-button"
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
                  <button className="ready-made-suggestion" type="button" onClick={() => setShowReadyMadeOptions(true)}>
                    <span>{t("No custom workout yet?")}</span>
                    <strong>{t('Pick a ready-made workout instead.')}</strong>
                  </button>
                )}

                <div className="workout-planner-actions">
                  {selectedScheduledWorkout && (
                    <button className="planner-remove-button" type="button" onClick={removeScheduledWorkout}>
                      <Trash2 size={16} /> {t('REMOVE')}
                    </button>
                  )}
                  <button className="planner-save-button" type="button" onClick={saveScheduledWorkout} disabled={!selectedWorkoutId}>
                    {t('SAVE WORKOUT')}
                  </button>
                </div>
              </>
            ) : (
              <div className="backfill-workout-form">
                <div className="backfill-source-panel">
                  <span>{t('CHOOSE WORKOUT TYPE')}</span>
                  <button
                    className={`backfill-source-card ${backfillWorkoutId === 'freestyle' ? 'active' : ''}`}
                    type="button"
                    onClick={() => selectBackfillWorkout('freestyle')}
                  >
                    <span className="backfill-source-icon"><PlusCircle size={18} /></span>
                    <span>
                      <strong>{t('FREESTYLE WORKOUT')}</strong>
                      <small>{t('Log exercises manually')}</small>
                    </span>
                  </button>

                  {customWorkouts.length > 0 ? (
                    <div className="backfill-saved-workouts">
                      {customWorkouts.map((workout) => {
                        const WorkoutIcon = workoutIconMap[workout.iconKey] || Dumbbell;

                        return (
                          <button
                            className={`backfill-source-card ${idsMatch(backfillWorkoutId, workout.id) ? 'active' : ''}`}
                            type="button"
                            key={workout.id}
                            onClick={() => selectBackfillWorkout(workout.id)}
                          >
                            <span
                              className="backfill-source-cover"
                              style={{ backgroundImage: `url(${workout.image || '/hero-bg.jpg'})` }}
                            >
                              <WorkoutIcon size={16} />
                            </span>
                            <span>
                              <strong>{workout.title}</strong>
                              <small>{[...workout.exercises, ...(workout.extraExercises || [])].length} {t('exercises')}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="backfill-empty-copy">{t('No saved workout yet. Use freestyle instead.')}</p>
                  )}
                </div>

                {hasBackfillSource && (
                  <>
                    <div className="backfill-summary-strip">
                      <span>{t('SELECTED')}</span>
                      <strong>{selectedBackfillWorkout?.title || t('FREESTYLE WORKOUT')}</strong>
                    </div>

                    <div className="backfill-plan-row">
                      <label>
                        <span>{t('DURATION')}</span>
                        <input
                          type="number"
                          min="0"
                          max="1440"
                          value={backfillDurationMinutes}
                          onChange={(event) => setBackfillDurationMinutes(event.target.value)}
                          placeholder="45"
                        />
                      </label>
                      <label>
                        <span>{t('CALORIES')}</span>
                        <input
                          type="number"
                          min="0"
                          max="3000"
                          value={backfillCalories}
                          onChange={(event) => setBackfillCalories(event.target.value)}
                          placeholder="320"
                        />
                      </label>
                    </div>

                    <div className="backfill-exertion-panel">
                      <div>
                        <span>{t('EFFORT LEVEL')}</span>
                        <strong>{backfillExertion}/10 · {t(getExertionZone(backfillExertion).label)}</strong>
                      </div>
                      <div className="backfill-exertion-scale" role="group" aria-label={t('Effort level')}>
                        {exertionOptions.map((value) => (
                          <button
                            type="button"
                            key={value}
                            className={backfillExertion === value ? 'active' : ''}
                            onClick={() => setBackfillExertion(value)}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <small>{t('1-3 light, 4-6 moderate, 7-9 hard, 10 max effort.')}</small>
                    </div>

                    <div className="backfill-exercise-list">
                      {backfillExercises.map((exercise, index) => (
                        <section className="backfill-active-card" key={`${index}-${exercise.exercise_name}`}>
                          <div className="backfill-active-heading">
                            <Dumbbell size={18} />
                            <label className="backfill-exercise-title">
                              <span>{t('EXERCISE')}</span>
                              <input
                                type="text"
                                value={exercise.exercise_name}
                                onChange={(event) => updateBackfillExercise(index, 'exercise_name', event.target.value)}
                                placeholder={t('Exercise name')}
                              />
                            </label>
                            <button
                              className="backfill-row-remove"
                              type="button"
                              onClick={() => removeBackfillExercise(index)}
                              aria-label={t('REMOVE')}
                              disabled={backfillExercises.length <= 1}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="backfill-set-log-table">
                            <div className="backfill-set-log-head">
                              <span>{t('SET')}</span>
                              <span>{t('REPS')}</span>
                              <span>{t('WEIGHT')}</span>
                              <span>{t('REST')}</span>
                            </div>
                            {Array.from({ length: Math.max(1, Math.min(20, Math.round(Number(exercise.sets) || 1))) }, (_, setIndex) => (
                              <div
                                className="backfill-set-log-row"
                                key={`${exercise.exercise_name}-${setIndex}`}
                              >
                                <strong>{setIndex + 1}</strong>
                                <label>
                                  <span>{t('REPS')}</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={exercise.repsBySet?.[setIndex] ?? ''}
                                    placeholder={
                                      focusedBackfillRep === `${index}-${setIndex}`
                                        ? ''
                                        : `(${exercise.targetRepsBySet?.[setIndex] || exercise.targetRepsBySet?.[0] || 10})`
                                    }
                                    onFocus={() => setFocusedBackfillRep(`${index}-${setIndex}`)}
                                    onBlur={() => setFocusedBackfillRep(null)}
                                    onChange={(event) => updateBackfillSet(index, setIndex, 'reps', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span>KG</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.5"
                                    value={exercise.weightsBySet?.[setIndex] ?? ''}
                                    onChange={(event) => updateBackfillSet(index, setIndex, 'weight', event.target.value)}
                                  />
                                </label>
                                <label>
                                  <span>{t('SEC')}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="3600"
                                    value={exercise.restBySet?.[setIndex] ?? ''}
                                    onChange={(event) => updateBackfillSet(index, setIndex, 'rest', event.target.value)}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <button className="backfill-add-exercise" type="button" onClick={addBackfillExercise}>
                      <PlusCircle size={16} /> {t('ADD EXERCISE')}
                    </button>

                    <label className="backfill-notes">
                      <span>{t('SESSION NOTES')}</span>
                      <textarea
                        value={backfillNotes}
                        onChange={(event) => setBackfillNotes(event.target.value)}
                        placeholder={t('Optional notes')}
                      />
                    </label>

                    {backfillError && <div className="backfill-error">{backfillError}</div>}

                    <div className="workout-planner-actions">
                      <button className="planner-save-button" type="button" onClick={saveBackfilledWorkout} disabled={isSavingBackfill}>
                        {isSavingBackfill ? t('SAVING') : t('SAVE PAST WORKOUT')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </MotionDiv>
        </div>
      )}

    </div>
  );
}
