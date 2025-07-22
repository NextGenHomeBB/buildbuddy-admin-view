// <reference types="cypress" />

// Custom commands
Cypress.Commands.add('loginAsAdmin', () => {
  const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@buildbuddy.com';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';
  
  cy.visit('/auth');
  cy.get('[data-testid="email-input"]').type(adminEmail);
  cy.get('[data-testid="password-input"]').type(adminPassword);
  cy.get('[data-testid="login-button"]').click();
  
  // Wait for successful login
  cy.url().should('not.include', '/auth');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>
    }
  }
}