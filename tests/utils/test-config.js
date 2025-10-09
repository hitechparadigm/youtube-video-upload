/**
 * Test Configuration
 * Configuration settings and constants for tests
 */

export const TEST_CONFIG = {
  // Test timeouts
  timeouts: {
    unit: 5000,        // 5 seconds for unit tests
    integration: 30000, // 30 seconds for integration tests
    e2e: 60000         // 60 seconds for end-to-end tests
  },

  // Test environment settings
  environment: {
    AWS_REGION: 'us-east-1',
    S3_BUCKET: 'test-automated-video-pipeline-bucket',
    CONTEXT_TABLE: 'test-context-table',
    TOPICS_TABLE_NAME: 'test-topics-table',
    SCRIPTS_TABLE_NAME: 'test-scripts-table',
    VIDEOS_TABLE_NAME: 'test-videos-table'
  },

  // Mock Lambda function names
  lambdaFunctions: {
    topicManagement: 'test-topic-management-function',
    scriptGenerator: 'test-script-generator-function',
    mediaCurator: 'test-media-curator-function',
    audioGenerator: 'test-audio-generator-function',
    videoAssembler: 'test-video-assembler-function',
    youtubePublisher: 'test-youtube-publisher-function',
    workflowOrchestrator: 'test-workflow-orchestrator-function'
  },

  // Test data constants
  testData: {
    defaultTopic: 'AI Tools for Content Creation',
    defaultAudience: 'general',
    defaultVideoStyle: 'engaging_educational',
    defaultDuration: 480, // 8 minutes
    defaultSceneCount: 5,
    
    sampleTopics: [
      'AI Tools for Content Creation',
      'Investment Strategies for Beginners',
      'Digital Marketing Fundamentals',
      'Productivity Hacks for Remote Work',
      'Sustainable Living Tips'
    ],

    sampleKeywords: [
      'education', 'tutorial', 'guide', 'tips', 'strategies',
      'beginners', 'advanced', 'professional', '2025', 'latest'
    ]
  },

  // API rate limits for testing
  rateLimits: {
    bedrock: {
      requestsPerSecond: 2,
      delayBetweenRequests: 500 // milliseconds
    },
    polly: {
      requestsPerSecond: 2,
      delayBetweenRequests: 500 // milliseconds
    },
    pexels: {
      requestsPerSecond: 5,
      delayBetweenRequests: 200 // milliseconds
    },
    pixabay: {
      requestsPerSecond: 5,
      delayBetweenRequests: 200 // milliseconds
    }
  },

  // Expected response formats
  responseFormats: {
    healthCheck: {
      service: 'string',
      status: 'healthy',
      timestamp: 'string',
      version: 'string'
    },

    topicContext: {
      projectId: 'string',
      selectedTopic: 'string',
      mainTopic: 'string',
      expandedTopics: 'array',
      videoStructure: 'object',
      seoContext: 'object'
    },

    sceneContext: {
      projectId: 'string',
      scenes: 'array',
      totalDuration: 'number',
      selectedSubtopic: 'string'
    },

    mediaContext: {
      projectId: 'string',
      sceneMediaMapping: 'array',
      totalAssets: 'number',
      industryStandards: 'object'
    },

    audioContext: {
      projectId: 'string',
      masterAudioId: 'string',
      audioSegments: 'array',
      timingMarks: 'array'
    }
  },

  // Performance benchmarks
  performance: {
    maxExecutionTime: {
      topicManagement: 30000,    // 30 seconds
      scriptGenerator: 60000,    // 60 seconds (includes rate limiting)
      mediaCurator: 45000,       // 45 seconds (includes API calls)
      audioGenerator: 30000,     // 30 seconds
      videoAssembler: 120000,    // 2 minutes
      youtubePublisher: 180000,  // 3 minutes
      workflowOrchestrator: 600000 // 10 minutes for complete pipeline
    },

    expectedResponseTimes: {
      healthCheck: 100,          // 100ms
      basicOperations: 1000,     // 1 second
      aiOperations: 5000,        // 5 seconds
      fileOperations: 2000       // 2 seconds
    }
  },

  // Quality thresholds
  quality: {
    contextValidation: {
      requiredFieldsPresent: 100, // 100% required fields must be present
      validationSuccess: 95       // 95% validation success rate
    },

    mediaQuality: {
      minRelevanceScore: 0.7,     // 70% relevance minimum
      minQualityScore: 0.8,       // 80% quality minimum
      minAssetsPerScene: 2,       // Minimum 2 assets per scene
      maxAssetsPerScene: 8        // Maximum 8 assets per scene
    },

    audioQuality: {
      minDuration: 30,            // Minimum 30 seconds
      maxDuration: 600,           // Maximum 10 minutes
      preferredVoices: ['Ruth', 'Stephen'], // Generative voices
      minQualityScore: 0.8        // 80% quality minimum
    }
  },

  // Error handling test scenarios
  errorScenarios: {
    networkErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND'
    ],

    awsErrors: [
      'ThrottlingException',
      'ServiceUnavailable',
      'AccessDenied',
      'ResourceNotFoundException'
    ],

    validationErrors: [
      'Missing required field',
      'Invalid format',
      'Value out of range'
    ]
  },

  // Test patterns
  patterns: {
    projectId: /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_[\w-]+$/,
    s3Url: /^s3:\/\/[\w-]+\/[\w\/-]+$/,
    youtubeUrl: /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+$/,
    timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'ci') {
  // CI environment adjustments
  TEST_CONFIG.timeouts.unit = 10000;
  TEST_CONFIG.timeouts.integration = 60000;
  TEST_CONFIG.timeouts.e2e = 120000;
}

if (process.env.NODE_ENV === 'development') {
  // Development environment adjustments
  TEST_CONFIG.performance.expectedResponseTimes.aiOperations = 10000; // Allow slower AI operations
}

export default TEST_CONFIG;