const createCoachRouter = require('./coach.routes');
const createProgressRouter = require('./progress.routes');
const createStatsRouter = require('./stats.routes');

module.exports = {
  createCoachRouter,
  createProgressRouter,
  createStatsRouter,
};
