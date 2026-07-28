const { prisma } = require('../../prismaClient');
const { broadcastToUser } = require('../../events');
const { sendPushToUserLater } = require('../../push');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const toNumberId = (id) => {
  const parsedId = Number(id);
  return Number.isInteger(parsedId) ? parsedId : null;
};

const serializeExercise = (exercise) => ({
  id: exercise.id,
  plan_id: exercise.planId,
  exercise_name: exercise.exerciseName,
  target_sets: exercise.targetSets,
  target_reps: exercise.targetReps,
});

const serializePlan = (plan) => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  image: plan.image,
  icon_key: plan.iconKey,
  exercises: (plan.exercises || []).map(serializeExercise),
});

const MAX_PLAN_IMAGE_DATA_URL_LENGTH = 2_000_000;
const MAX_PLAN_IMAGE_PATH_LENGTH = 512;
const PLAN_IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

const isValidPlanImagePath = (image) => (
  typeof image === 'string'
  && image.length <= MAX_PLAN_IMAGE_PATH_LENGTH
  && image.startsWith('/')
  && !image.startsWith('//')
);

const isValidPlanImageDataUrl = (image) => (
  typeof image === 'string'
  && image.length <= MAX_PLAN_IMAGE_DATA_URL_LENGTH
  && PLAN_IMAGE_DATA_URL_PATTERN.test(image)
);

const isValidPlanImage = (image) => (
  image === undefined
  || image === null
  || image === ''
  || isValidPlanImagePath(image)
  || isValidPlanImageDataUrl(image)
);

const normalizePlanImage = (image) => (image ? image : null);
const normalizeIconKey = (iconKey) => (
  typeof iconKey === 'string' && iconKey.trim() ? iconKey.trim() : null
);

const validateExerciseInput = (exercise) => {
  if (!exercise.exercise_name || typeof exercise.exercise_name !== 'string') {
    return 'Exercise name is required';
  }

  if (
    exercise.target_sets !== undefined
    && exercise.target_sets !== null
    && Number.isNaN(Number(exercise.target_sets))
  ) {
    return 'Target sets must be a number';
  }

  return null;
};

const validatePlanInput = ({ name, image, exercises }) => {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Workout name is required');
  }

  if (!isValidPlanImage(image)) {
    throw new ValidationError('Workout image is invalid');
  }

  if (!Array.isArray(exercises)) {
    throw new ValidationError('Exercises must be an array');
  }

  const invalidExerciseMessage = exercises.map(validateExerciseInput).find(Boolean);
  if (invalidExerciseMessage) {
    throw new ValidationError(invalidExerciseMessage);
  }
};

const mapExerciseInput = (exercise) => ({
  exerciseName: exercise.exercise_name.trim(),
  targetSets: exercise.target_sets === undefined || exercise.target_sets === null
    ? null
    : Number(exercise.target_sets),
  targetReps: exercise.target_reps ?? null,
});

async function createWorkoutPlan(data, userId) {
  const { name, description = '', image, exercises = [] } = data;
  validatePlanInput({ name, image, exercises });

  const plan = await prisma.plan.create({
    data: {
      name: name.trim(),
      description,
      image: normalizePlanImage(image),
      iconKey: normalizeIconKey(data.icon_key),
      userId,
      exercises: {
        create: exercises.map(mapExerciseInput),
      },
    },
    include: { exercises: true },
  });

  broadcastToUser(userId, 'plans:changed', {
    action: 'created',
    id: plan.id,
  });
  sendPushToUserLater(userId, {
    title: 'Workout plan created',
    body: `${plan.name} was added to your NEXT REPS workouts.`,
    url: '/workouts',
  });

  return serializePlan(plan);
}

async function updateWorkoutPlan(planIdValue, data, userId) {
  const { name, description = '', image, exercises = [] } = data;
  validatePlanInput({ name, image, exercises });

  const planId = toNumberId(planIdValue);
  if (!planId) throw new NotFoundError('Workout not found');

  const plan = await prisma.plan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new NotFoundError('Workout not found');

  const updatedPlan = await prisma.$transaction(async (tx) => {
    await tx.planExercise.deleteMany({ where: { planId } });
    return tx.plan.update({
      where: { id: planId },
      data: {
        name: name.trim(),
        description,
        image: normalizePlanImage(image),
        iconKey: normalizeIconKey(data.icon_key),
        exercises: {
          create: exercises.map(mapExerciseInput),
        },
      },
      include: { exercises: true },
    });
  });

  broadcastToUser(userId, 'plans:changed', {
    action: 'updated',
    id: updatedPlan.id,
  });
  sendPushToUserLater(userId, {
    title: 'Workout plan updated',
    body: `${updatedPlan.name} was updated.`,
    url: '/workouts',
  });

  return serializePlan(updatedPlan);
}

module.exports = {
  NotFoundError,
  ValidationError,
  createWorkoutPlan,
  serializeExercise,
  serializePlan,
  toNumberId,
  updateWorkoutPlan,
  validateExerciseInput,
};
