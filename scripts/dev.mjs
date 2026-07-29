import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const backendEnv = new URL('../workout-tracker/backend/.env', import.meta.url);
const backendEnvExample = new URL('../workout-tracker/backend/.env.example', import.meta.url);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

const run = (command, args, label) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error?.code === 'ENOENT') {
    console.error(`[dev] ${label} wurde nicht gefunden.`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[dev] ${label} ist fehlgeschlagen.`);
    process.exit(result.status || 1);
  }
};

if (!existsSync(backendEnv)) {
  copyFileSync(backendEnvExample, backendEnv);
  console.log('[dev] backend/.env wurde aus .env.example erstellt.');
}

const dockerStatus = spawnSync(dockerCommand, ['info'], { stdio: 'ignore' });
if (dockerStatus.error?.code === 'ENOENT') {
  console.error('[dev] Docker wurde nicht gefunden. Bitte Docker Desktop installieren.');
  process.exit(1);
}
if (dockerStatus.status !== 0) {
  console.error('[dev] Docker ist nicht aktiv. Bitte Docker Desktop starten und npm start erneut ausführen.');
  process.exit(1);
}

console.log('[dev] Starte MySQL und warte auf den Healthcheck ...');
run(dockerCommand, ['compose', 'up', '-d', '--wait', 'mysql'], 'Docker Compose');

console.log('[dev] Generiere Prisma Client ...');
run(
  npmCommand,
  ['run', '--workspace', 'workout-tracker/backend', 'prisma:generate'],
  'Prisma Client-Generierung'
);

console.log('[dev] Wende vorhandene Datenbankmigrationen an ...');
run(
  npmCommand,
  ['run', '--workspace', 'workout-tracker/backend', 'prisma:deploy'],
  'Prisma-Migration'
);

const children = [
  spawn(
    npmCommand,
    ['run', '--workspace', 'workout-tracker/backend', 'start'],
    { stdio: 'inherit' }
  ),
  spawn(
    npmCommand,
    ['run', '--workspace', 'workout-tracker/frontend', 'dev'],
    { stdio: 'inherit' }
  ),
];

let shuttingDown = false;

const shutdown = (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }

  setTimeout(() => process.exit(exitCode), 250);
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

for (const [index, child] of children.entries()) {
  child.on('error', (error) => {
    console.error(`[dev] Prozess ${index + 1} konnte nicht gestartet werden:`, error.message);
    shutdown('SIGTERM', 1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[dev] Prozess ${index + 1} wurde unerwartet beendet `
      + `(Code: ${code ?? '–'}, Signal: ${signal ?? '–'}).`
    );
    shutdown('SIGTERM', code || 1);
  });
}
