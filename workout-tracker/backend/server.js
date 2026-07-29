const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
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
const { authenticate, ensureEmailVerified } = require('./middleware/authenticate');
const { authRateLimiter } = require('./middleware/rateLimiters');
const { createEventsRouter } = require('./events');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env');
}

const app = express();

// The app runs behind the Apache reverse proxy on konsoleH.
// Only known proxy addresses may supply forwarding headers. A numeric hop count
// would also trust an attacker-controlled X-Forwarded-For value when a request
// reaches the app through a shorter path.
const trustedProxies = [
  'loopback',
  ...String(process.env.TRUSTED_PROXY_IPS || '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean),
];
app.set('trust proxy', trustedProxies);
app.disable('x-powered-by');

app.use(cookieParser());
app.use('/api/auth', authRateLimiter);

// Profile images are capped at 500 KB after decoding. Allow their Base64/JSON
// overhead only on the authenticated profile update endpoint.
app.put(
  '/api/auth/me',
  authenticate,
  express.json({ limit: '750kb' }),
  (req, res, next) => next()
);

app.use(express.json({ limit: '100kb' }));

const shouldForceHttps = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false';
const getTrustedHttpsOrigin = () => {
  const configuredHost = (process.env.APP_HOST || 'next-reps.de').trim();
  const candidate = /^https?:\/\//i.test(configuredHost) ? configuredHost : `https://${configuredHost}`;

  try {
    const url = new URL(candidate);
    return `https://${url.host}`;
  } catch {
    return 'https://next-reps.de';
  }
};
const trustedHttpsOrigin = getTrustedHttpsOrigin();
const contentSecurityPolicyDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  manifestSrc: ["'self'"],
  workerSrc: ["'self'"],
  mediaSrc: ["'self'"],
};

app.use((req, res, next) => {
  if (!shouldForceHttps || req.secure) {
    return next();
  }

  return res.redirect(308, `${trustedHttpsOrigin}${req.originalUrl}`);
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: contentSecurityPolicyDirectives,
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

const PORT = process.env.PORT || 3000;

const workoutsRouter = createWorkoutsRouter();
const verifiedUser = [authenticate, ensureEmailVerified];

app.use('/api/auth', createAuthRouter());
app.use('/api/events', verifiedUser, createEventsRouter());
app.use('/api/plans', verifiedUser, workoutsRouter);
app.use('/api/workouts', verifiedUser, workoutsRouter);
app.use('/api/sessions', verifiedUser, createSessionsRouter());
app.use('/api/progress', verifiedUser, createProgressRouter());
app.use('/api/stats', verifiedUser, createStatsRouter());
app.use('/api/daily-activity', verifiedUser, createDailyActivityRouter());
app.use('/api/push', verifiedUser, createPushRouter());
app.use('/api/coach', verifiedUser, createCoachRouter());

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
