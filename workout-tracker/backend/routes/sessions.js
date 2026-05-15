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
  plan_name: session.plan?.name || null,
  logs: (session.logs || []).map(serializeLog),
});

function createSessionsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const sessions = await prisma.workoutSession.findMany({
        include: {
          plan: true,
          logs: {
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { date: 'desc' },
        take: 20,
      });

      res.status(200).json(sessions.map(serializeSession));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', async (req, res) => {
    const { date, plan_id, notes = '', logs = [] } = req.body;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Session date is required' });
    }

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Logs must be an array' });
    }

    const invalidLog = logs.find((log) => !log.exercise_name);
    if (invalidLog) {
      return res.status(400).json({ error: 'Every log needs an exercise_name' });
    }

    try {
      const session = await prisma.workoutSession.create({
        data: {
          date,
          planId: plan_id ?? null,
          notes,
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

      res.status(201).json({ id: session.id, date: session.date, plan_id: session.planId, notes: session.notes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    const sessionId = toNumberId(req.params.id);
    if (!sessionId) return res.status(404).json({ error: 'Session not found' });

    try {
      const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
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
