const express = require('express');

function createWorkoutsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const plans = await db.all('SELECT * FROM plans');
      for (const plan of plans) {
        const exercises = await db.all('SELECT * FROM plan_exercises WHERE plan_id = ?', [plan.id]);
        plan.exercises = exercises;
      }
      res.status(200).json(plans);
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

    const invalidExercise = exercises.find((exercise) => !exercise.exercise_name);
    if (invalidExercise) {
      return res.status(400).json({ error: 'Every exercise needs an exercise_name' });
    }

    try {
      const result = await db.run(
        'INSERT INTO plans (name, description) VALUES (?, ?)',
        [name.trim(), description]
      );
      const planId = result.lastID;

      if (exercises.length > 0) {
        const placeholders = exercises.map(() => '(?, ?, ?, ?)').join(',');
        const values = exercises.flatMap((exercise) => [
          planId,
          exercise.exercise_name,
          exercise.target_sets,
          exercise.target_reps,
        ]);
        await db.run(
          `INSERT INTO plan_exercises (plan_id, exercise_name, target_sets, target_reps) VALUES ${placeholders}`,
          values
        );
      }

      res.status(201).json({ id: planId, name: name.trim(), description });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const plan = await db.get('SELECT * FROM plans WHERE id = ?', [req.params.id]);
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const exercises = await db.all('SELECT * FROM plan_exercises WHERE plan_id = ?', [req.params.id]);
      res.status(200).json({ ...plan, exercises });
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

    const invalidExercise = exercises.find((exercise) => !exercise.exercise_name);
    if (invalidExercise) {
      return res.status(400).json({ error: 'Every exercise needs an exercise_name' });
    }

    try {
      const plan = await db.get('SELECT id FROM plans WHERE id = ?', [req.params.id]);
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      await db.exec('BEGIN');
      await db.run(
        'UPDATE plans SET name = ?, description = ? WHERE id = ?',
        [name.trim(), description, req.params.id]
      );
      await db.run('DELETE FROM plan_exercises WHERE plan_id = ?', [req.params.id]);

      if (exercises.length > 0) {
        const placeholders = exercises.map(() => '(?, ?, ?, ?)').join(',');
        const values = exercises.flatMap((exercise) => [
          req.params.id,
          exercise.exercise_name,
          exercise.target_sets,
          exercise.target_reps,
        ]);
        await db.run(
          `INSERT INTO plan_exercises (plan_id, exercise_name, target_sets, target_reps) VALUES ${placeholders}`,
          values
        );
      }
      await db.exec('COMMIT');

      const updatedPlan = await db.get('SELECT * FROM plans WHERE id = ?', [req.params.id]);
      const updatedExercises = await db.all('SELECT * FROM plan_exercises WHERE plan_id = ?', [req.params.id]);
      res.status(200).json({ ...updatedPlan, exercises: updatedExercises });
    } catch (error) {
      await db.exec('ROLLBACK').catch(() => {});
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const plan = await db.get('SELECT id FROM plans WHERE id = ?', [req.params.id]);
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      await db.run('DELETE FROM plans WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createWorkoutsRouter;
