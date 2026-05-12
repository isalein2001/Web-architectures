const express = require('express');

function createProgressRouter(db) {
  const router = express.Router();

  router.get('/:exercise_name', async (req, res) => {
    const { exercise_name: exerciseName } = req.params;

    if (!exerciseName) {
      return res.status(400).json({ error: 'Exercise name is required' });
    }

    try {
      const logs = await db.all(`
        SELECT wl.*, ws.date
        FROM workout_logs wl
        JOIN workout_sessions ws ON wl.session_id = ws.id
        WHERE wl.exercise_name = ?
        ORDER BY ws.date ASC
      `, [exerciseName]);

      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createProgressRouter;
