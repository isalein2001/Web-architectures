import { Capacitor } from '@capacitor/core';

const isNativeRuntime = Capacitor.getPlatform() !== 'web';
const nativeTokenKey = 'nextrepsNativeToken';
const configuredApiBase = import.meta.env.VITE_API_BASE_URL;
const configuredApiBaseIsAbsolute = /^https?:\/\//i.test(configuredApiBase || '');

export const isNativeApp = isNativeRuntime;

export const API_URL = isNativeRuntime
  ? (configuredApiBaseIsAbsolute ? configuredApiBase : 'https://next-reps.de/api')
  : (configuredApiBase || '/api');

const getNativeToken = () => (
  isNativeRuntime && typeof window !== 'undefined'
    ? window.localStorage.getItem(nativeTokenKey)
    : null
);

const setNativeToken = (token) => {
  if (!isNativeRuntime || typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(nativeTokenKey, token);
  } else {
    window.localStorage.removeItem(nativeTokenKey);
  }
};

export const authFetch = async (url, options = {}) => {
  const { redirectOnUnauthorized = true, ...fetchOptions } = options;
  const nativeToken = getNativeToken();
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  const requiresCsrfProtection = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const res = await fetch(url, {
    credentials: 'include',
    ...fetchOptions,
    headers: {
      ...(isNativeRuntime ? { 'X-NextReps-Client': 'native' } : {}),
      ...(nativeToken ? { Authorization: `Bearer ${nativeToken}` } : {}),
      ...(requiresCsrfProtection ? { 'X-NextReps-CSRF': '1' } : {}),
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  if (res.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
    if (isNativeRuntime) {
      window.localStorage.setItem('nextrepsLastAuthError', JSON.stringify({
        url,
        status: res.status,
        at: new Date().toISOString(),
      }));
      return res;
    }

    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(isNativeRuntime ? { 'X-NextReps-Client': 'native' } : {}),
        ...(nativeToken ? { Authorization: `Bearer ${nativeToken}` } : {}),
        'X-NextReps-CSRF': '1',
      },
    }).catch(() => null);
    setNativeToken(null);
    window.location.assign('/');
  }

  return res;
};

