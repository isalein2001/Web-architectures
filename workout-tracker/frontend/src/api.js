const API_URL = 'http://localhost:3000/api';

export const api = {
  // Plans
  getPlans: async () => {
    const res = await fetch(\`\${API_URL}/plans\`);
    return res.json();
  },
  getPlan: async (id) => {
    const res = await fetch(\`\${API_URL}/plans/\${id}\`);
    return res.json();
  },
  createPlan: async (planData) => {
    const res = await fetch(\`\${API_URL}/plans\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planData),
    });
    return res.json();
  },

  // Sessions / Logs
  getSessions: async () => {
    const res = await fetch(\`\${API_URL}/sessions\`);
    return res.json();
  },
  logSession: async (sessionData) => {
    const res = await fetch(\`\${API_URL}/sessions\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return res.json();
  },

  // Progress & Stats
  getProgress: async (exerciseName) => {
    const res = await fetch(\`\${API_URL}/progress/\${encodeURIComponent(exerciseName)}\`);
    return res.json();
  },
  getStats: async () => {
    const res = await fetch(\`\${API_URL}/stats\`);
    return res.json();
  }
};
