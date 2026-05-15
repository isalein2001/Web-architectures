const express = require('express');
const { prisma } = require('../prismaClient');

function createStatsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const sessions = await prisma.workoutSession.findMany({
        where: { userId: req.user.userId },
        select: { date: true },
        orderBy: { date: 'desc' },
      });
      res.status(200).json({
        totalSessions: sessions.length,
        sessionDates: sessions.map((session) => session.date),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createStatsRouter;
