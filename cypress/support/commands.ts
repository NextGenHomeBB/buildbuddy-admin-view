/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';
import './accessibility';

// Custom command for admin login using Supabase REST API
Cypress.Commands.add('loginAsAdmin', () => {
  const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@buildbuddy.com';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';
  
  // Direct Supabase auth via REST API for faster, more reliable testing
  cy.request({
    method: 'POST',
    url: 'https://ppsjrqfgsznnlojpyjvu.supabase.co/auth/v1/token?grant_type=password',
    body: {
      email: adminEmail,
      password: adminPassword
    },
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwc2pycWZnc3pubmxvanB5anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTY3NTgsImV4cCI6MjA2ODY3Mjc1OH0.dO08bUqr9XqMk3fVkDK1OxpnzY_S5pPzUPAicnpTURE',
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    // Set auth tokens in localStorage for the app to use
    window.localStorage.setItem(
      `supabase.auth.token.ppsjrqfgsznnlojpyjvu`,
      JSON.stringify(response.body)
    );
  });
});

// Alternative UI-based login for more integration-like testing
Cypress.Commands.add('loginAsAdminUI', () => {
  const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@buildbuddy.com';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';
  
  cy.visit('/auth');
  cy.get('[data-testid="email-input"]').type(adminEmail);
  cy.get('[data-testid="password-input"]').type(adminPassword);
  cy.get('[data-testid="login-button"]').click();
  
  // Wait for successful login
  cy.url().should('not.include', '/auth');
});

// Add worker login command
Cypress.Commands.add('loginAsWorker', () => {
  const workerEmail = Cypress.env('WORKER_EMAIL') || 'worker@buildbuddy.com';
  const workerPassword = Cypress.env('WORKER_PASSWORD') || 'worker123';
  
  cy.request({
    method: 'POST',
    url: 'https://ppsjrqfgsznnlojpyjvu.supabase.co/auth/v1/token?grant_type=password',
    body: {
      email: workerEmail,
      password: workerPassword
    },
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwc2pycWZnc3pubmxvanB5anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTY3NTgsImV4cCI6MjA2ODY3Mjc1OH0.dO08bUqr9XqMk3fVkDK1OxpnzY_S5pPzUPAicnpTURE',
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    window.localStorage.setItem(
      `supabase.auth.token.ppsjrqfgsznnlojpyjvu`,
      JSON.stringify(response.body)
    );
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>
      loginAsAdminUI(): Chainable<void>
      loginAsWorker(): Chainable<void>
    }
  }
}

export {};