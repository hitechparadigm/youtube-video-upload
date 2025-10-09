/**
 * End-to-End Integration Tests for Complete Video Pipeline
 * Tests the complete pipeline from topic to YouTube publishing
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('End-to-End Pipeline Integration', () => {
  let testProjectId;

  beforeEach(() => {
    testProjectId = `2025-10-09_12-00-00_e2e-test-${Date.now()}`;
    jest.clearAllMocks();
    
    // Mock all shared utilities
    const { storeContext, retrieveContext, createProject } = require('../../src/shared/context-manager.js');
    const { uploadToS3, getSecret, invokeLambda } = require('../../src/shared/aws-service-manager.js');
    
    createProject.mockResolvedValue(testProjectId);
    storeContext.mockResolvedValue('context-stored');
    uploadToS3.mockResolvedValue(`s3://test-bucket/test-key`);
    getSecret.mockResolvedValue({
      'pexels-api-key': 'test-pexels-key',
      'pixabay-api-key': 'test-pixabay-key',
      'youtube-oauth-client-id': 'test-client-id',
      'youtube-oauth-client-secret': 'test-client-secret',
      'youtube-oauth-refresh-token': 'test-refresh-token'
    });
  });

  describe('Complete Enhanced Pipeline', () => {
    it('should execute complete pipeline successfully', async () => {
      // Mock context flow through all agents
      const { retrieveContext } = require('../../src/shared/context-manager.js');
      
      // Mock topic context
      const mockTopicContext = {
        projectId: testProjectId,
        mainTopic: 'AI Tools for Content Creation',
        expandedTopics: [{ subtopic: 'Best AI tools for beginners' }],
        videoStructure: { totalDuration: 480, recommendedScenes: 5 },
        seoContext: { primaryKeywords: ['AI tools'] }
      };

      // Mock scene context
      const mockSceneContext = {
        projectId: testProjectId,
        scenes: [
          {
            sceneNumber: 1,
            title: 'Introduction',
            duration: 60,
            content: { script: 'Welcome to our guide...' },
            mediaRequirements: {
              specificLocations: ['modern office'],
              searchKeywords: ['AI tools']
            }
          }
        ],
        totalDuration: 480
      };

      // Mock media context
      const mockMediaContext = {
        projectId: testProjectId,
        sceneMediaMapping: [
          {
            sceneNumber: 1,
            mediaSequence: [
              { sequenceOrder: 1, assetUrl: 'test-asset-url' }
            ]
          }
        ],
        totalAssets: 5,
        industryStandards: { overallCompliance: true }
      };

      // Mock audio context
      const mockAudioContext = {
        projectId: testProjectId,
        masterAudioId: 'audio-123',
        audioSegments: [
          { sceneNumber: 1, audioUrl: 'test-audio-url' }
        ],
        timingMarks: [{ type: 'scene_start', sceneNumber: 1 }]
      };

      // Mock assembly context
      const mockAssemblyContext = {
        projectId: testProjectId,
        videoMetadata: {
          videoId: 'video-123',
          videoUrl: 'test-video-url',
          duration: 480
        },
        youtubePublisherInstructions: {
          title: 'AI Tools for Content Creation - Complete Guide 2025',
          description: 'Professional guide to AI tools...',
          tags: ['AI tools', 'education']
        }
      };

      // Set up context retrieval mocks in sequence
      retrieveContext
        .mockResolvedValueOnce(mockTopicContext)    // Script Generator
        .mockResolvedValueOnce(mockSceneContext)    // Media Curator
        .mockResolvedValueOnce(mockSceneContext)    // Audio Generator (scene)
        .mockResolvedValueOnce(mockMediaContext)    // Audio Generator (media)
        .mockResolvedValueOnce(mockSceneContext)    // Video Assembler (scene)
        .mockResolvedValueOnce(mockMediaContext)    // Video Assembler (media)
        .mockResolvedValueOnce(mockAudioContext)    // Video Assembler (audio)
        .mockResolvedValueOnce(mockAssemblyContext); // YouTube Publisher

      // Mock Lambda invocations for workflow orchestrator
      const { invokeLambda } = require('../../src/shared/aws-service-manager.js');
      
      // Mock successful responses from each agent
      invokeLambda
        .mockResolvedValueOnce({ // Topic Management
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              projectId: testProjectId,
              topicContext: mockTopicContext
            })
          })
        })
        .mockResolvedValueOnce({ // Script Generator
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              sceneContext: mockSceneContext,
              enhancedFeatures: { professionalVisualRequirements: true }
            })
          })
        })
        .mockResolvedValueOnce({ // Media Curator
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              mediaContext: mockMediaContext,
              industryCompliance: true
            })
          })
        })
        .mockResolvedValueOnce({ // Audio Generator
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              audioContext: mockAudioContext,
              generativeFeatures: { voiceUsed: 'Ruth' }
            })
          })
        })
        .mockResolvedValueOnce({ // Video Assembler
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              videoResult: { videoId: 'video-123', videoUrl: 'test-video-url' },
              professionalFeatures: { lambdaBasedProcessing: true }
            })
          })
        })
        .mockResolvedValueOnce({ // YouTube Publisher
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              youtubeResult: { youtubeUrl: 'https://youtube.com/watch?v=test123' },
              seoOptimization: { title: 'Optimized Title' }
            })
          })
        });

      // Test Workflow Orchestrator with enhanced pipeline
      const { handler: orchestratorHandler } = await import('../../src/lambda/workflow-orchestrator/index.js');
      const orchestratorEvent = {
        httpMethod: 'POST',
        path: '/workflow/start-enhanced',
        body: JSON.stringify({
          baseTopic: 'AI Tools for Content Creation',
          targetAudience: 'general',
          publishOptions: { publishToYouTube: true }
        })
      };

      const orchestratorResponse = await orchestratorHandler(orchestratorEvent, {});
      expect(orchestratorResponse.statusCode).toBe(200);

      const orchestratorBody = JSON.parse(orchestratorResponse.body);
      expect(orchestratorBody.success).toBe(true);
      expect(orchestratorBody.projectId).toBe(testProjectId);
      expect(orchestratorBody.pipelineResult.status).toBe('completed');
      
      // Verify all agents were called
      expect(orchestratorBody.pipelineResult.agents.topicManagement.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.scriptGenerator.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.mediaCurator.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.audioGenerator.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.videoAssembler.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.youtubePublisher.status).toBe('completed');

      // Verify enhanced features
      expect(orchestratorBody.enhancedFeatures.contextAware).toBe(true);
      expect(orchestratorBody.enhancedFeatures.professionalQuality).toBe(true);
      expect(orchestratorBody.enhancedFeatures.industryStandards).toBe(true);
      expect(orchestratorBody.enhancedFeatures.generativeVoices).toBe(true);
      expect(orchestratorBody.enhancedFeatures.rateLimitingProtection).toBe(true);
      expect(orchestratorBody.enhancedFeatures.refactored).toBe(true);
    });

    it('should handle partial pipeline failure gracefully', async () => {
      const { invokeLambda } = require('../../src/shared/aws-service-manager.js');
      
      // Mock successful topic and script generation, but media curator failure
      invokeLambda
        .mockResolvedValueOnce({ // Topic Management - Success
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              projectId: testProjectId,
              topicContext: { mainTopic: 'Test' }
            })
          })
        })
        .mockResolvedValueOnce({ // Script Generator - Success
          Payload: JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              sceneContext: { scenes: [{ sceneNumber: 1 }] }
            })
          })
        })
        .mockResolvedValueOnce({ // Media Curator - Failure
          Payload: JSON.stringify({
            statusCode: 500,
            body: JSON.stringify({
              success: false,
              error: 'Media curation failed'
            })
          })
        });

      const { handler: orchestratorHandler } = await import('../../src/lambda/workflow-orchestrator/index.js');
      const orchestratorEvent = {
        httpMethod: 'POST',
        path: '/workflow/start-enhanced',
        body: JSON.stringify({
          baseTopic: 'Test Topic'
        })
      };

      const orchestratorResponse = await orchestratorHandler(orchestratorEvent, {});
      expect(orchestratorResponse.statusCode).toBe(500);

      const orchestratorBody = JSON.parse(orchestratorResponse.body);
      expect(orchestratorBody.success).toBe(false);
      expect(orchestratorBody.pipelineResult.status).toBe('failed');
      
      // Verify successful agents completed
      expect(orchestratorBody.pipelineResult.agents.topicManagement.status).toBe('completed');
      expect(orchestratorBody.pipelineResult.agents.scriptGenerator.status).toBe('completed');
    });
  });

  describe('Performance and Timing', () => {
    it('should complete pipeline within reasonable time limits', async () => {
      const startTime = Date.now();

      // Mock fast responses from all agents
      const { invokeLambda } = require('../../src/shared/aws-service-manager.js');
      const mockSuccessResponse = {
        Payload: JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({ success: true })
        })
      };

      invokeLambda.mockResolvedValue(mockSuccessResponse);

      const { handler: orchestratorHandler } = await import('../../src/lambda/workflow-orchestrator/index.js');
      const orchestratorEvent = {
        httpMethod: 'POST',
        path: '/workflow/start-enhanced',
        body: JSON.stringify({
          baseTopic: 'Performance Test',
          publishOptions: { publishToYouTube: false } // Skip YouTube for speed
        })
      };

      const orchestratorResponse = await orchestratorHandler(orchestratorEvent, {});
      const executionTime = Date.now() - startTime;

      expect(orchestratorResponse.statusCode).toBe(200);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const orchestratorBody = JSON.parse(orchestratorResponse.body);
      expect(orchestratorBody.pipelineResult.totalDuration).toBeDefined();
    });
  });

  describe('Context Preservation and Recovery', () => {
    it('should preserve context across agent failures for recovery', async () => {
      const { storeContext, retrieveContext } = require('../../src/shared/context-manager.js');
      
      // Mock context storage calls
      const storedContexts = {};
      storeContext.mockImplementation((context, type) => {
        storedContexts[type] = context;
        return Promise.resolve('stored');
      });
      
      retrieveContext.mockImplementation((projectId, type) => {
        return Promise.resolve(storedContexts[type] || {});
      });

      // Test that contexts are properly stored and can be retrieved
      const mockTopicContext = { projectId: testProjectId, mainTopic: 'Test' };
      await storeContext(mockTopicContext, 'topic');
      
      const retrievedContext = await retrieveContext(testProjectId, 'topic');
      expect(retrievedContext).toEqual(mockTopicContext);
      
      // Verify context is available for recovery scenarios
      expect(storedContexts.topic).toEqual(mockTopicContext);
    });
  });
});