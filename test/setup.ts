/**
 * Jest Test Setup Configuration
 * 
 * This file runs before all tests and sets up:
 * - AWS SDK mocking for unit tests
 * - Environment variables for testing
 * - Global test utilities and helpers
 * - Mock configurations for external APIs
 * 
 * Ensures tests run in isolation without making real AWS API calls
 * or external service requests.
 */

// Mock AWS SDK to prevent real API calls during testing
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      get: jest.fn().mockReturnValue({ promise: jest.fn() }),
      put: jest.fn().mockReturnValue({ promise: jest.fn() }),
      update: jest.fn().mockReturnValue({ promise: jest.fn() }),
      delete: jest.fn().mockReturnValue({ promise: jest.fn() }),
      query: jest.fn().mockReturnValue({ promise: jest.fn() }),
      scan: jest.fn().mockReturnValue({ promise: jest.fn() })
    }))
  },
  S3: jest.fn(() => ({
    getObject: jest.fn().mockReturnValue({ promise: jest.fn() }),
    putObject: jest.fn().mockReturnValue({ promise: jest.fn() }),
    deleteObject: jest.fn().mockReturnValue({ promise: jest.fn() }),
    listObjects: jest.fn().mockReturnValue({ promise: jest.fn() })
  })),
  SecretsManager: jest.fn(() => ({
    getSecretValue: jest.fn().mockReturnValue({ promise: jest.fn() })
  })),
  Polly: jest.fn(() => ({
    synthesizeSpeech: jest.fn().mockReturnValue({ promise: jest.fn() })
  })),
  Bedrock: jest.fn(() => ({
    invokeModel: jest.fn().mockReturnValue({ promise: jest.fn() })
  }))
}));

// Set up test environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-video-pipeline-bucket';
process.env.TOPIC_TABLE_NAME = 'test-topics-table';
process.env.TREND_DATA_TABLE_NAME = 'test-trends-table';
process.env.VIDEO_PRODUCTION_TABLE_NAME = 'test-videos-table';
process.env.API_CREDENTIALS_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-credentials';

// Global test timeout for async operations
jest.setTimeout(30000);

// Mock external API responses for consistent testing
(global as any).mockApiResponses = {
  googleTrends: {
    default: {
      timelineData: [
        { time: '2025-01-01', formattedTime: 'Jan 1, 2025', value: [85] }
      ]
    }
  },
  
  twitter: {
    trends: [
      { name: 'Real Estate Investment', tweet_volume: 15000 },
      { name: 'Canada Housing Market', tweet_volume: 8500 }
    ]
  },
  
  youtube: {
    items: [
      {
        id: { videoId: 'test-video-id' },
        snippet: {
          title: 'Real Estate Investment Tips',
          description: 'Learn about investing in Canadian real estate',
          publishedAt: '2025-01-01T00:00:00Z'
        },
        statistics: { viewCount: '50000' }
      }
    ]
  },
  
  pexels: {
    photos: [
      {
        id: 12345,
        url: 'https://example.com/photo.jpg',
        photographer: 'Test Photographer',
        src: {
          large: 'https://example.com/photo-large.jpg',
          medium: 'https://example.com/photo-medium.jpg'
        }
      }
    ]
  },
  
  pixabay: {
    hits: [
      {
        id: 67890,
        webformatURL: 'https://example.com/image.jpg',
        tags: 'real estate, house, investment',
        user: 'TestUser'
      }
    ]
  }
};

// Console log suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods after tests
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});