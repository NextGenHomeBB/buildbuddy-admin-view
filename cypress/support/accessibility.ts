/// <reference types="cypress" />

// Add accessibility testing commands
Cypress.Commands.add('checkA11y', (context?: string | Node, options?: any) => {
  // Simple accessibility checks without axe-core
  if (context) {
    cy.get(context).within(() => {
      checkBasicA11y();
    });
  } else {
    checkBasicA11y();
  }
});

function checkBasicA11y() {
  // Check for alt attributes on images
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });
  
  // Check for form labels
  cy.get('input:not([type="hidden"])').each(($input) => {
    const id = $input.attr('id');
    if (id) {
      cy.get(`label[for="${id}"], [aria-labelledby*="${id}"]`).should('exist');
    }
  });
  
  // Check for button types
  cy.get('button').each(($btn) => {
    if (!$btn.attr('type')) {
      cy.wrap($btn).should('have.attr', 'type', 'button');
    }
  });
  
  // Check for heading structure
  cy.get('h1').should('have.length.at.most', 1);
}

// Add keyboard navigation helper
Cypress.Commands.add('tab', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).trigger('keydown', { key: 'Tab' });
  return cy.focused();
});

declare global {
  namespace Cypress {
    interface Chainable {
      checkA11y(context?: string | Node, options?: any): Chainable<void>
      tab(): Chainable<JQuery<HTMLElement>>
    }
  }
}

export {};