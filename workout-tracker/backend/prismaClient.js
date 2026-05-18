const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const resolveDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl?.startsWith('file:')) return databaseUrl;

  const databasePath = databaseUrl.slice('file:'.length);
  if (path.isAbsolute(databasePath)) return databaseUrl;

  return `file:${path.join(__dirname, databasePath)}`;
};

const adapter = new PrismaBetterSqlite3({
  url: resolveDatabaseUrl(process.env.DATABASE_URL),
});

const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
