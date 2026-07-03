const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });

const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const databaseUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
