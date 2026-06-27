import { Capacitor, registerPlugin } from '@capacitor/core';

const HydrationReminder = registerPlugin('HydrationReminder');

export const isNativeHydrationReminderRuntime = () => Capacitor.getPlatform() === 'ios';

export const scheduleNativeHydrationReminders = async ({ title, message }) => {
  if (!isNativeHydrationReminderRuntime()) {
    return { scheduled: false };
  }

  return HydrationReminder.schedule({
    title,
    message,
  });
};

export const cancelNativeHydrationReminders = async () => {
  if (!isNativeHydrationReminderRuntime()) {
    return { cancelled: false };
  }

  return HydrationReminder.cancel();
};
