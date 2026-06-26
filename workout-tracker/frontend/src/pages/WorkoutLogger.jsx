import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Check, Dumbbell, Flame, Pause, Plus, Save, Timer, X } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageKey } from '../userStorage';
import './WorkoutLogger.css';

const CUSTOM_WORKOUT_PLANS_STORAGE_KEY = 'customWorkoutPlans';
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
const SELECTED_WORKOUT_STORAGE_KEY = 'selectedWorkoutToStart';

const readyWorkoutPlans = [
  {
    id: 'ready-push-pull-legs',
    title: 'PUSH PULL LEGS',
    badge: 'ADVANCED PLAN',
    iconKey: 'dumbbell',
    image: '/slideshow-8.png',
    exercises: ['Chest Press (3x12)', 'Incline Bench Press (3x12)', 'Shoulder Press (2x15)', 'Lat Pulldown (3x12)', 'Romanian Deadlift (3x10)', 'Cable Row (4x12)'],
  },
  {
    id: 'ready-fat-loss',
    title: 'FAT LOSS',
    badge: 'BEGINNER PLAN',
    iconKey: 'flame',
    image: '/slideshow-3.png',
    exercises: ['HIIT Intervals (15m)', 'Bodyweight Squats (4x20)', 'Mountain Climbers (4x30s)'],
  },
  {
    id: 'ready-full-body-workout',
    title: 'FULL BODY WORKOUT',
    badge: 'BEGINNER PLAN',
    iconKey: 'activity',
    image: '/achievements-bg.jpg',
    exercises: ['Bench Press (3x12)', 'Lat Pulldown (3x12)', 'Lateral Raise (4x12)', 'Leg Press (4x10)', 'Seated Row (3x12)', 'Hamstring Curl (3x15)', 'Plank Hold (3x45s)'],
  },
];

const iconMap = {
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
};

const intensityOptions = [
  {
    id: 'light',
    label: 'LIGHT',
    description: 'Technique, mobility or easy pace',
    met: 3.2,
  },
  {
    id: 'moderate',
    label: 'MODERATE',
    description: 'Solid training with steady effort',
    met: 4.8,
  },
  {
    id: 'intense',
    label: 'INTENSE',
    description: 'Heavy sets and short breaks',
    met: 6.2,
  },
  {
    id: 'hiit',
    label: 'HIIT',
    description: 'High output, circuits or intervals',
    met: 8,
  },
];

const compoundKeywords = [
  'bench',
  'press',
  'squat',
  'deadlift',
  'row',
  'pull',
  'lunge',
  'clean',
  'snatch',
  'thruster',
  'leg press',
];

const loadJson = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
};

const getLocalDateKey = (date) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return String(date).slice(0, 10);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseExerciseSummary = (summary) => {
  const match = summary.match(/^(.*?)\s*\((\d+)x([^)]*)\)$/);
  if (!match) {
    return {
      name: summary,
      sets: 1,
      repsBySet: [''],
      rest: '',
    };
  }

  const [, name, sets, reps] = match;
  const setCount = Number.parseInt(sets, 10) || 1;
  const repsBySet = reps.includes('/')
    ? reps.split('/').map((rep) => rep.trim())
    : Array.from({ length: setCount }, () => reps.trim());

  return {
    name: name.trim(),
    sets: setCount,
    repsBySet,
    rest: '',
  };
};

const normalizePlan = (plan, source = 'custom') => {
  if (!plan) return null;

  const rawExercises = plan.builderExercises?.length
    ? plan.builderExercises.map((exercise) => ({
      name: exercise.name,
      sets: Number.parseInt(exercise.sets, 10) || 1,
      repsBySet: Array.isArray(exercise.setReps) && exercise.setReps.length
        ? exercise.setReps
        : Array.from({ length: Number.parseInt(exercise.sets, 10) || 1 }, () => exercise.reps || ''),
      rest: exercise.rest || '',
    }))
    : [...(plan.exercises || []), ...(plan.extraExercises || [])].map(parseExerciseSummary);

  return {
    id: plan.id,
    planId: typeof plan.backendPlanId === 'number'
      ? plan.backendPlanId
      : (typeof plan.id === 'number' ? plan.id : null),
    title: plan.title || plan.name || 'WORKOUT',
    badge: plan.badge || (source === 'backend' ? 'SAVED PLAN' : 'WORKOUT PLAN'),
    image: plan.image || '/hero-bg.jpg',
    iconKey: plan.iconKey || 'dumbbell',
    source,
    exercises: rawExercises.filter((exercise) => exercise.name),
  };
};

