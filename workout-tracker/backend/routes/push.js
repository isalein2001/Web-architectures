const express = require('express');
const { getVapidConfig, savePushSubscription } = require('../push');

function createPushRouter() {
  const router = express.Router();

  router.get('/public-key', (req, res) => {
    const { publicKey } = getVapidConfig();
    if (!publicKey) {
      return res.status(503).json({ error: 'Push notifications are not configured.' });
    }

    res.status(200).json({ publicKey });
  });

  router.post('/subscribe', async (req, res) => {
    try {
      await savePushSubscription(req.user.userId, req.body.subscription);
      res.status(201).json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createPushRouter;
