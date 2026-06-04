const React = require('react');
const {
  Body,
  Button,
  CodeInline,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} = require('@react-email/components');

const colors = {
  background: '#f4f7f5',
  panel: '#ffffff',
  text: '#17211b',
  muted: '#5f6f66',
  accent: '#49c86f',
  border: '#dfe8e2',
};

function VerificationEmail({ firstName = 'there', code, verifyUrl }) {
  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, 'Verify your PROGYM email address'),
    React.createElement(
      Body,
      {
        style: {
          margin: 0,
          backgroundColor: colors.background,
          fontFamily: 'Arial, sans-serif',
          color: colors.text,
        },
      },
      React.createElement(
        Container,
        {
          style: {
            maxWidth: '560px',
            margin: '0 auto',
            padding: '32px 18px',
          },
        },
        React.createElement(
          Section,
          {
            style: {
              backgroundColor: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '28px',
            },
          },
          React.createElement(Heading, {
            as: 'h1',
            style: {
              margin: '0 0 12px',
              fontSize: '26px',
              lineHeight: '32px',
            },
          }, 'Verify your email'),
          React.createElement(Text, {
            style: {
              margin: '0 0 18px',
              fontSize: '16px',
              lineHeight: '24px',
              color: colors.muted,
            },
          }, `Hi ${firstName}, use this code to finish setting up your PROGYM account.`),
          React.createElement(
            Section,
            {
              style: {
                margin: '22px 0',
                padding: '18px',
                backgroundColor: '#eef8f0',
                borderRadius: '8px',
                textAlign: 'center',
              },
            },
            React.createElement(CodeInline, {
              style: {
                fontSize: '30px',
                letterSpacing: '6px',
                fontWeight: 700,
                color: colors.text,
              },
            }, code),
          ),
          React.createElement(Button, {
            href: verifyUrl,
            style: {
              display: 'inline-block',
              backgroundColor: colors.accent,
              borderRadius: '6px',
              color: '#08110c',
              fontSize: '15px',
              fontWeight: 700,
              padding: '12px 18px',
              textDecoration: 'none',
            },
          }, 'Open verification page'),
          React.createElement(Text, {
            style: {
              margin: '18px 0 0',
              fontSize: '14px',
              lineHeight: '22px',
              color: colors.muted,
            },
          }, 'If the button does not work, open this link: ',
          React.createElement(Link, { href: verifyUrl, style: { color: colors.text } }, verifyUrl)),
          React.createElement(Hr, { style: { borderColor: colors.border, margin: '24px 0' } }),
          React.createElement(Text, {
            style: {
              margin: 0,
              fontSize: '13px',
              lineHeight: '20px',
              color: colors.muted,
            },
          }, 'You can ignore this email if you did not create or update a PROGYM account.')
        )
      )
    )
  );
}

module.exports = VerificationEmail;
