/**
 * Test Helper Utilities
 * Common utilities and setup functions for tests
 */

import { jest } from '@jest/globals';

/**
 * Create a mock AWS Lambda event
 */
export function createMockLambdaEvent(httpMethod = 'GET', path = '/health', body = null) {
  return {
    httpMethod,
    path,
    pathParameters: null,
    queryStringParameters: null,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent'
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      httpMethod,
      path
    }
  };
}

/**
 * Create a mock AWS Lambda context
 */
export function createMockLambdaContext(functionName = 'test-function') {
  return {
    functionName,
    functionVersion: '1.0.0',
    invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:${functionName}`,
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: `/aws/lambda/${functionName}`,
    logStreamName: '2025/10/09/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn()
  };
}

/**
 * Create a test project ID with timestamp
 */
export function createTestProjectId(topic = 'test-topic') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  return `${timestamp}_${sanitizedTopic}`;
}

/**
 * Create mock topic context
 */
export function createMockTopicContext(projectId, topic = 'Test Topic') {
  return {
    projectId,
    selectedTopic: topic,
    mainTopic: topic,
    expandedTopics: [
      { subtopic: `${topic} for beginners`, priority: 'high', contentComplexity: 'simple' },
      { subtopic: `Advanced ${topic} techniques`, priority: 'medium', contentComplexity: 'moderate' }
    ],
    videoStructure: {
      recommendedScenes: 5,
      hookDuration: 15,
      mainContentDuration: 400,
      conclusionDuration: 65,
      totalDuration: 480,
      contentComplexity: 'moderate'
    },
    seoContext: {
      primaryKeywords: [topic.toLowerCase(), 'tutorial', 'guide'],
      longTailKeywords: [`best ${topic.toLowerCase()} for beginners`, `how to use ${topic.toLowerCase()}`],
      trendingTerms: ['2025', 'latest', 'professional'],
      semanticKeywords: ['education', 'learning', 'skills'],
      questionKeywords: [`what is ${topic.toLowerCase()}`, `how to learn ${topic.toLowerCase()}`]
    },
    contentGuidance: {
      complexConcepts: [`${topic} fundamentals`, 'best practices'],
      quickWins: ['basic tips', 'immediate benefits'],
      visualOpportunities: ['charts', 'examples', 'demonstrations'],
      emotionalBeats: ['success stories', 'transformation moments'],
      callToActionSuggestions: ['subscribe for more', 'try these techniques']
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'claude-3-sonnet-test',
      confidence: 0.95
    }
  };
}

/**
 * Create mock scene context
 */
export function createMockSceneContext(projectId, sceneCount = 3) {
  const scenes = [];
  const sceneDuration = 480 / sceneCount;
  
  for (let i = 1; i <= sceneCount; i++) {
    scenes.push({
      sceneNumber: i,
      title: `Scene ${i}: Introduction to Topic`,
      purpose: i === 1 ? 'hook' : i === sceneCount ? 'conclusion' : 'content_delivery',
      startTime: (i - 1) * sceneDuration,
      endTime: i * sceneDuration,
      duration: sceneDuration,
      content: {
        script: `This is the script content for scene ${i}. It provides valuable information about the topic.`,
        keyPoints: [`Key point ${i}.1`, `Key point ${i}.2`],
        emotionalTone: 'informative'
      },
      visualStyle: 'professional',
      mediaNeeds: ['presenter', 'graphics', 'examples'],
      mediaRequirements: {
        specificLocations: [`location ${i}`, `setting ${i}`],
        visualElements: [`element ${i}.1`, `element ${i}.2`],
        shotTypes: ['wide shot', 'close-up'],
        searchKeywords: [`keyword ${i}`, `term ${i}`],
        assetPlan: {
          totalAssets: 3,
          videoClips: 2,
          images: 1,
          averageClipDuration: '4-6 seconds'
        }
      }
    });
  }

  return {
    projectId,
    scenes,
    totalDuration: 480,
    selectedSubtopic: 'Test Topic Guide',
    videoStructure: {
      recommendedScenes: sceneCount,
      totalDuration: 480
    },
    contentStrategy: {
      mainTopic: 'Test Topic',
      targetAudience: 'general',
      contentType: 'educational',
      engagementStrategy: 'hook_and_value_delivery'
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'claude-3-sonnet-enhanced-test',
      enhancedFeatures: true,
      rateLimitingApplied: true
    }
  };
}

/**
 * Create mock media context
 */
export function createMockMediaContext(projectId, sceneCount = 3) {
  const sceneMediaMapping = [];
  let totalAssets = 0;

  for (let i = 1; i <= sceneCount; i++) {
    const assetsPerScene = 3;
    const mediaSequence = [];
    
    for (let j = 1; j <= assetsPerScene; j++) {
      mediaSequence.push({
        sequenceOrder: j,
        assetId: `asset-${i}-${j}`,
        assetType: j % 2 === 0 ? 'video' : 'image',
        assetUrl: `https://example.com/asset-${i}-${j}.jpg`,
        sceneStartTime: (j - 1) * 4,
        sceneDuration: 4,
        visualType: j === 1 ? 'primary' : 'supporting',
        transitionType: j === 1 ? 'fade-in' : 'crossfade',
        relevanceScore: 0.9,
        qualityScore: 0.95
      });
    }

    sceneMediaMapping.push({
      sceneNumber: i,
      sceneDuration: 160,
      mediaSequence,
      industryCompliance: {
        visualsPerScene: assetsPerScene,
        averageVisualDuration: 4,
        pacingCompliant: true,
        timingOptimal: true
      }
    });

    totalAssets += assetsPerScene;
  }

  return {
    projectId,
    sceneMediaMapping,
    totalAssets,
    scenesCovered: sceneCount,
    coverageComplete: true,
    industryStandards: {
      overallCompliance: true,
      averageVisualsPerScene: 3,
      averageVisualDuration: 4,
      industryStandards: {
        visualsPerSceneRange: '2-8 (industry standard)',
        visualDurationRange: '3-6 seconds (optimal processing)',
        pacingStrategy: 'Professional video production standards'
      },
      qualityMetrics: {
        scenesCovered: sceneCount,
        totalAssets,
        coverageComplete: true
      }
    },
    qualityMetrics: {
      averageRelevanceScore: 0.9,
      averageQualityScore: 0.95,
      totalProcessingTime: Date.now()
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      curatedBy: 'media-curator-ai-test',
      industryStandardsApplied: true,
      contextAware: true,
      professionalPacing: true
    }
  };
}

