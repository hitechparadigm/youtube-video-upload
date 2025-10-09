/**
 * Jest Test Setup
 * Global setup and configuration for all tests
 */

import { jest } from '@jest/globals';
import { setupTestEnvironment } from './test-helpers.js';
import TEST_CONFIG from './test-config.js';

// Global test setup
beforeAll(() => {
  // Set up test environment
  setupTestEnvironment();
  
  // Set environment variables for tests
  Object.entries(TEST_CONFIG.environment).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Mock AWS SDK globally
  mockAWSSDK();
  
  // Set up global test utilities
  global.TEST_CONFIG = TEST_CONFIG;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global cleanup
afterAll(() => {
  jest.restoreAllMocks();
});

/**
 * Mock AWS SDK modules globally
 */
function mockAWSSDK() {
  // Mock S3 Client
  jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        ETag: '"test-etag"',
        Location: 'https://test-bucket.s3.amazonaws.com/test-key'
      })
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
    DeleteObjectCommand: jest.fn()
  }));

  // Mock DynamoDB Client
  jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({})
    }))
  }));

  // Mock DynamoDB Document Client
  jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({ Items: [] })
      })
    },
    QueryCommand: jest.fn(),
    PutCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    ScanCommand: jest.fn(),
    GetCommand: jest.fn()
  }));

  // Mock Secrets Manager Client
  jest.mock('@aws-sdk/client-secrets-manager', () => ({
    SecretsManagerClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        SecretString: JSON.stringify({
          'pexels-api-key': 'test-pexels-key',
          'pixabay-api-key': 'test-pixabay-key',
          'youtube-oauth-client-id': 'test-client-id',
          'youtube-oauth-client-secret': 'test-client-secret',
          'youtube-oauth-refresh-token': 'test-refresh-token'
        })
      })
    })),
    GetSecretValueCommand: jest.fn()
  }));

  // Mock Lambda Client
  jest.mock('@aws-sdk/client-lambda', () => ({
    LambdaClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        Payload: JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({ success: true })
        })
      })
    })),
    InvokeCommand: jest.fn()
  }));

  // Mock Bedrock Runtime Client
  jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              specificLocations: ['test location'],
              visualElements: ['test element'],
              searchKeywords: ['test keyword']
            })
          }]
        }))
      })
    })),
    InvokeModelCommand: jest.fn()
  }));

  // Mock Polly Client
  jest.mock('@aws-sdk/client-polly', () => ({
    PollyClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        AudioStream: {
          transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
        }
      })
    })),
    SynthesizeSpeechCommand: jest.fn(),
    DescribeVoicesCommand: jest.fn()
  }));

  // Mock Rekognition Client
  jest.mock('@aws-sdk/client-rekognition', () => ({
    RekognitionClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        Labels: [
          { Name: 'Test Label', Confidence: 95.5 }
        ]
      })
    })),
    DetectLabelsCommand: jest.fn(),
    DetectTextCommand: jest.fn()
  }));
}

/**
 * Global test utilities
 */
global.testUtils = {
  // Wait for promises to resolve
  waitForPromises: () => new Promise(resolve => setImmediate(resolve)),
  
  // Create test timeout
  createTimeout: (ms) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Test timeout')), ms)
  ),
  
  // Mock console methods
  mockConsole: () => {
    const originalConsole = global.console;
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };
    return originalConsole;
  },
  
  // Restore console
  restoreConsole: (originalConsole) => {
    global.console = originalConsole;
  }
};

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, just log the error
});