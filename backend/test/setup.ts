/**
 * Test Setup
 *
 * Global test configuration and setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SWAGGER_ENABLED = 'false'; // Disable Swagger for tests

// Increase timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(), // Silence logs
  debug: jest.fn(), // Silence debug
  info: jest.fn(), // Silence info
  warn: jest.fn(), // Keep warnings visible in tests (can comment out if too noisy)
  error: jest.fn(), // Keep errors visible
};

// Global test lifecycle hooks
beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
});
