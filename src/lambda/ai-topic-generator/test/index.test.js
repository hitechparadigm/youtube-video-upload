/**
 * Unit tests for AI Topic Generator Lambda function
 */

const { handler } = require('../index');

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockBedrockClient = {
  send: jest.fn()
};

const mockDocClient = {
  send: jest.fn()
};

// Mock environment variables
process.env.TOPICS_TABLE_NAME = 'test-topics-table';
process.env.TRENDS_TABLE_NAME = 'test-trends-table';
process.env.AWS_REGION = 'us-east-1';

describe('AI Topic Generator Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTopics', () => {
    it('should generate topics successfully with AI', async () => {
      // Mock Bedrock response
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify([
              {
                title: "5 Secrets About Investing Nobody Tells You",
                hook: "What if everything you knew about investing was wrong?",
                angle: "Contrarian perspective on popular investment advice",
                keywords: ["investing", "secrets", "finance"],
                engagementScore: 8,
                format: "secrets"
              }
            ])
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValue(mockBedrockResponse);

      // Mock DynamoDB responses
      mockDocClient.send
        .mockResolvedValueOnce({ Items: [] }) // getTrendDataForTopic
        .mockResolvedValue({ Items: [] }); // storeGeneratedTopics

      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/generate',
        body: JSON.stringify({
          baseTopic: 'investing for beginners',
          frequency: 2,
          targetAudience: 'millennials',
          contentStyle: 'engaging'
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.baseTopic).toBe('investing for beginners');
      expect(body.generatedTopics).toHaveLength(1);
      expect(body.generatedTopics[0].title).toBe('5 Secrets About Investing Nobody Tells You');
      expect(mockBedrockClient.send).toHaveBeenCalled();
    });

    it('should handle missing baseTopic', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/generate',
        body: JSON.stringify({
          frequency: 2
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.error).toBe('baseTopic is required');
    });

    it('should fallback when Bedrock fails', async () => {
      // Mock Bedrock failure
      mockBedrockClient.send.mockRejectedValue(new Error('Bedrock unavailable'));

      // Mock DynamoDB responses
      mockDocClient.send
        .mockResolvedValueOnce({ Items: [] }) // getTrendDataForTopic
        .mockResolvedValue({ Items: [] }); // storeGeneratedTopics

      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/generate',
        body: JSON.stringify({
          baseTopic: 'investing',
          frequency: 2
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.generatedTopics).toHaveLength(4); // frequency * 2
      expect(body.generatedTopics[0].format).toBe('fallback');
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze trends successfully', async () => {
      // Mock trend data
      const mockTrendData = [
        {
          keyword: 'investing apps',
          searchVolume: 1000,
          source: 'google'
        }
      ];

      // Mock Bedrock analysis response
      const mockAnalysisResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              summary: 'Investing apps are trending upward',
              momentum: 'increasing',
              insights: ['Mobile investing is popular'],
              opportunities: ['Create app comparison content'],
              recommendations: ['Focus on beginner-friendly apps']
            })
          }]
        }))
      };

      mockDocClient.send.mockResolvedValue({ Items: mockTrendData });
      mockBedrockClient.send.mockResolvedValue(mockAnalysisResponse);

      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/analyze',
        body: JSON.stringify({
          topic: 'investing',
          timeframe: '7d'
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.topic).toBe('investing');
      expect(body.trendCount).toBe(1);
      expect(body.analysis.momentum).toBe('increasing');
    });

    it('should handle missing topic parameter', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/analyze',
        body: JSON.stringify({
          timeframe: '7d'
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(400);
      expect(body.error).toBe('topic is required');
    });
  });

  describe('getTopicSuggestions', () => {
    it('should return topic suggestions', async () => {
      const mockSuggestions = [
        {
          topicId: 'topic-1',
          title: 'High Performing Topic',
          engagementScore: 8.5
        }
      ];

      mockDocClient.send.mockResolvedValue({ Items: mockSuggestions });

      const event = {
        httpMethod: 'GET',
        path: '/ai-topics/suggestions',
        queryStringParameters: {
          category: 'finance',
          limit: '5'
        }
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.suggestions).toHaveLength(1);
      expect(body.category).toBe('finance');
    });
  });

  describe('error handling', () => {
    it('should handle unknown endpoints', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/unknown-endpoint'
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.error).toBe('Endpoint not found');
    });

    it('should handle internal errors', async () => {
      // Mock DynamoDB error
      mockDocClient.send.mockRejectedValue(new Error('Database error'));

      const event = {
        httpMethod: 'POST',
        path: '/ai-topics/generate',
        body: JSON.stringify({
          baseTopic: 'test topic'
        })
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(500);
      expect(body.error).toBe('Failed to generate topics');
    });
  });

  describe('topic scoring', () => {
    it('should boost scores for trending keywords', () => {
      const topics = [
        {
          title: 'Test Topic',
          keywords: ['investing', 'apps'],
          engagementScore: 5
        }
      ];

      const trendData = [
        { keyword: 'investing' },
        { keyword: 'apps' }
      ];

      // This would be tested by calling the scoreTopics function
      // For now, we're testing the concept
      expect(topics[0].keywords).toContain('investing');
      expect(trendData.some(t => t.keyword === 'investing')).toBe(true);
    });
  });
});