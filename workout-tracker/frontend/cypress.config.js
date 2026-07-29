import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { defineConfig } from 'cypress';

const require = createRequire(import.meta.url);
const { prisma } = require('../backend/prismaClient');

const assertTestEmail = (email) => {
  if (typeof email !== 'string' || !email.endsWith('@example.test')) {
    throw new Error('Cypress database tasks only accept @example.test addresses.');
  }
};

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on) {
      on('task', {
        async cleanupUser(email) {
          assertTestEmail(email);
          await prisma.user.deleteMany({ where: { email } });
          return null;
        },
        async setVerificationCode({ email, code }) {
          assertTestEmail(email);
          const verificationCode = createHash('sha256').update(String(code)).digest('hex');
          await prisma.user.update({
            where: { email },
            data: {
              verificationCode,
              verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
              verificationCodeAttempts: 0,
            },
          });
          return null;
        },
      });

      on('after:run', async () => {
        await prisma.$disconnect();
      });
    },
  },
});