const createLogsFromPlan = (plan) => plan.exercises.flatMap((exercise) =>
  Array.from({ length: exercise.sets || 1 }, (_, index) => ({
    id: `${exercise.name}-${index}-${Date.now()}-${Math.random()}`,
    exercise_name: exercise.name,
    set_number: index + 1,
    target_reps: exercise.repsBySet[index] || exercise.repsBySet[0] || '',
    reps: '',
    weight: '',
    rest_seconds: exercise.rest || '',
    completed: false,
  }))
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    return `${hours}h ${restMinutes}m`;
  }
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
};

const calculateCalories = ({ logs, bodyWeightKg, durationSeconds, intensity }) => {
  const selectedIntensity = intensityOptions.find((option) => option.id === intensity) || intensityOptions[1];
  const safeWeight = clamp(Number(bodyWeightKg) || 75, 35, 180);
  const safeDurationSeconds = clamp(Number(durationSeconds) || 900, 60, 86400);
  const trainingHours = safeDurationSeconds / 3600;
  const baseCalories = selectedIntensity.met * safeWeight * trainingHours;

  const activeLogs = logs.filter((log) => log.completed || log.reps || log.weight);
  const totalReps = activeLogs.reduce((sum, log) => sum + (Number(log.reps) || 0), 0);
  const totalVolume = activeLogs.reduce((sum, log) => {
    const reps = Number(log.reps) || 0;
    const weight = Number(log.weight) || 0;
    return sum + reps * weight;
  }, 0);
  const compoundSets = activeLogs.filter((log) => {
    const name = log.exercise_name.toLowerCase();
    return compoundKeywords.some((keyword) => name.includes(keyword));
  }).length;

  const setFactor = clamp(1 + (activeLogs.length - 8) * 0.012, 0.88, 1.22);
  const repFactor = clamp(1 + totalReps / 900, 0.95, 1.18);
  const volumeFactor = clamp(1 + totalVolume / 80000, 0.95, 1.2);
  const compoundFactor = clamp(1 + compoundSets * 0.012, 1, 1.12);

  return Math.max(1, Math.round(baseCalories * setFactor * repFactor * volumeFactor * compoundFactor));
};

