Cypress.Commands.add('chooseEssentialCookies', () => {
  cy.get('[data-cy="cookie-essential-only"]')
    .should('be.visible')
    .click();
  cy.get('[role="dialog"][aria-labelledby="cookie-consent-title"]')
    .should('not.exist');
});

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.chooseEssentialCookies();
  cy.get('[data-cy="landing-login"]').click();
  cy.location('pathname').should('eq', '/login');
  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type(password, { log: false });
  cy.get('[data-cy="login-submit"]').click();
  cy.location('pathname').should('eq', '/dashboard');
});
