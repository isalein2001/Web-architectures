const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_URL = `http://${API_HOST}:3000/api`;

export const api = {
  // Plans
  getPlans: async () => {
    const res = await fetch(`${API_URL}/plans`);
    return res.json();
  },
  getPlan: async (id) => {
    const res = await fetch(`${API_URL}/plans/${id}`);
    return res.json();
  },
  createPlan: async (planData) => {
    const res = await fetch(`${API_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    });
    return res.json();
  },

  // Sessions / Logs
  getSessions: async () => {
    const res = await fetch(`${API_URL}/sessions`);
    return res.json();
  },
  logSession: async (sessionData) => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return res.json();
  },
  deleteSession: async (id) => {
    const res = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Could not delete session');
    }
    return true;
  },

  // Progress & Stats
  getProgress: async (exerciseName) => {
    const res = await fetch(`${API_URL}/progress/${encodeURIComponent(exerciseName)}`);
    return res.json();
  },
  getStats: async () => {
    const res = await fetch(`${API_URL}/stats`);
    return res.json();
  }
};
