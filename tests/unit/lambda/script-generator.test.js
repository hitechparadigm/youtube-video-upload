/**
 * Unit Tests for Script Generator AI Lambda Function
 * Tests enhanced script generation with professional visual requirements and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the shared utilities
jest.mock('../../../src/shared/context-manager.js');
jest.mock('../../../src/shared/aws-service-manager.js');
jest.mock('../../../src/shared/error-handler.js');

describe('Script Generator AI Lambda', () => {
  let mockEvent, mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'POST',
      path: '/scripts/generate-enhanced',
      body: JSON.stringify({
        projectId: '2025-10-09_12-00-00_ai-tools-content-creation',
        scriptOptions: {
          style: 'engaging_educational',
          targetAudience: 'general'
        }
      })
    };

    mockContext = {
      awsRequestId: 'test-request-id',
      functionName: 'script-generator-test'
    };

    // Mock shared utilities
    const { retrieveContext, storeContext } = require('../../../src/shared/context-manager.js');
    const { putDynamoDBItem } = require('../../../src/shared/aws-service-manager.js');
    
    // Mock topic context retrieval
    retrieveContext.mockResolvedValue({
      projectId: '2025-10-09_12-00-00_ai-tools-content-creation',
      mainTopic: 'AI Tools for Content Creation',
      expandedTopics: [
        { subtopic: 'Best AI tools for beginners', priority: 'high' }
      ],
      videoStructure: {
        recommendedScenes: 5,
        hookDuration: 15,
        mainContentDuration: 400,
        conclusionDuration: 65,
        totalDuration: 480
      },
      seoContext: {
        primaryKeywords: ['AI tools', 'content creation']
      }
    });

    storeContext.mockResolvedValue('context-stored');
    putDynamoDBItem.mockResolvedValue({});
  });

  describe('health check', () => {
    it('should return healthy status with enhanced features', async () => {
      const healthEvent = {
        httpMethod: 'GET',
        path: '/health'
      };

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(healthEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('script-generator');
      expect(body.status).toBe('healthy');
      expect(body.enhancedFeatures).toBe(true);
      expect(body.rateLimitingProtection).toBe(true);
      expect(body.professionalVisualRequirements).toBe(true);
      expect(body.sharedUtilities).toBe(true);
    });
  });

  describe('enhanced script generation', () => {
    it('should generate enhanced script with professional visual requirements', async () => {
      // Mock Bedrock response for enhanced visual requirements
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              specificLocations: ['modern office', 'creative workspace'],
              visualElements: ['laptop', 'design tools', 'creative process'],
              shotTypes: ['close-up', 'over-shoulder', 'wide establishing'],
              searchKeywords: ['AI tools', 'content creation', 'digital workspace'],
              assetPlan: {
                totalAssets: 3,
                videoClips: 2,
                images: 1,
                averageClipDuration: '5-7 seconds'
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

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.projectId).toBe('2025-10-09_12-00-00_ai-tools-content-creation');
      expect(body.sceneContext).toBeDefined();
      expect(body.enhancedFeatures.professionalVisualRequirements).toBe(true);
      expect(body.enhancedFeatures.rateLimitingProtection).toBe(true);
      expect(body.enhancedFeatures.refactored).toBe(true);
    });

    it('should handle missing projectId', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: JSON.stringify({
          scriptOptions: { style: 'engaging_educational' }
          // Missing projectId
        })
      };

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(invalidEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe(true);
    });

    it('should apply rate limiting between Bedrock calls', async () => {
      // Mock multiple scenes to test rate limiting
      const { retrieveContext } = require('../../../src/shared/context-manager.js');
      retrieveContext.mockResolvedValue({
        projectId: '2025-10-09_12-00-00_ai-tools-content-creation',
        mainTopic: 'AI Tools for Content Creation',
        expandedTopics: [{ subtopic: 'Test' }],
        videoStructure: { totalDuration: 480 },
        seoContext: { primaryKeywords: ['test'] }
      });

      // Mock timer to verify rate limiting delays
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn((callback, delay) => {
        expect(delay).toBe(2000); // Should be 2 second delay
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });
      global.setTimeout = mockSetTimeout;

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      await handler(mockEvent, mockContext);

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('professional visual requirements generation', () => {
    it('should generate professional fallback when Bedrock fails', async () => {
      // Mock Bedrock to fail
      const mockSend = jest.fn().mockRejectedValue(new Error('Bedrock error'));
      jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
          send: mockSend
        })),
        InvokeModelCommand: jest.fn()
      }));

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(mockEvent, mockContext);

      // Should still succeed with fallback
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should handle Bedrock throttling with exponential backoff', async () => {
      // Mock Bedrock to throw throttling exception then succeed
      const mockSend = jest.fn()
        .mockRejectedValueOnce({ name: 'ThrottlingException' })
        .mockRejectedValueOnce({ name: 'ThrottlingException' })
        .mockResolvedValue({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '{"specificLocations": ["test"]}' }]
          }))
        });

      jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
          send: mockSend
        })),
        InvokeModelCommand: jest.fn()
      }));

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('basic script generation', () => {
    it('should generate basic script successfully', async () => {
      const basicEvent = {
        httpMethod: 'POST',
        path: '/scripts/generate',
        body: JSON.stringify({
          topic: 'Test Topic',
          title: 'Test Title'
        })
      };

      const { handler } = await import('../../../src/lambda/script-generator/index.js');
      const response = await handler(basicEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.script).toBeDefined();
      expect(body.refactored).toBe(true);
    });
  });
});