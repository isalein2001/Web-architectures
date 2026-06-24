const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
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

// The app runs behind the Apache reverse proxy on konsoleH.
// Trust the first proxy so Express can read HTTPS/IP headers correctly.
app.set('trust proxy', 1);

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

// Unknown API paths should stay JSON responses and must not fall through
// to the React SPA fallback.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve the Vite production build. In this repo the backend and frontend
// folders are siblings, so the build output is ../frontend/dist.
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// SPA fallback for client-side routes such as /login and /dashboard.
// Express 5 changed wildcard route parsing, so use a final middleware
// instead of app.get('*', ...). index.html must not be cached.
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