/**
 * Create mock audio context
 */
export function createMockAudioContext(projectId, sceneCount = 3) {
  const audioSegments = [];
  const timingMarks = [];
  let currentTime = 0;

  for (let i = 1; i <= sceneCount; i++) {
    const sceneDuration = 160;
    
    audioSegments.push({
      sceneNumber: i,
      audioUrl: `s3://test-bucket/audio/scene-${i}.mp3`,
      audioKey: `audio/scene-${i}.mp3`,
      duration: sceneDuration,
      voice: { name: 'Ruth', type: 'generative' },
      ssmlUsed: true,
      contextAware: true
    });

    // Add scene timing mark
    timingMarks.push({
      type: 'scene_start',
      sceneNumber: i,
      timestamp: currentTime,
      duration: sceneDuration
    });

    // Add word timing marks (simplified)
    const words = [`Scene ${i} word 1`, `Scene ${i} word 2`, `Scene ${i} word 3`];
    words.forEach((word, index) => {
      timingMarks.push({
        type: 'word',
        text: word,
        timestamp: currentTime + (index * 10),
        sceneNumber: i
      });
    });

    currentTime += sceneDuration;
  }

  return {
    projectId,
    masterAudioId: `audio-${projectId}-${Date.now()}`,
    masterAudioUrl: `s3://test-bucket/audio/master/${projectId}.json`,
    audioSegments,
    timingMarks,
    voiceSettings: {
      selectedVoice: { name: 'Ruth', type: 'generative' },
      quality: 'generative',
      format: 'mp3',
      sampleRate: 22050
    },
    synchronizationData: {
      sceneBreakpoints: audioSegments.map(segment => ({
        sceneNumber: segment.sceneNumber,
        startTime: (segment.sceneNumber - 1) * 160,
        endTime: segment.sceneNumber * 160,
        duration: segment.duration
      })),
      mediaSynchronization: {
        mediaContextAvailable: true,
        visualPacingConsidered: true
      }
    },
    qualityMetrics: {
      totalDuration: currentTime,
      averageQuality: 0.95,
      generativeVoiceUsed: true,
      contextAwarePacing: true
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'audio-generator-ai-test',
      generativeVoices: true,
      contextAware: true,
      sceneAwarePacing: true
    }
  };
}

/**
 * Setup test environment with common mocks
 */
export function setupTestEnvironment() {
  // Mock console methods to reduce test noise
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  // Mock setTimeout for rate limiting tests
  global.setTimeout = jest.fn((callback, delay) => {
    // Execute immediately in tests unless specifically testing delays
    if (process.env.TEST_DELAYS === 'true') {
      return setTimeout(callback, delay);
    }
    callback();
    return 'mock-timeout-id';
  });

  // Mock Date.now for consistent timestamps
  const mockNow = 1696867200000; // Fixed timestamp for tests
  jest.spyOn(Date, 'now').mockReturnValue(mockNow);
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment() {
  jest.restoreAllMocks();
  jest.clearAllMocks();
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock AWS SDK responses
 */
export const mockAWSResponses = {
  s3Upload: {
    ETag: '"test-etag"',
    Location: 'https://test-bucket.s3.amazonaws.com/test-key',
    Key: 'test-key',
    Bucket: 'test-bucket'
  },
  
  dynamoDbPut: {
    ConsumedCapacity: {
      TableName: 'test-table',
      CapacityUnits: 1
    }
  },
  
  secretsManager: {
    SecretString: JSON.stringify({
      'pexels-api-key': 'test-pexels-key',
      'pixabay-api-key': 'test-pixabay-key',
      'youtube-oauth-client-id': 'test-client-id',
      'youtube-oauth-client-secret': 'test-client-secret',
      'youtube-oauth-refresh-token': 'test-refresh-token'
    })
  },
  
  pollyAudio: {
    AudioStream: {
      transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3, 4, 5]))
    }
  }
};

export default {
  createMockLambdaEvent,
  createMockLambdaContext,
  createTestProjectId,
  createMockTopicContext,
  createMockSceneContext,
  createMockMediaContext,
  createMockAudioContext,
  setupTestEnvironment,
  cleanupTestEnvironment,
  waitForAsync,
  mockAWSResponses
};