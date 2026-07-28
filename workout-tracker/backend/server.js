const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const createAuthRouter = require('./modules/identity-access/identity-access.routes');
const createWorkoutsRouter = require('./modules/training/training.routes');
const createSessionsRouter = require('./modules/training/sessions.routes');
const {
  createCoachRouter,
  createProgressRouter,
  createStatsRouter,
} = require('./modules/insights-coaching/insights-coaching.routes');
const createDailyActivityRouter = require('./modules/daily-activity/daily-activity.routes');
const createPushRouter = require('./modules/notifications/notifications.routes');
const { authenticate } = require('./middleware/authenticate');
const { authRateLimiter } = require('./middleware/rateLimiters');
const { createEventsRouter } = require('./events');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env');
}

const app = express();

// The app runs behind the Apache reverse proxy on konsoleH.
// Trust the first proxy so Express can read HTTPS/IP headers correctly.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

const shouldForceHttps = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false';

app.use((req, res, next) => {
  if (!shouldForceHttps || req.secure) {
    return next();
  }

  return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "media-src 'self'",
    ].join('; '),
  );

  next();
});

const PORT = process.env.PORT || 3000;

const workoutsRouter = createWorkoutsRouter();

app.use('/api/auth', authRateLimiter, createAuthRouter());
app.use('/api/events', authenticate, createEventsRouter());
app.use('/api/plans', authenticate, workoutsRouter);
app.use('/api/workouts', authenticate, workoutsRouter);
app.use('/api/sessions', authenticate, createSessionsRouter());
app.use('/api/progress', authenticate, createProgressRouter());
app.use('/api/stats', authenticate, createStatsRouter());
app.use('/api/daily-activity', authenticate, createDailyActivityRouter());
app.use('/api/push', authenticate, createPushRouter());
app.use('/api/coach', authenticate, createCoachRouter());

// Unknown API paths should stay JSON responses and must not fall through
// to the React SPA fallback.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve the Vite production build.
const distPath = path.join(__dirname, 'public');
app.use(express.static(distPath, {
  index: false,
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
