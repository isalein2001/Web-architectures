import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Check, Dumbbell, Flame, Pause, Plus, Save, Timer, X } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageKey } from '../userStorage';
import './WorkoutLogger.css';

const CUSTOM_WORKOUT_PLANS_STORAGE_KEY = 'customWorkoutPlans';
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
    image: '/achievements-bg.png',
    exercises: ['Bench Press (3x12)', 'Lat Pulldown (3x12)', 'Lateral Raise (4x12)', 'Leg Press (4x10)', 'Seated Row (3x12)', 'Hamstring Curl (3x15)', 'Plank Hold (3x45s)'],
  },
];

const iconMap = {
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
};

const loadJson = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
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
    planId: typeof plan.id === 'number' ? plan.id : null,
    title: plan.title || plan.name || 'WORKOUT',
    badge: plan.badge || (source === 'backend' ? 'SAVED PLAN' : 'WORKOUT PLAN'),
    image: plan.image || '/hero-bg.png',
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

export default function WorkoutLogger({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const customPlansStorageKey = getUserStorageKey(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, currentUser);
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

  const startWorkout = useCallback((plan) => {
    const nextPlan = plan || {
      id: null,
      planId: null,
      title: t('FREESTYLE WORKOUT'),
      badge: t('ON THE FLY'),
      image: '/hero-bg.png',
      iconKey: 'activity',
      exercises: [],
    };

    setActivePlan(nextPlan);
    setLogs(createLogsFromPlan(nextPlan));
    setNotes('');
    setCountdown(3);
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
    setSaveState('idle');
    setPhase('select');
  };

  const finishWorkout = async () => {
    if (!activePlan) return;

    const sessionData = {
      date: new Date().toISOString(),
      plan_id: activePlan.planId,
      notes,
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
          <button className="finish-workout-button" type="button" onClick={finishWorkout} disabled={saveState === 'saving'}>
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
