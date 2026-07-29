const webPush = require('web-push');
const { prisma } = require('../prismaClient');
const {
  getVapidConfig,
  sendPushToUser,
} = require('../push');

describe('push notification service', () => {
  beforeEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  test('uses the documented default subject', () => {
    expect(getVapidConfig()).toEqual({
      publicKey: undefined,
      privateKey: undefined,
      subject: 'mailto:admin@nextreps.local',
    });
  });

  test('skips delivery when VAPID is not configured', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sendPushToUser(1, { title: 'Test' });

    expect(warning).toHaveBeenCalledWith(
      '[PUSH] VAPID keys are missing, so no push notification was sent.'
    );
  });

  test('sends notifications and removes expired subscriptions', async () => {
    process.env.VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@next-reps.invalid';

    vi.spyOn(webPush, 'setVapidDetails').mockImplementation(() => {});
    vi.spyOn(prisma.pushSubscription, 'findMany').mockResolvedValue([
      {
        id: 1,
        endpoint: 'https://push.invalid/active',
        p256dh: 'active-key',
        auth: 'active-auth',
      },
      {
        id: 2,
        endpoint: 'https://push.invalid/expired',
        p256dh: 'expired-key',
        auth: 'expired-auth',
      },
    ]);
    vi.spyOn(webPush, 'sendNotification')
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ statusCode: 410 });
    const remove = vi
      .spyOn(prisma.pushSubscription, 'delete')
      .mockResolvedValue({ id: 2 });

    await sendPushToUser(7, { title: 'Plan updated' });

    expect(webPush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@next-reps.invalid',
      'public-key',
      'private-key'
    );
    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  test('logs provider failures without deleting an active subscription', async () => {
    process.env.VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';

    vi.spyOn(webPush, 'setVapidDetails').mockImplementation(() => {});
    vi.spyOn(prisma.pushSubscription, 'findMany').mockResolvedValue([{
      id: 3,
      endpoint: 'https://push.invalid/failing',
      p256dh: 'key',
      auth: 'auth',
    }]);
    vi.spyOn(webPush, 'sendNotification').mockRejectedValue({ statusCode: 500 });
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    await sendPushToUser(7, { title: 'Plan updated' });

    expect(errorLog).toHaveBeenCalledWith(
      '[PUSH] Failed to send push notification:',
      { statusCode: 500 }
    );
  });
});
