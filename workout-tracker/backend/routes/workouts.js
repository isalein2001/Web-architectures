const express = require('express');

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

    const invalidExerciseMessage = exercises.map(validateExerciseInput).find(Boolean);
    if (invalidExerciseMessage) {
      return res.status(400).json({ error: invalidExerciseMessage });
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

  router.get('/:planId/exercises', async (req, res) => {
    try {
      const plan = await db.get('SELECT id FROM plans WHERE id = ?', [req.params.planId]);
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const exercises = await db.all(
        'SELECT * FROM plan_exercises WHERE plan_id = ?',
        [req.params.planId]
      );
      res.status(200).json(exercises);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:planId/exercises', async (req, res) => {
    const validationError = validateExerciseInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const plan = await db.get('SELECT id FROM plans WHERE id = ?', [req.params.planId]);
      if (!plan) return res.status(404).json({ error: 'Workout not found' });

      const result = await db.run(
        'INSERT INTO plan_exercises (plan_id, exercise_name, target_sets, target_reps) VALUES (?, ?, ?, ?)',
        [req.params.planId, req.body.exercise_name.trim(), req.body.target_sets, req.body.target_reps]
      );
      const exercise = await db.get('SELECT * FROM plan_exercises WHERE id = ?', [result.lastID]);
      res.status(201).json(exercise);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:planId/exercises/:exerciseId', async (req, res) => {
    try {
      const exercise = await db.get(
        'SELECT * FROM plan_exercises WHERE id = ? AND plan_id = ?',
        [req.params.exerciseId, req.params.planId]
      );
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      res.status(200).json(exercise);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:planId/exercises/:exerciseId', async (req, res) => {
    const validationError = validateExerciseInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      const exercise = await db.get(
        'SELECT id FROM plan_exercises WHERE id = ? AND plan_id = ?',
        [req.params.exerciseId, req.params.planId]
      );
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      await db.run(
        `UPDATE plan_exercises
         SET exercise_name = ?, target_sets = ?, target_reps = ?
         WHERE id = ? AND plan_id = ?`,
        [
          req.body.exercise_name.trim(),
          req.body.target_sets,
          req.body.target_reps,
          req.params.exerciseId,
          req.params.planId,
        ]
      );

      const updatedExercise = await db.get(
        'SELECT * FROM plan_exercises WHERE id = ? AND plan_id = ?',
        [req.params.exerciseId, req.params.planId]
      );
      res.status(200).json(updatedExercise);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:planId/exercises/:exerciseId', async (req, res) => {
    try {
      const exercise = await db.get(
        'SELECT id FROM plan_exercises WHERE id = ? AND plan_id = ?',
        [req.params.exerciseId, req.params.planId]
      );
      if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

      await db.run(
        'DELETE FROM plan_exercises WHERE id = ? AND plan_id = ?',
        [req.params.exerciseId, req.params.planId]
      );
      res.status(204).send();
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

    const invalidExerciseMessage = exercises.map(validateExerciseInput).find(Boolean);
    if (invalidExerciseMessage) {
      return res.status(400).json({ error: invalidExerciseMessage });
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
