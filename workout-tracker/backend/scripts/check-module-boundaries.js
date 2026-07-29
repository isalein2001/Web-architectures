const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const moduleChecks = [
  {
    moduleName: 'identity-access',
    filePath: path.join(backendRoot, 'modules', 'identity-access', 'identity-access.service.js'),
    allowedModels: new Set(['user']),
  },
  {
    moduleName: 'training',
    filePath: path.join(backendRoot, 'modules', 'training', 'training.service.js'),
    allowedModels: new Set(['plan', 'planExercise', 'workoutSession', 'workoutLog']),
  },
  {
    moduleName: 'daily-activity',
    filePath: path.join(backendRoot, 'modules', 'daily-activity', 'daily-activity.service.js'),
    allowedModels: new Set(['dailyActivity']),
  },
  {
    moduleName: 'insights-coaching',
    filePath: path.join(backendRoot, 'modules', 'insights-coaching', 'insights-coaching.service.js'),
    allowedModels: new Set([]),
  },
  {
    moduleName: 'notifications',
    filePath: path.join(backendRoot, 'modules', 'notifications', 'notifications.service.js'),
    allowedModels: new Set(['pushSubscription']),
  },
];

const prismaAccessPattern = /\bprisma\.([A-Za-z][A-Za-z0-9_]*)/g;

function findViolations() {
  const violations = [];

  for (const { moduleName, filePath, allowedModels } of moduleChecks) {
    const source = fs.readFileSync(filePath, 'utf8');

    for (const match of source.matchAll(prismaAccessPattern)) {
      const modelName = match[1];
      if (modelName === '$transaction') continue;

      if (!allowedModels.has(modelName)) {
        violations.push({
          moduleName,
          modelName,
          filePath: path.relative(backendRoot, filePath),
        });
      }
    }
  }

  return violations;
}

const violations = findViolations();

if (violations.length > 0) {
  console.error('Module boundary violations found:');
  for (const violation of violations) {
    console.error(
      `- ${violation.filePath}: ${violation.moduleName} service accesses prisma.${violation.modelName}`,
    );
  }
  process.exit(1);
}

console.log('Module boundary check passed.');
