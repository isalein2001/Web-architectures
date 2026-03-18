const express = require('express');
const cors = require('cors');
const { initializeDb } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let db;

app.get('/api/plans', async (req, res) => {
  try {
    const plans = await db.all('SELECT * FROM plans');
    for (let plan of plans) {
       const exercises = await db.all('SELECT * FROM plan_exercises WHERE plan_id = ?', [plan.id]);
       plan.exercises = exercises;
    }
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plans', async (req, res) => {
  const { name, description, exercises } = req.body;
  try {
    const result = await db.run('INSERT INTO plans (name, description) VALUES (?, ?)', [name, description]);
    const planId = result.lastID;

    if (exercises && exercises.length > 0) {
      const placeholders = exercises.map(() => '(?, ?, ?, ?)').join(',');
      const values = exercises.flatMap(ex => [planId, ex.exercise_name, ex.target_sets, ex.target_reps]);
      await db.run(`INSERT INTO plan_exercises (plan_id, exercise_name, target_sets, target_reps) VALUES ${placeholders}`, values);
    }
    res.status(201).json({ id: planId, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/plans/:id', async (req, res) => {
  try {
    const plan = await db.get('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const exercises = await db.all('SELECT * FROM plan_exercises WHERE plan_id = ?', [req.params.id]);
    res.json({ ...plan, exercises });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  const { date, plan_id, notes, logs } = req.body;
  try {
    const result = await db.run('INSERT INTO workout_sessions (date, plan_id, notes) VALUES (?, ?, ?)', [date, plan_id, notes]);
    const sessionId = result.lastID;

    if (logs && logs.length > 0) {
        const placeholders = logs.map(() => '(?, ?, ?, ?, ?)').join(',');
        const values = logs.flatMap(log => [sessionId, log.exercise_name, log.set_number, log.reps, log.weight]);
        await db.run(`INSERT INTO workout_logs (session_id, exercise_name, set_number, reps, weight) VALUES ${placeholders}`, values);
    }

    res.status(201).json({ id: sessionId, date, plan_id, notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.all(`
      SELECT ws.*, p.name as plan_name 
      FROM workout_sessions ws 
      LEFT JOIN plans p ON ws.plan_id = p.id 
      ORDER BY ws.date DESC LIMIT 20
    `);
    
    for (let session of sessions) {
      const logs = await db.all('SELECT * FROM workout_logs WHERE session_id = ?', [session.id]);
      session.logs = logs;
    }
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/progress/:exercise_name', async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT wl.*, ws.date 
      FROM workout_logs wl
      JOIN workout_sessions ws ON wl.session_id = ws.id
      WHERE wl.exercise_name = ?
      ORDER BY ws.date ASC
    `, [req.params.exercise_name]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
    try {
        const sessions = await db.all('SELECT date FROM workout_sessions ORDER BY date DESC');
        res.json({ totalSessions: sessions.length, sessionDates: sessions.map(s => s.date) });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

initializeDb().then(database => {
  db = database;
  app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize local database:', err);
});
