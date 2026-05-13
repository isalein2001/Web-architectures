const express = require('express');

function createSessionsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const sessions = await db.all(`
        SELECT ws.*, p.name as plan_name
        FROM workout_sessions ws
        LEFT JOIN plans p ON ws.plan_id = p.id
        ORDER BY ws.date DESC LIMIT 20
      `);

      for (const session of sessions) {
        const logs = await db.all('SELECT * FROM workout_logs WHERE session_id = ?', [session.id]);
        session.logs = logs;
      }

      res.status(200).json(sessions);
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
      const result = await db.run(
        'INSERT INTO workout_sessions (date, plan_id, notes) VALUES (?, ?, ?)',
        [date, plan_id, notes]
      );
      const sessionId = result.lastID;

      if (logs.length > 0) {
        const placeholders = logs.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
        const values = logs.flatMap((log) => [
          sessionId,
          log.exercise_name,
          log.set_number,
          log.reps,
          log.weight,
          log.rest_seconds,
        ]);
        await db.run(
          `INSERT INTO workout_logs (session_id, exercise_name, set_number, reps, weight, rest_seconds) VALUES ${placeholders}`,
          values
        );
      }

      res.status(201).json({ id: sessionId, date, plan_id, notes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const session = await db.get('SELECT id FROM workout_sessions WHERE id = ?', [req.params.id]);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      await db.run('DELETE FROM workout_sessions WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createSessionsRouter;
