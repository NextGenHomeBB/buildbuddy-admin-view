describe('Admin Panel', () => {
  const loginAsAdmin = () => {
    // Using environment variables for admin credentials
    const adminEmail = Cypress.env('ADMIN_EMAIL') || 'admin@buildbuddy.com';
    const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';
    
    cy.visit('/auth');
    cy.get('[data-testid="email-input"]').type(adminEmail);
    cy.get('[data-testid="password-input"]').type(adminPassword);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for successful login
    cy.url().should('not.include', '/auth');
  };

  beforeEach(() => {
    // Set up Supabase intercepts
    cy.intercept('POST', '**/rest/v1/projects*', {
      statusCode: 201,
      body: { id: 'test-id', name: 'Test Project' }
    }).as('supabaseInsert');
    
    cy.intercept('GET', '**/rest/v1/projects*', {
      statusCode: 200,
      body: []
    }).as('supabaseGet');
  });

  it('should redirect non-admin users from admin routes', () => {
    // Visit admin route without authentication
    cy.visit('/admin/projects');
    
    // Should redirect to home page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should allow admin access to projects page', () => {
    loginAsAdmin();
    
    // Visit admin projects page
    cy.visit('/admin/projects');
    
    // Should successfully load the page
    cy.url().should('include', '/admin/projects');
    cy.get('[data-testid="admin-projects-header"]').should('be.visible');
  });

  it('should create new project successfully', () => {
    loginAsAdmin();
    
    cy.visit('/admin/projects');
    
    // Click new project button
    cy.get('[data-testid="new-project-button"]').click();
    
    // Fill out the form
    cy.get('[data-testid="project-name-input"]').type('Test Project');
    cy.get('[data-testid="project-description-input"]').type('Test Description');
    
    // Submit the form
    cy.get('[data-testid="submit-project-button"]').click();
    
    // Verify the API call was made
    cy.wait('@supabaseInsert').should('have.property', 'response.statusCode', 201);
  });
});