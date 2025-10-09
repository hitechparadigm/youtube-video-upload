/**
 * Unit Tests for Topic Management AI Lambda Function
 * Tests enhanced context generation and Google Sheets integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the shared utilities
jest.mock('../../../src/shared/context-manager.js');
jest.mock('../../../src/shared/aws-service-manager.js');
jest.mock('../../../src/shared/error-handler.js');

describe('Topic Management AI Lambda', () => {
  let mockEvent, mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'POST',
      path: '/topics/enhanced',
      body: JSON.stringify({
        baseTopic: 'AI Tools for Content Creation',
        targetAudience: 'general',
        useGoogleSheets: true
      })
    };

    mockContext = {
      awsRequestId: 'test-request-id',
      functionName: 'topic-management-test'
    };

    // Mock shared utilities
    const { storeContext, createProject } = require('../../../src/shared/context-manager.js');
    const { scanDynamoDB, putDynamoDBItem } = require('../../../src/shared/aws-service-manager.js');
    
    storeContext.mockResolvedValue('context-stored');
    createProject.mockResolvedValue('2025-10-09_12-00-00_ai-tools-content-creation');
    scanDynamoDB.mockResolvedValue([]);
    putDynamoDBItem.mockResolvedValue({});
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const healthEvent = {
        httpMethod: 'GET',
        path: '/health'
      };

      // Import and test the handler
      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(healthEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('topic-management');
      expect(body.status).toBe('healthy');
      expect(body.sharedUtilities).toBe(true);
    });
  });

  describe('enhanced topic generation', () => {
    it('should generate enhanced topic context successfully', async () => {
      // Mock Bedrock response
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              mainTopic: 'AI Tools for Content Creation',
              expandedTopics: [
                { subtopic: 'Best AI tools for beginners', priority: 'high' }
              ],
              seoContext: {
                primaryKeywords: ['AI tools', 'content creation'],
                longTailKeywords: ['best AI tools for beginners 2025']
              },
              videoStructure: {
                recommendedScenes: 5,
                hookDuration: 15,
                mainContentDuration: 400,
                conclusionDuration: 65,
                totalDuration: 480
              }
            })
          }]
        }))
      };

      // Mock BedrockRuntimeClient
      const mockSend = jest.fn().mockResolvedValue(mockBedrockResponse);
      jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
          send: mockSend
        })),
        InvokeModelCommand: jest.fn()
      }));

      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.projectId).toBeDefined();
      expect(body.topicContext).toBeDefined();
      expect(body.refactored).toBe(true);
    });

    it('should handle missing baseTopic', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: JSON.stringify({
          targetAudience: 'general'
          // Missing baseTopic
        })
      };

      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(invalidEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(true);
    });
  });

  describe('Google Sheets integration', () => {
    it('should handle Google Sheets fetch errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(mockEvent, mockContext);

      // Should still work with fallback even if Google Sheets fails
      expect(response.statusCode).toBe(200);
    });
  });

  describe('topic CRUD operations', () => {
    it('should create topic successfully', async () => {
      const createEvent = {
        httpMethod: 'POST',
        path: '/topics',
        body: JSON.stringify({
          topic: 'Test Topic',
          dailyFrequency: 2,
          priority: 5
        })
      };

      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(createEvent, mockContext);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.topic).toBe('Test Topic');
      expect(body.topicId).toBeDefined();
    });

    it('should get topics successfully', async () => {
      const getEvent = {
        httpMethod: 'GET',
        path: '/topics',
        queryStringParameters: { limit: '10' }
      };

      const { scanDynamoDB } = require('../../../src/shared/aws-service-manager.js');
      scanDynamoDB.mockResolvedValue([
        { topicId: '1', topic: 'Test Topic 1' },
        { topicId: '2', topic: 'Test Topic 2' }
      ]);

      const { handler } = await import('../../../src/lambda/topic-management/index.js');
      const response = await handler(getEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.topics).toHaveLength(2);
      expect(body.count).toBe(2);
    });
  });
});