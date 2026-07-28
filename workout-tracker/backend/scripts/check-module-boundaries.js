const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const modulesRoot = path.join(backendRoot, 'modules');

const moduleModelAllowlist = {
  'identity-access': new Set(['user']),
  training: new Set(['plan', 'planExercise', 'workoutSession', 'workoutLog']),
  'daily-activity': new Set(['dailyActivity']),
  'insights-coaching': new Set([]),
  notifications: new Set(['pushSubscription']),
};

const prismaAccessPattern = /\bprisma\.([A-Za-z][A-Za-z0-9_]*)/g;
const safeModuleNamePattern = /^[a-z][a-z0-9-]*$/;

function resolveModuleDir(moduleName) {
  if (!safeModuleNamePattern.test(moduleName)) {
    throw new Error(`Invalid module name: ${moduleName}`);
  }

  const moduleDir = path.resolve(modulesRoot, moduleName);
  const modulesRootWithSeparator = `${path.resolve(modulesRoot)}${path.sep}`;
  if (!moduleDir.startsWith(modulesRootWithSeparator)) {
    throw new Error(`Module path escapes modules root: ${moduleName}`);
  }

  return moduleDir;
}

function readServiceFiles(moduleName) {
  const moduleDir = resolveModuleDir(moduleName);
  if (!fs.existsSync(moduleDir)) return [];

  return fs
    .readdirSync(moduleDir)
    .filter((fileName) => fileName.endsWith('.service.js'))
    .map((fileName) => path.join(moduleDir, fileName));
}

function findViolations() {
  const violations = [];

  for (const [moduleName, allowedModels] of Object.entries(moduleModelAllowlist)) {
    for (const filePath of readServiceFiles(moduleName)) {
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
