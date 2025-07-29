describe('Worker Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Mock worker profile data
    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [{ id: 'worker-user', role: 'worker', full_name: 'Worker User' }]
    }).as('getProfile');

    // Mock worker projects
    cy.intercept('GET', '**/rest/v1/project_workers*', {
      statusCode: 200,
      body: [
        {
          id: 'pw-1',
          project_id: 'project-1',
          worker_id: 'worker-user',
          project: {
            id: 'project-1',
            name: 'Construction Project',
            status: 'active',
            description: 'Main construction project'
          }
        }
      ]
    }).as('getWorkerProjects');

    // Mock worker tasks
    cy.intercept('GET', '**/rest/v1/tasks*', {
      statusCode: 200,
      body: [
        {
          id: 'task-1',
          title: 'Foundation Work',
          description: 'Complete foundation excavation',
          status: 'in_progress',
          priority: 'high',
          assigned_to: 'worker-user',
          project_id: 'project-1'
        }
      ]
    }).as('getWorkerTasks');
  });

  it('should display worker dashboard with projects and tasks', () => {
    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Verify dashboard loads
    cy.url().should('include', '/worker');
    cy.contains('Welcome back').should('be.visible');
    
    // Verify projects section
    cy.contains('Recent Projects').should('be.visible');
    cy.contains('Construction Project').should('be.visible');
    
    // Verify tasks section
    cy.contains('Active Tasks').should('be.visible');
    cy.contains('Foundation Work').should('be.visible');
  });

  it('should navigate to project details from dashboard', () => {
    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Click on project card
    cy.contains('Construction Project').click();
    
    // Should navigate to project detail
    cy.url().should('include', '/worker/projects/project-1');
  });

  it('should update task status from dashboard', () => {
    cy.intercept('PATCH', '**/rest/v1/tasks*', {
      statusCode: 200,
      body: { id: 'task-1', status: 'done' }
    }).as('updateTask');

    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Find and click task status button
    cy.get('[data-testid="task-status-button"]').first().click();
    
    // Verify API call
    cy.wait('@updateTask');
    
    // Verify success message
    cy.contains('Task updated').should('be.visible');
  });

  it('should handle mobile navigation correctly', () => {
    cy.viewport('iphone-x');
    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Mobile bottom navigation should be visible
    cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible');
    
    // Test navigation to projects
    cy.get('[data-testid="nav-projects"]').click();
    cy.url().should('include', '/worker/projects');
    
    // Test navigation back to dashboard
    cy.get('[data-testid="nav-dashboard"]').click();
    cy.url().should('include', '/worker');
  });
});