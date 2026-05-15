const express = require('express');
const cors = require('cors');
const createWorkoutsRouter = require('./routes/workouts');
const createSessionsRouter = require('./routes/sessions');
const createProgressRouter = require('./routes/progress');
const createStatsRouter = require('./routes/stats');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const workoutsRouter = createWorkoutsRouter();

app.use('/api/plans', workoutsRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/sessions', createSessionsRouter());
app.use('/api/progress', createProgressRouter());
app.use('/api/stats', createStatsRouter());

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
