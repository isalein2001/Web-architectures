export const getUserDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user?.name?.trim()) return user.name.trim();
  const emailPrefix = user?.email?.split('@')[0] || 'Member';
  return emailPrefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const getUserFirstName = (user) => {
  if (user?.firstName?.trim()) return user.firstName.trim();
  return getUserDisplayName(user).split(/\s+/)[0] || 'Athlete';
};

export const getUserInitials = (user) => {
  const displayName = getUserDisplayName(user);
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'PG';
};

export const getUserStorageKey = (baseKey, user) => (
  user?.id ? `${baseKey}:user:${user.id}` : baseKey
);

const STORED_WORKOUT_SESSIONS_KEY = 'savedWorkoutSessions';

export const getStoredWorkoutSessionsKey = (user) => getUserStorageKey(STORED_WORKOUT_SESSIONS_KEY, user);

export const loadStoredWorkoutSessions = (user) => {
  if (typeof window === 'undefined') return [];

  try {
    const storedValue = window.localStorage.getItem(getStoredWorkoutSessionsKey(user));
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

export const saveStoredWorkoutSessions = (user, sessions) => {
  if (typeof window === 'undefined') return [];

  const normalizedSessions = Array.isArray(sessions) ? sessions : [];
  window.localStorage.setItem(getStoredWorkoutSessionsKey(user), JSON.stringify(normalizedSessions));
  return normalizedSessions;
};

export const upsertStoredWorkoutSession = (user, session) => {
  const nextSessions = loadStoredWorkoutSessions(user);
  const sessionId = session?.id || `local-${Date.now()}`;
  const normalizedSession = { ...session, id: sessionId };
  const existingIndex = nextSessions.findIndex((entry) => (
    (normalizedSession.client_session_id && entry.client_session_id === normalizedSession.client_session_id)
    || entry.id === sessionId
    || (entry.date === normalizedSession.date && entry.plan_name === normalizedSession.plan_name)
  ));
  const normalizedList = existingIndex >= 0
    ? nextSessions.map((entry, index) => (index === existingIndex ? normalizedSession : entry))
    : [normalizedSession, ...nextSessions];

  return saveStoredWorkoutSessions(user, normalizedList);
};
