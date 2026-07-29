Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.get('[data-cy="landing-login"]').click();
  cy.location('pathname').should('eq', '/login');
  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type(password, { log: false });
  cy.get('[data-cy="login-submit"]').click();
  cy.location('pathname').should('eq', '/dashboard');
});
