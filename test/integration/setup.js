/**
 * Integration test setup
 * Configures environment and test utilities
 */

import { beforeAll, afterAll } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting Integration Test Suite');
  console.log('Environment:', process.env.NODE_ENV || 'test');
  
  // Validate required environment variables
  const requiredEnvVars = ['API_BASE_URL', 'API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('Some tests may be skipped or use default values');
  }
  
  // Set default test timeout
  jest.setTimeout(30000);
});

afterAll(async () => {
  console.log('✅ Integration Test Suite Complete');
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});