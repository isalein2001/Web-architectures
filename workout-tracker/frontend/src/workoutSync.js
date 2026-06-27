/**
 * Workout Sync Manager - Robust offline/online persistence for workout sessions
 * Ensures all workouts are saved to backend with automatic retries and queuing
 */

import { api } from './api';
import { loadStoredWorkoutSessions, saveStoredWorkoutSessions } from './userStorage';

const SYNC_QUEUE_KEY = 'workoutSyncQueue';
const SYNC_RETRY_DELAY_MS = 2000; // Start with 2 seconds
const SYNC_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

let syncCheckInterval = null;
let activeSyncUser = null;

/**
 * Get the pending sync queue from localStorage
 */
const getSyncQueue = () => {
  try {
    const stored = window.localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save the sync queue to localStorage
 */
const saveSyncQueue = (queue) => {
  try {
    window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save sync queue:', e);
  }
};

/**
 * Add a workout session to the sync queue
 */
const getUserId = (userOrId) => (typeof userOrId === 'object' ? userOrId?.id : userOrId);

const replaceLocalQueuedSession = (user, savedSession, queueItem) => {
  if (!user?.id || !savedSession) return;

  const currentSessions = loadStoredWorkoutSessions(user);
  const clientSessionId = savedSession.client_session_id || queueItem.sessionData?.client_session_id;
  const nextSessions = currentSessions.map((session) => {
    const isSameClientSession = clientSessionId && session.client_session_id === clientSessionId;
    const isSameQueueItem = queueItem.id && session.queueId === queueItem.id;
    if (!isSameClientSession && !isSameQueueItem) return session;

    return {
      ...session,
      ...savedSession,
      id: savedSession.id || session.id,
      client_session_id: clientSessionId,
      syncStatus: 'synced',
      source: 'backend',
      queueId: undefined,
    };
  });

  saveStoredWorkoutSessions(user, nextSessions);
  window.dispatchEvent(new CustomEvent('workout-session-saved', {
    detail: {
      date: savedSession.date,
      synced: true,
      recovered: true,
    },
  }));
};

export const queueWorkoutSession = (sessionData, userOrId) => {
  const userId = getUserId(userOrId);
  const queue = getSyncQueue();
  const queueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    sessionData,
    retries: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    lastRetryAt: null,
  };
  
  queue.push(queueItem);
  saveSyncQueue(queue);
  
  // Immediately try to sync in case we're online
  syncWorkoutQueue(typeof userOrId === 'object' ? userOrId : activeSyncUser);
  
  return queueItem;
};

/**
 * Calculate exponential backoff delay for retries
 */
const getBackoffDelay = (retryCount) => {
  return SYNC_RETRY_DELAY_MS * Math.pow(2, Math.min(retryCount, 4));
};

/**
 * Try to sync a single queue item
 */
const syncQueueItem = async (item, user) => {
  const now = Date.now();
  const lastRetryTime = item.lastRetryAt ? new Date(item.lastRetryAt).getTime() : 0;
  const backoffDelay = getBackoffDelay(item.retries);
  
  // Skip if we haven't waited long enough
  if (lastRetryTime + backoffDelay > now) {
    return false;
  }
  
  try {
    // Attempt to upload the session
    const savedSession = await api.logSession(item.sessionData);
    replaceLocalQueuedSession(user, savedSession, item);
    
    // Success - remove from queue
    return 'success';
  } catch (error) {
    // Increment retries
    item.retries += 1;
    item.lastError = error.message;
    item.lastRetryAt = new Date().toISOString();
    
    return 'retry-later';
  }
};

/**
 * Sync all pending workout sessions from the queue
 */
export const syncWorkoutQueue = async (user = activeSyncUser) => {
  const activeUserId = getUserId(user);
  if (!activeUserId) {
    return { synced: 0, failed: 0, remaining: getSyncQueue().length };
  }

  const queue = getSyncQueue();
  
  if (queue.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }
  
  let synced = 0;
  let failed = 0;
  const updatedQueue = [];
  
  for (const item of queue) {
    if (item.userId !== activeUserId) {
      updatedQueue.push(item);
      continue;
    }

    const result = await syncQueueItem(item, user);
    
    if (result === 'success') {
      synced++;
      // Don't add back to queue - it's been synced
    } else if (result === 'failed') {
      failed++;
      // Keep in queue but marked as failed (user will see warning)
      updatedQueue.push(item);
    } else {
      // 'retry-later' - keep in queue for next attempt
      updatedQueue.push(item);
    }
  }
  
  saveSyncQueue(updatedQueue);
  
  return { synced, failed, remaining: updatedQueue.length };
};

/**
 * Get current sync status
 */
export const getSyncStatus = () => {
  const queue = getSyncQueue();
  return {
    pending: queue.length,
    failed: 0,
    queue,
  };
};

/**
 * Remove a specific item from the queue (e.g., after user decides to discard)
 */
export const removeFromSyncQueue = (queueItemId) => {
  const queue = getSyncQueue();
  const filtered = queue.filter(item => item.id !== queueItemId);
  saveSyncQueue(filtered);
};

/**
 * Manually retry a specific failed item
 */
export const retryFailedWorkout = async (queueItemId) => {
  const queue = getSyncQueue();
  const item = queue.find(i => i.id === queueItemId);
  
  if (!item) {
    throw new Error('Workout not found in queue');
  }
  
  // Reset retry count to force immediate retry
  item.retries = 0;
  item.lastRetryAt = null;
  saveSyncQueue(queue);
  
  // Try to sync immediately
  const result = await syncQueueItem(item, activeSyncUser);
  
  if (result === 'success') {
    removeFromSyncQueue(queueItemId);
    return { success: true };
  }
  
  const updated = getSyncQueue();
  const updatedItem = updated.find(i => i.id === queueItemId);
  saveSyncQueue(updated);
  
  return { success: false, item: updatedItem };
};

/**
 * Start periodic sync checks
 */
export const startSyncChecks = () => {
  if (syncCheckInterval) return;
  
  syncCheckInterval = window.setInterval(() => {
    syncWorkoutQueue(activeSyncUser);
  }, SYNC_CHECK_INTERVAL_MS);
};

/**
 * Stop periodic sync checks
 */
export const stopSyncChecks = () => {
  if (syncCheckInterval) {
    window.clearInterval(syncCheckInterval);
    syncCheckInterval = null;
  }
};

/**
 * Initialize sync manager on app start
 */
export const initSyncManager = (user) => {
  activeSyncUser = user || null;
  startSyncChecks();
  // Try to sync immediately on init
  syncWorkoutQueue(activeSyncUser);
};
