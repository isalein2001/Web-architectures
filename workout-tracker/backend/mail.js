const React = require('react');
const { render } = require('@react-email/render');
const nodemailer = require('nodemailer');
const VerificationEmail = require('./emails/VerificationEmail');

const DEMO_EMAIL = 'jonasarnold@gmail.com';

const normalizeBaseUrl = (url) => (url || 'http://localhost:5173').replace(/\/+$/, '');
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const parseBoolean = (value) => ['1', 'true', 'yes'].includes(String(value).trim().toLowerCase());

const getMailConfig = () => ({
  host: process.env.SMTP_SERVER,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE ? parseBoolean(process.env.SMTP_SECURE) : Number(process.env.SMTP_PORT) === 465,
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.MAIL_FROM || (process.env.SMTP_USER ? `NEXT REPS <${process.env.SMTP_USER}>` : undefined),
  appUrl: normalizeBaseUrl(process.env.APP_URL),
});

const getSmtpTransporter = () => {
  const { host, port, secure, user, password } = getMailConfig();
  if (!host || !user || !password) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: password,
    },
  });
};

async function sendVerificationEmail({ to, firstName, code }) {
  const normalizedTo = normalizeEmail(to);
  const { from, appUrl } = getMailConfig();
  const transporter = getSmtpTransporter();
  const verifyUrl = `${appUrl}/verify-email`;

  if (normalizedTo === DEMO_EMAIL) {
    console.info(`[MAIL] Skipping verification email for demo account ${DEMO_EMAIL}.`);
    return;
  }

  if (!transporter) {
    console.warn(`[DEV EMAIL] Verification code for ${normalizedTo || to}: ${code}`);
    console.warn('[DEV EMAIL] SMTP_SERVER, SMTP_USER, or SMTP_PASSWORD is not set, so no email was sent.');
    return;
  }

  try {
    const html = await render(React.createElement(VerificationEmail, {
      firstName,
      code,
      verifyUrl,
    }));

    await transporter.sendMail({
      from,
      to: normalizedTo || to,
      subject: 'Verify your NEXT REPS email',
      html,
      text: [
        `Hi ${firstName || 'there'},`,
        '',
        `Your NEXT REPS verification code is ${code}.`,
        `Open ${verifyUrl} and enter the code to verify your account.`,
        '',
        'If you did not create or update a NEXT REPS account, you can ignore this email.',
      ].join('\n'),
    });
  } catch (error) {
    console.error('[MAIL] Failed to send verification email:', error);
    throw error;
  }
}

function sendVerificationEmailLater(payload) {
  setImmediate(async () => {
    try {
      await sendVerificationEmail(payload);
    } catch {
      // Mail delivery must not change the already-sent HTTP response.
    }
  });
}

module.exports = {
  sendVerificationEmail,
  sendVerificationEmailLater,
};
