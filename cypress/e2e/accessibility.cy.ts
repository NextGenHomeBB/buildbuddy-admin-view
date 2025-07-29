describe('Accessibility Tests', () => {
  beforeEach(() => {
    // Set up common mocks
    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [{ id: 'admin-user', role: 'admin', full_name: 'Admin User' }]
    }).as('getProfile');
  });

  it('should have no accessibility violations on admin dashboard', () => {
    cy.loginAsAdmin();
    cy.visit('/admin');
    
    // Check for accessibility violations
    cy.checkA11y();
    
    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('be.visible');
    
    // Test skip links
    cy.get('[data-testid="skip-to-content"]').should('exist');
  });

  it('should have proper ARIA labels and roles', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/projects');
    
    // Check for proper table structure
    cy.get('table').should('have.attr', 'role', 'table');
    cy.get('thead').should('have.attr', 'role', 'rowgroup');
    cy.get('tbody').should('have.attr', 'role', 'rowgroup');
    
    // Check for button accessibility
    cy.get('button').each(($btn) => {
      cy.wrap($btn).should('have.attr', 'type');
    });
    
    // Check for form labels
    cy.get('input').each(($input) => {
      const id = $input.attr('id');
      if (id) {
        cy.get(`label[for="${id}"]`).should('exist');
      }
    });
  });

  it('should support keyboard navigation', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/projects');
    
    // Test tab navigation through interactive elements
    cy.get('body').tab();
    cy.focused().should('be.visible');
    
    // Test escape key to close modals
    cy.get('[data-testid="new-project-button"]').click();
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
    
    // Test enter key to activate buttons
    cy.get('[data-testid="new-project-button"]').focus().type('{enter}');
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should have proper color contrast', () => {
    cy.loginAsAdmin();
    cy.visit('/admin');
    
    // Check color contrast for all text elements
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  it('should work with screen readers', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/projects');
    
    // Check for screen reader announcements
    cy.get('[aria-live]').should('exist');
    
    // Check for descriptive headings
    cy.get('h1, h2, h3, h4, h5, h6').each(($heading) => {
      cy.wrap($heading).should('not.be.empty');
    });
    
    // Check for alt text on images
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
  });
});