const requestJson = async (url, options = {}) => {
  const res = await authFetch(url, options);

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const musclePatterns = [
  { group: 'Chest', patterns: [/bench|chest|push.?up|fly/i] },
  { group: 'Back', patterns: [/row|pulldown|pull.?up|lat|deadlift/i] },
  { group: 'Legs', patterns: [/squat|leg|lunge|quad|hamstring|calf|hip|glute/i] },
  { group: 'Shoulders', patterns: [/shoulder|press|lateral|rear delt|face pull/i] },
  { group: 'Arms', patterns: [/bicep|curl|tricep|extension|pushdown/i] },
  { group: 'Core', patterns: [/plank|crunch|sit.?up|core|abs|mountain/i] },
];

const defaultExercisesByGroup = {
  Chest: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly'],
  Back: ['Lat Pulldown', 'Seated Row', 'Romanian Deadlift'],
  Legs: ['Leg Press', 'Walking Lunges', 'Hamstring Curl'],
  Shoulders: ['Shoulder Press', 'Lateral Raise', 'Face Pull'],
  Arms: ['Biceps Curl', 'Triceps Pushdown', 'Hammer Curl'],
  Core: ['Plank Hold', 'Dead Bug', 'Cable Crunch'],
};

const parseCoachDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCoachDaysAgo = (date) => {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
};

const classifyExercise = (name = '') => {
  const match = musclePatterns.find((entry) => entry.patterns.some((pattern) => pattern.test(name)));
  return match?.group || 'Full Body';
};

const roundMetric = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const getCoachExerciseStats = (sessions) => {
  const stats = new Map();

  sessions.forEach((session) => {
    const sessionDate = parseCoachDate(session.date);

    (session.logs || []).forEach((log) => {
      const name = String(log.exercise_name || log.exerciseName || '').trim();
      if (!name) return;

      const key = name.toLowerCase();
      const current = stats.get(key) || {
        name,
        muscleGroup: classifyExercise(name),
        sets: 0,
        reps: 0,
        volume: 0,
        maxWeight: 0,
        sessionIds: new Set(),
        lastTrainedAt: null,
      };
      const reps = Number(log.reps) || 0;
      const weight = Number(log.weight) || 0;

      current.sets += 1;
      current.reps += reps;
      current.volume += reps * weight;
      current.maxWeight = Math.max(current.maxWeight, weight);
      current.sessionIds.add(session.id);
      if (!current.lastTrainedAt || (sessionDate && sessionDate > current.lastTrainedAt)) {
        current.lastTrainedAt = sessionDate;
      }

      stats.set(key, current);
    });
  });

  return Array.from(stats.values())
    .map((exercise) => ({
      ...exercise,
      sessions: exercise.sessionIds.size,
      sessionIds: undefined,
      daysSinceLastTrained: getCoachDaysAgo(exercise.lastTrainedAt),
    }))
    .sort((a, b) => b.sets - a.sets);
};

const getCoachMuscleBalance = (exerciseStats) => {
  const groups = {};

  exerciseStats.forEach((exercise) => {
    groups[exercise.muscleGroup] = (groups[exercise.muscleGroup] || 0) + exercise.sets;
  });

  return Object.entries(groups)
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
};

const pickCoachExercisesForGroup = ({ group, exerciseStats, limit = 3 }) => {
  const existing = exerciseStats
    .filter((exercise) => exercise.muscleGroup === group)
    .map((exercise) => exercise.name);
  const fallback = defaultExercisesByGroup[group] || ['Goblet Squat', 'Push Up', 'Seated Row'];
  return Array.from(new Set([...existing, ...fallback])).slice(0, limit);
};

const buildCoachSuggestedWeek = ({ exerciseStats, weakestGroups, sessionCount30 }) => {
  const primaryGroups = weakestGroups.length > 0 ? weakestGroups : ['Legs', 'Back', 'Chest'];
  const weeklyDays = sessionCount30 >= 12 ? 4 : 3;
  const templates = [
    { day: 'Day 1', title: `${primaryGroups[0]} strength`, goal: 'Controlled heavy work with two reps in reserve.' },
    { day: 'Day 2', title: 'Upper balance', goal: 'Pair push and pull work to keep posture and pressing strength aligned.' },
    { day: 'Day 3', title: `${primaryGroups[1] || 'Legs'} volume`, goal: 'Moderate load, clean reps and enough total sets to drive progress.' },
    { day: 'Day 4', title: 'Recovery pump', goal: 'Shorter session with shoulders, arms and core to stay fresh.' },
  ];

  return templates.slice(0, weeklyDays).map((template, index) => {
    const group = primaryGroups[index % primaryGroups.length] || 'Full Body';
    const secondaryGroup = index === 1 ? 'Back' : index === 3 ? 'Arms' : group;
    const exercises = pickCoachExercisesForGroup({ group: secondaryGroup, exerciseStats, limit: 3 });

    return {
      ...template,
      exercises: exercises.map((name, exerciseIndex) => ({
        exercise_name: name,
        target_sets: exerciseIndex === 0 ? 4 : 3,
        target_reps: exerciseIndex === 0 ? '6-10' : '10-15',
      })),
    };
  });
};

const getCoachScore = ({ sessionCount30, totalSets30, uniqueExerciseCount, avgRpe }) => {
  const frequencyScore = Math.min(35, sessionCount30 * 3);
  const volumeScore = Math.min(30, Math.round(totalSets30 / 4));
  const diversityScore = Math.min(20, uniqueExerciseCount * 2);
  const recoveryScore = avgRpe && avgRpe > 8.5 ? 8 : 15;
  return Math.min(100, frequencyScore + volumeScore + diversityScore + recoveryScore);
};

const buildLocalCoachAnalysis = ({ user, plans, sessions, todayActivity }) => {
  const recentSessions = sessions.filter((session) => getCoachDaysAgo(parseCoachDate(session.date)) <= 30);
  const weekSessions = sessions.filter((session) => getCoachDaysAgo(parseCoachDate(session.date)) <= 7);
  const exerciseStats = getCoachExerciseStats(recentSessions);
  const muscleBalance = getCoachMuscleBalance(exerciseStats);
  const totalSets30 = exerciseStats.reduce((sum, exercise) => sum + exercise.sets, 0);
  const totalDurationSeconds = recentSessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
  const rpeValues = recentSessions.map((session) => session.perceived_exertion).filter(Boolean);
  const avgRpe = rpeValues.length ? roundMetric(rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length, 1) : null;
  const avgDurationMin = recentSessions.length && totalDurationSeconds
    ? Math.round(totalDurationSeconds / recentSessions.length / 60)
    : null;
  const avgSteps = Number(todayActivity?.steps) || 0;
  const avgWaterMl = Number(todayActivity?.water_intake_ml) || 0;
  const representedGroups = new Set(muscleBalance.map((entry) => entry.group));
  const missingGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
    .filter((group) => !representedGroups.has(group));
  const weakestGroups = [
    ...muscleBalance.slice(-2).map((entry) => entry.group),
    ...missingGroups,
  ].filter((group, index, groups) => groups.indexOf(group) === index).slice(0, 3);
  const topExercise = exerciseStats[0];
  const score = getCoachScore({
    sessionCount30: recentSessions.length,
    totalSets30,
    uniqueExerciseCount: exerciseStats.length,
    avgRpe,
  });

  const recommendations = [];
  if (weekSessions.length < 3) {
    recommendations.push('Aim for three logged sessions this week before increasing workout complexity.');
  } else {
    recommendations.push('Frequency is in a useful range. Keep the weekly rhythm and progress one lift at a time.');
  }
  if (weakestGroups.length) {
    recommendations.push(`Bring up ${weakestGroups.join(', ')} with 6-10 focused sets over the next seven days.`);
  }
  if (avgRpe && avgRpe > 8.5) {
    recommendations.push('Average effort is high. Add one lighter technique day or reduce one top set this week.');
  } else {
    recommendations.push('Keep most sets around two reps in reserve and reserve all-out sets for final working sets.');
  }
  if (avgWaterMl && user?.hydrationGoalLiters && avgWaterMl < user.hydrationGoalLiters * 800) {
    recommendations.push('Hydration is behind your profile goal. Add one fixed water check before and after training.');
  }

  return {
    generatedAt: new Date().toISOString(),
    engine: 'NEXT_REPS_CLIENT_RULE_COACH_V1',
    summary: {
      headline: recentSessions.length
        ? `Your last 30 days show ${recentSessions.length} sessions and ${totalSets30} working sets.`
        : 'Start by logging your first sessions so the coach can personalize the plan.',
      score,
      sessionCount30: recentSessions.length,
      sessionCount7: weekSessions.length,
      totalSets30,
      uniqueExerciseCount: exerciseStats.length,
      avgDurationMin,
      avgRpe,
      avgSteps,
      avgWaterMl,
      planCount: plans.length,
    },
    insights: [
      {
        label: 'Training frequency',
        value: `${weekSessions.length}/7 days`,
        status: weekSessions.length >= 3 ? 'strong' : 'needs_work',
        detail: weekSessions.length >= 3
          ? 'Enough recent sessions to maintain momentum.'
          : 'A third weekly session would make the plan more reliable.',
      },
      {
        label: 'Main focus',
        value: topExercise?.name || 'No exercise yet',
        status: topExercise ? 'strong' : 'needs_data',
        detail: topExercise
          ? `${topExercise.sets} sets in the last 30 days, max logged weight ${roundMetric(topExercise.maxWeight, 1)}.`
          : 'Log workouts to unlock exercise-specific feedback.',
      },
      {
        label: 'Muscle balance',
        value: weakestGroups.length ? weakestGroups.join(', ') : 'Balanced',
        status: weakestGroups.length ? 'watch' : 'strong',
        detail: weakestGroups.length
          ? 'These areas need a little more attention compared with your current pattern.'
          : 'Your logged sets are spread well across major patterns.',
      },
      {
        label: 'Recovery signal',
        value: avgRpe ? `${avgRpe}/10 RPE` : 'No RPE data',
        status: avgRpe && avgRpe > 8.5 ? 'watch' : 'strong',
        detail: avgRpe ? 'Based on your perceived exertion entries.' : 'Add exertion ratings after sessions for sharper guidance.',
      },
    ],
    recommendations,
    muscleBalance,
    topExercises: exerciseStats.slice(0, 6).map((exercise) => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets,
      sessions: exercise.sessions,
      maxWeight: roundMetric(exercise.maxWeight, 1),
      volume: roundMetric(exercise.volume, 1),
      daysSinceLastTrained: exercise.daysSinceLastTrained,
    })),
    suggestedWeek: buildCoachSuggestedWeek({
      exerciseStats,
      weakestGroups,
      sessionCount30: recentSessions.length,
    }),
  };
};

