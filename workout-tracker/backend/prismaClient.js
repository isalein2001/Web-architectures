const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });

const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const databaseUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: databaseUrl.username,
  password: databaseUrl.password,
  database: databaseUrl.pathname.replace(/^\//, ''),
});

const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
