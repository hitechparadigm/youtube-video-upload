/**
 * Topic Management Service
 * 
 * This service handles CRUD operations for user-defined video topics.
 * Topics define what content the AI should generate videos about, such as:
 * - "investing in real estate in Canada"
 * - "tourism trends in Europe 2025"
 * - "economic issues in technology sector"
 * 
 * Features:
 * - Create, read, update, delete topics
 * - Keyword extraction and validation
 * - Priority and scheduling management
 * - Topic status tracking
 * - Cost tracking integration
 */

import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CostTracker } from '../shared/cost-tracker';

export interface Topic {
  topicId: string;
  topic: string;
  keywords: string[];
  priority: number;
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    times: string[]; // Array of times in HH:MM format
    timezone?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
  lastProcessed?: number;
  videoCount?: number;
  averageCost?: number;
}

export interface CreateTopicRequest {
  topic: string;
  keywords?: string[];
  priority?: number;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'custom';
    times: string[];
    timezone?: string;
  };
}

export interface UpdateTopicRequest {
  topic?: string;
  keywords?: string[];
  priority?: number;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'custom';
    times: string[];
    timezone?: string;
  };
  status?: 'active' | 'paused' | 'completed' | 'archived';
}

export class TopicService {
  private dynamodb: DynamoDB.DocumentClient;
  private tableName: string;
  private costTracker: CostTracker;

  constructor(costTracker?: CostTracker) {
    this.dynamodb = new DynamoDB.DocumentClient();
    this.tableName = process.env.TOPIC_TABLE_NAME || 'automated-video-topics';
    this.costTracker = costTracker || new CostTracker('topic-management');
  }

