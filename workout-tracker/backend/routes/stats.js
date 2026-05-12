const express = require('express');

function createStatsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const sessions = await db.all('SELECT date FROM workout_sessions ORDER BY date DESC');
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
