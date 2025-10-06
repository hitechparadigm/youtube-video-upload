/**
 * Jest configuration for integration tests
 */

export default {
  testEnvironment: 'node',
  testMatch: ['**/test/integration/**/*.test.js'],
  testTimeout: 30000, // 30 seconds for API calls
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.js'],
  collectCoverage: false, // Disable for integration tests
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleType: 'module'
};