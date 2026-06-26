import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bike,
  Camera,
  Dumbbell,
  Flame,
  Flower2,
  GripVertical,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageKey } from '../userStorage';
import { API_URL, api } from '../api';
import './Workouts.css';

const readyPlans = [
  {
    title: 'PUSH PULL LEGS',
    badge: 'ADVANCED PLAN',
    image: '/slideshow-8.png',
    iconKey: 'dumbbell',
    exercises: ['Chest Press (3x12)', 'Incline Bench Press (3x12)', 'Shoulder Press (2x15)'],
    extraExercises: ['Lat Pulldown (3x12)', 'Romanian Deadlift (3x10)', 'Cable Row (4x12)'],
    more: '+ 3 MORE EXERCISES',
  },
  {
    title: 'FAT LOSS',
    badge: 'BEGINNER PLAN',
    image: '/slideshow-3.png',
    iconKey: 'flame',
    exercises: ['HIIT Intervals (15m)', 'Bodyweight Squats (4x20)', 'Mountain Climbers (4x30s)'],
  },
  {
    title: 'FULL BODY WORKOUT',
    badge: 'BEGINNER PLAN',
    image: '/achievements-bg.jpg',
    iconKey: 'activity',
    exercises: ['Bench Press (3x12)', 'Lat Pulldown (3x12)', 'Lateral Raise (4x12)'],
    extraExercises: ['Leg Press (4x10)', 'Seated Row (3x12)', 'Hamstring Curl (3x15)', 'Plank Hold (3x45s)'],
    more: '+ 4 MORE EXERCISES',
  },
];

const planIconOptions = [
  { key: 'dumbbell', label: 'Barbell', Icon: Dumbbell },
  { key: 'flame', label: 'Fire', Icon: Flame },
  { key: 'activity', label: 'Activity', Icon: Activity },
  { key: 'bike', label: 'Cycle', Icon: Bike },
  { key: 'yoga', label: 'Yoga', Icon: Flower2 },
];

const planIconMap = planIconOptions.reduce((icons, option) => {
  icons[option.key] = option.Icon;
  return icons;
}, {});

const initialExercises = [];
const CUSTOM_WORKOUT_PLANS_STORAGE_KEY = 'customWorkoutPlans';
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
const MAX_COVER_IMAGE_WIDTH = 1400;
const COVER_IMAGE_QUALITY = 0.78;

const loadSavedWorkoutPlans = (storageKey) => {
  try {
    const savedPlans = window.localStorage.getItem(storageKey);
    return savedPlans ? JSON.parse(savedPlans) : [];
  } catch {
    return [];
  }
};

const emptyExercise = () => ({
  id: Date.now() + Math.random(),
  name: '',
  sets: '',
  reps: '',
  setReps: [],
  rest: '',
  notes: '',
});

const getSetCount = (sets) => {
  const parsedSets = Number.parseInt(sets, 10);
  return Number.isFinite(parsedSets) && parsedSets > 0 ? Math.min(parsedSets, 12) : 0;
};

const normalizeSetReps = (exercise) => {
  const setCount = getSetCount(exercise.sets);
  const fallbackReps = exercise.reps || '';
  const currentSetReps = Array.isArray(exercise.setReps) ? exercise.setReps : [];

  return Array.from({ length: setCount }, (_, index) => currentSetReps[index] ?? fallbackReps);
};

const mapBackendPlanToSavedPlan = (plan, localPlan = null) => {
  const formattedExercises = (plan.exercises || []).map((exercise) =>
    `${exercise.exercise_name} (${exercise.target_sets || 1}x${exercise.target_reps || ''})`
  );

  return {
    id: localPlan?.id ?? plan.id,
    backendPlanId: plan.id,
    title: plan.name,
    badge: 'SAVED PLAN',
    image: plan.image || localPlan?.image || '/hero-bg.jpg',
    iconKey: plan.icon_key || localPlan?.iconKey || 'dumbbell',
    builderExercises: (plan.exercises || []).map((exercise) => ({
      id: exercise.id || Date.now() + Math.random(),
      name: exercise.exercise_name,
      sets: String(exercise.target_sets || 1),
      reps: exercise.target_reps || '',
      setReps: String(exercise.target_reps || '').split('/').filter(Boolean),
      rest: '',
      notes: '',
    })),
    exercises: formattedExercises.slice(0, 3),
    extraExercises: formattedExercises.slice(3),
    more: formattedExercises.length > 3 ? `+ ${formattedExercises.length - 3} MORE EXERCISES` : '',
    editable: true,
  };
};

