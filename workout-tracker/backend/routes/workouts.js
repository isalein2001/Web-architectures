const express = require('express');
const { prisma } = require('../prismaClient');
const { broadcastToUser } = require('../events');
const { sendPushToUserLater } = require('../push');

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
  exercises: (plan.exercises || []).map(serializeExercise),
});

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

function createWorkoutsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const plans = await prisma.plan.findMany({
        where: { userId: req.user.userId },
        include: { exercises: true },
        orderBy: { id: 'asc' },
      });
      res.status(200).json(plans.map(serializePlan));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', async (req, res) => {
    const { name, description = '', exercises = [] } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Workout name is required' });
    }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({ error: 'Exercises must be an array' });
    }

    const invalidExerciseMessage = exercises.map(validateExerciseInput).find(Boolean);
    if (invalidExerciseMessage) {
      return res.status(400).json({ error: invalidExerciseMessage });
    }

    try {
      const plan = await prisma.plan.create({
        data: {
          name: name.trim(),
          description,
          userId: req.user.userId,
          exercises: {
            create: exercises.map((exercise) => ({
              exerciseName: exercise.exercise_name.trim(),
              targetSets: exercise.target_sets === undefined || exercise.target_sets === null
                ? null
                : Number(exercise.target_sets),
              targetReps: exercise.target_reps ?? null,
            })),
          },
        },
      });

      broadcastToUser(req.user.userId, 'plans:changed', {
        action: 'created',
        id: plan.id,
      });
      sendPushToUserLater(req.user.userId, {
        title: 'Workout plan created',
        body: `${plan.name} was added to your PROGYM workouts.`,
        url: '/workouts',
      });
      res.status(201).json({ id: plan.id, name: plan.name, description: plan.description });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:planId/exercises', async (req, res) => {
    const planId = toNumberId(req.params.planId);
    if (!planId) return res.status(404).json({ error: 'Workout not found' });

    try {
      const plan = await prisma.plan.findFirst({ where: { id: planId, userId: req.user.userId } });
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const exercises = await prisma.planExercise.findMany({
        where: { planId },
        orderBy: { id: 'asc' },
      });
      res.status(200).json(exercises.map(serializeExercise));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:planId/exercises', async (req, res) => {
    const validationError = validateExerciseInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const planId = toNumberId(req.params.planId);
    if (!planId) return res.status(404).json({ error: 'Workout not found' });

    try {
      const plan = await prisma.plan.findFirst({ where: { id: planId, userId: req.user.userId } });
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const exercise = await prisma.planExercise.create({
        data: {
          planId,
          exerciseName: req.body.exercise_name.trim(),
          targetSets: req.body.target_sets === undefined || req.body.target_sets === null
            ? null
            : Number(req.body.target_sets),
          targetReps: req.body.target_reps ?? null,
        },
      });
      res.status(201).json(serializeExercise(exercise));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:planId/exercises/:exerciseId', async (req, res) => {
    const planId = toNumberId(req.params.planId);
    const exerciseId = toNumberId(req.params.exerciseId);
    if (!planId || !exerciseId) return res.status(404).json({ error: 'Exercise not found' });

    try {
      const exercise = await prisma.planExercise.findFirst({
        where: { id: exerciseId, planId, plan: { userId: req.user.userId } },
      });
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      res.status(200).json(serializeExercise(exercise));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:planId/exercises/:exerciseId', async (req, res) => {
    const validationError = validateExerciseInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const planId = toNumberId(req.params.planId);
    const exerciseId = toNumberId(req.params.exerciseId);
    if (!planId || !exerciseId) return res.status(404).json({ error: 'Exercise not found' });

    try {
      const exercise = await prisma.planExercise.findFirst({
        where: { id: exerciseId, planId, plan: { userId: req.user.userId } },
      });
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      const updatedExercise = await prisma.planExercise.update({
        where: { id: exerciseId },
        data: {
          exerciseName: req.body.exercise_name.trim(),
          targetSets: req.body.target_sets === undefined || req.body.target_sets === null
            ? null
            : Number(req.body.target_sets),
          targetReps: req.body.target_reps ?? null,
        },
      });

      res.status(200).json(serializeExercise(updatedExercise));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:planId/exercises/:exerciseId', async (req, res) => {
    const planId = toNumberId(req.params.planId);
    const exerciseId = toNumberId(req.params.exerciseId);
    if (!planId || !exerciseId) return res.status(404).json({ error: 'Exercise not found' });

    try {
      const exercise = await prisma.planExercise.findFirst({
        where: { id: exerciseId, planId, plan: { userId: req.user.userId } },
      });
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      await prisma.planExercise.delete({ where: { id: exerciseId } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    const planId = toNumberId(req.params.id);
    if (!planId) return res.status(404).json({ error: 'Workout not found' });

    try {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        include: { exercises: true },
      });
      if (!plan || plan.userId !== req.user.userId) return res.status(404).json({ error: 'Workout not found' });

      res.status(200).json(serializePlan(plan));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', async (req, res) => {
    const { name, description = '', exercises = [] } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Workout name is required' });
    }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({ error: 'Exercises must be an array' });
    }

    const invalidExerciseMessage = exercises.map(validateExerciseInput).find(Boolean);
    if (invalidExerciseMessage) {
      return res.status(400).json({ error: invalidExerciseMessage });
    }

    const planId = toNumberId(req.params.id);
    if (!planId) return res.status(404).json({ error: 'Workout not found' });

    try {
      const plan = await prisma.plan.findFirst({ where: { id: planId, userId: req.user.userId } });
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const updatedPlan = await prisma.$transaction(async (tx) => {
        await tx.planExercise.deleteMany({ where: { planId } });
        return tx.plan.update({
          where: { id: planId },
          data: {
            name: name.trim(),
            description,
            exercises: {
              create: exercises.map((exercise) => ({
                exerciseName: exercise.exercise_name.trim(),
                targetSets: exercise.target_sets === undefined || exercise.target_sets === null
                  ? null
                  : Number(exercise.target_sets),
                targetReps: exercise.target_reps ?? null,
              })),
            },
          },
          include: { exercises: true },
        });
      });

      broadcastToUser(req.user.userId, 'plans:changed', {
        action: 'updated',
        id: updatedPlan.id,
      });
      sendPushToUserLater(req.user.userId, {
        title: 'Workout plan updated',
        body: `${updatedPlan.name} was updated.`,
        url: '/workouts',
      });
      res.status(200).json(serializePlan(updatedPlan));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    const planId = toNumberId(req.params.id);
    if (!planId) return res.status(404).json({ error: 'Workout not found' });

    try {
      const plan = await prisma.plan.findFirst({ where: { id: planId, userId: req.user.userId } });
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      await prisma.plan.delete({ where: { id: planId } });
      broadcastToUser(req.user.userId, 'plans:changed', {
        action: 'deleted',
        id: planId,
      });
      sendPushToUserLater(req.user.userId, {
        title: 'Workout plan deleted',
        body: `${plan.name} was removed from your workouts.`,
        url: '/workouts',
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createWorkoutsRouter;
