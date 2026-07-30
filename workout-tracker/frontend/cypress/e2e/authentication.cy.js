describe('critical account and authentication paths', () => {
  const email = 'cypress.account@example.test';
  const password = 'Cypress-Test-2026!';
  const verificationCode = '123456';

  before(() => {
    cy.task('cleanupUser', email);
  });

  after(() => {
    cy.task('cleanupUser', email);
  });

  it('registers, verifies and completes onboarding', () => {
    cy.visit('/register');
    cy.chooseEssentialCookies();

    cy.get('[data-cy="register-first-name"]').type('Cypress');
    cy.get('[data-cy="register-last-name"]').type('Test');
    cy.get('[data-cy="register-email"]').type(email);
    cy.get('[data-cy="register-password"]').type(password, { log: false });
    cy.get('[data-cy="register-password-confirmation"]').type(password, { log: false });
    cy.get('[data-cy="register-terms"]').check();
    cy.get('[data-cy="register-submit"]').click();

    cy.location('pathname').should('eq', '/verify-email');
    cy.task('setVerificationCode', { email, code: verificationCode });
    cy.get('[data-cy="verification-code"]').type(verificationCode);
    cy.get('[data-cy="verification-submit"]').click();

    cy.location('pathname').should('eq', '/onboarding');
    cy.get('[data-cy="onboarding-gender"]').select('Female');
    cy.get('[data-cy="onboarding-height"]').clear().type('170');
    cy.get('[data-cy="onboarding-weight"]').clear().type('65');
    cy.get('[data-cy="onboarding-water"]').clear().type('2.5');
    cy.get('[data-cy="onboarding-continue"]').click();

    cy.get('[data-cy="onboarding-steps"]').type('10000');
    cy.get('[data-cy="onboarding-calories"]').type('450');
    cy.get('[data-cy="onboarding-minutes"]').type('45');
    cy.get('[data-cy="onboarding-goal-muscle_gain"]').click();
    cy.get('[data-cy="onboarding-submit"]').click();

    cy.location('pathname').should('eq', '/dashboard');
    cy.contains('Cypress', { matchCase: false }).should('be.visible');
  });

  it('logs in, opens account settings and logs out', () => {
    cy.login(email, password);
    cy.visit('/settings');
    cy.get('[data-cy="logout"]').click();
    cy.location('pathname').should('eq', '/');
  });

  it('creates and persists a custom workout plan', () => {
    cy.login(email, password);
    cy.visit('/workouts');

    cy.get('[data-cy="workout-name"]').type('Cypress Strength');
    cy.get('[data-cy="add-exercise"]').click();
    cy.get('[data-cy="create-custom-exercise"]').click();
    cy.get('[data-cy="exercise-name"]').type('Goblet Squat');
    cy.get('[data-cy="exercise-sets"]').clear().type('3');
    cy.get('[data-cy="exercise-reps"]').clear().type('10');
    cy.get('[data-cy="save-workout"]').click();

    cy.contains('CYPRESS STRENGTH').should('be.visible');
    cy.reload();
    cy.contains('CYPRESS STRENGTH').should('be.visible');
  });
});
