/**
 * Topic Management Lambda Function
 * Updated to use shared utilities and consistent patterns
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Configuration
const TOPICS_TABLE = process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics-v2';

/**
 * Main Lambda handler
 */
const handler = async (event, context) => {
  console.log('Topic Management invoked:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, pathParameters, queryStringParameters, body } = event;
    
    // Parse request body if present
    let requestBody = {};
    if (body) {
      requestBody = typeof body === 'string' ? JSON.parse(body) : body;
    }
    
    // Route requests based on HTTP method and path
    switch (httpMethod) {
      case 'GET':
        return pathParameters?.topicId 
          ? await getTopicById(pathParameters.topicId)
          : await getTopics(queryStringParameters || {});
      
      case 'POST':
        return await createTopic(requestBody);
      
      case 'PUT':
        const topicId = pathParameters?.topicId;
        if (!topicId) {
          return createErrorResponse(400, 'Topic ID is required');
        }
        return await updateTopic(topicId, requestBody);
      
      case 'DELETE':
        const deleteTopicId = pathParameters?.topicId;
        if (!deleteTopicId) {
          return createErrorResponse(400, 'Topic ID is required');
        }
        return await deleteTopic(deleteTopicId);
      
      default:
        return createErrorResponse(405, 'Method not allowed');
    }
    
  } catch (error) {
    console.error('Error in Topic Management:', error);
    return createErrorResponse(500, {
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get topic by ID
 */
const getTopicById = async (topicId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TOPICS_TABLE,
      Key: { topicId: topicId }
    }));
    
    if (!result.Item) {
      return createErrorResponse(404, 'Topic not found');
    }
    
    return createResponse(200, result.Item);
  } catch (error) {
    console.error('Error getting topic by ID:', error);
    return createErrorResponse(500, 'Failed to get topic');
  }
};

/**
 * Get topics with filtering
 */
const getTopics = async (queryParams) => {
  try {
    const { status, priority, limit = '50' } = queryParams;
    
    const params = {
      TableName: TOPICS_TABLE,
      Limit: parseInt(limit)
    };
    
    // Add filters if provided
    if (status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues = { ':status': status };
    }
    
    if (priority) {
      const priorityFilter = 'priority = :priority';
      if (params.FilterExpression) {
        params.FilterExpression += ' AND ' + priorityFilter;
        params.ExpressionAttributeValues[':priority'] = parseInt(priority);
      } else {
        params.FilterExpression = priorityFilter;
        params.ExpressionAttributeValues = { ':priority': parseInt(priority) };
      }
    }
    
    const result = await docClient.send(new ScanCommand(params));
    
    return createResponse(200, {
      topics: result.Items || [],
      count: result.Items?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting topics:', error);
    return createErrorResponse(500, 'Failed to get topics');
  }
};

/**
 * Create new topic
 */
const createTopic = async (requestBody) => {
  try {
    // Validate required fields
    if (!requestBody.topic) {
      return createErrorResponse(400, { error: 'Topic is required' });
    }
    
    const topicId = uuidv4();
    const topic = {
      topicId,
      topic: requestBody.topic.trim(),
      keywords: extractKeywords(requestBody.topic),
      dailyFrequency: requestBody.dailyFrequency || 1,
      priority: requestBody.priority || 5,
      status: requestBody.status || 'active',
      targetAudience: requestBody.targetAudience || 'general',
      region: requestBody.region || 'US',
      contentStyle: requestBody.contentStyle || 'engaging_educational',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastProcessed: null,
      totalVideosGenerated: 0,
      averageEngagement: 0,
      metadata: {
        createdBy: requestBody.createdBy || 'system',
        source: requestBody.source || 'api',
        tags: requestBody.tags || []
      }
    };
    
    await docClient.send(new PutCommand({
      TableName: TOPICS_TABLE,
      Item: topic,
      ConditionExpression: 'attribute_not_exists(topicId)'
    }));
    
    return createResponse(201, topic);
  } catch (error) {
    console.error('Error creating topic:', error);
    return createErrorResponse(500, 'Failed to create topic');
  }
};

/**
 * Update existing topic
 */
const updateTopic = async (topicId, requestBody) => {
  try {
    // Get existing topic first
    const existing = await docClient.send(new GetCommand({
      TableName: TOPICS_TABLE,
      Key: { topicId: topicId }
    }));
    
    if (!existing.Item) {
      return createErrorResponse(404, 'Topic not found');
    }
    
    // Update fields
    const updatedTopic = {
      ...existing.Item,
      ...requestBody,
      topicId: topicId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    // Update keywords if topic text changed
    if (requestBody.topic) {
      updatedTopic.keywords = extractKeywords(requestBody.topic);
    }
    
    await docClient.send(new PutCommand({
      TableName: TOPICS_TABLE,
      Item: updatedTopic
    }));
    
    return createResponse(200, updatedTopic);
  } catch (error) {
    console.error('Error updating topic:', error);
    return createErrorResponse(500, 'Failed to update topic');
  }
};

/**
 * Delete topic
 */
const deleteTopic = async (topicId) => {
  try {
    // Check if topic exists
    const existing = await docClient.send(new GetCommand({
      TableName: TOPICS_TABLE,
      Key: { topicId: topicId }
    }));
    
    if (!existing.Item) {
      return createErrorResponse(404, 'Topic not found');
    }
    
    await docClient.send(new DeleteCommand({
      TableName: TOPICS_TABLE,
      Key: { topicId: topicId }
    }));
    
    return createResponse(200, { message: 'Topic deleted successfully', topicId });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return createErrorResponse(500, 'Failed to delete topic');
  }
};

/**
 * Extract keywords from topic text
 */
const extractKeywords = (topicText) => {
  if (!topicText) return [];
  
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  
  return topicText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 10);
};

/**
 * Create standardized HTTP response
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(statusCode, error) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
    },
    body: JSON.stringify({
      error: typeof error === 'string' ? error : error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    })
  };
}

// Export handler
export { handler };