  /**
   * Create a new topic
   */
  async createTopic(request: CreateTopicRequest): Promise<Topic> {
    const startTime = Date.now();
    
    // Generate unique topic ID
    const topicId = this.generateTopicId(request.topic);
    
    // Extract keywords if not provided
    const keywords = request.keywords || this.extractKeywords(request.topic);
    
    // Validate topic content
    this.validateTopic(request.topic, keywords);
    
    const topic: Topic = {
      topicId,
      topic: request.topic.trim(),
      keywords,
      priority: request.priority || 1,
      schedule: request.schedule || {
        frequency: 'daily',
        times: ['14:00', '18:00', '22:00'],
        timezone: 'UTC'
      },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      videoCount: 0,
      averageCost: 0
    };

    // Store in DynamoDB
    const item = {
      PK: `TOPIC#${topicId}`,
      SK: 'CONFIG',
      ...topic,
      // Add GSI attributes for querying
      status: topic.status,
      priority: topic.priority,
      createdAt: topic.createdAt
    };

    try {
      await this.dynamodb.put({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)', // Prevent duplicates
      }).promise();

      // Track DynamoDB write cost
      this.costTracker.logDynamoDBUsage('write', 1);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('createTopic', executionTime, 512);

      return topic;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error(`Topic with similar content already exists: ${topicId}`);
      }
      throw error;
    }
  }

  /**
   * Get a topic by ID
   */
  async getTopic(topicId: string): Promise<Topic | null> {
    const startTime = Date.now();

    try {
      const result = await this.dynamodb.get({
        TableName: this.tableName,
        Key: {
          PK: `TOPIC#${topicId}`,
          SK: 'CONFIG'
        }
      }).promise();

      // Track DynamoDB read cost
      this.costTracker.logDynamoDBUsage('read', 1);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('getTopic', executionTime, 512);

      if (!result.Item) {
        return null;
      }

      // Remove DynamoDB keys from response
      const { PK, SK, ...topic } = result.Item;
      return topic as Topic;
    } catch (error) {
      console.error('Error getting topic:', error);
      throw error;
    }
  }

  /**
   * List all topics with optional filtering
   */
  async listTopics(
    status?: string,
    limit: number = 50,
    lastEvaluatedKey?: any
  ): Promise<{
    topics: Topic[];
    lastEvaluatedKey?: any;
    totalCount: number;
  }> {
    const startTime = Date.now();

    try {
      let queryParams: any = {
        TableName: this.tableName,
        Limit: limit
      };

      if (status) {
        // Use GSI to filter by status
        queryParams.IndexName = 'TopicsByPriority';
        queryParams.KeyConditionExpression = '#status = :status';
        queryParams.ExpressionAttributeNames = {
          '#status': 'status'
        };
        queryParams.ExpressionAttributeValues = {
          ':status': status
        };
      } else {
        // Scan all topics
        queryParams.FilterExpression = 'SK = :sk';
        queryParams.ExpressionAttributeValues = {
          ':sk': 'CONFIG'
        };
      }

      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = status 
        ? await this.dynamodb.query(queryParams).promise()
        : await this.dynamodb.scan(queryParams).promise();

      // Track DynamoDB read cost (estimate based on items returned)
      const readUnits = Math.max(1, Math.ceil((result.Items?.length || 0) / 2));
      this.costTracker.logDynamoDBUsage('read', readUnits);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('listTopics', executionTime, 512);

      const topics = (result.Items || []).map(item => {
        const { PK, SK, ...topic } = item;
        return topic as Topic;
      });

      return {
        topics,
        lastEvaluatedKey: result.LastEvaluatedKey,
        totalCount: result.Count || 0
      };
    } catch (error) {
      console.error('Error listing topics:', error);
      throw error;
    }
  }

  /**
   * Update an existing topic
   */
  async updateTopic(topicId: string, updates: UpdateTopicRequest): Promise<Topic> {
    const startTime = Date.now();

    // First, get the existing topic
    const existingTopic = await this.getTopic(topicId);
    if (!existingTopic) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    // Prepare update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.topic !== undefined) {
      updateExpressions.push('#topic = :topic');
      expressionAttributeNames['#topic'] = 'topic';
      expressionAttributeValues[':topic'] = updates.topic.trim();
      
      // Update keywords if topic changed
      if (!updates.keywords) {
        updates.keywords = this.extractKeywords(updates.topic);
      }
    }

    if (updates.keywords !== undefined) {
      updateExpressions.push('keywords = :keywords');
      expressionAttributeValues[':keywords'] = updates.keywords;
    }

    if (updates.priority !== undefined) {
      updateExpressions.push('priority = :priority');
      expressionAttributeValues[':priority'] = updates.priority;
    }

    if (updates.schedule !== undefined) {
      updateExpressions.push('schedule = :schedule');
      expressionAttributeValues[':schedule'] = updates.schedule;
    }

    if (updates.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = updates.status;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = Date.now();

    try {
      const result = await this.dynamodb.update({
        TableName: this.tableName,
        Key: {
          PK: `TOPIC#${topicId}`,
          SK: 'CONFIG'
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
          ? expressionAttributeNames 
          : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }).promise();

      // Track DynamoDB write cost
      this.costTracker.logDynamoDBUsage('write', 1);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('updateTopic', executionTime, 512);

      const { PK, SK, ...updatedTopic } = result.Attributes!;
      return updatedTopic as Topic;
    } catch (error) {
      console.error('Error updating topic:', error);
      throw error;
    }
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.dynamodb.delete({
        TableName: this.tableName,
        Key: {
          PK: `TOPIC#${topicId}`,
          SK: 'CONFIG'
        },
        ConditionExpression: 'attribute_exists(PK)' // Ensure topic exists
      }).promise();

      // Track DynamoDB write cost
      this.costTracker.logDynamoDBUsage('write', 1);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('deleteTopic', executionTime, 512);

    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error(`Topic not found: ${topicId}`);
      }
      throw error;
    }
  }

  /**
   * Get topics ready for processing (based on schedule)
   */
  async getTopicsForProcessing(): Promise<Topic[]> {
    const startTime = Date.now();
    const currentTime = new Date();
    const currentHour = currentTime.getHours().toString().padStart(2, '0');
    const currentMinute = currentTime.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;

    try {
      // Get all active topics
      const result = await this.listTopics('active', 100);
      
      // Filter topics that should be processed now
      const topicsToProcess = result.topics.filter(topic => {
        if (topic.status !== 'active') return false;
        
        // Check if current time matches any scheduled time
        return topic.schedule.times.some(scheduledTime => {
          // Simple time matching (can be enhanced with timezone support)
          return scheduledTime === currentTimeString;
        });
      });

      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('getTopicsForProcessing', executionTime, 512);

      return topicsToProcess;
    } catch (error) {
      console.error('Error getting topics for processing:', error);
      throw error;
    }
  }

  /**
   * Update topic statistics after video generation
   */
  async updateTopicStats(topicId: string, videoCost: number): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.dynamodb.update({
        TableName: this.tableName,
        Key: {
          PK: `TOPIC#${topicId}`,
          SK: 'CONFIG'
        },
        UpdateExpression: `
          SET lastProcessed = :lastProcessed,
              videoCount = if_not_exists(videoCount, :zero) + :one,
              averageCost = (if_not_exists(averageCost, :zero) * if_not_exists(videoCount, :zero) + :cost) / (if_not_exists(videoCount, :zero) + :one)
        `,
        ExpressionAttributeValues: {
          ':lastProcessed': Date.now(),
          ':zero': 0,
          ':one': 1,
          ':cost': videoCost
        },
        ReturnValues: 'NONE'
      }).promise();

      // Track DynamoDB write cost
      this.costTracker.logDynamoDBUsage('write', 1);
      
      // Track Lambda execution time
      const executionTime = Date.now() - startTime;
      this.costTracker.logLambdaUsage('updateTopicStats', executionTime, 512);

    } catch (error) {
      console.error('Error updating topic stats:', error);
      // Don't throw - stats update shouldn't break the main flow
    }
  }

  /**
   * Generate a unique topic ID based on content
   */
  private generateTopicId(topic: string): string {
    // Create a URL-friendly ID from the topic
    const baseId = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 50); // Limit length
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    return `${baseId}-${timestamp}`;
  }

  /**
   * Extract keywords from topic text
   */
  private extractKeywords(topic: string): string[] {
    // Simple keyword extraction (can be enhanced with NLP)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    return topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 2 && !stopWords.has(word)) // Filter short words and stop words
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Validate topic content
   */
  private validateTopic(topic: string, keywords: string[]): void {
    if (!topic || topic.trim().length < 10) {
      throw new Error('Topic must be at least 10 characters long');
    }

    if (topic.length > 500) {
      throw new Error('Topic must be less than 500 characters');
    }

    if (keywords.length === 0) {
      throw new Error('Unable to extract keywords from topic. Please provide keywords manually.');
    }

    // Check for inappropriate content (basic validation)
    const inappropriateWords = ['spam', 'scam', 'illegal', 'hack', 'piracy'];
    const lowerTopic = topic.toLowerCase();
    
    for (const word of inappropriateWords) {
      if (lowerTopic.includes(word)) {
        throw new Error(`Topic contains inappropriate content: ${word}`);
      }
    }
  }
}