const getFallbackCoachAnalysis = async () => {
  const [currentUserPayload, plans, sessions, todayActivity] = await Promise.all([
    requestJson(`${API_URL}/auth/me`, { redirectOnUnauthorized: false }),
    requestJson(`${API_URL}/plans`),
    requestJson(`${API_URL}/sessions`),
    requestJson(`${API_URL}/daily-activity/today`).catch(() => null),
  ]);

  return buildLocalCoachAnalysis({
    user: currentUserPayload?.user,
    plans,
    sessions,
    todayActivity,
  });
};

export const api = {
  register: async (credentials) => {
    const data = await requestJson(`${API_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(credentials),
      redirectOnUnauthorized: false,
    });
    setNativeToken(data.token);
    return data;
  },
  login: async (credentials) => {
    const data = await requestJson(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
      redirectOnUnauthorized: false,
    });
    setNativeToken(data.token);
    return data;
  },
  getCurrentUser: async () => requestJson(`${API_URL}/auth/me`, {
    redirectOnUnauthorized: false,
  }),
  getCurrentUserProfileImage: async () => requestJson(`${API_URL}/auth/me/profile-image`, {
    redirectOnUnauthorized: false,
  }),
  updateCurrentUser: async (profileData) => requestJson(`${API_URL}/auth/me`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
    redirectOnUnauthorized: false,
  }),
  verifyEmail: async (code) => requestJson(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ code }),
    redirectOnUnauthorized: false,
  }),
  resendVerification: async () => requestJson(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    redirectOnUnauthorized: false,
  }),
  verifyEmailChange: async (code) => requestJson(`${API_URL}/auth/verify-email-change`, {
    method: 'POST',
    body: JSON.stringify({ code }),
    redirectOnUnauthorized: false,
  }),
  resendEmailChange: async () => requestJson(`${API_URL}/auth/resend-email-change`, {
    method: 'POST',
    redirectOnUnauthorized: false,
  }),
  completeOnboarding: async (onboardingData) => requestJson(`${API_URL}/auth/onboarding`, {
    method: 'POST',
    body: JSON.stringify(onboardingData),
  }),
  logout: async () => {
    const result = await requestJson(`${API_URL}/auth/logout`, {
      method: 'POST',
    }).catch((error) => {
      setNativeToken(null);
      throw error;
    });
    setNativeToken(null);
    return result;
  },

  // Plans
  getPlans: async () => {
    return requestJson(`${API_URL}/plans`);
  },
  getPlan: async (id) => {
    return requestJson(`${API_URL}/plans/${id}`);
  },
  createPlan: async (planData) => {
    return requestJson(`${API_URL}/plans`, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  },
  updatePlan: async (id, planData) => {
    return requestJson(`${API_URL}/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  },
  deletePlan: async (id) => {
    await requestJson(`${API_URL}/plans/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  // Sessions / Logs
  getSessions: async () => {
    return requestJson(`${API_URL}/sessions`);
  },
  logSession: async (sessionData) => {
    return requestJson(`${API_URL}/sessions`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },
  deleteSession: async (id) => {
    await requestJson(`${API_URL}/sessions/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  // Progress & Stats
  getProgress: async (exerciseName) => {
    return requestJson(`${API_URL}/progress/${encodeURIComponent(exerciseName)}`);
  },
  getStats: async () => {
    return requestJson(`${API_URL}/stats`);
  },
  getCoachAnalysis: async () => {
    try {
      return await requestJson(`${API_URL}/coach/analysis`);
    } catch (error) {
      if (error.status !== 404) throw error;
      return getFallbackCoachAnalysis();
    }
  },

  // Daily activity
  getTodayActivity: async (date) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return requestJson(`${API_URL}/daily-activity/today${query}`);
  },
  updateTodayActivity: async (activityData) => {
    return requestJson(`${API_URL}/daily-activity/today`, {
      method: 'PATCH',
      body: JSON.stringify(activityData),
    });
  },
  addWater: async (amountMl, date) => {
    return requestJson(`${API_URL}/daily-activity/today/water`, {
      method: 'POST',
      body: JSON.stringify({ amountMl, ...(date ? { date } : {}) }),
    });
  },
  addSteps: async (amount, date) => {
    return requestJson(`${API_URL}/daily-activity/today/steps`, {
      method: 'POST',
      body: JSON.stringify({ amount, ...(date ? { date } : {}) }),
    });
  },

  // Push notifications
  getPushPublicKey: async () => {
    return requestJson(`${API_URL}/push/public-key`);
  },
  subscribeToPush: async (subscription) => {
    return requestJson(`${API_URL}/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  }
};
