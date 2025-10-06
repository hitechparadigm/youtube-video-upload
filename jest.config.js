/**
 * Jest Configuration for Automated Video Pipeline
 * 
 * This configuration sets up Jest testing framework for:
 * - Unit tests for Lambda functions
 * - Integration tests for AWS service interactions
 * - Mock configurations for external APIs
 * - Test coverage reporting
 * 
 * Tests ensure reliability of the video generation pipeline
 * before deploying to production.
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // Test file patterns to include
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Module path mapping for cleaner imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1'
  },
  
  // Transform configuration for TypeScript
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Ignore patterns for faster test execution
  testPathIgnorePatterns: [
    '/node_modules/',
    '/cdk.out/',
    '/dist/'
  ],
  
  // Verbose output for better debugging
  verbose: true,
  
  // Clear mocks between tests for isolation
  clearMocks: true,
  
  // Collect coverage in multiple formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage output directory
  coverageDirectory: 'coverage'
};