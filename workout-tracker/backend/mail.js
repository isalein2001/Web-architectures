const React = require('react');
const { render } = require('@react-email/render');
const { Resend } = require('resend');
const VerificationEmail = require('./emails/VerificationEmail');

const DEMO_EMAIL = 'jonasarnold@gmail.com';

const normalizeBaseUrl = (url) => (url || 'http://localhost:5173').replace(/\/+$/, '');
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const getMailConfig = () => ({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.MAIL_FROM || 'NEXT REPS <onboarding@resend.dev>',
  appUrl: normalizeBaseUrl(process.env.APP_URL),
});

const getResendClient = () => {
  const { apiKey } = getMailConfig();
  return apiKey ? new Resend(apiKey) : null;
};

async function sendVerificationEmail({ to, firstName, code }) {
  const normalizedTo = normalizeEmail(to);
  const { from, appUrl } = getMailConfig();
  const resend = getResendClient();
  const verifyUrl = `${appUrl}/verify-email`;

  if (normalizedTo === DEMO_EMAIL) {
    console.info(`[MAIL] Skipping verification email for demo account ${DEMO_EMAIL}.`);
    return;
  }

  if (!resend) {
    console.warn(`[DEV EMAIL] Verification code for ${normalizedTo || to}: ${code}`);
    console.warn('[DEV EMAIL] RESEND_API_KEY is not set, so no email was sent.');
    return;
  }

  try {
    const html = await render(React.createElement(VerificationEmail, {
      firstName,
      code,
      verifyUrl,
    }));

    await resend.emails.send({
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
