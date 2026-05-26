const express = require('express');

const clientsByUser = new Map();

const writeEvent = (res, eventName, payload = {}) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const addClient = (userId, res) => {
  if (!clientsByUser.has(userId)) {
    clientsByUser.set(userId, new Set());
  }

  clientsByUser.get(userId).add(res);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  writeEvent(res, 'connected', { connected: true });

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  res.on('close', () => {
    clearInterval(keepAlive);
    const userClients = clientsByUser.get(userId);
    if (!userClients) return;

    userClients.delete(res);
    if (userClients.size === 0) {
      clientsByUser.delete(userId);
    }
  });
};

const broadcastToUser = (userId, eventName, payload = {}) => {
  const userClients = clientsByUser.get(userId);
  if (!userClients) return;

  userClients.forEach((client) => {
    writeEvent(client, eventName, payload);
  });
};

const createEventsRouter = () => {
  const router = express.Router();

  router.get('/', (req, res) => {
    addClient(req.user.userId, res);
  });

  return router;
};

module.exports = {
  broadcastToUser,
  createEventsRouter,
};
