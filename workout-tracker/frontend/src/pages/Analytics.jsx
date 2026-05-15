import React, { useState, useEffect, useRef } from 'react';
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
  Bike,
  Flower2,
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
import './Analytics.css';

const MotionG = motion.g;
const MotionPath = motion.path;
const MotionCircle = motion.circle;
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CUSTOM_WORKOUT_PLANS_STORAGE_KEY = 'customWorkoutPlans';
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
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
    image: '/achievements-bg.png',
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
const chartSeries = {
  '1W': {
    change: 3.8,
    compareLabel: 'vs last week',
    labels: ['APR 09', 'APR 12', 'APR 15'],
    values: [0.18, 0.21, 0.19, 0.27, 0.43, 0.61, 0.74],
  },
  '1M': {
    change: 14.2,
    compareLabel: 'vs last month',
    labels: ['MAR 15', 'APR 01', 'APR 15'],
    values: [0.10, 0.14, 0.16, 0.15, 0.23, 0.42, 0.66, 0.74, 0.72, 0.77, 0.89, 0.96],
  },
  '1Y': {
    change: 28.6,
    compareLabel: 'vs last year',
    labels: ['JAN', 'JUN', 'DEC'],
    values: [0.08, 0.11, 0.16, 0.24, 0.31, 0.45, 0.51, 0.58, 0.70, 0.79, 0.88, 0.98],
  },
};

const loadJsonFromStorage = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
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

function MilestoneCard() {
  const { t } = useLanguage();
  const [fireworks, setFireworks] = useState([]);
  const fireworksTimer = useRef(null);

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
      <h3>{t('BENCH PRESS +5KG')}</h3>
      <p>{t('Unlocked 2h ago')}</p>
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

export default function Analytics() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeRange, setActiveRange] = useState('1M');
  const [customWorkouts, setCustomWorkouts] = useState(() => loadJsonFromStorage(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, []));
  const [workoutSchedule, setWorkoutSchedule] = useState(() => loadJsonFromStorage(WORKOUT_SCHEDULE_STORAGE_KEY, {}));
  const [stats, setStats] = useState({ totalSessions: 0, sessionDates: [] });
  const [sessions, setSessions] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [showReadyMadeOptions, setShowReadyMadeOptions] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [confirmingSessionId, setConfirmingSessionId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: false, amount: 0.4 });
  const activeChart = chartSeries[activeRange];
  const chartPoints = getChartPoints(activeChart.values);
  const chartLinePath = buildSmoothLinePath(chartPoints);
  const chartAreaPath = `${chartLinePath} L${chartPoints[chartPoints.length - 1].x},${CHART_HEIGHT} L${chartPoints[0].x},${CHART_HEIGHT} Z`;
  const endPoint = chartPoints[chartPoints.length - 1];

  const refreshSessionData = async () => {
    const [nextStats, nextSessions] = await Promise.all([api.getStats(), api.getSessions()]);
    setStats(nextStats);
    setSessions(Array.isArray(nextSessions) ? nextSessions : []);
  };

  useEffect(() => {
    window.localStorage.setItem(WORKOUT_SCHEDULE_STORAGE_KEY, JSON.stringify(workoutSchedule));
  }, [workoutSchedule]);

  useEffect(() => {
    const refreshWorkoutPlannerData = () => {
      setCustomWorkouts(loadJsonFromStorage(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, []));
      setWorkoutSchedule(loadJsonFromStorage(WORKOUT_SCHEDULE_STORAGE_KEY, {}));
      refreshSessionData().catch(console.error);
    };

    refreshWorkoutPlannerData();
    window.addEventListener('focus', refreshWorkoutPlannerData);
    window.addEventListener('storage', refreshWorkoutPlannerData);

    return () => {
      window.removeEventListener('focus', refreshWorkoutPlannerData);
      window.removeEventListener('storage', refreshWorkoutPlannerData);
    };
  }, []);

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
  const completedWorkoutDates = new Set((stats.sessionDates || []).map(getSessionDateKey));
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
    ? sessions.filter((session) => getSessionDateKey(session.date) === selectedDateKey)
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
              <AnimatedNumber value={activeChart.change} decimals={1} prefix="+ " suffix=" %" className="chart-card-title-h2" as="h2" />
              <p>{t(activeChart.compareLabel)}</p>
            </div>
            <div className="chart-filters">
              {Object.keys(chartSeries).map((range) => (
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
              {activeChart.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <Dumbbell size={20} />
              </div>
            </div>
            <div className="metric-card-value">
              315 <span>{t('LBS')}</span>
            </div>
            <div className="metric-card-meta">{t('CURRENT PB')}</div>
            <div className="metric-card-title-side">{t('BENCH PRESS')}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <Dumbbell size={20} />
              </div>
            </div>
            <div className="metric-card-value">
              485 <span>{t('LBS')}</span>
            </div>
            <div className="metric-card-meta">{t('CURRENT PB')}</div>
            <div className="metric-card-title-side">{t('DEADLIFT')}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-top">
              <div className="metric-card-icon">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="metric-card-value">
              405 <span>{t('LBS')}</span>
            </div>
            <div className="metric-card-meta">{t('CURRENT PB')}</div>
            <div className="metric-card-title-side">{t('SQUADS')}</div>
          </div>

          <MilestoneCard />
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
              <h3>94<span>%</span></h3>
            </div>
            <Award size={24} />
          </div>
          <p>{t('Your progress toward a perfect training week')}</p>
        </div>
      </div>

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
                        style={{ backgroundImage: `url(${workout.image || '/hero-bg.png'})` }}
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
