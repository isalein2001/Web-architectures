require('dotenv/config');

const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'nextreps_token';

function readToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  return authHeader.slice('Bearer '.length).trim();
}

function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }
}

module.exports = {
  AUTH_COOKIE_NAME,
  authenticate,
};
