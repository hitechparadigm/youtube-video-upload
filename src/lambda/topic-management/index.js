/**
 * Topic Management Lambda Function
 * Updated to use shared utilities and consistent patterns
 */

import { createResponse, createErrorResponse } from '../../shared/http/response-handler.js';
import { createAWSClients } from '../../shared/aws-clients/factory.js';
import { withErrorHandler, withValidation, withCors } from '../../shared/middleware/error-handler.js';
import { parseEvent, validateRequiredFields, getPathParameter } from '../../shared/middleware/lambda-utils.js';
import { getEnvironmentConfig } from '../../shared/config/environment.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients and configuration
const { docClient } = createAWSClients();
const config = getEnvironmentConfig();

/**
 * Main Lambda handler with middleware
 */
const handler = async (event, context) => {
  const { method, pathParams, queryParams, body } = parseEvent(event);
  
  // Route requests based on HTTP method and path
  switch (method) {
    case 'GET':
      return pathParams.topicId 
        ? await getTopicById(pathParams.topicId)
        : await getTopics(queryParams);
    
    case 'POST':
      return await createTopic(body);
    
    case 'PUT':
      const topicId = getPathParameter(event, 'topicId');
      return await updateTopic(topicId, body);
    
    case 'DELETE':
      const deleteTopicId = getPathParameter(event, 'topicId');
      return await deleteTopic(deleteTopicId);
    
    default:
      return createErrorResponse(405, 'Method not allowed', context.awsRequestId);
  }
};

/**
 * Get topic by ID
 */
const getTopicById = async (topicId) => {
  const result = await docClient.send(new GetCommand({
    TableName: config.tables.topics,
    Key: { PK: `TOPIC#${topicId}`, SK: `TOPIC#${topicId}` }
  }));
  
  if (!result.Item) {
    return createErrorResponse(404, 'Topic not found');
  }
  
  return createResponse(200, result.Item);
};

/**
 * Get topics with filtering
 */
const getTopics = async (queryParams) => {
  const { status, priority, limit = '50' } = queryParams;
  
  const params = {
    TableName: config.tables.topics,
    FilterExpression: 'begins_with(PK, :topicPrefix)',
    ExpressionAttributeValues: { ':topicPrefix': 'TOPIC#' },
    Limit: parseInt(limit)
  };
  
  if (status) {
    params.FilterExpression += ' AND #status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }
  
  const result = await docClient.send(new ScanCommand(params));
  
  return createResponse(200, {
    topics: result.Items || [],
    count: result.Items?.length || 0,
    timestamp: new Date().toISOString()
  });
};

/**
 * Create new topic
 */
const createTopic = async (requestBody) => {
  // Validate required fields
  const validation = validateRequiredFields(requestBody, ['topic']);
  if (!validation.isValid) {
    return createErrorResponse(400, { error: 'Validation failed', details: validation.errors });
  }
  
  const topicId = uuidv4();
  const topic = {
    PK: `TOPIC#${topicId}`,
    SK: `TOPIC#${topicId}`,
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
    TableName: config.tables.topics,
    Item: topic,
    ConditionExpression: 'attribute_not_exists(PK)'
  }));
  
  return createResponse(201, topic);
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

// Export handler with middleware
export { handler };
export default withCors(withErrorHandler(handler));
