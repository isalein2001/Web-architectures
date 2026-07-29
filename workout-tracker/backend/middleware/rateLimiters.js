const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const windowMs = toPositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, FIFTEEN_MINUTES_MS);

const authRateLimiter = rateLimit({
  windowMs,
  limit: toPositiveNumber(process.env.AUTH_RATE_LIMIT_MAX, 100),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
});

const loginRateLimiter = rateLimit({
  windowMs,
  limit: toPositiveNumber(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Zu viele Login-Versuche. Bitte versuche es später erneut.' },
});

const authEmailRateLimiter = rateLimit({
  windowMs,
  limit: toPositiveNumber(process.env.AUTH_EMAIL_RATE_LIMIT_MAX, 5),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId
    ? `user:${req.user.userId}`
    : `ip:${ipKeyGenerator(req.ip)}`,
  message: { error: 'Zu viele E-Mail-Anfragen. Bitte versuche es später erneut.' },
});

const verificationRateLimiter = rateLimit({
  windowMs,
  limit: toPositiveNumber(process.env.AUTH_VERIFICATION_RATE_LIMIT_MAX, 5),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.user?.userId || ipKeyGenerator(req.ip)}:${req.path}`,
  message: { error: 'Zu viele Verifizierungsversuche. Bitte versuche es später erneut.' },
});

module.exports = {
  authEmailRateLimiter,
  authRateLimiter,
  loginRateLimiter,
  verificationRateLimiter,
};
