const express = require('express');
const { prisma } = require('../prismaClient');

const serializeProgressLog = (log) => ({
  id: log.id,
  session_id: log.sessionId,
  exercise_name: log.exerciseName,
  set_number: log.setNumber,
  reps: log.reps,
  weight: log.weight,
  rest_seconds: log.restSeconds,
  date: log.session?.date,
});

function createProgressRouter() {
  const router = express.Router();

  router.get('/:exercise_name', async (req, res) => {
    const { exercise_name: exerciseName } = req.params;

    if (!exerciseName) {
      return res.status(400).json({ error: 'Exercise name is required' });
    }

    try {
      const logs = await prisma.workoutLog.findMany({
        where: {
          exerciseName,
          session: { userId: req.user.userId },
        },
        include: { session: true },
        orderBy: {
          session: {
            date: 'asc',
          },
        },
      });

      res.status(200).json(logs.map(serializeProgressLog));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createProgressRouter;
