import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeHealthKit = registerPlugin('HealthKit');

export const isHealthKitRuntime = () => Capacitor.getPlatform() === 'ios';

export const healthKit = {
  isAvailable: async () => {
    if (!isHealthKitRuntime()) return { available: false };
    return NativeHealthKit.isAvailable();
  },

  requestAuthorization: async () => {
    if (!isHealthKitRuntime()) {
      throw new Error('Apple Health is only available in the iOS app.');
    }

    return NativeHealthKit.requestAuthorization();
  },

  getTodayActivity: async () => {
    if (!isHealthKitRuntime()) {
      throw new Error('Apple Health is only available in the iOS app.');
    }

    return NativeHealthKit.getTodayActivity();
  },
};
