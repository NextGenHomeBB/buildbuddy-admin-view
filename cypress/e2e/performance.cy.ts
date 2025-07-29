describe('Performance Tests', () => {
  beforeEach(() => {
    // Set up performance monitoring
    cy.intercept('GET', '**/rest/v1/**', (req) => {
      req.continue((res) => {
        // Add artificial delay for testing
        res.delay = Math.random() * 100;
      });
    });
  });

  it('should load admin dashboard within performance budget', () => {
    cy.loginAsAdmin();
    
    // Start performance measurement
    cy.window().then((win) => {
      win.performance.mark('dashboard-start');
    });
    
    cy.visit('/admin');
    
    // Wait for page to be fully loaded
    cy.get('[data-testid="admin-dashboard"]').should('be.visible');
    
    // Measure performance
    cy.window().then((win) => {
      win.performance.mark('dashboard-end');
      win.performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end');
      
      const measures = win.performance.getEntriesByType('measure');
      const dashboardMeasure = measures.find(m => m.name === 'dashboard-load');
      
      // Assert load time is under 3 seconds
      expect(dashboardMeasure?.duration).to.be.lessThan(3000);
    });
  });

  it('should handle large datasets efficiently', () => {
    // Mock large dataset
    const largeTaskSet = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'in_progress' : 'todo',
      project_id: 'project-1'
    }));

    cy.intercept('GET', '**/rest/v1/tasks*', {
      statusCode: 200,
      body: largeTaskSet
    }).as('getLargeTasks');

    cy.loginAsAdmin();
    cy.visit('/admin/projects/project-1/tasks');
    
    // Verify virtual scrolling is working
    cy.get('[data-testid="virtual-list"]').should('be.visible');
    
    // Check that not all tasks are rendered at once
    cy.get('[data-testid="task-card"]').should('have.length.lessThan', 100);
    
    // Test scrolling performance
    cy.get('[data-testid="virtual-list"]').scrollTo(0, 5000);
    cy.get('[data-testid="task-card"]').should('be.visible');
  });

  it('should maintain responsive performance on mobile', () => {
    cy.viewport('iphone-x');
    cy.loginAsWorker();
    
    cy.window().then((win) => {
      win.performance.mark('mobile-start');
    });
    
    cy.visit('/worker');
    
    // Test touch interactions
    cy.get('[data-testid="project-card"]').first().click();
    
    cy.window().then((win) => {
      win.performance.mark('mobile-end');
      win.performance.measure('mobile-interaction', 'mobile-start', 'mobile-end');
      
      const measures = win.performance.getEntriesByType('measure');
      const mobileMeasure = measures.find(m => m.name === 'mobile-interaction');
      
      // Mobile interactions should be under 1 second
      expect(mobileMeasure?.duration).to.be.lessThan(1000);
    });
  });

  it('should handle network failures gracefully', () => {
    cy.loginAsAdmin();
    
    // Simulate network failure
    cy.intercept('GET', '**/rest/v1/projects*', { forceNetworkError: true }).as('networkFailure');
    
    cy.visit('/admin/projects');
    
    // Should show error boundary or loading state
    cy.get('[data-testid="error-boundary"], [data-testid="loading-state"]').should('be.visible');
    
    // Should not crash the application
    cy.get('body').should('be.visible');
  });
});