import { Capacitor, registerPlugin } from '@capacitor/core';
import { api } from './api';
import { getUserStorageKey } from './userStorage';

const NativeHealthKit = registerPlugin('HealthKit');

export const isHealthKitRuntime = () => Capacitor.getPlatform() === 'ios';

export const getTodayHealthDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isHealthMetricsFromToday = (metrics) => (
  Boolean(metrics) && metrics.dateKey === getTodayHealthDateKey()
);

const normalizeHealthMetrics = (metrics = {}) => ({
  steps: Number(metrics.steps) || 0,
  activeEnergyKcal: Number(metrics.activeEnergyKcal) || 0,
  exerciseMinutes: Number(metrics.exerciseMinutes) || 0,
  workoutCount: Number(metrics.workoutCount) || 0,
  dateKey: metrics.dateKey || getTodayHealthDateKey(),
  lastSyncAt: metrics.lastSyncAt || new Date().toISOString(),
});

const persistHealthConnection = (currentUser, metrics) => {
  window.localStorage.setItem(getUserStorageKey('appleWatchConnected', currentUser), 'true');
  window.localStorage.setItem(getUserStorageKey('appleHealthMetrics', currentUser), JSON.stringify(metrics));
  window.dispatchEvent(new CustomEvent('apple-health-sync', { detail: metrics }));
};

export const syncAppleHealthActivity = async (currentUser) => {
  const availability = await healthKit.isAvailable();
  if (!availability.available) {
    throw new Error('APPLE HEALTH IS ONLY AVAILABLE IN THE IOS APP');
  }

  await healthKit.requestAuthorization();
  const metrics = normalizeHealthMetrics(await healthKit.getTodayActivity());
  persistHealthConnection(currentUser, metrics);

  let activity = null;
  try {
    activity = await api.updateTodayActivity({
      date: metrics.dateKey,
      steps: metrics.steps,
      active_energy_kcal: metrics.activeEnergyKcal,
      exercise_minutes: metrics.exerciseMinutes,
    });
    window.dispatchEvent(new CustomEvent('daily-activity-change', { detail: activity }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('apple-health-server-sync-failed', {
      detail: { message: error.message || 'APPLE HEALTH SERVER SYNC FAILED', metrics },
    }));
  }

  return { metrics, activity };
};

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
