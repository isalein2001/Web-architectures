const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: [
        'middleware/**/*.js',
        'modules/**/*.js',
        'events.js',
        'mail.js',
        'push.js',
        'server.js',
      ],
      exclude: [
        '**/*.test.js',
        'modules/daily-activity/daily-activity.service.js',
        'modules/identity-access/identity-access.service.js',
        'modules/insights-coaching/insights-coaching.service.js',
        'modules/notifications/notifications.service.js',
      ],
    },
  },
});
