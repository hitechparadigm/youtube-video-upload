/**
 * Integration Tests for EventBridge Scheduling and Cost Tracking System
 * 
 * Tests the complete scheduling and cost tracking functionality including:
 * - EventBridge rule creation and management
 * - Cost tracking and budget monitoring
 * - Schedule optimization and performance analysis
 * - Integration with existing pipeline components
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

// Mock AWS SDK clients
const mockEventBridge = {
  send: jest.fn()
};

const mockDynamoDB = {
  send: jest.fn()
};

const mockCloudWatch = {
  send: jest.fn()
};

const mockSNS = {
  send: jest.fn()
};

// Mock shared utilities
jest.mock('/opt/nodejs/context-manager', () => ({
  retrieveContext: jest.fn(),
  storeContext: jest.fn(),
  validateContext: jest.fn()
}));

jest.mock('/opt/nodejs/aws-service-manager', () => ({
  executeWithRetry: jest.fn((fn) => fn()),
  getSecret: jest.fn()
}));

jest.mock('/opt/nodejs/error-handler', () => ({
  wrapHandler: jest.fn((handler) => handler),
  AppError: class AppError extends Error {
    constructor(message, type, statusCode) {
      super(message);
      this.type = type;
      this.statusCode = statusCode;
    }
  },
  ERROR_TYPES: {
    VALIDATION: 'VALIDATION',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE: 'DATABASE',
    AWS_SERVICE: 'AWS_SERVICE',
    EXTERNAL_API: 'EXTERNAL_API'
  },
  validateRequiredParams: jest.fn(),
  monitorPerformance: jest.fn((fn) => fn())
}));

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn(() => mockEventBridge),
  PutRuleCommand: jest.fn(),
  DeleteRuleCommand: jest.fn(),
  PutTargetsCommand: jest.fn(),
  RemoveTargetsCommand: jest.fn(),
  ListRulesCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => mockDynamoDB),
  PutItemCommand: jest.fn(),
  QueryCommand: jest.fn(),
  ScanCommand: jest.fn(),
  UpdateItemCommand: jest.fn(),
  GetItemCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => mockCloudWatch),
  PutMetricDataCommand: jest.fn(),
  GetMetricStatisticsCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(() => mockSNS),
  PublishCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-cost-explorer', () => ({
  CostExplorerClient: jest.fn(() => ({})),
  GetCostAndUsageCommand: jest.fn()
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj) => obj),
  unmarshall: jest.fn((obj) => obj)
}));

// Import the Lambda handlers
const { handler: schedulerHandler } = require('../../src/lambda/eventbridge-scheduler/index.js');
const { handler: costTrackerHandler } = require('../../src/lambda/cost-tracker/index.js');

describe('EventBridge Scheduling and Cost Tracking System', () => {
  beforeAll(() => {
    // Set up environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.TOPICS_TABLE = 'test-topics-table';
    process.env.COST_TRACKING_TABLE = 'test-cost-tracking-table';
    process.env.WORKFLOW_ORCHESTRATOR_ARN = 'arn:aws:lambda:us-east-1:123456789012:function:workflow-orchestrator';
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('EventBridge Scheduler', () => {
    test('should create schedule for topic successfully', async () => {
      // Mock topic data
      const mockTopic = {
        topicId: 'test-topic-1',
        topic: 'Investing for beginners',
        keywords: ['investing', 'beginners'],
        priority: 1,
        dailyFrequency: 2
      };

      // Mock DynamoDB response for topic lookup
      mockDynamoDB.send.mockResolvedValueOnce({
        Item: mockTopic
      });

      // Mock EventBridge responses
      mockEventBridge.send
        .mockResolvedValueOnce({ RuleArn: 'arn:aws:events:us-east-1:123456789012:rule/video-generation-test-topic-1' })
        .mockResolvedValueOnce({}); // PutTargets response

      const event = {
        httpMethod: 'POST',
        path: '/schedules/create',
        body: JSON.stringify({
          topicId: 'test-topic-1',
          scheduleConfig: {
            dailyFrequency: 2,
            preferredHours: [9, 14],
            timezone: 'UTC'
          }
        })
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.topicId).toBe('test-topic-1');
      expect(responseBody.ruleName).toBe('video-generation-test-topic-1');
      expect(responseBody.schedule.frequency).toBe(2);
      expect(mockEventBridge.send).toHaveBeenCalledTimes(2); // PutRule + PutTargets
    });

    test('should handle manual trigger successfully', async () => {
      const mockTopic = {
        topicId: 'test-topic-2',
        topic: 'Travel tips for Europe',
        keywords: ['travel', 'europe'],
        priority: 3
      };

      mockDynamoDB.send.mockResolvedValueOnce({
        Item: mockTopic
      });

      const event = {
        httpMethod: 'POST',
        path: '/schedules/trigger',
        body: JSON.stringify({
          topicId: 'test-topic-2',
          priority: 1
        })
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.topicId).toBe('test-topic-2');
      expect(responseBody.triggerPayload.manualGeneration).toBe(true);
      expect(responseBody.triggerPayload.priority).toBe(1);
    });

    test('should list schedules successfully', async () => {
      mockEventBridge.send.mockResolvedValueOnce({
        Rules: [
          {
            Name: 'video-generation-topic-1',
            ScheduleExpression: 'cron(0 9,14 * * ? *)',
            Description: 'Generate 2 video(s) daily for "Investing for beginners" (Priority: 1)',
            State: 'ENABLED',
            Arn: 'arn:aws:events:us-east-1:123456789012:rule/video-generation-topic-1'
          }
        ]
      });

      const event = {
        httpMethod: 'GET',
        path: '/schedules',
        queryStringParameters: { status: 'active', limit: '50' }
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.schedules).toHaveLength(1);
      expect(responseBody.schedules[0].name).toBe('video-generation-topic-1');
      expect(responseBody.schedules[0].state).toBe('ENABLED');
    });

    test('should update schedule successfully', async () => {
      const mockTopic = {
        topicId: 'test-topic-1',
        topic: 'Investing for beginners',
        priority: 1
      };

      const mockExistingSchedule = {
        ruleName: 'video-generation-test-topic-1',
        ruleArn: 'arn:aws:events:us-east-1:123456789012:rule/video-generation-test-topic-1'
      };

      // Mock context retrieval and topic lookup
      const { retrieveContext } = require('/opt/nodejs/context-manager');
      retrieveContext.mockResolvedValueOnce(mockExistingSchedule);

      mockDynamoDB.send.mockResolvedValueOnce({
        Item: mockTopic
      });

      mockEventBridge.send.mockResolvedValueOnce({
        RuleArn: 'arn:aws:events:us-east-1:123456789012:rule/video-generation-test-topic-1'
      });

      const event = {
        httpMethod: 'POST',
        path: '/schedules/update',
        body: JSON.stringify({
          topicId: 'test-topic-1',
          scheduleConfig: {
            dailyFrequency: 3,
            preferredHours: [9, 14, 18]
          }
        })
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.schedule.frequency).toBe(3);
    });

    test('should delete schedule successfully', async () => {
      const mockExistingSchedule = {
        ruleName: 'video-generation-test-topic-1'
      };

      const { retrieveContext } = require('/opt/nodejs/context-manager');
      retrieveContext.mockResolvedValueOnce(mockExistingSchedule);

      mockEventBridge.send
        .mockResolvedValueOnce({}) // RemoveTargets
        .mockResolvedValueOnce({}); // DeleteRule

      const event = {
        httpMethod: 'DELETE',
        path: '/schedules/delete',
        body: JSON.stringify({
          topicId: 'test-topic-1'
        })
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.topicId).toBe('test-topic-1');
      expect(mockEventBridge.send).toHaveBeenCalledTimes(2);
    });

    test('should return health status', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/health'
      };

      const result = await schedulerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.service).toBe('eventbridge-scheduler');
      expect(responseBody.status).toBe('healthy');
      expect(responseBody.features.topicBasedScheduling).toBe(true);
      expect(responseBody.features.sharedUtilities).toBe(true);
    });
  });

  describe('Cost Tracker', () => {
    test('should track cost successfully', async () => {
      mockDynamoDB.send.mockResolvedValueOnce({}); // PutItem response

      const event = {
        httpMethod: 'POST',
        path: '/costs/track',
        body: JSON.stringify({
          projectId: 'test-project-1',
          service: 'Amazon Bedrock',
          operation: 'text-generation',
          cost: 0.35,
          metadata: {
            model: 'claude-3-sonnet',
            tokens: 1500
          }
        })
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.costRecord.projectId).toBe('test-project-1');
      expect(responseBody.costRecord.service).toBe('Amazon Bedrock');
      expect(responseBody.costRecord.cost).toBe(0.35);
      expect(mockDynamoDB.send).toHaveBeenCalledTimes(1);
    });

    test('should calculate video production cost successfully', async () => {
      const mockCostRecords = [
        { projectId: 'test-project-1', service: 'Amazon Bedrock', operation: 'text-generation', cost: 0.35 },
        { projectId: 'test-project-1', service: 'Amazon Polly', operation: 'speech-synthesis', cost: 0.15 },
        { projectId: 'test-project-1', service: 'Amazon Rekognition', operation: 'image-analysis', cost: 0.12 },
        { projectId: 'test-project-1', service: 'AWS Lambda', operation: 'execution', cost: 0.08 }
      ];

      mockDynamoDB.send.mockResolvedValueOnce({
        Items: mockCostRecords
      });

      const { retrieveContext } = require('/opt/nodejs/context-manager');
      retrieveContext.mockResolvedValueOnce({
        videoMetadata: { duration: 480 } // 8 minutes
      });

      const event = {
        httpMethod: 'POST',
        path: '/costs/calculate-video',
        body: JSON.stringify({
          projectId: 'test-project-1'
        })
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.costBreakdown.totalCost).toBe(0.70);
      expect(responseBody.efficiency.isUnderBudget).toBe(true);
      expect(responseBody.targetComparison.target).toBe(1.00);
      expect(responseBody.targetComparison.actual).toBe(0.70);
      expect(parseFloat(responseBody.targetComparison.percentageOfTarget)).toBe(70.0);
    });

    test('should get current costs successfully', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/costs/current',
        queryStringParameters: { timeframe: '24h' }
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.timeframe).toBe('24h');
      expect(responseBody.realtimeCosts).toBeDefined();
      expect(responseBody.summary.totalCost).toBeDefined();
    });

    test('should get video production costs with analysis', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/costs/video',
        queryStringParameters: { projectId: 'test-project-1' }
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.projectId).toBe('test-project-1');
      expect(responseBody.analysis).toBeDefined();
      expect(responseBody.recommendations).toBeDefined();
    });

    test('should set budget alert successfully', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/costs/set-budget',
        body: JSON.stringify({
          budget: 50.00,
          thresholds: [0.8, 0.9, 0.95]
        })
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.budget).toBe(50.00);
      expect(responseBody.thresholds).toEqual([0.8, 0.9, 0.95]);
    });

    test('should optimize costs successfully', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/costs/optimize',
        body: JSON.stringify({})
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.optimizations).toBeDefined();
      expect(responseBody.optimizations.potentialSavings).toBeDefined();
      expect(responseBody.optimizations.recommendations).toBeDefined();
    });

    test('should get budget status successfully', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/costs/budget-status'
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.budgetStatus.target).toBe(1.00);
      expect(responseBody.budgetStatus.status).toBe('under-budget');
    });

    test('should return health status', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/health'
      };

      const result = await costTrackerHandler(event, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.service).toBe('cost-tracker');
      expect(responseBody.status).toBe('healthy');
      expect(responseBody.features.realTimeCostMonitoring).toBe(true);
      expect(responseBody.features.sharedUtilities).toBe(true);
      expect(responseBody.costConfig.targetCostPerVideo).toBe(1.00);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle schedule creation with cost tracking', async () => {
      // Test the integration between scheduling and cost tracking
      const mockTopic = {
        topicId: 'integration-test-1',
        topic: 'AI and Machine Learning',
        priority: 2,
        dailyFrequency: 1
      };

      // Mock scheduler responses
      mockDynamoDB.send.mockResolvedValueOnce({ Item: mockTopic });
      mockEventBridge.send
        .mockResolvedValueOnce({ RuleArn: 'test-rule-arn' })
        .mockResolvedValueOnce({});

      // Create schedule
      const scheduleEvent = {
        httpMethod: 'POST',
        path: '/schedules/create',
        body: JSON.stringify({
          topicId: 'integration-test-1',
          scheduleConfig: { dailyFrequency: 1 }
        })
      };

      const scheduleResult = await schedulerHandler(scheduleEvent, {});
      expect(scheduleResult.statusCode).toBe(200);

      // Track cost for schedule creation
      mockDynamoDB.send.mockResolvedValueOnce({});

      const costEvent = {
        httpMethod: 'POST',
        path: '/costs/track',
        body: JSON.stringify({
          projectId: 'integration-test-1',
          service: 'Amazon EventBridge',
          operation: 'schedule-creation',
          cost: 0.02
        })
      };

      const costResult = await costTrackerHandler(costEvent, {});
      expect(costResult.statusCode).toBe(200);

      const costResponseBody = JSON.parse(costResult.body);
      expect(costResponseBody.costRecord.service).toBe('Amazon EventBridge');
      expect(costResponseBody.costRecord.operation).toBe('schedule-creation');
    });

    test('should handle cost optimization recommendations', async () => {
      // Test cost optimization with scheduling considerations
      const optimizationEvent = {
        httpMethod: 'POST',
        path: '/costs/optimize',
        body: JSON.stringify({
          includeSchedulingOptimization: true
        })
      };

      const result = await costTrackerHandler(optimizationEvent, {});
      const responseBody = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(responseBody.optimizations.recommendations).toBeDefined();
      expect(Array.isArray(responseBody.optimizations.recommendations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing topic in scheduler', async () => {
      mockDynamoDB.send.mockResolvedValueOnce({ Item: null });

      const event = {
        httpMethod: 'POST',
        path: '/schedules/create',
        body: JSON.stringify({
          topicId: 'non-existent-topic',
          scheduleConfig: { dailyFrequency: 1 }
        })
      };

      await expect(schedulerHandler(event, {})).rejects.toThrow();
    });

    test('should handle invalid cost tracking parameters', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/costs/track',
        body: JSON.stringify({
          projectId: 'test-project',
          // Missing required fields: service, operation, cost
        })
      };

      // The validateRequiredParams mock should be called
      const { validateRequiredParams } = require('/opt/nodejs/error-handler');
      validateRequiredParams.mockImplementationOnce(() => {
        throw new Error('Missing required parameters');
      });

      await expect(costTrackerHandler(event, {})).rejects.toThrow();
    });

    test('should handle EventBridge service errors', async () => {
      const mockTopic = {
        topicId: 'test-topic',
        topic: 'Test Topic',
        priority: 1
      };

      mockDynamoDB.send.mockResolvedValueOnce({ Item: mockTopic });
      mockEventBridge.send.mockRejectedValueOnce(new Error('EventBridge service error'));

      const event = {
        httpMethod: 'POST',
        path: '/schedules/create',
        body: JSON.stringify({
          topicId: 'test-topic',
          scheduleConfig: { dailyFrequency: 1 }
        })
      };

      await expect(schedulerHandler(event, {})).rejects.toThrow();
    });
  });
});

describe('Performance and Scalability', () => {
  test('should handle multiple concurrent schedule operations', async () => {
    // Test concurrent schedule creation
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      mockDynamoDB.send.mockResolvedValueOnce({
        Item: { topicId: `topic-${i}`, topic: `Topic ${i}`, priority: 1 }
      });
      mockEventBridge.send
        .mockResolvedValueOnce({ RuleArn: `arn-${i}` })
        .mockResolvedValueOnce({});

      const event = {
        httpMethod: 'POST',
        path: '/schedules/create',
        body: JSON.stringify({
          topicId: `topic-${i}`,
          scheduleConfig: { dailyFrequency: 1 }
        })
      };

      promises.push(schedulerHandler(event, {}));
    }

    const results = await Promise.all(promises);
    
    results.forEach((result, index) => {
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.topicId).toBe(`topic-${index}`);
    });
  });

  test('should handle high-volume cost tracking', async () => {
    // Test multiple cost tracking operations
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      mockDynamoDB.send.mockResolvedValueOnce({});

      const event = {
        httpMethod: 'POST',
        path: '/costs/track',
        body: JSON.stringify({
          projectId: `project-${i}`,
          service: 'AWS Lambda',
          operation: 'execution',
          cost: 0.01 * (i + 1)
        })
      };

      promises.push(costTrackerHandler(event, {}));
    }

    const results = await Promise.all(promises);
    
    results.forEach((result, index) => {
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.costRecord.projectId).toBe(`project-${index}`);
    });
  });
});