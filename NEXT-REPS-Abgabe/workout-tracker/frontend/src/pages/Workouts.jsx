import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import {
  Activity,
  Bike,
  BrainCircuit,
  Camera,
  Check,
  Dumbbell,
  Flame,
  Flower2,
  GripVertical,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageKey } from '../userStorage';
import { API_URL, api } from '../api';
import { trackProductEvent } from '../productAnalytics';
import { exerciseLibrary } from '../data/exerciseLibrary';
import './Workouts.css';

const MotionButton = motion.button;
const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionSpan = motion.span;

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

const exerciseCategoryFilters = ['All', 'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];
const EXERCISE_SELECTION_MOVE_DELAY = 420;
const EXERCISE_REMOVAL_MOVE_DELAY = 220;

const getExerciseCategory = (exercise) => {
  if (exercise.pattern === 'conditioning') return 'Cardio';
  return exercise.muscleGroup;
};

function ExerciseIllustration({ exercise }) {
  if (exercise.image) {
    return (
      <div className="exercise-illustration" aria-hidden="true">
        <img src={exercise.image} alt="" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="exercise-illustration exercise-illustration-placeholder" aria-hidden="true" />
  );
}

const initialExercises = [];
const WORKOUT_SCHEDULE_STORAGE_KEY = 'workoutSchedule';
const MAX_COVER_IMAGE_WIDTH = 640;
const MIN_COVER_IMAGE_WIDTH = 260;
const COVER_IMAGE_QUALITY = 0.68;
const MIN_COVER_IMAGE_QUALITY = 0.38;
const MAX_COVER_DATA_URL_LENGTH = 52000;

const createClientId = (prefix, parts = []) => {
  if (globalThis.crypto?.randomUUID) {
    return [prefix, ...parts, globalThis.crypto.randomUUID()].filter(Boolean).join('-');
  }

  const values = new Uint32Array(2);
  globalThis.crypto?.getRandomValues?.(values);
  const randomPart = Array.from(values).map((value) => value.toString(36)).join('');
  return [prefix, ...parts, Date.now(), randomPart || 'fallback'].filter(Boolean).join('-');
};

const emptyExercise = () => ({
  id: createClientId('exercise'),
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

const mapBackendPlanToSavedPlan = (plan) => {
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
    builderExercises: (plan.exercises || []).map((exercise) => ({
      id: exercise.id || createClientId('backend-exercise'),
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

const isPersistablePlanImage = (image) => (
  typeof image === 'string'
  && (image.startsWith('/') || image.startsWith('data:image/'))
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

const createCoverDataUrl = (image, maxSize, quality) => {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);
  const webpDataUrl = canvas.toDataURL('image/webp', quality);
  return webpDataUrl.startsWith('data:image/webp')
    ? webpDataUrl
    : canvas.toDataURL('image/jpeg', quality);
};

const compressCoverImageDataUrl = async (sourceDataUrl) => {
  const image = await loadImageElement(sourceDataUrl);
  let maxSize = MAX_COVER_IMAGE_WIDTH;
  let quality = COVER_IMAGE_QUALITY;
  let compressedDataUrl = createCoverDataUrl(image, maxSize, quality) || sourceDataUrl;

  while (
    compressedDataUrl.length > MAX_COVER_DATA_URL_LENGTH
    && (maxSize > MIN_COVER_IMAGE_WIDTH || quality > MIN_COVER_IMAGE_QUALITY)
  ) {
    maxSize = Math.max(MIN_COVER_IMAGE_WIDTH, Math.round(maxSize * 0.82));
    quality = Math.max(MIN_COVER_IMAGE_QUALITY, Number((quality - 0.08).toFixed(2)));
    compressedDataUrl = createCoverDataUrl(image, maxSize, quality) || compressedDataUrl;
  }

  return compressedDataUrl;
};

const compressCoverImage = async (file) => {
  const originalDataUrl = await readImageFileAsDataUrl(file);
  return compressCoverImageDataUrl(originalDataUrl);
};

const preparePlanImageForSave = async (image) => {
  if (!isPersistablePlanImage(image)) return '/hero-bg.jpg';
  if (!image.startsWith('data:image/')) return image;
  if (image.length <= MAX_COVER_DATA_URL_LENGTH) return image;
  return compressCoverImageDataUrl(image);
};

const getServerPlanImage = (image) => (
  isPersistablePlanImage(image) ? image : null
);

const buildScheduleEntryFromSavedPlan = (plan) => ({
  workoutId: plan.id,
  backendPlanId: plan.backendPlanId,
  title: plan.title,
  image: plan.image,
  badge: plan.badge,
  iconKey: plan.iconKey,
  exercises: [...(plan.exercises || []), ...(plan.extraExercises || [])],
});

export default function Workouts({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  const [savedPlans, setSavedPlans] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [coachAnalysis, setCoachAnalysis] = useState(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [isExerciseLibraryOpen, setIsExerciseLibraryOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [activeExerciseCategory, setActiveExerciseCategory] = useState('All');
  const [pendingExerciseNames, setPendingExerciseNames] = useState(() => new Set());
  const [removingExerciseNames, setRemovingExerciseNames] = useState(() => new Set());
  const [validationErrors, setValidationErrors] = useState({
    workoutName: false,
    noExercises: false,
    exercises: {},
  });
  const exerciseCardRefs = useRef(new Map());
  const activeDrag = useRef({ id: null, startY: 0, lastY: 0 });
  const pendingExerciseTimers = useRef(new Map());
  const removingExerciseTimers = useRef(new Map());

  const selectedExerciseNames = useMemo(() => (
    new Set(exercises.map((exercise) => exercise.name.trim().toLowerCase()).filter(Boolean))
  ), [exercises]);

  const selectedLibraryExercises = useMemo(() => (
    exerciseLibrary.filter((exercise) => selectedExerciseNames.has(exercise.name.toLowerCase()))
  ), [selectedExerciseNames]);

  const filteredLibraryExercises = useMemo(() => {
    const normalizedQuery = exerciseSearchQuery.trim().toLowerCase();

    return exerciseLibrary.filter((exercise) => {
      const matchesQuery = !normalizedQuery || [
        exercise.name,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.location,
        exercise.focus,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesCategory = activeExerciseCategory === 'All'
        || getExerciseCategory(exercise) === activeExerciseCategory;

      return matchesQuery && matchesCategory;
    });
  }, [activeExerciseCategory, exerciseSearchQuery]);

  const libraryListExercises = useMemo(() => {
    return filteredLibraryExercises.filter((exercise) => {
      const normalizedName = exercise.name.toLowerCase();
      return !selectedExerciseNames.has(normalizedName) || pendingExerciseNames.has(normalizedName);
    });
  }, [filteredLibraryExercises, pendingExerciseNames, selectedExerciseNames]);

  const refreshBackendPlans = useCallback(async () => {
    try {
      const plans = await api.getPlans();
      setSavedPlans((Array.isArray(plans) ? plans : []).map(mapBackendPlanToSavedPlan));
      return plans;
    } catch (error) {
      setWorkoutSaveStatus(t(error.message || 'Could not load workouts from the backend.'));
      return [];
    }
  }, [t]);

  useEffect(() => {
    void refreshBackendPlans();
  }, [currentUser?.id, refreshBackendPlans]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let isCancelled = false;

    const loadCoachAnalysis = async () => {
      setIsCoachLoading(true);
      try {
        const analysis = await api.getCoachAnalysis();
        if (!isCancelled) setCoachAnalysis(analysis);
      } catch {
        if (!isCancelled) setCoachAnalysis(null);
      } finally {
        if (!isCancelled) setIsCoachLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadCoachAnalysis();
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return undefined;

    const events = new EventSource(`${API_URL}/events`, { withCredentials: true });
    events.addEventListener('plans:changed', () => {
      void refreshBackendPlans();
    });

    return () => {
      events.close();
    };
  }, [currentUser?.id, refreshBackendPlans]);

  useEffect(() => {
    if (!isExerciseLibraryOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExerciseLibraryOpen]);

  useEffect(() => () => {
    pendingExerciseTimers.current.forEach((timer) => window.clearTimeout(timer));
    pendingExerciseTimers.current.clear();
    removingExerciseTimers.current.forEach((timer) => window.clearTimeout(timer));
    removingExerciseTimers.current.clear();
  }, []);

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
    setIsExerciseLibraryOpen(false);
  };

  const createExerciseFromLibrary = (libraryExercise) => {
    return {
      ...emptyExercise(),
      name: libraryExercise.name,
      muscleGroup: libraryExercise.muscleGroup,
      equipment: libraryExercise.equipment,
      focus: libraryExercise.focus,
      pattern: libraryExercise.pattern,
    };
  };

  const toggleLibraryExercise = (libraryExercise) => {
    const normalizedName = libraryExercise.name.trim().toLowerCase();

    setValidationErrors((currentErrors) => ({ ...currentErrors, noExercises: false }));

    if (pendingExerciseTimers.current.has(normalizedName)) {
      window.clearTimeout(pendingExerciseTimers.current.get(normalizedName));
      pendingExerciseTimers.current.delete(normalizedName);
      setPendingExerciseNames((currentNames) => {
        const nextNames = new Set(currentNames);
        nextNames.delete(normalizedName);
        return nextNames;
      });
      return;
    }

    if (removingExerciseTimers.current.has(normalizedName)) {
      window.clearTimeout(removingExerciseTimers.current.get(normalizedName));
      removingExerciseTimers.current.delete(normalizedName);
      setRemovingExerciseNames((currentNames) => {
        const nextNames = new Set(currentNames);
        nextNames.delete(normalizedName);
        return nextNames;
      });
      return;
    }

    if (!selectedExerciseNames.has(normalizedName)) {
      setPendingExerciseNames((currentNames) => new Set(currentNames).add(normalizedName));

      const timer = window.setTimeout(() => {
        setExercises((currentExercises) => {
          const alreadySelected = currentExercises.some(
            (exercise) => exercise.name.trim().toLowerCase() === normalizedName
          );

          return alreadySelected
            ? currentExercises
            : [...currentExercises, createExerciseFromLibrary(libraryExercise)];
        });
        setPendingExerciseNames((currentNames) => {
          const nextNames = new Set(currentNames);
          nextNames.delete(normalizedName);
          return nextNames;
        });
        pendingExerciseTimers.current.delete(normalizedName);
      }, EXERCISE_SELECTION_MOVE_DELAY);

      pendingExerciseTimers.current.set(normalizedName, timer);
      return;
    }

    setRemovingExerciseNames((currentNames) => new Set(currentNames).add(normalizedName));
    const timer = window.setTimeout(() => {
      setExercises((currentExercises) => currentExercises.filter(
        (exercise) => exercise.name.trim().toLowerCase() !== normalizedName
      ));
      setRemovingExerciseNames((currentNames) => {
        const nextNames = new Set(currentNames);
        nextNames.delete(normalizedName);
        return nextNames;
      });
      removingExerciseTimers.current.delete(normalizedName);
    }, EXERCISE_REMOVAL_MOVE_DELAY);

    removingExerciseTimers.current.set(normalizedName, timer);
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

    let planImage;
    try {
      planImage = await preparePlanImageForSave(coverImage);
    } catch {
      setWorkoutSaveStatus(t('Could not prepare image file.'));
      return;
    }

    if (planImage.startsWith('data:image/') && planImage.length > MAX_COVER_DATA_URL_LENGTH) {
      setWorkoutSaveStatus(t('Please choose a smaller cover photo.'));
      return;
    }

    const planPayload = {
      name: workoutName.trim().toUpperCase(),
      description: t('CUSTOM PLAN'),
      image: getServerPlanImage(planImage),
      icon_key: selectedIconKey,
      exercises: enteredExercises.map((exercise) => ({
        exercise_name: exercise.name.trim(),
        target_sets: Number.parseInt(exercise.sets, 10) || 1,
        target_reps: normalizeSetReps(exercise).filter(Boolean).join('/'),
      })),
    };

    let persistedPlan;
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

    const savedPlan = mapBackendPlanToSavedPlan(persistedPlan);
    if (!editingPlanId) {
      void trackProductEvent('plan_created', {
        exerciseCount: enteredExercises.length,
      });
    }

    setSavedPlans((currentPlans) => {
      if (editingPlanId) {
        return currentPlans.map((plan) => (plan.id === editingPlanId ? savedPlan : plan));
      }

      return [savedPlan, ...currentPlans];
    });

    if (editingPlanId) {
      try {
        const storedSchedule = window.localStorage.getItem(workoutScheduleStorageKey);
        const currentSchedule = storedSchedule ? JSON.parse(storedSchedule) : {};
        const nextSchedule = Object.fromEntries(Object.entries(currentSchedule).map(([dateKey, scheduledWorkout]) => {
          const referencesEditedPlan = scheduledWorkout?.workoutId === editingPlanId
            || scheduledWorkout?.workoutId === currentBackendId
            || scheduledWorkout?.backendPlanId === currentBackendId;
          return [
            dateKey,
            referencesEditedPlan ? buildScheduleEntryFromSavedPlan(savedPlan) : scheduledWorkout,
          ];
        }));
        window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify(nextSchedule));
      } catch {
        // The saved plan itself is still valid; the dashboard can rebuild planner data from the backend.
      }
    }

    window.dispatchEvent(new CustomEvent('workout-plans-changed'));
    refreshBackendPlans();
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
      id: createClientId('editable-exercise'),
    })));
    setValidationErrors({ workoutName: false, noExercises: false, exercises: {} });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyCoachDayToBuilder = (day) => {
    if (!day) return;

    setEditingPlanId(null);
    setWorkoutName(`AI ${day.title}`.toUpperCase());
    setCoverImage('/hero-bg.jpg');
    setSelectedIconKey('dumbbell');
    setExercises((day.exercises || []).map((exercise) => {
      const setCount = Math.max(1, Math.min(12, Number.parseInt(exercise.target_sets, 10) || 3));
      const targetReps = String(exercise.target_reps || '10');

      return {
        id: createClientId('coach-exercise'),
        name: exercise.exercise_name || '',
        sets: String(setCount),
        reps: targetReps,
        setReps: Array.from({ length: setCount }, () => targetReps),
        rest: '',
        notes: t('Coach suggestion'),
      };
    }));
    setValidationErrors({ workoutName: false, noExercises: false, exercises: {} });
    setWorkoutSaveStatus(t('Coach suggestion loaded into the builder.'));
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
        Object.entries(currentSchedule).filter(([, scheduledWorkout]) =>
          scheduledWorkout.workoutId !== editingPlanId
          && scheduledWorkout.workoutId !== planToDelete?.backendPlanId
          && scheduledWorkout.backendPlanId !== planToDelete?.backendPlanId
        )
      );
      window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify(nextSchedule));
    } catch {
      window.localStorage.setItem(workoutScheduleStorageKey, JSON.stringify({}));
    }
    window.dispatchEvent(new CustomEvent('workout-plans-changed'));
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
    <>
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
          data-cy="workout-name"
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
                '--drag-offset-y': draggingExerciseId === exercise.id ? `${dragOffsetY}px` : 'var(--size-0)',
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
                  data-cy="exercise-name"
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

              {(exercise.muscleGroup || exercise.equipment || exercise.focus) && (
                <div className="exercise-card-meta">
                  {exercise.muscleGroup && <span>{t(exercise.muscleGroup)}</span>}
                  {exercise.equipment && <span>{t(exercise.equipment)}</span>}
                  {exercise.focus && <small>{t(exercise.focus)}</small>}
                </div>
              )}

              <div className="exercise-fields">
                <label>
                  <span>{t('SETS')}</span>
                  <input
                    data-cy="exercise-sets"
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
                    data-cy="exercise-reps"
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
              data-cy="add-exercise"
              className={`add-exercise-button ${validationErrors.noExercises ? 'field-error' : ''}`}
              type="button"
              onClick={() => setIsExerciseLibraryOpen(true)}
            >
              <PlusCircle size={16} /> {t('ADD EXERCISE')}
            </button>
            {validationErrors.noExercises && (
              <div className="workout-error-message add-exercise-error">
                {t('Add at least one exercise to save your workout.')}
              </div>
            )}
          </div>
          <button data-cy="save-workout" className="save-workout-button" type="button" onClick={saveWorkout} disabled={isCoverProcessing}>
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

        <div className="workout-coach-panel">
          <div className="workout-coach-heading">
            <span>
              <BrainCircuit size={18} />
              {t('NEXT REPS COACH')}
            </span>
            <h2>{t('Smart plan support')}</h2>
            <p>{t('Your training data quietly shapes suggestions here, without adding an extra tab to the app.')}</p>
          </div>

          {isCoachLoading && !coachAnalysis ? (
            <div className="workout-coach-state">{t('Analyzing your recent training...')}</div>
          ) : coachAnalysis ? (
            <>
              <div className="workout-coach-score">
                <strong>{coachAnalysis.summary.score}</strong>
                <span>{t('Coach score')}</span>
                <small>{coachAnalysis.summary.headline}</small>
              </div>

              <div className="workout-coach-recommendation">
                {t(coachAnalysis.recommendations?.[0] || 'Log your next workout to unlock sharper suggestions.')}
              </div>

              <div className="workout-coach-week">
                {(coachAnalysis.suggestedWeek || []).slice(0, 3).map((day) => (
                  <article className="workout-coach-day" key={day.day}>
                    <span>{t(day.day)}</span>
                    <h3>{t(day.title)}</h3>
                    <p>{t(day.goal)}</p>
                    <button type="button" onClick={() => applyCoachDayToBuilder(day)}>
                      {t('USE THIS DAY')}
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="workout-coach-state">{t('Log workouts to unlock coach suggestions.')}</div>
          )}
        </div>

        <div className="ready-plans-intro ready-plans-separator">
          <span>{t('NEED A STARTING POINT?')}</span>
          <h2>{t('Pick a proven plan and make it yours.')}</h2>
          <p>{t('Use these templates when you want structure fast, then adjust exercises, sets and reps to match your own training style.')}</p>
        </div>

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
    <AnimatePresence>
    {isExerciseLibraryOpen && (
      <MotionDiv
        className="exercise-library-overlay"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsExerciseLibraryOpen(false);
        }}
      >
        <MotionSection
          className="exercise-library-sheet"
          aria-label={t('Exercise library')}
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        >
          <div className="exercise-library-header">
            <h2>{t('Add exercise')}</h2>
            <button
              className="exercise-library-close"
              type="button"
              aria-label={t('Close exercise library')}
              onClick={() => setIsExerciseLibraryOpen(false)}
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>

          <label className="exercise-library-search">
            <Search size={22} />
            <input
              type="search"
              value={exerciseSearchQuery}
              onChange={(event) => setExerciseSearchQuery(event.target.value)}
              placeholder={t('Search exercises compact')}
            />
          </label>

          <div className="exercise-library-filter-options" aria-label={t('Exercise filters')}>
            {exerciseCategoryFilters.map((option) => (
              <MotionButton
                key={option}
                className={activeExerciseCategory === option ? 'active' : ''}
                type="button"
                onClick={() => setActiveExerciseCategory(option)}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'tween', duration: 0.14, ease: 'easeOut' }}
              >
                {activeExerciseCategory === option && (
                  <MotionSpan
                    className="exercise-library-filter-pill"
                    initial={{ opacity: 0, scaleX: 0.72 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.72 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="exercise-library-filter-label">
                  {option === 'All' ? t('All') : t(option)}
                </span>
              </MotionButton>
            ))}
          </div>

          <LayoutGroup>
          <div className="exercise-library-list">
            <AnimatePresence initial={false}>
            {selectedLibraryExercises.length > 0 && (
              <MotionDiv
                className="exercise-library-section"
                key="selected-exercises"
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <h3>{t('Selected Exercises')} ({selectedLibraryExercises.length})</h3>
                {selectedLibraryExercises.map((exercise) => {
                  const isSelected = selectedExerciseNames.has(exercise.name.toLowerCase());
                  const isRemoving = removingExerciseNames.has(exercise.name.toLowerCase());

                  return (
                    <MotionDiv
                      className={`exercise-library-row selected${isRemoving ? ' removing' : ''}`}
                      key={`selected-${exercise.name}`}
                      layout
                      layoutId={`exercise-library-row-${exercise.name}`}
                      transition={{ layout: { type: 'spring', stiffness: 520, damping: 42 } }}
                    >
                      <ExerciseIllustration exercise={exercise} />
                      <span className="exercise-library-info">
                        <strong>{t(exercise.name)}</strong>
                        <span>{t(exercise.muscleGroup)} · {t(exercise.equipment)}</span>
                      </span>
                      <MotionButton
                        className={`exercise-library-toggle${isSelected && !isRemoving ? ' selected' : ''}`}
                        type="button"
                        aria-label={isSelected ? t('Remove exercise') : t('Add exercise')}
                        onClick={() => toggleLibraryExercise(exercise)}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isSelected && !isRemoving ? <Check size={18} /> : <Plus size={19} />}
                      </MotionButton>
                    </MotionDiv>
                  );
                })}
              </MotionDiv>
            )}
            </AnimatePresence>
            <AnimatePresence initial={false} mode="wait">
              {libraryListExercises.length > 0 && (
                <MotionDiv
                  className="exercise-library-section"
                  key={`all-exercises-${activeExerciseCategory}-${exerciseSearchQuery.trim().toLowerCase()}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3>{t('All exercises')}</h3>
                  {libraryListExercises.map((exercise) => {
                    const isSelected = selectedExerciseNames.has(exercise.name.toLowerCase());
                    const isPending = pendingExerciseNames.has(exercise.name.toLowerCase());

                    return (
                      <MotionDiv
                        className={`exercise-library-row${isPending ? ' pending' : ''}`}
                        key={exercise.name}
                        layout={isPending ? 'position' : false}
                        layoutId={isPending ? `exercise-library-row-${exercise.name}` : undefined}
                        transition={{ layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
                      >
                        <ExerciseIllustration exercise={exercise} />
                        <span className="exercise-library-info">
                          <strong>{t(exercise.name)}</strong>
                          <span>{t(exercise.muscleGroup)} · {t(exercise.equipment)}</span>
                        </span>
                        <MotionButton
                          className={`exercise-library-toggle${isSelected || isPending ? ' selected' : ''}`}
                          type="button"
                          aria-label={isSelected || isPending ? t('Remove exercise') : t('Add exercise')}
                          onClick={() => toggleLibraryExercise(exercise)}
                          whileTap={{ scale: 0.9 }}
                        >
                          {isSelected || isPending ? <Check size={18} /> : <Plus size={20} />}
                        </MotionButton>
                      </MotionDiv>
                    );
                  })}
                </MotionDiv>
              )}
            </AnimatePresence>
            {filteredLibraryExercises.length === 0 && (
              <div className="exercise-library-empty">
                {t('No matching exercises found.')}
              </div>
            )}
          </div>
          </LayoutGroup>

          <button data-cy="create-custom-exercise" className="exercise-library-custom" type="button" onClick={addExercise}>
            <PlusCircle size={12} />
            {t('Create custom exercise')}
          </button>
        </MotionSection>
      </MotionDiv>
    )}
    </AnimatePresence>
    </>
  );
}
