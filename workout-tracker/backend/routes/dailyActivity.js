const express = require('express');
const { prisma } = require('../prismaClient');

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toOptionalDateKey = (value) => {
  if (value === undefined || value === null || value === '') return getTodayKey();
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
};

const serializeActivity = (activity) => ({
  id: activity.id,
  date: activity.date,
  water_intake_ml: activity.waterIntakeMl,
  water_goal_ml: activity.waterGoalMl,
  steps: activity.steps,
  step_goal: activity.stepGoal,
});

const getDefaultWaterGoalMl = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hydrationGoalLiters: true },
  });

  return Math.round((user?.hydrationGoalLiters || 3) * 1000);
};

const getOrCreateActivity = async ({ userId, date }) => {
  const waterGoalMl = await getDefaultWaterGoalMl(userId);

  return prisma.dailyActivity.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    update: {},
    create: {
      userId,
      date,
      waterGoalMl,
      stepGoal: 10000,
    },
  });
};

function createDailyActivityRouter() {
  const router = express.Router();

  router.get('/today', async (req, res) => {
    const date = toOptionalDateKey(req.query.date);
    if (!date) return res.status(400).json({ error: 'Date must use YYYY-MM-DD.' });

    try {
      const activity = await getOrCreateActivity({
        userId: req.user.userId,
        date,
      });
      res.status(200).json(serializeActivity(activity));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/today', async (req, res) => {
    const date = toOptionalDateKey(req.body.date);
    if (!date) return res.status(400).json({ error: 'Date must use YYYY-MM-DD.' });

    const updateData = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'water_intake_ml')) {
      const waterIntakeMl = Number(req.body.water_intake_ml);
      if (!Number.isInteger(waterIntakeMl) || waterIntakeMl < 0 || waterIntakeMl > 20000) {
        return res.status(400).json({ error: 'Water intake must be between 0ml and 20000ml.' });
      }
      updateData.waterIntakeMl = waterIntakeMl;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'water_goal_ml')) {
      const waterGoalMl = Number(req.body.water_goal_ml);
      if (!Number.isInteger(waterGoalMl) || waterGoalMl < 1500 || waterGoalMl > 7000) {
        return res.status(400).json({ error: 'Water goal must be between 1500ml and 7000ml.' });
      }
      updateData.waterGoalMl = waterGoalMl;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'steps')) {
      const steps = Number(req.body.steps);
      if (!Number.isInteger(steps) || steps < 0 || steps > 200000) {
        return res.status(400).json({ error: 'Steps must be between 0 and 200000.' });
      }
      updateData.steps = steps;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'step_goal')) {
      const stepGoal = Number(req.body.step_goal);
      if (!Number.isInteger(stepGoal) || stepGoal < 1000 || stepGoal > 100000) {
        return res.status(400).json({ error: 'Step goal must be between 1000 and 100000.' });
      }
      updateData.stepGoal = stepGoal;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No daily activity values provided.' });
    }

    try {
      await getOrCreateActivity({
        userId: req.user.userId,
        date,
      });

      const activity = await prisma.dailyActivity.update({
        where: {
          userId_date: {
            userId: req.user.userId,
            date,
          },
        },
        data: updateData,
      });

      res.status(200).json(serializeActivity(activity));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/today/water', async (req, res) => {
    const date = toOptionalDateKey(req.body.date);
    const amountMl = Number(req.body.amountMl);

    if (!date) return res.status(400).json({ error: 'Date must use YYYY-MM-DD.' });
    if (!Number.isInteger(amountMl) || amountMl <= 0 || amountMl > 5000) {
      return res.status(400).json({ error: 'Water amount must be between 1ml and 5000ml.' });
    }

    try {
      const currentActivity = await getOrCreateActivity({
        userId: req.user.userId,
        date,
      });

      const activity = await prisma.dailyActivity.update({
        where: {
          userId_date: {
            userId: req.user.userId,
            date,
          },
        },
        data: {
          waterIntakeMl: Math.min(20000, currentActivity.waterIntakeMl + amountMl),
        },
      });

      res.status(200).json(serializeActivity(activity));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/today/steps', async (req, res) => {
    const date = toOptionalDateKey(req.body.date);
    const amount = Number(req.body.amount);

    if (!date) return res.status(400).json({ error: 'Date must use YYYY-MM-DD.' });
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: 'Step amount must be between 1 and 100000.' });
    }

    try {
      const currentActivity = await getOrCreateActivity({
        userId: req.user.userId,
        date,
      });

      const activity = await prisma.dailyActivity.update({
        where: {
          userId_date: {
            userId: req.user.userId,
            date,
          },
        },
        data: {
          steps: Math.min(200000, currentActivity.steps + amount),
        },
      });

      res.status(200).json(serializeActivity(activity));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createDailyActivityRouter;
