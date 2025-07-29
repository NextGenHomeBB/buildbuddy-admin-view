describe('Mobile Touch Interactions', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    
    // Mock worker data
    cy.intercept('GET', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: [{ id: 'worker-user', role: 'worker', full_name: 'Worker User' }]
    }).as('getProfile');
  });

  it('should handle swipe gestures on task cards', () => {
    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Test swipe-to-complete on task card
    cy.get('[data-testid="task-card"]').first()
      .trigger('touchstart', { touches: [{ clientX: 50, clientY: 100 }] })
      .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
      .trigger('touchend');
    
    // Should show action button or complete task
    cy.get('[data-testid="task-actions"], [data-testid="task-complete"]').should('be.visible');
  });

  it('should support pull-to-refresh functionality', () => {
    cy.intercept('GET', '**/rest/v1/tasks*', {
      statusCode: 200,
      body: []
    }).as('refreshTasks');

    cy.loginAsWorker();
    cy.visit('/worker/tasks');
    
    // Pull down to refresh
    cy.get('[data-testid="pull-to-refresh"]')
      .trigger('touchstart', { touches: [{ clientX: 200, clientY: 50 }] })
      .trigger('touchmove', { touches: [{ clientX: 200, clientY: 150 }] })
      .trigger('touchend');
    
    // Should trigger refresh
    cy.wait('@refreshTasks');
    cy.contains('Refreshed').should('be.visible');
  });

  it('should handle pinch-to-zoom on calendar view', () => {
    cy.loginAsWorker();
    cy.visit('/worker/calendar');
    
    // Simulate pinch gesture
    cy.get('[data-testid="calendar-view"]')
      .trigger('touchstart', { 
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ] 
      })
      .trigger('touchmove', { 
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ] 
      })
      .trigger('touchend');
    
    // Calendar should respond to zoom
    cy.get('[data-testid="calendar-view"]').should('have.class', 'zoomed');
  });

  it('should provide haptic feedback on interactions', () => {
    cy.loginAsWorker();
    cy.visit('/worker');
    
    // Mock vibration API
    cy.window().then((win) => {
      cy.stub(win.navigator, 'vibrate').as('vibrate');
    });
    
    // Trigger action that should provide haptic feedback
    cy.get('[data-testid="task-complete-button"]').first().click();
    
    // Should trigger vibration
    cy.get('@vibrate').should('have.been.called');
  });

  it('should handle touch gestures in context menu', () => {
    cy.loginAsWorker();
    cy.visit('/worker/projects');
    
    // Long press to open context menu
    cy.get('[data-testid="project-card"]').first()
      .trigger('touchstart')
      .wait(800) // Long press duration
      .trigger('touchend');
    
    // Context menu should appear
    cy.get('[data-testid="context-menu"]').should('be.visible');
    
    // Tap outside to close
    cy.get('body').trigger('touchstart', { touches: [{ clientX: 50, clientY: 50 }] });
    cy.get('[data-testid="context-menu"]').should('not.exist');
  });

  it('should support touch scrolling with momentum', () => {
    cy.loginAsWorker();
    cy.visit('/worker/tasks');
    
    // Test momentum scrolling
    cy.get('[data-testid="task-list"]')
      .trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
      .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
      .trigger('touchend');
    
    // List should continue scrolling with momentum
    cy.get('[data-testid="task-list"]').should('have.css', 'scroll-behavior', 'smooth');
  });
});