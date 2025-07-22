describe('Admin Panel E2E - Smoke Tests', () => {
  beforeEach(() => {
    // Set up Supabase intercepts for reliable testing
    cy.intercept('POST', '**/rest/v1/projects*', {
      statusCode: 201,
      body: { 
        id: 'test-project-id', 
        name: 'Test Build',
        status: 'planning',
        created_at: new Date().toISOString()
      }
    }).as('createProject');
    
    cy.intercept('GET', '**/rest/v1/projects*', {
      statusCode: 200,
      body: [
        { 
          id: '1', 
          name: 'Existing Project', 
          status: 'active',
          created_at: '2025-01-01T00:00:00.000Z'
        }
      ]
    }).as('getProjects');

    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [{ id: 'admin-user', role: 'admin', full_name: 'Admin User' }]
    }).as('getProfile');
  });

  it('should visit /admin/projects and assert table rows render', () => {
    // Login using the custom command
    cy.loginAsAdmin();
    
    // Visit admin projects page
    cy.visit('/admin/projects');
    
    // Assert URL is correct
    cy.url().should('include', '/admin/projects');
    
    // Assert table rows render
    cy.get('table').should('be.visible');
    cy.get('tbody tr').should('have.length.at.least', 1);
    
    // Assert table headers are present
    cy.get('thead').should('contain', 'Name');
    cy.get('thead').should('contain', 'Status');
  });

  it('should click "New Project", type "Test Build", save and show toast', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/projects');
    
    // Get initial table row count
    cy.get('tbody tr').its('length').as('initialRowCount');
    
    // Click new project button
    cy.get('[data-testid="new-project-button"]').click();
    
    // Fill out the form with exact text "Test Build"
    cy.get('[data-testid="project-name-input"]').type('Test Build');
    cy.get('[data-testid="project-description-input"]').type('Test project for E2E testing');
    
    // Submit the form
    cy.get('[data-testid="submit-project-button"]').click();
    
    // Verify the API call was made
    cy.wait('@createProject').should('have.property', 'response.statusCode', 201);
    
    // Assert toast "Project created" appears
    cy.get('[data-testid="toast"]')
      .should('be.visible')
      .and('contain', 'Project created');
    
    // Assert table row count increments
    cy.get('@initialRowCount').then((initialCount) => {
      cy.get('tbody tr').should('have.length', Number(initialCount) + 1);
    });
  });

  it('should redirect non-admin users from admin routes', () => {
    // Visit admin route without authentication
    cy.visit('/admin/projects');
    
    // Should redirect to auth page due to RequireAdmin component
    cy.url().should('include', '/auth');
  });
});