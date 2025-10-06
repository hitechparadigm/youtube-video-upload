/**
 * Unit Tests for Topic Management Service
 * 
 * Tests cover:
 * - CRUD operations for topics
 * - Validation and error handling
 * - Cost tracking integration
 * - Schedule management
 * - Keyword extraction and optimization
 */

import { TopicService, CreateTopicRequest, UpdateTopicRequest } from '../topic-service';
import { CostTracker } from '../../shared/cost-tracker';

// Mock AWS SDK
jest.mock('aws-sdk');

// Mock CostTracker
jest.mock('../../shared/cost-tracker');

describe('TopicService', () => {
  let topicService: TopicService;
  let mockCostTracker: jest.Mocked<CostTracker>;
  let mockDynamoDB: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock CostTracker
    mockCostTracker = {
      logDynamoDBUsage: jest.fn(),
      logLambdaUsage: jest.fn(),
      initializeTracking: jest.fn(),
      finalizeCostTracking: jest.fn()
    } as any;

    // Mock DynamoDB DocumentClient
    mockDynamoDB = {
      put: jest.fn().mockReturnValue({ promise: jest.fn() }),
      get: jest.fn().mockReturnValue({ promise: jest.fn() }),
      update: jest.fn().mockReturnValue({ promise: jest.fn() }),
      delete: jest.fn().mockReturnValue({ promise: jest.fn() }),
      query: jest.fn().mockReturnValue({ promise: jest.fn() }),
      scan: jest.fn().mockReturnValue({ promise: jest.fn() })
    };

    // Mock AWS DynamoDB DocumentClient constructor
    const AWS = require('aws-sdk');
    AWS.DynamoDB.DocumentClient.mockImplementation(() => mockDynamoDB);

    topicService = new TopicService(mockCostTracker);
  });

  describe('createTopic', () => {
    it('should create a topic successfully', async () => {
      const request: CreateTopicRequest = {
        topic: 'investing in real estate in Canada',
        keywords: ['real estate', 'Canada', 'investment'],
        priority: 1
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await topicService.createTopic(request);

      expect(result).toMatchObject({
        topic: request.topic,
        keywords: request.keywords,
        priority: 1,
        status: 'active'
      });

      expect(result.topicId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(mockDynamoDB.put).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        Item: expect.objectContaining({
          PK: expect.stringMatching(/^TOPIC#/),
          SK: 'CONFIG',
          topic: request.topic,
          keywords: request.keywords,
          priority: 1,
          status: 'active'
        }),
        ConditionExpression: 'attribute_not_exists(PK)'
      });

      expect(mockCostTracker.logDynamoDBUsage).toHaveBeenCalledWith('write', 1);
      expect(mockCostTracker.logLambdaUsage).toHaveBeenCalledWith(
        'createTopic',
        expect.any(Number),
        512
      );
    });

    it('should extract keywords automatically if not provided', async () => {
      const request: CreateTopicRequest = {
        topic: 'investing in real estate in Canada for beginners'
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await topicService.createTopic(request);

      expect(result.keywords).toEqual(
        expect.arrayContaining(['investing', 'real', 'estate', 'canada', 'beginners'])
      );
    });

    it('should use default schedule if not provided', async () => {
      const request: CreateTopicRequest = {
        topic: 'technology trends in 2025'
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await topicService.createTopic(request);

      expect(result.schedule).toEqual({
        frequency: 'daily',
        times: ['14:00', '18:00', '22:00'],
        timezone: 'UTC'
      });
    });

    it('should throw error for duplicate topics', async () => {
      const request: CreateTopicRequest = {
        topic: 'duplicate topic'
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockRejectedValue({
          code: 'ConditionalCheckFailedException'
        })
      });

      await expect(topicService.createTopic(request)).rejects.toThrow(
        'Topic with similar content already exists'
      );
    });

    it('should validate topic length', async () => {
      const request: CreateTopicRequest = {
        topic: 'short' // Too short
      };

      await expect(topicService.createTopic(request)).rejects.toThrow(
        'Topic must be at least 10 characters long'
      );
    });

    it('should validate inappropriate content', async () => {
      const request: CreateTopicRequest = {
        topic: 'how to hack into systems illegally'
      };

      await expect(topicService.createTopic(request)).rejects.toThrow(
        'Topic contains inappropriate content'
      );
    });
  });

  describe('getTopic', () => {
    it('should retrieve a topic successfully', async () => {
      const mockTopic = {
        PK: 'TOPIC#test-topic-id',
        SK: 'CONFIG',
        topicId: 'test-topic-id',
        topic: 'test topic content',
        keywords: ['test', 'topic'],
        priority: 1,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: mockTopic })
      });

      const result = await topicService.getTopic('test-topic-id');

      expect(result).toEqual({
        topicId: 'test-topic-id',
        topic: 'test topic content',
        keywords: ['test', 'topic'],
        priority: 1,
        status: 'active',
        createdAt: mockTopic.createdAt,
        updatedAt: mockTopic.updatedAt
      });

      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        Key: {
          PK: 'TOPIC#test-topic-id',
          SK: 'CONFIG'
        }
      });

      expect(mockCostTracker.logDynamoDBUsage).toHaveBeenCalledWith('read', 1);
    });

    it('should return null for non-existent topic', async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await topicService.getTopic('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listTopics', () => {
    it('should list topics with status filter', async () => {
      const mockItems = [
        {
          PK: 'TOPIC#topic1',
          SK: 'CONFIG',
          topicId: 'topic1',
          topic: 'Topic 1',
          status: 'active'
        },
        {
          PK: 'TOPIC#topic2',
          SK: 'CONFIG',
          topicId: 'topic2',
          topic: 'Topic 2',
          status: 'active'
        }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: mockItems,
          Count: 2
        })
      });

      const result = await topicService.listTopics('active', 50);

      expect(result.topics).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.topics[0]).not.toHaveProperty('PK');
      expect(result.topics[0]).not.toHaveProperty('SK');

      expect(mockDynamoDB.query).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        IndexName: 'TopicsByPriority',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'active' },
        Limit: 50
      });
    });

    it('should scan all topics when no status filter', async () => {
      const mockItems = [
        {
          PK: 'TOPIC#topic1',
          SK: 'CONFIG',
          topicId: 'topic1',
          topic: 'Topic 1',
          status: 'active'
        }
      ];

      mockDynamoDB.scan.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: mockItems,
          Count: 1
        })
      });

      const result = await topicService.listTopics();

      expect(mockDynamoDB.scan).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'CONFIG' },
        Limit: 50
      });
    });
  });

  describe('updateTopic', () => {
    it('should update topic successfully', async () => {
      // Mock existing topic
      const existingTopic = {
        PK: 'TOPIC#test-id',
        SK: 'CONFIG',
        topicId: 'test-id',
        topic: 'original topic',
        keywords: ['original'],
        priority: 1,
        status: 'active'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: existingTopic })
      });

      const updatedTopic = {
        ...existingTopic,
        topic: 'updated topic',
        keywords: ['updated'],
        updatedAt: Date.now()
      };

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Attributes: updatedTopic })
      });

      const updateRequest: UpdateTopicRequest = {
        topic: 'updated topic',
        keywords: ['updated']
      };

      const result = await topicService.updateTopic('test-id', updateRequest);

      expect(result.topic).toBe('updated topic');
      expect(result.keywords).toEqual(['updated']);

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        Key: {
          PK: 'TOPIC#test-id',
          SK: 'CONFIG'
        },
        UpdateExpression: expect.stringContaining('SET'),
        ExpressionAttributeNames: expect.any(Object),
        ExpressionAttributeValues: expect.objectContaining({
          ':topic': 'updated topic',
          ':keywords': ['updated'],
          ':updatedAt': expect.any(Number)
        }),
        ReturnValues: 'ALL_NEW'
      });
    });

    it('should throw error for non-existent topic', async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const updateRequest: UpdateTopicRequest = {
        topic: 'updated topic'
      };

      await expect(topicService.updateTopic('non-existent', updateRequest))
        .rejects.toThrow('Topic not found: non-existent');
    });
  });

  describe('deleteTopic', () => {
    it('should delete topic successfully', async () => {
      mockDynamoDB.delete.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      await topicService.deleteTopic('test-id');

      expect(mockDynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        Key: {
          PK: 'TOPIC#test-id',
          SK: 'CONFIG'
        },
        ConditionExpression: 'attribute_exists(PK)'
      });

      expect(mockCostTracker.logDynamoDBUsage).toHaveBeenCalledWith('write', 1);
    });

    it('should throw error for non-existent topic', async () => {
      mockDynamoDB.delete.mockReturnValue({
        promise: jest.fn().mockRejectedValue({
          code: 'ConditionalCheckFailedException'
        })
      });

      await expect(topicService.deleteTopic('non-existent'))
        .rejects.toThrow('Topic not found: non-existent');
    });
  });

  describe('getTopicsForProcessing', () => {
    beforeEach(() => {
      // Mock current time to 14:00
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return topics scheduled for current time', async () => {
      const mockTopics = [
        {
          topicId: 'topic1',
          topic: 'Topic 1',
          status: 'active',
          schedule: {
            frequency: 'daily',
            times: ['14:00', '18:00']
          }
        },
        {
          topicId: 'topic2',
          topic: 'Topic 2',
          status: 'active',
          schedule: {
            frequency: 'daily',
            times: ['15:00', '18:00']
          }
        }
      ];

      // Mock listTopics to return these topics
      jest.spyOn(topicService, 'listTopics').mockResolvedValue({
        topics: mockTopics as any,
        totalCount: 2
      });

      const result = await topicService.getTopicsForProcessing();

      expect(result).toHaveLength(1);
      expect(result[0].topicId).toBe('topic1');
    });

    it('should return empty array when no topics match current time', async () => {
      const mockTopics = [
        {
          topicId: 'topic1',
          topic: 'Topic 1',
          status: 'active',
          schedule: {
            frequency: 'daily',
            times: ['15:00', '18:00']
          }
        }
      ];

      jest.spyOn(topicService, 'listTopics').mockResolvedValue({
        topics: mockTopics as any,
        totalCount: 1
      });

      const result = await topicService.getTopicsForProcessing();

      expect(result).toHaveLength(0);
    });
  });

  describe('updateTopicStats', () => {
    it('should update topic statistics after video generation', async () => {
      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      await topicService.updateTopicStats('test-id', 1.25);

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: 'automated-video-topics',
        Key: {
          PK: 'TOPIC#test-id',
          SK: 'CONFIG'
        },
        UpdateExpression: expect.stringContaining('SET lastProcessed'),
        ExpressionAttributeValues: expect.objectContaining({
          ':lastProcessed': expect.any(Number),
          ':zero': 0,
          ':one': 1,
          ':cost': 1.25
        }),
        ReturnValues: 'NONE'
      });

      expect(mockCostTracker.logDynamoDBUsage).toHaveBeenCalledWith('write', 1);
    });

    it('should not throw error if update fails', async () => {
      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Update failed'))
      });

      // Should not throw
      await expect(topicService.updateTopicStats('test-id', 1.25))
        .resolves.toBeUndefined();
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords', () => {
      const topic = 'investing in real estate properties in Canada for beginners';
      
      // Access private method through any cast for testing
      const keywords = (topicService as any).extractKeywords(topic);

      expect(keywords).toEqual(
        expect.arrayContaining(['investing', 'real', 'estate', 'properties', 'canada', 'beginners'])
      );
      
      // Should not include stop words
      expect(keywords).not.toContain('in');
      expect(keywords).not.toContain('for');
    });

    it('should limit keyword count', () => {
      const longTopic = 'this is a very long topic with many words that should be filtered and limited to a reasonable number of keywords for processing';
      
      const keywords = (topicService as any).extractKeywords(longTopic);

      expect(keywords.length).toBeLessThanOrEqual(10);
    });
  });

  describe('topic ID generation', () => {
    it('should generate URL-friendly topic IDs', () => {
      const topic = 'Investing in Real Estate: A Complete Guide!';
      
      const topicId = (topicService as any).generateTopicId(topic);

      expect(topicId).toMatch(/^[a-z0-9-]+$/);
      expect(topicId).toContain('investing-in-real-estate-a-complete-guide');
      expect(topicId).toMatch(/-[a-z0-9]+$/); // Should end with timestamp
    });

    it('should handle special characters', () => {
      const topic = 'How to Make $1000/Month Online? (2025 Guide)';
      
      const topicId = (topicService as any).generateTopicId(topic);

      expect(topicId).not.toContain('$');
      expect(topicId).not.toContain('?');
      expect(topicId).not.toContain('(');
      expect(topicId).not.toContain(')');
    });
  });

  describe('topic validation', () => {
    it('should validate minimum topic length', () => {
      expect(() => {
        (topicService as any).validateTopic('short', ['keyword']);
      }).toThrow('Topic must be at least 10 characters long');
    });

    it('should validate maximum topic length', () => {
      const longTopic = 'a'.repeat(501);
      
      expect(() => {
        (topicService as any).validateTopic(longTopic, ['keyword']);
      }).toThrow('Topic must be less than 500 characters');
    });

    it('should validate inappropriate content', () => {
      expect(() => {
        (topicService as any).validateTopic('how to spam people effectively', ['spam']);
      }).toThrow('Topic contains inappropriate content: spam');
    });

    it('should validate keyword availability', () => {
      expect(() => {
        (topicService as any).validateTopic('valid topic content', []);
      }).toThrow('Unable to extract keywords from topic');
    });
  });
});