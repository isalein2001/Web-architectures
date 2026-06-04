const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const createAuthRouter = require('./routes/auth');
const createWorkoutsRouter = require('./routes/workouts');
const createSessionsRouter = require('./routes/sessions');
const createProgressRouter = require('./routes/progress');
const createStatsRouter = require('./routes/stats');
const createDailyActivityRouter = require('./routes/dailyActivity');
const createPushRouter = require('./routes/push');
const { authenticate } = require('./middleware/authenticate');
const { createEventsRouter } = require('./events');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env');
}

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

const workoutsRouter = createWorkoutsRouter();

app.use('/api/auth', createAuthRouter());
app.use('/api/events', authenticate, createEventsRouter());
app.use('/api/plans', authenticate, workoutsRouter);
app.use('/api/workouts', authenticate, workoutsRouter);
app.use('/api/sessions', authenticate, createSessionsRouter());
app.use('/api/progress', authenticate, createProgressRouter());
app.use('/api/stats', authenticate, createStatsRouter());
app.use('/api/daily-activity', authenticate, createDailyActivityRouter());
app.use('/api/push', authenticate, createPushRouter());

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