/**
 * Lambda handler for topic management API
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const costTracker = new CostTracker(`topic-api-${Date.now()}`);
  await costTracker.initializeTracking();
  
  const topicService = new TopicService(costTracker);
  
  try {
    const path = event.path;
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    let response: any;

    switch (`${method} ${path}`) {
      case 'POST /topics':
        const createRequest: CreateTopicRequest = JSON.parse(event.body || '{}');
        response = await topicService.createTopic(createRequest);
        break;

      case 'GET /topics':
        const status = queryStringParameters.status;
        const limit = parseInt(queryStringParameters.limit || '50');
        const lastKey = queryStringParameters.lastEvaluatedKey 
          ? JSON.parse(decodeURIComponent(queryStringParameters.lastEvaluatedKey))
          : undefined;
        
        response = await topicService.listTopics(status, limit, lastKey);
        break;

      case 'GET /topics/{topicId}':
        const topicId = pathParameters.topicId;
        if (!topicId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Topic ID is required' }),
          };
        }
        
        response = await topicService.getTopic(topicId);
        if (!response) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Topic not found' }),
          };
        }
        break;

      case 'PUT /topics/{topicId}':
        const updateTopicId = pathParameters.topicId;
        if (!updateTopicId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Topic ID is required' }),
          };
        }
        
        const updateRequest: UpdateTopicRequest = JSON.parse(event.body || '{}');
        response = await topicService.updateTopic(updateTopicId, updateRequest);
        break;

      case 'DELETE /topics/{topicId}':
        const deleteTopicId = pathParameters.topicId;
        if (!deleteTopicId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Topic ID is required' }),
          };
        }
        
        await topicService.deleteTopic(deleteTopicId);
        response = { message: 'Topic deleted successfully' };
        break;

      case 'GET /topics/processing/ready':
        response = await topicService.getTopicsForProcessing();
        break;

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' }),
        };
    }

    // Finalize cost tracking
    await costTracker.finalizeCostTracking();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Topic management error:', error);
    
    // Finalize cost tracking even on error
    try {
      await costTracker.finalizeCostTracking();
    } catch (costError) {
      console.error('Cost tracking error:', costError);
    }

    return {
      statusCode: error.message.includes('not found') ? 404 : 
                  error.message.includes('already exists') ? 409 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};