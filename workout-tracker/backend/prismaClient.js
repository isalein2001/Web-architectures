const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const resolveDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl?.startsWith('file:')) return databaseUrl;

  const databasePath = databaseUrl.slice('file:'.length);
  if (path.isAbsolute(databasePath)) return databaseUrl;

  return `file:${path.join(__dirname, databasePath)}`;
};

const getSqlitePath = (databaseUrl) => {
  if (!databaseUrl?.startsWith('file:')) return null;

  const resolvedUrl = resolveDatabaseUrl(databaseUrl);
  return resolvedUrl.slice('file:'.length);
};

const ensureWritableSqliteDatabase = (databaseUrl) => {
  const databasePath = getSqlitePath(databaseUrl);
  if (!databasePath) return;

  const databaseDir = path.dirname(databasePath);
  fs.mkdirSync(databaseDir, { recursive: true, mode: 0o775 });

  try {
    fs.chmodSync(databaseDir, 0o775);
  } catch (error) {
    console.warn(`Could not update database directory permissions: ${error.message}`);
  }

  if (!fs.existsSync(databasePath)) return;

  try {
    fs.chmodSync(databasePath, 0o664);
  } catch (error) {
    console.warn(`Could not update database file permissions: ${error.message}`);
  }

  fs.accessSync(databaseDir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
  fs.accessSync(databasePath, fs.constants.R_OK | fs.constants.W_OK);

  const writeProbePath = path.join(databaseDir, `.sqlite-write-test-${process.pid}`);
  fs.writeFileSync(writeProbePath, 'ok');
  fs.unlinkSync(writeProbePath);
};

let prisma;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  ensureWritableSqliteDatabase(process.env.DATABASE_URL);
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(process.env.DATABASE_URL),
  });
  prisma = new PrismaClient({ adapter });
} else {
  prisma = new PrismaClient({});
}

module.exports = { prisma };
