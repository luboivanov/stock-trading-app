describe('Stock Trading Profit Finder E2E', () => {
  it('completes a successful trade flow', () => {
    cy.visit('http://localhost:3001');
    cy.contains('Stock Trading Profit Finder');

    // Fill in the form
    cy.get('input[placeholder="Select start time (UTC)"]').type('2025-07-01 10:00:00 UTC', { force: true });
    cy.get('body').type('{esc}'); // Close datepicker popover

    cy.get('input[placeholder="Select end time (UTC)"]').type('2025-07-01 10:00:18 UTC', { force: true });
    cy.get('body').type('{esc}'); // Close datepicker popover

    cy.get('input[placeholder="e.g. 1000"]').clear().type('500');
    cy.contains('Find Optimal Trade').click();

    // Wait for and check results or errors
    cy.contains('Buy Time', { timeout: 10000 }).should('exist');
    cy.contains('Sell Time').should('exist');
    cy.contains('Stocks You can Buy').should('exist');
    cy.contains('Potential Profit').should('exist');
  });

 
  it('shows error when no profitable trade is found', () => {
    cy.visit('http://localhost:3001');
    cy.get('input[placeholder="Select start time (UTC)"]').type('2025-07-01 10:00:19 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="Select end time (UTC)"]').type('2025-07-01 10:00:25 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="e.g. 1000"]').clear().type('1000'); // Insufficient funds
    cy.contains('Find Optimal Trade').click();
    cy.contains('No profitable trade found').should('exist');
  });


  it('handles fractional shares correctly', () => {
    cy.visit('http://localhost:3001');
    // Select the checkbox (assuming only one, or add selector if needed)
    cy.get('input[type="checkbox"]').check({ force: true });
    // Buy at 250 (2025-07-01T10:00:04Z), sell at 110 (2025-07-01T10:00:05Z) with $225
    // Should buy 1.5 shares (225/150), sell for 1.5*250 = $375, profit $150
    cy.get('input[placeholder="Select start time (UTC)"]').type('2025-07-01 10:00:01 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="Select end time (UTC)"]').type('2025-07-01 10:00:04 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="e.g. 1000"]').clear().type('225');
    cy.contains('Find Optimal Trade').click();
    cy.contains('Stocks You can Buy').should('contain', '2.25'); // Fractional shares
    cy.contains('Potential Profit').invoke('text').should((text) => {
      expect(text).to.match(/337.50/);
    }); // Allow rounding
  });

  it('shows error when start date is before available data', () => {
    cy.visit('http://localhost:3001');
    cy.get('input[placeholder="Select start time (UTC)"]').type('2025-06-30 23:59:59 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="Select end time (UTC)"]').type('2025-07-01 10:00:05 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="e.g. 1000"]').clear().type('1000');
    cy.contains('Find Optimal Trade').click();
    cy.contains('Start time in the request (2025-06-30T23:59:59.000Z) is earlier than the first CSV entry ').should('exist');
  });

  it('shows error when end date is after available data', () => {
    cy.visit('http://localhost:3001');
    cy.get('input[placeholder="Select start time (UTC)"]').type('2025-07-01 10:00:01 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="Select end time (UTC)"]').type('2025-07-01 20:00:01 UTC', { force: true });
    cy.get('body').type('{esc}');
    cy.get('input[placeholder="e.g. 1000"]').clear().type('1000');
    cy.contains('Find Optimal Trade').click();
    cy.contains('End time in the request (2025-07-01T20:00:01.000Z) is later than the last CSV entry').should('exist');
  });

});