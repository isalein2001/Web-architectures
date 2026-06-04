const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:3000/api`;

export const authFetch = async (url, options = {}) => {
  const { redirectOnUnauthorized = true, ...fetchOptions } = options;
  const res = await fetch(url, {
    credentials: 'include',
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  if (res.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    window.location.assign('/login');
  }

  return res;
};

const requestJson = async (url, options = {}) => {
  const res = await authFetch(url, options);

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

export const api = {
  register: async (credentials) => requestJson(`${API_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(credentials),
    redirectOnUnauthorized: false,
  }),
  login: async (credentials) => requestJson(`${API_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(credentials),
    redirectOnUnauthorized: false,
  }),
  getCurrentUser: async () => requestJson(`${API_URL}/auth/me`, {
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
  logout: async () => requestJson(`${API_URL}/auth/logout`, {
    method: 'POST',
  }),

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