const shouldShowSetRepsPanel = (exercise) => getSetCount(exercise.sets) > 1;

const formatExerciseSummary = (exercise) => {
  const setReps = normalizeSetReps(exercise).filter((rep) => rep.trim());
  const repSummary = setReps.every((rep) => rep === setReps[0])
    ? setReps[0]
    : setReps.join('/');

  return `${exercise.name.trim()} (${exercise.sets.trim()}x${repSummary})`;
};

const isPersistablePlanImage = (image) => (
  typeof image === 'string'
  && (image.startsWith('/') || image.startsWith('data:image/'))
);

const getPersistablePlanImage = (image) => (
  isPersistablePlanImage(image) ? image : '/hero-bg.jpg'
);

const isWorkoutNotFoundError = (error) => (
  error?.message === 'Workout not found'
);

const readImageFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const loadImageElement = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const compressCoverImage = async (file) => {
  const originalDataUrl = await readImageFileAsDataUrl(file);
  const image = await loadImageElement(originalDataUrl);
  const scale = Math.min(1, MAX_COVER_IMAGE_WIDTH / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) return originalDataUrl;

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', COVER_IMAGE_QUALITY);
};

export default function Workouts({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const customPlansStorageKey = getUserStorageKey(CUSTOM_WORKOUT_PLANS_STORAGE_KEY, currentUser);
  const workoutScheduleStorageKey = getUserStorageKey(WORKOUT_SCHEDULE_STORAGE_KEY, currentUser);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState(initialExercises);
  const [draggingExerciseId, setDraggingExerciseId] = useState(null);
  const [settlingExerciseId, setSettlingExerciseId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [coverImage, setCoverImage] = useState(null);
  const [isCoverProcessing, setIsCoverProcessing] = useState(false);
  const [workoutSaveStatus, setWorkoutSaveStatus] = useState('');
  const [selectedIconKey, setSelectedIconKey] = useState('dumbbell');
  const [savedPlans, setSavedPlans] = useState(() => loadSavedWorkoutPlans(customPlansStorageKey));
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    workoutName: false,
    noExercises: false,
    exercises: {},
  });
  const exerciseCardRefs = useRef(new Map());
  const activeDrag = useRef({ id: null, startY: 0, lastY: 0 });

  const refreshBackendPlans = () => {
    return api.getPlans()
      .then((plans) => {
        setSavedPlans((currentPlans) => {
          const backendPlans = plans.map((plan) => {
            const localPlan = currentPlans.find((currentPlan) => currentPlan.backendPlanId === plan.id);
            return mapBackendPlanToSavedPlan(plan, localPlan);
          });
          const localOnlyPlans = currentPlans.filter((plan) =>
            !plan.backendPlanId || !backendPlans.some((backendPlan) => backendPlan.backendPlanId === plan.backendPlanId)
          );
          return [...backendPlans, ...localOnlyPlans];
        });
      })
      .catch(() => null);
  };

  useEffect(() => {
    window.localStorage.setItem(customPlansStorageKey, JSON.stringify(savedPlans));
  }, [savedPlans, customPlansStorageKey]);

  useEffect(() => {
    setSavedPlans(loadSavedWorkoutPlans(customPlansStorageKey));
  }, [customPlansStorageKey]);

  useEffect(() => {
    refreshBackendPlans();
  }, [customPlansStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return undefined;

    const events = new EventSource(`${API_URL}/events`, { withCredentials: true });
    events.addEventListener('plans:changed', () => {
      refreshBackendPlans();
    });

    return () => {
      events.close();
    };
  }, [currentUser, customPlansStorageKey]);

  const updateExercise = (id, field, value) => {
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      noExercises: false,
      exercises: {
        ...currentErrors.exercises,
        [id]: {
          ...currentErrors.exercises[id],
          [field]: false,
        },
      },
    }));

    setExercises((currentExercises) =>
      currentExercises.map((exercise) => {
        if (exercise.id !== id) return exercise;

        const nextExercise = { ...exercise, [field]: value };

        if (field === 'sets') {
          return {
            ...nextExercise,
            setReps: normalizeSetReps(nextExercise),
          };
        }

        if (field === 'reps') {
          return {
            ...nextExercise,
            setReps: normalizeSetReps(nextExercise).map((currentRep) => currentRep || value),
          };
        }

        return nextExercise;
      })
    );
  };

  const updateSetRep = (id, setIndex, value) => {
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      exercises: {
        ...currentErrors.exercises,
        [id]: {
          ...currentErrors.exercises[id],
          reps: false,
        },
      },
    }));

    setExercises((currentExercises) =>
      currentExercises.map((exercise) => {
        if (exercise.id !== id) return exercise;

        const setReps = normalizeSetReps(exercise);
        setReps[setIndex] = value;

        return {
          ...exercise,
          reps: setReps.filter(Boolean).join('/'),
          setReps,
        };
      })
    );
  };

  const addExercise = () => {
    setValidationErrors((currentErrors) => ({ ...currentErrors, noExercises: false }));
    setExercises((currentExercises) => [
      ...currentExercises,
      emptyExercise(),
    ]);
  };

  const removeExercise = (id) => {
    setExercises((currentExercises) =>
      currentExercises.filter((exercise) => exercise.id !== id)
    );
  };

  const resetBuilder = () => {
    setWorkoutName('');
    setCoverImage(null);
    setIsCoverProcessing(false);
    setWorkoutSaveStatus('');
    setSelectedIconKey('dumbbell');
    setExercises([]);
    setEditingPlanId(null);
    setValidationErrors({ workoutName: false, noExercises: false, exercises: {} });
  };

  const togglePlanExercises = (title) => {
    setExpandedPlans((currentPlans) => ({
      ...currentPlans,
      [title]: !currentPlans[title],
    }));
  };

  const startWorkoutPlan = (plan, source = 'custom') => {
    const selectedPlan = {
      ...plan,
      id: plan.id || plan.title,
      source,
    };
    window.sessionStorage.setItem('selectedWorkoutToStart', JSON.stringify(selectedPlan));
    navigate('/start-workout', { state: { plan: selectedPlan } });
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    setWorkoutSaveStatus('');
    setIsCoverProcessing(true);

    try {
      setCoverImage(await compressCoverImage(file));
    } catch {
      setWorkoutSaveStatus(t('Could not read image file.'));
    } finally {
      setIsCoverProcessing(false);
      event.target.value = '';
    }
  };

  const handleWorkoutNameChange = (event) => {
    setWorkoutName(event.target.value);
    setWorkoutSaveStatus('');
    setValidationErrors((currentErrors) => ({ ...currentErrors, workoutName: false }));
  };

  const saveWorkout = async () => {
    setWorkoutSaveStatus('');

    if (isCoverProcessing) {
      setWorkoutSaveStatus(t('Please wait until the cover photo is ready.'));
      return;
    }

    const nextErrors = {
      workoutName: !workoutName.trim(),
      noExercises: false,
      exercises: {},
    };

    const enteredExercises = exercises;

    if (enteredExercises.length === 0) {
      nextErrors.noExercises = true;
    }

    enteredExercises.forEach((exercise) => {
      const setReps = normalizeSetReps(exercise);
      nextErrors.exercises[exercise.id] = {
        name: !exercise.name.trim(),
        sets: !exercise.sets.trim(),
        reps: shouldShowSetRepsPanel(exercise)
          ? setReps.some((rep) => !rep.trim())
          : !exercise.reps.trim(),
      };
    });

    const hasExerciseFieldErrors = Object.values(nextErrors.exercises).some((exerciseErrors) =>
      Object.values(exerciseErrors).some(Boolean)
    );

    if (nextErrors.workoutName || nextErrors.noExercises || hasExerciseFieldErrors) {
      setValidationErrors(nextErrors);
      return;
    }

    const formattedExercises = enteredExercises.map(formatExerciseSummary);
    const planPayload = {
      name: workoutName.trim().toUpperCase(),
      description: t('CUSTOM PLAN'),
      image: getPersistablePlanImage(coverImage),
      icon_key: selectedIconKey,
      exercises: enteredExercises.map((exercise) => ({
        exercise_name: exercise.name.trim(),
        target_sets: Number.parseInt(exercise.sets, 10) || 1,
        target_reps: normalizeSetReps(exercise).filter(Boolean).join('/'),
      })),
    };

    let persistedPlan = null;
    const editingPlan = savedPlans.find((plan) => plan.id === editingPlanId);
    const currentBackendId = editingPlan?.backendPlanId;

    try {
      persistedPlan = currentBackendId
        ? await api.updatePlan(currentBackendId, planPayload)
        : await api.createPlan(planPayload);
    } catch (error) {
      if (currentBackendId && isWorkoutNotFoundError(error)) {
        try {
          persistedPlan = await api.createPlan(planPayload);
        } catch (createError) {
          setWorkoutSaveStatus(t(createError.message || 'Could not save workout. Please try again.'));
          return;
        }
      } else {
        setWorkoutSaveStatus(t(error.message || 'Could not save workout. Please try again.'));
        return;
      }
    }

    const savedPlan = {
      id: editingPlanId || persistedPlan?.id || `custom-${Date.now()}`,
      backendPlanId: persistedPlan?.id || editingPlan?.backendPlanId || null,
      title: workoutName.trim().toUpperCase(),
      badge: t('CUSTOM PLAN'),
      image: getPersistablePlanImage(coverImage),
      iconKey: selectedIconKey,
      builderExercises: enteredExercises.map((exercise) => ({
        ...exercise,
        setReps: normalizeSetReps(exercise),
        id: Date.now() + Math.random(),
      })),
      exercises: formattedExercises.slice(0, 3),
      extraExercises: formattedExercises.slice(3),
      more: formattedExercises.length > 3 ? `+ ${formattedExercises.length - 3} ${t('MORE EXERCISES')}` : '',
      editable: true,
    };

    setSavedPlans((currentPlans) => {
      if (editingPlanId) {
        return currentPlans.map((plan) => (plan.id === editingPlanId ? savedPlan : plan));
      }

      return [savedPlan, ...currentPlans];
    });
    resetBuilder();
  };

  const editSavedPlan = (plan) => {
    if (!plan.editable) return;

    setEditingPlanId(plan.id);
    setWorkoutName(plan.title);
    setCoverImage(plan.image);
    setSelectedIconKey(plan.iconKey || 'dumbbell');
    setExercises(plan.builderExercises.map((exercise) => ({
      ...exercise,
      setReps: normalizeSetReps(exercise),
      id: Date.now() + Math.random(),
    })));
    setValidationErrors({ workoutName: false, noExercises: false, exercises: {} });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSavedPlan = async () => {
    if (!editingPlanId) return;
    const planToDelete = savedPlans.find((plan) => plan.id === editingPlanId);

    if (planToDelete?.backendPlanId) {
      try {
        await api.deletePlan(planToDelete.backendPlanId);
      } catch {
        // Keep the local cleanup so the UI can recover even if the backend entry was already gone.
      }
    }

    setSavedPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== editingPlanId));
    try {
      const storedSchedule = window.localStorage.getItem(workoutScheduleStorageKey);
      const currentSchedule = storedSchedule ? JSON.parse(storedSchedule) : {};
      const nextSchedule = Object.fromEntries(
        Object.entries(currentSchedule).filter(([, scheduledWorkout]) => scheduledWorkout.workoutId !== editingPlanId)
      );
      window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify(nextSchedule));
    } catch {
      window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify({}));
    }
    resetBuilder();
  };

  const moveExercise = (draggedId, targetId) => {
    if (!draggedId || draggedId === targetId) return;

    setExercises((currentExercises) => {
      const draggedIndex = currentExercises.findIndex((exercise) => exercise.id === draggedId);
      const targetIndex = currentExercises.findIndex((exercise) => exercise.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return currentExercises;
      }

      const nextExercises = [...currentExercises];
      const [draggedExercise] = nextExercises.splice(draggedIndex, 1);
      nextExercises.splice(targetIndex, 0, draggedExercise);
      return nextExercises;
    });
  };

  const handleDragHandlePointerDown = (event, exerciseId) => {
    event.preventDefault();
    event.stopPropagation();

    activeDrag.current = { id: exerciseId, startY: event.clientY, lastY: event.clientY };
    setDraggingExerciseId(exerciseId);
    setDragOffsetY(0);

    const handlePointerMove = (moveEvent) => {
      const currentDrag = activeDrag.current;
      const offsetY = moveEvent.clientY - currentDrag.startY;
      const direction = moveEvent.clientY > currentDrag.lastY ? 'down' : 'up';

      activeDrag.current = { ...currentDrag, lastY: moveEvent.clientY };
      setDragOffsetY(offsetY);

      const targetEntry = [...exerciseCardRefs.current.entries()].find(([id, element]) => {
        if (id === currentDrag.id) return false;
        const rect = element.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        return direction === 'down'
          ? moveEvent.clientY > midpoint && moveEvent.clientY <= rect.bottom
          : moveEvent.clientY < midpoint && moveEvent.clientY >= rect.top;
      });

      if (targetEntry) {
        moveExercise(currentDrag.id, targetEntry[0]);
        activeDrag.current = { id: currentDrag.id, startY: moveEvent.clientY, lastY: moveEvent.clientY };
        setDragOffsetY(0);
      }
    };

    const handlePointerUp = () => {
      const settledId = activeDrag.current.id;
      activeDrag.current = { id: null, startY: 0, lastY: 0 };
      setDraggingExerciseId(null);
      setSettlingExerciseId(settledId);
      setDragOffsetY(0);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.setTimeout(() => setSettlingExerciseId(null), 260);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <div className="workouts-page">
      <section className="workout-builder">
        <h1 className="workouts-title">{t('CREATE YOUR OWN')} <span>{t('WORKOUT')}</span></h1>
        <div className="workout-builder-topline">
          <div className="workout-section-kicker">
            {editingPlanId ? t('EDIT YOUR PLAN') : t('BUILD YOUR OWN PLAN')}
          </div>
          {editingPlanId && (
            <button className="delete-workout-button" type="button" onClick={deleteSavedPlan}>
              <Trash2 size={16} /> {t('DELETE WORKOUT')}
            </button>
          )}
        </div>

        <input
          className={`workout-name-input ${validationErrors.workoutName ? 'field-error' : ''}`}
          type="text"
          value={workoutName}
          onChange={handleWorkoutNameChange}
          placeholder={t('WORKOUT NAME (E.G. MONDAY OLYMPIC LIFTING)')}
        />
        {validationErrors.workoutName && (
          <div className="workout-error-message">{t('Please enter a workout name.')}</div>
        )}

        <div className="plan-icon-picker">
          <div className="workout-cover-label">{t('PLAN ICON')}</div>
          <div className="plan-icon-options">
            {planIconOptions.map(({ key, label, Icon }) => {
              const PlanOptionIcon = Icon;

              return (
                <button
                  key={key}
                  className={`plan-icon-option ${selectedIconKey === key ? 'active' : ''}`}
                  type="button"
                  aria-label={`${t('PLAN ICON')}: ${t(label)}`}
                  onClick={() => setSelectedIconKey(key)}
                >
                  <PlanOptionIcon size={20} />
                </button>
              );
            })}
          </div>
        </div>

        <label className="workout-cover-label">{t('WORKOUT COVER IMAGE')}</label>
        <label
          className={`workout-upload-box ${coverImage ? 'has-image' : ''}`}
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        >
          <input type="file" accept="image/*" onChange={handleCoverUpload} />
          <span className="workout-upload-content">
            <span className="workout-upload-icon">
              <Camera size={22} />
            </span>
            <strong>{isCoverProcessing ? t('PREPARING PHOTO') : coverImage ? t('CHANGE COVER PHOTO') : t('UPLOAD COVER PHOTO')}</strong>
            <small>{t('PNG, JPG UP TO 10MB')}</small>
          </span>
        </label>
        {workoutSaveStatus && (
          <div className="workout-error-message workout-save-status">{workoutSaveStatus}</div>
        )}

        <div className="workout-exercise-stack">
          {exercises.map((exercise) => (
            <article
              className={`workout-exercise-card ${exercise.name ? 'filled' : 'empty'} ${draggingExerciseId === exercise.id ? 'dragging' : ''} ${settlingExerciseId === exercise.id ? 'settling' : ''}`}
              key={exercise.id}
              style={{
                '--drag-offset-y': draggingExerciseId === exercise.id ? `${dragOffsetY}px` : '0px',
              }}
              ref={(element) => {
                if (element) {
                  exerciseCardRefs.current.set(exercise.id, element);
                } else {
                  exerciseCardRefs.current.delete(exercise.id);
                }
              }}
            >
              <div className="exercise-card-header">
                <input
                  className={`exercise-title-input ${validationErrors.exercises[exercise.id]?.name ? 'field-error' : ''}`}
                  value={exercise.name}
                  onChange={(event) => updateExercise(exercise.id, 'name', event.target.value)}
                  placeholder={t('Exercise Name...')}
                />
                <div className="exercise-card-actions">
                  <button
                    type="button"
                    aria-label={t('Delete exercise')}
                    className="delete-exercise-button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeExercise(exercise.id);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    className="drag-exercise-button"
                    aria-label={t('Move exercise')}
                    onPointerDown={(event) => handleDragHandlePointerDown(event, exercise.id)}
                  >
                    <GripVertical size={20} />
                  </button>
                </div>
              </div>
              {validationErrors.exercises[exercise.id]?.name && (
                <div className="exercise-field-error title-error">{t('Enter an exercise name.')}</div>
              )}

              <div className="exercise-fields">
                <label>
                  <span>{t('SETS')}</span>
                  <input
                    className={validationErrors.exercises[exercise.id]?.sets ? 'field-error' : ''}
                    value={exercise.sets}
                    onChange={(event) => updateExercise(exercise.id, 'sets', event.target.value)}
                  />
                  {validationErrors.exercises[exercise.id]?.sets && (
                    <small className="exercise-field-error">{t('Enter sets.')}</small>
                  )}
                </label>
                <label>
                  <span>{t('REPS')}</span>
                  <input
                    className={validationErrors.exercises[exercise.id]?.reps ? 'field-error' : ''}
                    value={exercise.reps}
                    onChange={(event) => updateExercise(exercise.id, 'reps', event.target.value)}
                    placeholder={t('Default reps')}
                  />
                  {validationErrors.exercises[exercise.id]?.reps && (
                    <small className="exercise-field-error">{t('Enter reps for every set.')}</small>
                  )}
                </label>
                <label>
                  <span>{t('REST (S)')}</span>
                  <input
                    value={exercise.rest}
                    onChange={(event) => updateExercise(exercise.id, 'rest', event.target.value)}
                  />
                </label>
              </div>

              {shouldShowSetRepsPanel(exercise) && (
                <div className="set-reps-panel">
                  <div className="set-reps-heading">
                    <span>{t('REPS PER SET')}</span>
                    <small>{t('Customize each set individually')}</small>
                  </div>
                  <div className="set-reps-grid">
                    {normalizeSetReps(exercise).map((repValue, index) => (
                      <label className="set-rep-field" key={`${exercise.id}-set-${index + 1}`}>
                        <span>{t('SET')} {index + 1}</span>
                        <input
                          className={validationErrors.exercises[exercise.id]?.reps && !repValue.trim() ? 'field-error' : ''}
                          value={repValue}
                          onChange={(event) => updateSetRep(exercise.id, index, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="exercise-notes">
                <span>{t('NOTES')}</span>
                <input
                  value={exercise.notes}
                  onChange={(event) => updateExercise(exercise.id, 'notes', event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>

        <div className="workout-builder-actions">
          <div className="add-exercise-control">
            <button
              className={`add-exercise-button ${validationErrors.noExercises ? 'field-error' : ''}`}
              type="button"
              onClick={addExercise}
            >
              <PlusCircle size={16} /> {t('ADD EXERCISE')}
            </button>
            {validationErrors.noExercises && (
              <div className="workout-error-message add-exercise-error">
                {t('Add at least one exercise to save your workout.')}
              </div>
            )}
          </div>
          <button className="save-workout-button" type="button" onClick={saveWorkout} disabled={isCoverProcessing}>
            {editingPlanId ? t('UPDATE WORKOUT') : t('SAVE WORKOUT')}
          </button>
        </div>
      </section>

      <aside className="ready-plans-panel">
        {savedPlans.length > 0 && (
          <div className="ready-plan-group">
            <div className="ready-plans-heading">
              <h2>{t('SELF-MADE WORKOUT PLANS')}</h2>
              <p>{t('Your custom training foundations.')}</p>
            </div>

            <div className="ready-plan-list">
              {savedPlans.map((plan) => {
                const PlanIcon = planIconMap[plan.iconKey] || Dumbbell;
                const planKey = plan.id || plan.title;
                const isExpanded = Boolean(expandedPlans[planKey]);
                const visibleExercises = isExpanded
                  ? [...plan.exercises, ...(plan.extraExercises || [])]
                  : plan.exercises;

                return (
                  <article
                    className="ready-plan-card editable"
                    key={planKey}
                    onClick={() => editSavedPlan(plan)}
                  >
                    <div
                      className="ready-plan-cover"
                      style={{ backgroundImage: `url(${plan.image})` }}
                    >
                      <span className="ready-plan-icon">
                        <PlanIcon size={18} />
                      </span>
                    </div>

                    <div className="ready-plan-body">
                      <span className="ready-plan-badge">{t(plan.badge)}</span>
                      <h3>{plan.title}</h3>
                      <ul>
                        {visibleExercises.map((exercise) => (
                          <li key={exercise}>{exercise}</li>
                        ))}
                      </ul>
                      {plan.more && (
                        <button
                          className="ready-plan-more-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            togglePlanExercises(planKey);
                          }}
                        >
                          {isExpanded ? t('SHOW LESS') : plan.more.replace('MORE EXERCISES', t('MORE EXERCISES'))}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startWorkoutPlan(plan, 'custom');
                        }}
                      >
                        {t('START WORKOUT')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="ready-plan-group">
          <div className="ready-plans-heading">
            <h2>{t('READY-MADE WORKOUT PLANS')}</h2>
            <p>{t('Curated high-performance foundations.')}</p>
          </div>

          <div className="ready-plan-list">
            {readyPlans.map((plan) => {
            const PlanIcon = planIconMap[plan.iconKey] || Dumbbell;
            const planKey = plan.id || plan.title;
            const isExpanded = Boolean(expandedPlans[planKey]);
            const visibleExercises = isExpanded
              ? [...plan.exercises, ...(plan.extraExercises || [])]
              : plan.exercises;

            return (
              <article
                className={`ready-plan-card ${plan.editable ? 'editable' : ''}`}
                key={planKey}
                onClick={() => editSavedPlan(plan)}
              >
                <div
                  className="ready-plan-cover"
                  style={{ backgroundImage: `url(${plan.image})` }}
                >
                  <span className="ready-plan-icon">
                    <PlanIcon size={18} />
                  </span>
                </div>

                <div className="ready-plan-body">
                  <span className="ready-plan-badge">{t(plan.badge)}</span>
                  <h3>{t(plan.title)}</h3>
                  <ul>
                    {visibleExercises.map((exercise) => (
                      <li key={exercise}>{t(exercise)}</li>
                    ))}
                  </ul>
                  {plan.more && (
                    <button
                      className="ready-plan-more-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePlanExercises(planKey);
                      }}
                    >
                      {isExpanded ? t('SHOW LESS') : plan.more.replace('MORE EXERCISES', t('MORE EXERCISES'))}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startWorkoutPlan(plan, 'ready');
                    }}
                  >
                    {t('START WORKOUT')}
                  </button>
                </div>
              </article>
            );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
