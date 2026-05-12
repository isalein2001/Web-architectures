const express = require('express');
const cors = require('cors');
const { initializeDb } = require('./database');
const createWorkoutsRouter = require('./routes/workouts');
const createSessionsRouter = require('./routes/sessions');
const createProgressRouter = require('./routes/progress');
const createStatsRouter = require('./routes/stats');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

initializeDb().then((db) => {
  const workoutsRouter = createWorkoutsRouter(db);

  app.use('/api/plans', workoutsRouter);
  app.use('/api/workouts', workoutsRouter);
  app.use('/api/sessions', createSessionsRouter(db));
  app.use('/api/progress', createProgressRouter(db));
  app.use('/api/stats', createStatsRouter(db));

  app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
}).catch((error) => {
  console.error('Failed to initialize local database:', error);
});
