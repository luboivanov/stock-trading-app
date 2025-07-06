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
});