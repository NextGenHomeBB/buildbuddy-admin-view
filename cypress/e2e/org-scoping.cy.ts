describe('Organization Scoping', () => {
  beforeEach(() => {
    // Mock auth
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      }));
    });
    
    // Intercept API calls
    cy.intercept('GET', '**/profiles*', {
      fixture: 'profile-with-org.json'
    }).as('getProfile');
    
    cy.intercept('GET', '**/projects*', {
      fixture: 'org-projects.json'
    }).as('getProjects');
  });

  it('should load admin with single org scoping', () => {
    cy.visit('/admin');
    
    // Wait for profile load
    cy.wait('@getProfile');
    
    // Should show organization name in header
    cy.get('header').should('contain', 'Test Organization');
    
    // Should not show organization switcher
    cy.get('[data-testid="org-switcher"]').should('not.exist');
    
    // Should load projects for the organization
    cy.wait('@getProjects');
    cy.get('[data-testid="projects-table"]').should('be.visible');
  });

  it('should restrict access to unauthorized org data', () => {
    // Mock failed request for unauthorized org
    cy.intercept('GET', '**/projects*', {
      statusCode: 403,
      body: { message: 'Unauthorized' }
    }).as('getUnauthorizedProjects');
    
    cy.visit('/admin/projects');
    
    // Should show error or redirect
    cy.wait('@getUnauthorizedProjects');
    cy.get('[data-testid="error-message"]').should('contain', 'Organization not found');
  });

  it('should handle missing organization gracefully', () => {
    // Mock profile without default org
    cy.intercept('GET', '**/profiles*', {
      body: { default_org_id: null }
    }).as('getProfileNoOrg');
    
    cy.visit('/admin');
    cy.wait('@getProfileNoOrg');
    
    // Should show error state
    cy.get('[data-testid="org-error"]').should('contain', 'No organization found');
  });
});