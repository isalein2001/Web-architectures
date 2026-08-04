require('dotenv/config');

const jwt = require('jsonwebtoken');
const { prisma } = require('../prismaClient');

const AUTH_COOKIE_NAME = 'nextreps_token';

const getAuthCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

function readToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  return authHeader.slice('Bearer '.length).trim();
}

async function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
      return res.status(401).json({ error: 'Nicht autorisiert.' });
    }

    req.user = {
      ...payload,
      userId: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      onboardingCompleted: Boolean(user.onboardingCompleted),
    };

    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error);
    return res.status(500).json({ error: 'Ein interner Fehler ist aufgetreten.' });
  }
}

function ensureEmailVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      error: 'Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse.',
    });
  }

  return next();
}

module.exports = {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  authenticate,
  ensureEmailVerified,
};
