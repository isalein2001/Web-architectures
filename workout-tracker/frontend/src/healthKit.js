import { Capacitor, registerPlugin } from '@capacitor/core';
import { api } from './api';
import { getUserStorageKey } from './userStorage';

const NativeHealthKit = registerPlugin('HealthKit');
const PENDING_HEALTH_SYNC_KEY = 'pendingAppleHealthMetrics';

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

export const hasAppleHealthConnection = (currentUser) => {
  if (!currentUser?.id) return false;

  if (window.localStorage.getItem(getUserStorageKey('appleWatchConnected', currentUser)) === 'true') {
    return true;
  }

  const savedMetrics = window.localStorage.getItem(getUserStorageKey('appleHealthMetrics', currentUser));
  return Boolean(savedMetrics);
};

export const getStoredAppleHealthMetrics = (currentUser) => {
  if (!currentUser?.id) return null;

  const savedMetrics = window.localStorage.getItem(getUserStorageKey('appleHealthMetrics', currentUser));
  if (!savedMetrics) return null;

  try {
    return normalizeHealthMetrics(JSON.parse(savedMetrics));
  } catch {
    return null;
  }
};

const persistHealthConnection = (currentUser, metrics) => {
  window.localStorage.setItem(getUserStorageKey('appleWatchConnected', currentUser), 'true');
  window.localStorage.setItem(getUserStorageKey('appleHealthMetrics', currentUser), JSON.stringify(metrics));
  window.dispatchEvent(new CustomEvent('apple-health-sync', { detail: metrics }));
};

const getPendingHealthSyncKey = (currentUser) => getUserStorageKey(PENDING_HEALTH_SYNC_KEY, currentUser);

const persistPendingHealthSync = (currentUser, metrics) => {
  if (!currentUser?.id || !metrics) return;
  window.localStorage.setItem(getPendingHealthSyncKey(currentUser), JSON.stringify(metrics));
};

const clearPendingHealthSync = (currentUser) => {
  if (!currentUser?.id) return;
  window.localStorage.removeItem(getPendingHealthSyncKey(currentUser));
};

const getPendingHealthSync = (currentUser) => {
  if (!currentUser?.id) return null;

  const savedMetrics = window.localStorage.getItem(getPendingHealthSyncKey(currentUser));
  if (!savedMetrics) return null;

  try {
    const metrics = normalizeHealthMetrics(JSON.parse(savedMetrics));
    return isHealthMetricsFromToday(metrics) ? metrics : null;
  } catch {
    return null;
  }
};

const pushHealthMetricsToServer = async (currentUser, metrics) => {
  if (!currentUser?.id || !metrics) return null;

  const activity = await api.updateTodayActivity({
    date: metrics.dateKey,
    steps: metrics.steps,
    active_energy_kcal: metrics.activeEnergyKcal,
    exercise_minutes: metrics.exerciseMinutes,
  });

  clearPendingHealthSync(currentUser);
  window.dispatchEvent(new CustomEvent('daily-activity-change', { detail: activity }));
  return activity;
};

export const syncPendingAppleHealthActivity = async (currentUser) => {
  const pendingMetrics = getPendingHealthSync(currentUser);
  if (!pendingMetrics) return null;

  try {
    return await pushHealthMetricsToServer(currentUser, pendingMetrics);
  } catch (error) {
    window.dispatchEvent(new CustomEvent('apple-health-server-sync-failed', {
      detail: { message: error.message || 'APPLE HEALTH SERVER SYNC FAILED', metrics: pendingMetrics },
    }));
    return null;
  }
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
  let syncError = null;
  try {
    activity = await pushHealthMetricsToServer(currentUser, metrics);
  } catch (error) {
    syncError = error;
    persistPendingHealthSync(currentUser, metrics);
    window.dispatchEvent(new CustomEvent('apple-health-server-sync-failed', {
      detail: { message: error.message || 'APPLE HEALTH SERVER SYNC FAILED', metrics },
    }));
  }

  return { metrics, activity, syncError };
};

let autoSyncPromise = null;

export const autoSyncAppleHealthActivity = async (currentUser, reason = 'auto') => {
  if (!isHealthKitRuntime() || !hasAppleHealthConnection(currentUser)) {
    return null;
  }

  if (autoSyncPromise) return autoSyncPromise;

  autoSyncPromise = syncPendingAppleHealthActivity(currentUser)
    .then(() => syncAppleHealthActivity(currentUser))
    .then((result) => {
      window.dispatchEvent(new CustomEvent('apple-health-auto-sync', {
        detail: { reason, ...result },
      }));
      return result;
    })
    .catch((error) => {
      window.dispatchEvent(new CustomEvent('apple-health-auto-sync-failed', {
        detail: { reason, message: error.message || 'APPLE HEALTH AUTO SYNC FAILED' },
      }));
      throw error;
    })
    .finally(() => {
      autoSyncPromise = null;
    });

  return autoSyncPromise;
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
