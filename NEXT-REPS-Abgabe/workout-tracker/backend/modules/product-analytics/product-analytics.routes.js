const express = require('express');
const { prisma } = require('../../prismaClient');

const ALLOWED_EVENTS = new Set([
  'sign_up_completed',
  'onboarding_completed',
  'plan_created',
  'workout_started',
  'workout_completed',
  'exercise_logged',
  'dashboard_viewed',
  'analysis_viewed',
]);

const ALLOWED_METADATA_KEYS = new Set([
  'exerciseCount',
  'setCount',
  'hasPlan',
]);

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;

  const sanitized = Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => ALLOWED_METADATA_KEYS.has(key))
      .map(([key, value]) => [key, typeof value === 'boolean' ? value : Number(value)])
      .filter(([, value]) => typeof value === 'boolean' || Number.isFinite(value))
  );

  return Object.keys(sanitized).length ? sanitized : null;
};

const serializeEvent = (event) => ({
  id: event.id,
  eventName: event.eventName,
  source: event.source,
  metadata: event.metadata,
  createdAt: event.createdAt,
});

function createProductAnalyticsRouter() {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const eventName = String(req.body?.eventName || '').trim();
    const clientEventId = String(req.body?.clientEventId || '').trim();
    const source = req.body?.source === 'app' ? 'app' : 'web';

    if (!ALLOWED_EVENTS.has(eventName)) {
      return res.status(400).json({ error: 'Unknown analytics event' });
    }

    if (!/^[a-zA-Z0-9-]{16,64}$/.test(clientEventId)) {
      return res.status(400).json({ error: 'Invalid analytics event id' });
    }

    try {
      const event = await prisma.productAnalyticsEvent.upsert({
        where: { clientEventId },
        update: {},
        create: {
          userId: req.user.userId,
          eventName,
          clientEventId,
          source,
          metadata: sanitizeMetadata(req.body?.metadata),
        },
      });

      return res.status(201).json(serializeEvent(event));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const events = await prisma.productAnalyticsEvent.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      return res.status(200).json({ events: events.map(serializeEvent) });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = {
  ALLOWED_EVENTS,
  createProductAnalyticsRouter,
  sanitizeMetadata,
};
