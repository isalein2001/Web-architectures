const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prismaClient');
const { AUTH_COOKIE_NAME, authenticate } = require('../middleware/authenticate');
const { sendVerificationEmailLater } = require('../mail');

const INVALID_LOGIN_MESSAGE = 'E-Mail oder Passwort ungültig.';
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const DEMO_EMAIL = 'jonasarnold@gmail.com';
const MIN_PASSWORD_LENGTH = 8;

const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));

const isDemoAccount = (email) => email === DEMO_EMAIL;

const isStrongPassword = (password) => (
  typeof password === 'string'
  && password.length >= MIN_PASSWORD_LENGTH
  && /[A-Za-z]/.test(password)
  && /\d/.test(password)
);

const isAllowedProfileImage = (profileImage) => (
  profileImage === null
  || profileImage === ''
  || (typeof profileImage === 'string'
    && /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(profileImage)
    && profileImage.length <= 15_000_000)
);

const selectPublicUser = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  emailVerified: true,
  onboardingCompleted: true,
  heightCm: true,
  weightKg: true,
  gender: true,
  hydrationGoalLiters: true,
  fitnessGoal: true,
  profileImage: true,
};

const createToken = (user) => jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/',
  });
};

function createAuthRouter() {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const firstName = normalizeText(req.body.firstName);
    const lastName = normalizeText(req.body.lastName);
    const legacyName = normalizeText(req.body.name || req.body.fullName);
    const name = firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : legacyName;

    if (!email || !password || typeof password !== 'string' || !firstName || !lastName) {
      return res.status(400).json({ error: 'Vorname, Nachname, E-Mail und Passwort sind erforderlich.' });
    }

    if (!isDemoAccount(email) && !isStrongPassword(password)) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben und Buchstaben sowie Zahlen enthalten.' });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'E-Mail bereits vergeben.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const verificationCode = isDemoAccount(email) ? null : createVerificationCode();
      const user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          firstName,
          lastName,
          emailVerified: isDemoAccount(email),
          verificationCode,
          onboardingCompleted: isDemoAccount(email),
          passwordHash,
        },
        select: selectPublicUser,
      });

      if (verificationCode) {
        sendVerificationEmailLater({
          to: email,
          firstName,
          code: verificationCode,
        });
      }

      const token = createToken(user);
      setAuthCookie(res, token);

      res.status(201).json({
        user,
        ...(process.env.NODE_ENV !== 'production' && verificationCode ? { verificationCode } : {}),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password || typeof password !== 'string') {
      return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
      }

      const token = createToken(user);
      setAuthCookie(res, token);

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompleted,
          heightCm: user.heightCm,
          weightKg: user.weightKg,
          gender: user.gender,
          hydrationGoalLiters: user.hydrationGoalLiters,
          fitnessGoal: user.fitnessGoal,
          profileImage: user.profileImage,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/me', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: selectPublicUser,
    });

    if (!user) return res.status(401).json({ error: 'Nicht autorisiert.' });

    res.status(200).json({ user });
  });

  router.put('/me', authenticate, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const firstName = normalizeText(req.body.firstName);
    const lastName = normalizeText(req.body.lastName);
    const { currentPassword, newPassword } = req.body;
    const hasProfileImageUpdate = Object.prototype.hasOwnProperty.call(req.body, 'profileImage');

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Vorname, Nachname und E-Mail sind erforderlich.' });
    }

    if (newPassword && !isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen haben und Buchstaben sowie Zahlen enthalten.' });
    }

    if (newPassword && !currentPassword) {
      return res.status(400).json({ error: 'Aktuelles Passwort ist erforderlich.' });
    }

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });
      if (!currentUser) return res.status(401).json({ error: 'Nicht autorisiert.' });

      if (email !== currentUser.email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== currentUser.id) {
          return res.status(409).json({ error: 'E-Mail bereits vergeben.' });
        }
      }

      const updateData = {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
      };

      if (email !== currentUser.email) {
        updateData.emailVerified = isDemoAccount(email);
        updateData.verificationCode = isDemoAccount(email) ? null : createVerificationCode();
        if (updateData.verificationCode) {
          sendVerificationEmailLater({
            to: email,
            firstName,
            code: updateData.verificationCode,
          });
        }
      }

      if (hasProfileImageUpdate) {
        const { profileImage } = req.body;
        if (!isAllowedProfileImage(profileImage)) {
          return res.status(400).json({ error: 'Profilbild muss ein Bild unter ca. 10 MB sein.' });
        }

        updateData.profileImage = profileImage || null;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'gender')) {
        const gender = normalizeText(req.body.gender);
        if (!['Male', 'Female', 'Other'].includes(gender)) {
          return res.status(400).json({ error: 'Please choose a valid gender.' });
        }
        updateData.gender = gender;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'heightCm')) {
        const heightCm = Number(req.body.heightCm);
        if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 240) {
          return res.status(400).json({ error: 'Please enter a valid height.' });
        }
        updateData.heightCm = heightCm;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'weightKg')) {
        const weightKg = Number(req.body.weightKg);
        if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) {
          return res.status(400).json({ error: 'Please enter a valid weight.' });
        }
        updateData.weightKg = weightKg;
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'hydrationGoalLiters')) {
        const hydrationGoalLiters = Number(req.body.hydrationGoalLiters);
        if (!Number.isFinite(hydrationGoalLiters) || hydrationGoalLiters < 1.5 || hydrationGoalLiters > 7) {
          return res.status(400).json({ error: 'Please enter a hydration goal between 1.5L and 7L.' });
        }
        updateData.hydrationGoalLiters = hydrationGoalLiters;
      }

      if (newPassword) {
        const isValidPassword = await bcrypt.compare(currentPassword, currentUser.passwordHash);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Aktuelles Passwort ist ungültig.' });
        }
        updateData.passwordHash = await bcrypt.hash(newPassword, 12);
      }

      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: updateData,
        select: selectPublicUser,
      });

      if (user.email !== req.user.email) {
        setAuthCookie(res, createToken(user));
      }

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/verify-email', authenticate, async (req, res) => {
    const code = normalizeText(req.body.code);

    try {
      const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!currentUser) return res.status(401).json({ error: 'Nicht autorisiert.' });

      if (isDemoAccount(currentUser.email) || currentUser.emailVerified) {
        const user = await prisma.user.update({
          where: { id: currentUser.id },
          data: { emailVerified: true, verificationCode: null },
          select: selectPublicUser,
        });
        return res.status(200).json({ user });
      }

      if (!code || code !== currentUser.verificationCode) {
        return res.status(400).json({ error: 'Verification code is invalid.' });
      }

      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: { emailVerified: true, verificationCode: null },
        select: selectPublicUser,
      });

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/resend-verification', authenticate, async (req, res) => {
    try {
      const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!currentUser) return res.status(401).json({ error: 'Nicht autorisiert.' });

      if (isDemoAccount(currentUser.email) || currentUser.emailVerified) {
        return res.status(200).json({ message: 'Already verified.' });
      }

      const verificationCode = createVerificationCode();
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { verificationCode },
      });
      sendVerificationEmailLater({
        to: currentUser.email,
        firstName: currentUser.firstName,
        code: verificationCode,
      });

      res.status(200).json({
        message: 'Verification code sent.',
        ...(process.env.NODE_ENV !== 'production' ? { verificationCode } : {}),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/onboarding', authenticate, async (req, res) => {
    const heightCm = Number(req.body.heightCm);
    const weightKg = Number(req.body.weightKg);
    const gender = normalizeText(req.body.gender);
    const hydrationGoalLiters = Number(req.body.hydrationGoalLiters);
    const fitnessGoal = normalizeText(req.body.fitnessGoal);

    if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 240) {
      return res.status(400).json({ error: 'Please enter a valid height.' });
    }

    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) {
      return res.status(400).json({ error: 'Please enter a valid weight.' });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ error: 'Please choose a valid gender.' });
    }

    if (!Number.isFinite(hydrationGoalLiters) || hydrationGoalLiters < 1.5 || hydrationGoalLiters > 7) {
      return res.status(400).json({ error: 'Please enter a hydration goal between 1.5L and 7L.' });
    }

    if (!['fat_loss', 'muscle_gain', 'definition'].includes(fitnessGoal)) {
      return res.status(400).json({ error: 'Please choose a training goal.' });
    }

    try {
      const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!currentUser) return res.status(401).json({ error: 'Nicht autorisiert.' });
      if (!currentUser.emailVerified) return res.status(400).json({ error: 'Please verify your email first.' });

      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          heightCm,
          weightKg,
          gender,
          hydrationGoalLiters,
          fitnessGoal,
          onboardingCompleted: true,
        },
        select: selectPublicUser,
      });

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.status(204).send();
  });

  return router;
}

module.exports = createAuthRouter;
