const webPush = require('web-push');
const { prisma } = require('./prismaClient');

const getVapidConfig = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@progym.local',
});

const configureWebPush = () => {
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey) return false;

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
};

const toWebPushSubscription = (subscription) => ({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.p256dh,
    auth: subscription.auth,
  },
});

async function savePushSubscription(userId, subscription) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription.');
  }

  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh,
      auth,
    },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
    },
  });
}

async function deleteExpiredSubscription(subscriptionId) {
  await prisma.pushSubscription.delete({ where: { id: subscriptionId } }).catch(() => null);
}

async function sendPushToUser(userId, notification) {
  if (!configureWebPush()) {
    console.warn('[PUSH] VAPID keys are missing, so no push notification was sent.');
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(
        toWebPushSubscription(subscription),
        JSON.stringify(notification)
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await deleteExpiredSubscription(subscription.id);
        return;
      }

      console.error('[PUSH] Failed to send push notification:', error);
    }
  }));
}

function sendPushToUserLater(userId, notification) {
  setImmediate(async () => {
    try {
      await sendPushToUser(userId, notification);
    } catch (error) {
      console.error('[PUSH] Failed to process push notification:', error);
    }
  });
}

module.exports = {
  getVapidConfig,
  savePushSubscription,
  sendPushToUser,
  sendPushToUserLater,
};
