/**
 * Unit Tests for Context Manager Shared Utility
 * Tests context validation, storage, and retrieval functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  validateContext, 
  compressContext, 
  decompressContext,
  storeContext,
  retrieveContext,
  createProject,
  validateContextCompatibility
} from '../../../src/shared/context-manager.js';

describe('Context Manager', () => {
  describe('validateContext', () => {
    it('should validate topic context successfully', () => {
      const topicContext = {
        projectId: '2025-10-09_12-00-00_test-topic',
        selectedTopic: 'Test Topic',
        expandedTopics: [{ subtopic: 'Test Subtopic' }],
        videoStructure: { recommendedScenes: 5 },
        seoContext: { primaryKeywords: ['test'] }
      };

      const result = validateContext(topicContext, 'topic');
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const invalidContext = {
        projectId: '2025-10-09_12-00-00_test-topic'
        // Missing required fields
      };

      const result = validateContext(invalidContext, 'topic');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for invalid projectId format', () => {
      const invalidContext = {
        projectId: 'invalid-format',
        selectedTopic: 'Test Topic',
        expandedTopics: [],
        videoStructure: {},
        seoContext: {}
      };

      const result = validateContext(invalidContext, 'topic');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid projectId format. Expected: YYYY-MM-DD_HH-MM-SS_topic-name');
    });
  });

  describe('context compression', () => {
    it('should compress and decompress context correctly', () => {
      const originalContext = {
        projectId: '2025-10-09_12-00-00_test-topic',
        data: 'test data',
        nested: { key: 'value' }
      };

      const compressed = compressContext(originalContext);
      expect(compressed).toBeInstanceOf(Buffer);

      const decompressed = decompressContext(compressed);
      expect(decompressed).toEqual(originalContext);
    });
  });

  describe('validateContextCompatibility', () => {
    it('should validate topic->scene compatibility', () => {
      const topicContext = {
        projectId: '2025-10-09_12-00-00_test-topic',
        videoStructure: { recommendedScenes: 5 },
        expandedTopics: [{ subtopic: 'Test' }]
      };

      const result = validateContextCompatibility(topicContext, 'topic', 'scene');
      expect(result.compatible).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing fields for compatibility', () => {
      const incompleteContext = {
        projectId: '2025-10-09_12-00-00_test-topic'
        // Missing required fields for scene compatibility
      };

      const result = validateContextCompatibility(incompleteContext, 'topic', 'scene');
      expect(result.compatible).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });
  });
});