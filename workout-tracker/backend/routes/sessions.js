const express = require('express');
const { prisma } = require('../prismaClient');

const toNumberId = (id) => {
  const parsedId = Number(id);
  return Number.isInteger(parsedId) ? parsedId : null;
};

const serializeLog = (log) => ({
  id: log.id,
  session_id: log.sessionId,
  exercise_name: log.exerciseName,
  set_number: log.setNumber,
  reps: log.reps,
  weight: log.weight,
  rest_seconds: log.restSeconds,
});

const serializeSession = (session) => ({
  id: session.id,
  date: session.date,
  plan_id: session.planId,
  notes: session.notes,
  calories_burned: session.caloriesBurned,
  duration_seconds: session.durationSeconds,
  intensity: session.intensity,
  plan_name: session.plan?.name || null,
  logs: (session.logs || []).map(serializeLog),
});

function createSessionsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const sessions = await prisma.workoutSession.findMany({
        where: { userId: req.user.userId },
        include: {
          plan: true,
          logs: {
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { date: 'desc' },
        take: 500,
      });

      res.status(200).json(sessions.map(serializeSession));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', async (req, res) => {
    const {
      date,
      plan_id,
      notes = '',
      logs = [],
      calories_burned,
      duration_seconds,
      intensity,
    } = req.body;
    const planId = plan_id === undefined || plan_id === null ? null : toNumberId(plan_id);
    const caloriesBurned = calories_burned === undefined || calories_burned === null || calories_burned === ''
      ? null
      : Number(calories_burned);
    const durationSeconds = duration_seconds === undefined || duration_seconds === null || duration_seconds === ''
      ? null
      : Number(duration_seconds);

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Session date is required' });
    }

    if (plan_id !== undefined && plan_id !== null && !planId) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs must be an array' });
    }

    if (caloriesBurned !== null && (!Number.isInteger(caloriesBurned) || caloriesBurned < 0 || caloriesBurned > 3000)) {
      return res.status(400).json({ error: 'Calories burned must be a number between 0 and 3000' });
    }

    if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400)) {
      return res.status(400).json({ error: 'Duration must be a valid number of seconds' });
    }

    if (intensity && !['light', 'moderate', 'intense', 'hiit'].includes(intensity)) {
      return res.status(400).json({ error: 'Intensity is invalid' });
    }

    const invalidLog = logs.find((log) => !log.exercise_name);
    if (invalidLog) {
      return res.status(400).json({ error: 'Every log needs an exercise_name' });
    }

    try {
      if (planId) {
        const plan = await prisma.plan.findFirst({
          where: { id: planId, userId: req.user.userId },
        });
        if (!plan) return res.status(404).json({ error: 'Workout not found' });
      }

      const session = await prisma.workoutSession.create({
        data: {
          date,
          planId,
          userId: req.user.userId,
          notes,
          caloriesBurned,
          durationSeconds,
          intensity: intensity || null,
          logs: {
            create: logs.map((log) => ({
              exerciseName: log.exercise_name,
              setNumber: log.set_number ?? null,
              reps: log.reps ?? null,
              weight: log.weight ?? null,
              restSeconds: log.rest_seconds ?? null,
            })),
          },
        },
      });

      res.status(201).json({
        id: session.id,
        date: session.date,
        plan_id: session.planId,
        notes: session.notes,
        calories_burned: session.caloriesBurned,
        duration_seconds: session.durationSeconds,
        intensity: session.intensity,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    const sessionId = toNumberId(req.params.id);
    if (!sessionId) return res.status(404).json({ error: 'Session not found' });

    try {
      const session = await prisma.workoutSession.findFirst({
        where: { id: sessionId, userId: req.user.userId },
      });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      await prisma.workoutLog.deleteMany({ where: { sessionId } });
      await prisma.workoutSession.delete({ where: { id: sessionId } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createSessionsRouter;
