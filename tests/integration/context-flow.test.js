/**
 * Integration Tests for Context Flow Between AI Agents
 * Tests the complete context flow: Topic → Script → Media → Audio → Video → YouTube
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Context Flow Integration', () => {
  let testProjectId;

  beforeEach(() => {
    testProjectId = `2025-10-09_12-00-00_integration-test-${Date.now()}`;
    jest.clearAllMocks();
  });

  describe('Topic → Script Context Flow', () => {
    it('should pass topic context to script generator successfully', async () => {
      // Mock topic context generation
      const mockTopicContext = {
        projectId: testProjectId,
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
          primaryKeywords: ['AI tools', 'content creation'],
          longTailKeywords: ['best AI tools for beginners 2025']
        }
      };

      // Mock context storage and retrieval
      const { storeContext, retrieveContext } = require('../../src/shared/context-manager.js');
      storeContext.mockResolvedValue('context-stored');
      retrieveContext.mockResolvedValue(mockTopicContext);

      // Test Topic Management AI
      const { handler: topicHandler } = await import('../../src/lambda/topic-management/index.js');
      const topicEvent = {
        httpMethod: 'POST',
        path: '/topics/enhanced',
        body: JSON.stringify({
          baseTopic: 'AI Tools for Content Creation',
          projectId: testProjectId
        })
      };

      const topicResponse = await topicHandler(topicEvent, {});
      expect(topicResponse.statusCode).toBe(200);

      // Test Script Generator AI with topic context
      const { handler: scriptHandler } = await import('../../src/lambda/script-generator/index.js');
      const scriptEvent = {
        httpMethod: 'POST',
        path: '/scripts/generate-enhanced',
        body: JSON.stringify({
          projectId: testProjectId
        })
      };

      const scriptResponse = await scriptHandler(scriptEvent, {});
      expect(scriptResponse.statusCode).toBe(200);

      const scriptBody = JSON.parse(scriptResponse.body);
      expect(scriptBody.success).toBe(true);
      expect(scriptBody.projectId).toBe(testProjectId);
      expect(scriptBody.sceneContext).toBeDefined();
    });
  });

  describe('Script → Media Context Flow', () => {
    it('should pass scene context to media curator successfully', async () => {
      // Mock scene context
      const mockSceneContext = {
        projectId: testProjectId,
        scenes: [
          {
            sceneNumber: 1,
            title: 'Introduction to AI Tools',
            duration: 60,
            content: { script: 'Welcome to our guide on AI tools...' },
            mediaRequirements: {
              specificLocations: ['modern office', 'creative workspace'],
              visualElements: ['laptop', 'design tools'],
              searchKeywords: ['AI tools', 'content creation']
            }
          }
        ],
        totalDuration: 480,
        selectedSubtopic: 'AI Tools for Content Creation'
      };

      const { retrieveContext, storeContext } = require('../../src/shared/context-manager.js');
      retrieveContext.mockResolvedValue(mockSceneContext);
      storeContext.mockResolvedValue('context-stored');

      // Mock API keys
      const { getSecret } = require('../../src/shared/aws-service-manager.js');
      getSecret.mockResolvedValue({
        'pexels-api-key': 'test-pexels-key',
        'pixabay-api-key': 'test-pixabay-key'
      });

      // Test Media Curator AI with scene context
      const { handler: mediaHandler } = await import('../../src/lambda/media-curator/index.js');
      const mediaEvent = {
        httpMethod: 'POST',
        path: '/media/curate-from-project',
        body: JSON.stringify({
          projectId: testProjectId
        })
      };

      const mediaResponse = await mediaHandler(mediaEvent, {});
      expect(mediaResponse.statusCode).toBe(200);

      const mediaBody = JSON.parse(mediaResponse.body);
      expect(mediaBody.success).toBe(true);
      expect(mediaBody.projectId).toBe(testProjectId);
      expect(mediaBody.mediaContext).toBeDefined();
      expect(mediaBody.professionalFeatures.industryStandardPacing).toBe(true);
    });
  });

  describe('Scene + Media → Audio Context Flow', () => {
    it('should generate audio with scene and media context', async () => {
      // Mock scene and media contexts
      const mockSceneContext = {
        projectId: testProjectId,
        scenes: [
          {
            sceneNumber: 1,
            title: 'Introduction',
            duration: 60,
            content: { script: 'Welcome to our guide...' }
          }
        ]
      };

      const mockMediaContext = {
        projectId: testProjectId,
        sceneMediaMapping: [
          {
            sceneNumber: 1,
            mediaSequence: [
              { sequenceOrder: 1, sceneDuration: 4 }
            ]
          }
        ]
      };

      const { retrieveContext, storeContext } = require('../../src/shared/context-manager.js');
      retrieveContext
        .mockResolvedValueOnce(mockSceneContext) // First call for scene context
        .mockResolvedValueOnce(mockMediaContext); // Second call for media context
      storeContext.mockResolvedValue('context-stored');

      // Mock Polly response
      const mockPollyResponse = {
        AudioStream: {
          transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
        }
      };

      jest.doMock('@aws-sdk/client-polly', () => ({
        PollyClient: jest.fn().mockImplementation(() => ({
          send: jest.fn().mockResolvedValue(mockPollyResponse)
        })),
        SynthesizeSpeechCommand: jest.fn(),
        DescribeVoicesCommand: jest.fn()
      }));

      // Test Audio Generator AI
      const { handler: audioHandler } = await import('../../src/lambda/audio-generator/index.js');
      const audioEvent = {
        httpMethod: 'POST',
        path: '/audio/generate-from-project',
        body: JSON.stringify({
          projectId: testProjectId
        })
      };

      const audioResponse = await audioHandler(audioEvent, {});
      expect(audioResponse.statusCode).toBe(200);

      const audioBody = JSON.parse(audioResponse.body);
      expect(audioBody.success).toBe(true);
      expect(audioBody.generativeFeatures.voiceUsed).toBe('Ruth');
      expect(audioBody.generativeFeatures.contextAwarePacing).toBe(true);
    });
  });

  describe('Complete Context Flow Validation', () => {
    it('should validate context compatibility between all agents', async () => {
      const { validateContextCompatibility } = require('../../src/shared/context-manager.js');

      // Test topic → scene compatibility
      const topicContext = {
        projectId: testProjectId,
        videoStructure: { recommendedScenes: 5 },
        expandedTopics: [{ subtopic: 'Test' }]
      };

      const topicToSceneResult = validateContextCompatibility(topicContext, 'topic', 'scene');
      expect(topicToSceneResult.compatible).toBe(true);

      // Test scene → media compatibility
      const sceneContext = {
        projectId: testProjectId,
        scenes: [{ sceneNumber: 1 }],
        totalDuration: 480
      };

      const sceneToMediaResult = validateContextCompatibility(sceneContext, 'scene', 'media');
      expect(sceneToMediaResult.compatible).toBe(true);

      // Test audio → video compatibility
      const audioContext = {
        projectId: testProjectId,
        masterAudioId: 'audio-123',
        timingMarks: [{ type: 'scene_start' }]
      };

      const audioToVideoResult = validateContextCompatibility(audioContext, 'audio', 'video');
      expect(audioToVideoResult.compatible).toBe(true);
    });
  });

  describe('Error Recovery and Context Preservation', () => {
    it('should preserve context when downstream agent fails', async () => {
      // Mock successful topic generation
      const mockTopicContext = {
        projectId: testProjectId,
        mainTopic: 'Test Topic',
        expandedTopics: [{ subtopic: 'Test' }],
        videoStructure: { totalDuration: 480 }
      };

      const { storeContext, retrieveContext } = require('../../src/shared/context-manager.js');
      storeContext.mockResolvedValue('context-stored');
      retrieveContext.mockResolvedValue(mockTopicContext);

      // Test that context is preserved even if script generation fails
      const { handler: scriptHandler } = await import('../../src/lambda/script-generator/index.js');
      
      // Mock script generation to fail
      const mockBedrockError = new Error('Bedrock unavailable');
      jest.doMock('@aws-sdk/client-bedrock-runtime', () => ({
        BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
          send: jest.fn().mockRejectedValue(mockBedrockError)
        })),
        InvokeModelCommand: jest.fn()
      }));

      const scriptEvent = {
        httpMethod: 'POST',
        path: '/scripts/generate-enhanced',
        body: JSON.stringify({ projectId: testProjectId })
      };

      // Should still succeed with fallback
      const scriptResponse = await scriptHandler(scriptEvent, {});
      expect(scriptResponse.statusCode).toBe(200);

      // Context should still be available for recovery
      expect(retrieveContext).toHaveBeenCalledWith(testProjectId, 'topic');
    });
  });
});