export default function WorkoutLogger({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const customPlansStorageKey = getUserStorageKey(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, currentUser);
  const workoutScheduleStorageKey = getUserStorageKey(WORKOUT_SCHEDULE_STORAGE_KEY, currentUser);
  const initialSelectedPlan = useMemo(() => {
    const selectedPlan = location.state?.plan || loadJson(SELECTED_WORKOUT_STORAGE_KEY, null);
    return selectedPlan ? normalizePlan(selectedPlan, selectedPlan.source || 'custom') : null;
  }, [location.state]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [activePlan, setActivePlan] = useState(initialSelectedPlan);
  const [logs, setLogs] = useState(() => (initialSelectedPlan ? createLogsFromPlan(initialSelectedPlan) : []));
  const [phase, setPhase] = useState(() => (initialSelectedPlan ? 'countdown' : 'select'));
  const [countdown, setCountdown] = useState(3);
  const [currentExercise, setCurrentExercise] = useState('');
  const [notes, setNotes] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [sessionStartedAt, setSessionStartedAt] = useState(() => (initialSelectedPlan ? Date.now() : null));
  const [intensity, setIntensity] = useState('moderate');
  const [energyMode, setEnergyMode] = useState('estimate');
  const [manualCalories, setManualCalories] = useState('');
  const [durationOverrideMinutes, setDurationOverrideMinutes] = useState('');

  const startWorkout = useCallback((plan) => {
    const nextPlan = plan || {
      id: null,
      planId: null,
      title: t('FREESTYLE WORKOUT'),
      badge: t('ON THE FLY'),
      image: '/hero-bg.jpg',
      iconKey: 'activity',
      exercises: [],
    };

    setActivePlan(nextPlan);
    setLogs(createLogsFromPlan(nextPlan));
    setNotes('');
    setCountdown(3);
    setSessionStartedAt(Date.now());
    setIntensity('moderate');
    setEnergyMode('estimate');
    setManualCalories('');
    setDurationOverrideMinutes('');
    setPhase('countdown');
    setSaveState('idle');
  }, [t]);

  useEffect(() => {
    const customPlans = loadJson(customPlansStorageKey, []).map((plan) => normalizePlan(plan, 'custom'));

    api.getPlans()
      .then((backendPlans) => {
        const normalizedBackendPlans = backendPlans.map((plan) => normalizePlan({
          ...plan,
          title: plan.name,
          exercises: plan.exercises?.map((exercise) => `${exercise.exercise_name} (${exercise.target_sets || 1}x${exercise.target_reps || ''})`) || [],
        }, 'backend'));

        setAvailablePlans([
          ...customPlans,
          ...normalizedBackendPlans,
          ...readyWorkoutPlans.map((plan) => normalizePlan(plan, 'ready')),
        ].filter(Boolean));
      })
      .catch(() => {
        setAvailablePlans([
          ...customPlans,
          ...readyWorkoutPlans.map((plan) => normalizePlan(plan, 'ready')),
        ].filter(Boolean));
      });
  }, [customPlansStorageKey]);

  useEffect(() => {
    window.sessionStorage.removeItem(SELECTED_WORKOUT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    if (countdown === 0) {
      const startTimer = window.setTimeout(() => setPhase('active'), 650);
      return () => window.clearTimeout(startTimer);
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 900);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  const groupedLogs = useMemo(() => {
    const groups = [];
    logs.forEach((log) => {
      const currentGroup = groups.find((group) => group.name === log.exercise_name);
      if (currentGroup) {
        currentGroup.logs.push(log);
      } else {
        groups.push({ name: log.exercise_name, logs: [log] });
      }
    });
    return groups;
  }, [logs]);

  const completedCount = logs.filter((log) => log.completed).length;
  const activeLogCount = logs.filter((log) => log.completed || log.reps || log.weight).length;
  const fallbackDurationSeconds = sessionStartedAt ? Math.max(60, Math.round((Date.now() - sessionStartedAt) / 1000)) : 900;
  const durationSeconds = durationOverrideMinutes
    ? clamp(Math.round(Number(durationOverrideMinutes) * 60), 60, 86400)
    : fallbackDurationSeconds;
  const userWeightKg = currentUser?.weightKg || currentUser?.weight_kg || 75;
  const estimatedCalories = calculateCalories({
    logs,
    bodyWeightKg: userWeightKg,
    durationSeconds,
    intensity,
  });
  const caloriesToSave = energyMode === 'manual'
    ? (Number(manualCalories) || estimatedCalories)
    : estimatedCalories;

  const updateLog = (id, field, value) => {
    setLogs((currentLogs) =>
      currentLogs.map((log) => (log.id === id ? { ...log, [field]: value } : log))
    );
  };

  const toggleComplete = (id) => {
    setLogs((currentLogs) =>
      currentLogs.map((log) => (log.id === id ? { ...log, completed: !log.completed } : log))
    );
  };

  const addFreestyleSet = () => {
    if (!currentExercise.trim()) return;

    setLogs((currentLogs) => {
      const existingSets = currentLogs.filter((log) => log.exercise_name === currentExercise.trim()).length;
      return [
        ...currentLogs,
        {
          id: `freestyle-${Date.now()}-${Math.random()}`,
          exercise_name: currentExercise.trim(),
          set_number: existingSets + 1,
          target_reps: '',
          reps: '',
          weight: '',
          rest_seconds: '',
          completed: false,
        },
      ];
    });
  };

  const cancelWorkout = () => {
    setActivePlan(null);
    setLogs([]);
    setNotes('');
    setCurrentExercise('');
    setCountdown(3);
    setSessionStartedAt(null);
    setIntensity('moderate');
    setEnergyMode('estimate');
    setManualCalories('');
    setDurationOverrideMinutes('');
    setSaveState('idle');
    setPhase('select');
  };

  const openWorkoutSummary = () => {
    setManualCalories(String(estimatedCalories));
    setSaveState('idle');
    setPhase('summary');
  };

  const saveWorkoutSession = async () => {
    if (!activePlan) return;
    const sessionDate = new Date().toISOString();

    const sessionData = {
      date: sessionDate,
      plan_id: activePlan.planId,
      notes,
      calories_burned: caloriesToSave,
      duration_seconds: durationSeconds,
      intensity,
      logs: logs
        .filter((log) => log.completed || log.reps || log.weight)
        .map((log) => ({
          exercise_name: log.exercise_name,
          set_number: log.set_number,
          reps: Number(log.reps) || 0,
          weight: Number(log.weight) || 0,
          rest_seconds: Number(log.rest_seconds) || 0,
        })),
    };

    setSaveState('saving');
    try {
      await api.logSession(sessionData);
      const dateKey = getLocalDateKey(sessionDate);
      const currentSchedule = loadJson(workoutScheduleStorageKey, {});
      window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify({
        ...currentSchedule,
        [dateKey]: {
          workoutId: activePlan.id,
          title: activePlan.title,
          image: activePlan.image,
          badge: activePlan.badge,
          iconKey: activePlan.iconKey,
          exercises: activePlan.exercises.map((exercise) => `${exercise.name} (${exercise.sets}x${exercise.repsBySet.join('/')})`),
        },
      }));
      setSaveState('saved');
      window.setTimeout(() => navigate('/analytics'), 700);
    } catch (error) {
      console.error(error);
      setSaveState('error');
    }
  };

  if (phase === 'countdown') {
    return (
      <div className="workout-countdown-screen">
        <div className="workout-countdown-pulse">
          <span>{countdown || t('GO')}</span>
        </div>
        <h1>{activePlan?.title}</h1>
        <p>{t('GET READY TO TRAIN')}</p>
        <button className="countdown-cancel-button" type="button" onClick={cancelWorkout}>
          <X size={16} /> {t('CANCEL SESSION')}
        </button>
      </div>
    );
  }

  if (phase === 'select') {
    return (
      <div className="workout-start-page">
        <header className="workout-start-hero">
          <span>{t('START WORKOUT')}</span>
          <h1>{t('CHOOSE YOUR SESSION')}</h1>
          <p>{t('Pick a plan or start freestyle. The workout tracker will count you in and save your session.')}</p>
        </header>

        <div className="workout-start-grid">
          <button className="workout-start-card freestyle" type="button" onClick={() => startWorkout(null)}>
            <span className="workout-start-icon"><Activity size={24} /></span>
            <strong>{t('FREESTYLE WORKOUT')}</strong>
            <small>{t('Track any exercise on the fly.')}</small>
          </button>

          {availablePlans.map((plan) => {
            const PlanIcon = iconMap[plan.iconKey] || Dumbbell;

            return (
              <button className="workout-start-card" type="button" key={`${plan.source}-${plan.id}`} onClick={() => startWorkout(plan)}>
                <span className="workout-start-cover" style={{ backgroundImage: `url(${plan.image})` }}>
                  <PlanIcon size={22} />
                </span>
                <span className="workout-start-info">
                  <small>{t(plan.badge)}</small>
                  <strong>{t(plan.title)}</strong>
                  <em>{plan.exercises.length} {t('exercises')}</em>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="workout-summary-page">
        <section className="workout-summary-card">
          <div className="workout-summary-heading">
            <span><Flame size={16} /> {t('WORKOUT SUMMARY')}</span>
            <h1>{t('LOG YOUR ENERGY')}</h1>
            <p>{t('We estimated your calories from duration, body weight, intensity and your logged sets. Adjust it if your watch or machine shows a better value.')}</p>
          </div>

          <div className="workout-summary-stats">
            <div>
              <small>{t('SESSION')}</small>
              <strong>{activePlan?.title}</strong>
            </div>
            <div>
              <small>{t('DURATION')}</small>
              <strong>{formatDuration(durationSeconds)}</strong>
            </div>
            <div>
              <small>{t('SETS LOGGED')}</small>
              <strong>{activeLogCount}</strong>
            </div>
          </div>

          <label className="summary-duration-field">
            <span><Timer size={15} /> {t('ADJUST DURATION')}</span>
            <div>
              <input
                type="number"
                min="1"
                max="1440"
                value={durationOverrideMinutes}
                onChange={(event) => setDurationOverrideMinutes(event.target.value)}
                placeholder={String(Math.max(1, Math.round(fallbackDurationSeconds / 60)))}
              />
              <small>{t('MIN')}</small>
            </div>
          </label>

          <div className="summary-section-label">{t('TRAINING INTENSITY')}</div>
          <div className="summary-intensity-grid">
            {intensityOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`summary-intensity-button ${intensity === option.id ? 'active' : ''}`}
                onClick={() => setIntensity(option.id)}
              >
                <strong>{t(option.label)}</strong>
                <span>{t(option.description)}</span>
              </button>
            ))}
          </div>

          <div className="summary-calories-panel">
            <div>
              <small>{t('ESTIMATED BURN')}</small>
              <strong>{estimatedCalories} kcal</strong>
              <span>{t('Use the estimate or enter your own value.')}</span>
            </div>
            <div className="summary-energy-toggle">
              <button type="button" className={energyMode === 'estimate' ? 'active' : ''} onClick={() => setEnergyMode('estimate')}>
                {t('ESTIMATE')}
              </button>
              <button type="button" className={energyMode === 'manual' ? 'active' : ''} onClick={() => setEnergyMode('manual')}>
                {t('MANUAL')}
              </button>
            </div>
          </div>

          {energyMode === 'manual' && (
            <label className="summary-kcal-field">
              <span>{t('CALORIES BURNED')}</span>
              <div>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={manualCalories}
                  onChange={(event) => setManualCalories(event.target.value)}
                />
                <small>KCAL</small>
              </div>
            </label>
          )}

          {saveState === 'error' && (
            <div className="workout-save-error">
              <X size={16} /> {t('Could not save workout. Please try again.')}
            </div>
          )}

          <div className="summary-actions">
            <button className="cancel-workout-button" type="button" onClick={() => setPhase('active')} disabled={saveState === 'saving'}>
              {t('BACK TO WORKOUT')}
            </button>
            <button className="finish-workout-button" type="button" onClick={saveWorkoutSession} disabled={saveState === 'saving'}>
              <Save size={17} /> {saveState === 'saving' ? t('SAVING') : t('SAVE WORKOUT')}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="active-workout-page">
      <header className="active-workout-header">
        <div>
          <span>{t('SESSION IN PROGRESS')}</span>
          <h1>{activePlan?.title}</h1>
          <p>{completedCount}/{logs.length || 1} {t('SETS COMPLETED')}</p>
        </div>
        <div className="active-workout-actions">
          <button className="cancel-workout-button" type="button" onClick={cancelWorkout} disabled={saveState === 'saving'}>
            <X size={17} /> {t('CANCEL SESSION')}
          </button>
          <button className="finish-workout-button" type="button" onClick={openWorkoutSummary} disabled={saveState === 'saving'}>
            <Save size={17} /> {saveState === 'saving' ? t('SAVING') : t('FINISH WORKOUT')}
          </button>
        </div>
      </header>

      <div className="active-workout-progress">
        <span style={{ width: `${Math.min(100, (completedCount / Math.max(logs.length, 1)) * 100)}%` }}></span>
      </div>

      <div className="active-workout-list">
        {groupedLogs.map((group) => (
          <section className="active-exercise-card" key={group.name}>
            <div className="active-exercise-heading">
              <Dumbbell size={19} />
              <h2>{group.name}</h2>
            </div>

            <div className="set-log-table">
              <div className="set-log-head">
                <span>{t('SET')}</span>
                <span>{t('REPS')}</span>
                <span>{t('WEIGHT')}</span>
                <span>{t('REST')}</span>
                <span>{t('DONE')}</span>
              </div>
              {group.logs.map((log) => (
                <div className={`set-log-row ${log.completed ? 'completed' : ''}`} key={log.id}>
                  <strong>{log.set_number}</strong>
                  <label>
                    <span>{log.target_reps ? `${t('TARGET')}: ${log.target_reps}` : t('REPS')}</span>
                    <input type="number" value={log.reps} onChange={(event) => updateLog(log.id, 'reps', event.target.value)} />
                  </label>
                  <label>
                    <span>KG</span>
                    <input type="number" value={log.weight} onChange={(event) => updateLog(log.id, 'weight', event.target.value)} />
                  </label>
                  <label>
                    <span>{t('SEC')}</span>
                    <input type="number" value={log.rest_seconds} onChange={(event) => updateLog(log.id, 'rest_seconds', event.target.value)} />
                  </label>
                  <button type="button" className={log.completed ? 'done' : ''} onClick={() => toggleComplete(log.id)} aria-label={t('DONE')}>
                    <Check size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="freestyle-add-card">
        <div>
          <span><Plus size={16} /> {t('ADD EXERCISE')}</span>
          <h2>{t('FREESTYLE SET')}</h2>
        </div>
        <div className="freestyle-add-row">
          <input value={currentExercise} onChange={(event) => setCurrentExercise(event.target.value)} placeholder={t('Exercise Name...')} />
          <button type="button" onClick={addFreestyleSet}><Plus size={17} /> {t('ADD SET')}</button>
        </div>
      </section>

      <section className="workout-notes-card">
        <h2><Pause size={17} /> {t('SESSION NOTES')}</h2>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('How did this workout feel?')}></textarea>
      </section>

      {saveState === 'error' && (
        <div className="workout-save-error">
          <X size={16} /> {t('Could not save workout. Please try again.')}
        </div>
      )}
    </div>
  );
}
