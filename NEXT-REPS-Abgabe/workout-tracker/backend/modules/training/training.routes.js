const express = require('express');
const { prisma } = require('../../prismaClient');
const { broadcastToUser } = require('../../events');
const { sendPushToUserLater } = require('../../push');
const {
  NotFoundError,
  ValidationError,
  createWorkoutPlan,
  serializeExercise,
  serializePlan,
  toNumberId,
  updateWorkoutPlan,
  validateExerciseInput,
} = require('./training.service');

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
    try {
      const plan = await createWorkoutPlan(req.body, req.user.userId);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
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
    try {
      const plan = await updateWorkoutPlan(req.params.id, req.body, req.user.userId);
      res.status(200).json(plan);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
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
