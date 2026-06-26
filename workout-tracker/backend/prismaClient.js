const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const resolveDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl?.startsWith('file:')) return databaseUrl;

  const databasePath = databaseUrl.slice('file:'.length);
  if (path.isAbsolute(databasePath)) return databaseUrl;

  return `file:${path.join(__dirname, databasePath)}`;
};

let prisma;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(process.env.DATABASE_URL),
  });
  prisma = new PrismaClient({ adapter });
} else {
  prisma = new PrismaClient({});
}

module.exports = { prisma };
