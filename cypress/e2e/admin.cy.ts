describe('Admin Panel E2E - Smoke Tests', () => {
  beforeEach(() => {
    // Set up Supabase intercepts for reliable testing
    cy.intercept('POST', '**/rest/v1/projects*', {
      statusCode: 201,
      body: { 
        id: 'test-project-id', 
        name: 'Test Build',
        status: 'planning',
        created_at: new Date().toISOString(),
        project_phases: []
      }
    }).as('createProject');
    
    cy.intercept('GET', '**/rest/v1/projects*', {
      statusCode: 200,
      body: [
        { 
          id: '1', 
          name: 'Existing Project', 
          status: 'active',
          created_at: '2025-01-01T00:00:00.000Z',
          project_phases: []
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
    cy.get('thead').should('contain', 'Phases');
    cy.get('thead').should('contain', 'Updated At');
  });

  it('should click "New Project", type "Test Build", save and show toast', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/projects');
    
    // Get initial table row count
    cy.get('tbody tr').its('length').as('initialRowCount');
    
    // Click new project button to open drawer
    cy.get('[data-testid="new-project-button"]').click();
    
    // Fill out the drawer form with exact text "Test Build"
    cy.get('#name').type('Test Build');
    cy.get('#description').type('Test project for E2E testing');
    
    // Submit the form
    cy.contains('button', 'Create').click();
    
    // Verify the API call was made
    cy.wait('@createProject').should('have.property', 'response.statusCode', 201);
    
    // Assert toast "Project created" appears - check for the actual toast message
    cy.contains('Project created').should('be.visible');
    
    // Assert table row count increments
    cy.get('@initialRowCount').then((initialCount) => {
      cy.get('tbody tr').should('have.length', Number(initialCount) + 1);
    });
  });

  it('should select phases and bulk update status', () => {
    cy.loginAsAdmin();
    
    // Mock project data with phases
    cy.intercept('GET', '**/rest/v1/projects*', {
      statusCode: 200,
      body: [
        { 
          id: 'test-project-1', 
          name: 'Test Project', 
          status: 'active',
          description: 'Test project with phases',
          created_at: '2025-01-01T00:00:00.000Z',
          project_phases: [
            { id: 'phase-1' },
            { id: 'phase-2' }
          ]
        }
      ]
    }).as('getProjects');

    // Mock project phases data
    cy.intercept('GET', '**/rest/v1/project_phases*', {
      statusCode: 200,
      body: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          status: 'in_progress',
          progress: 50,
          description: 'First phase',
          project_id: 'test-project-1'
        },
        {
          id: 'phase-2', 
          name: 'Phase 2',
          status: 'not_started',
          progress: 0,
          description: 'Second phase',
          project_id: 'test-project-1'
        }
      ]
    }).as('getPhases');

    // Mock the bulk update edge function
    cy.intercept('POST', '**/functions/v1/bulk_update_phase_status', {
      statusCode: 200,
      body: {
        updated_count: 2,
        message: 'Successfully updated 2 phases'
      }
    }).as('invokeBulk');

    // Visit project detail page
    cy.visit('/admin/projects/test-project-1');
    
    // Wait for data to load
    cy.wait('@getProjects');
    cy.wait('@getPhases');

    // Select two phases using checkboxes
    cy.get('input[type="checkbox"]').first().check(); // Select all checkbox
    
    // Verify Mark Complete button appears and click it
    cy.contains('Mark Complete').should('be.visible').click();
    
    // Wait for bulk update API call
    cy.wait('@invokeBulk').should('have.property', 'response.statusCode', 200);
    
    // Verify success toast appears
    cy.contains('Successfully updated 2 phases').should('be.visible');
  });

  it('should redirect non-admin users from admin routes', () => {
    // Visit admin route without authentication
    cy.visit('/admin/projects');
    
    // Should redirect to auth page due to RequireAdmin component
    cy.url().should('include', '/auth');
  });
});