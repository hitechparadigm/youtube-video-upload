/**
 * Topic Management Lambda Function
 * Node.js 20.x Runtime
 * 
 * Handles CRUD operations for video topics with validation,
 * priority-based scheduling, and comprehensive error handling.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TOPICS_TABLE = process.env.TOPICS_TABLE_NAME;

/**
 * Lambda handler for topic management operations
 */
export const handler = async (event) => {
    console.log('Topic Management Lambda invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, pathParameters, body, queryStringParameters } = event;
        const requestBody = body ? JSON.parse(body) : {};
        
        // Route to appropriate handler based on HTTP method
        switch (httpMethod) {
            case 'GET':
                return await handleGetTopics(pathParameters, queryStringParameters);
            case 'POST':
                return await handleCreateTopic(requestBody);
            case 'PUT':
                return await handleUpdateTopic(pathParameters, requestBody);
            case 'DELETE':
                return await handleDeleteTopic(pathParameters);
            default:
                return createResponse(405, { error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in topic management:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message,
            requestId: event.requestContext?.requestId
        });
    }
};

/**
 * Handle GET requests - retrieve topics
 */
async function handleGetTopics(pathParameters, queryStringParameters) {
    try {
        // Get single topic by ID
        if (pathParameters?.topicId) {
            const topic = await getTopicById(pathParameters.topicId);
            if (!topic) {
                return createResponse(404, { error: 'Topic not found' });
            }
            return createResponse(200, topic);
        }
        
        // Get topics with optional filtering
        const topics = await getTopics(queryStringParameters);
        return createResponse(200, {
            topics,
            count: topics.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting topics:', error);
        return createResponse(500, { error: 'Failed to retrieve topics' });
    }
}

/**
 * Handle POST requests - create new topic
 */
async function handleCreateTopic(requestBody) {
    try {
        // Validate required fields
        const validation = validateTopicData(requestBody);
        if (!validation.isValid) {
            return createResponse(400, { 
                error: 'Validation failed',
                details: validation.errors
            });
        }
        
        // Extract and process keywords
        const keywords = extractKeywords(requestBody.topic);
        
        // Create topic object
        const topic = {
            topicId: uuidv4(),
            topic: requestBody.topic.trim(),
            keywords,
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
        
        // Save to DynamoDB
        await docClient.send(new PutCommand({
            TableName: TOPICS_TABLE,
            Item: topic,
            ConditionExpression: 'attribute_not_exists(topicId)'
        }));
        
        console.log('Topic created successfully:', topic.topicId);
        return createResponse(201, topic);
        
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return createResponse(409, { error: 'Topic already exists' });
        }
        console.error('Error creating topic:', error);
        return createResponse(500, { error: 'Failed to create topic' });
    }
}

/**
 * Handle PUT requests - update existing topic
 */
async function handleUpdateTopic(pathParameters, requestBody) {
    try {
        const topicId = pathParameters?.topicId;
        if (!topicId) {
            return createResponse(400, { error: 'Topic ID is required' });
        }
        
        // Check if topic exists
        const existingTopic = await getTopicById(topicId);
        if (!existingTopic) {
            return createResponse(404, { error: 'Topic not found' });
        }
        
        // Validate update data
        const validation = validateTopicData(requestBody, true);
        if (!validation.isValid) {
            return createResponse(400, { 
                error: 'Validation failed',
                details: validation.errors
            });
        }
        
        // Build update expression
        const updateData = buildUpdateExpression(requestBody);
        
        // Update topic
        const result = await docClient.send(new UpdateCommand({
            TableName: TOPICS_TABLE,
            Key: { topicId },
            UpdateExpression: updateData.updateExpression,
            ExpressionAttributeNames: updateData.expressionAttributeNames,
            ExpressionAttributeValues: updateData.expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }));
        
        console.log('Topic updated successfully:', topicId);
        return createResponse(200, result.Attributes);
        
    } catch (error) {
        console.error('Error updating topic:', error);
        return createResponse(500, { error: 'Failed to update topic' });
    }
}

/**
 * Handle DELETE requests - delete topic
 */
async function handleDeleteTopic(pathParameters) {
    try {
        const topicId = pathParameters?.topicId;
        if (!topicId) {
            return createResponse(400, { error: 'Topic ID is required' });
        }
        
        // Check if topic exists
        const existingTopic = await getTopicById(topicId);
        if (!existingTopic) {
            return createResponse(404, { error: 'Topic not found' });
        }
        
        // Delete topic
        await docClient.send(new DeleteCommand({
            TableName: TOPICS_TABLE,
            Key: { topicId }
        }));
        
        console.log('Topic deleted successfully:', topicId);
        return createResponse(200, { 
            message: 'Topic deleted successfully',
            topicId,
            deletedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error deleting topic:', error);
        return createResponse(500, { error: 'Failed to delete topic' });
    }
}

/**
 * Get topic by ID
 */
async function getTopicById(topicId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: TOPICS_TABLE,
            Key: { topicId }
        }));
        return result.Item;
    } catch (error) {
        console.error('Error getting topic by ID:', error);
        throw error;
    }
}

/**
 * Get topics with optional filtering
 */
async function getTopics(queryParams = {}) {
    try {
        const { status, priority, limit = '50' } = queryParams;
        
        let command;
        
        if (status) {
            // Query by status using GSI
            command = new QueryCommand({
                TableName: TOPICS_TABLE,
                IndexName: 'StatusIndex',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': status
                },
                Limit: parseInt(limit)
            });
        } else {
            // Scan all topics
            command = new ScanCommand({
                TableName: TOPICS_TABLE,
                Limit: parseInt(limit)
            });
        }
        
        const result = await docClient.send(command);
        let topics = result.Items || [];
        
        // Apply priority filter if specified
        if (priority) {
            topics = topics.filter(topic => topic.priority === parseInt(priority));
        }
        
        // Sort by priority (ascending) and then by updatedAt (descending)
        topics.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        
        return topics;
    } catch (error) {
        console.error('Error getting topics:', error);
        throw error;
    }
}

/**
 * Validate topic data
 */
function validateTopicData(data, isUpdate = false) {
    const errors = [];
    
    // Required fields for creation
    if (!isUpdate) {
        if (!data.topic || typeof data.topic !== 'string' || data.topic.trim().length === 0) {
            errors.push('Topic is required and must be a non-empty string');
        }
        
        if (data.topic && data.topic.length > 200) {
            errors.push('Topic must be 200 characters or less');
        }
    }
    
    // Optional field validations
    if (data.dailyFrequency !== undefined) {
        if (!Number.isInteger(data.dailyFrequency) || data.dailyFrequency < 1 || data.dailyFrequency > 10) {
            errors.push('Daily frequency must be an integer between 1 and 10');
        }
    }
    
    if (data.priority !== undefined) {
        if (!Number.isInteger(data.priority) || data.priority < 1 || data.priority > 10) {
            errors.push('Priority must be an integer between 1 and 10');
        }
    }
    
    if (data.status !== undefined) {
        const validStatuses = ['active', 'paused', 'archived'];
        if (!validStatuses.includes(data.status)) {
            errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
        }
    }
    
    if (data.targetAudience !== undefined) {
        if (typeof data.targetAudience !== 'string' || data.targetAudience.length > 100) {
            errors.push('Target audience must be a string of 100 characters or less');
        }
    }
    
    if (data.region !== undefined) {
        const validRegions = ['US', 'CA', 'UK', 'AU', 'EU'];
        if (!validRegions.includes(data.region)) {
            errors.push(`Region must be one of: ${validRegions.join(', ')}`);
        }
    }
    
    if (data.contentStyle !== undefined) {
        const validStyles = ['engaging_educational', 'entertainment', 'professional', 'casual'];
        if (!validStyles.includes(data.contentStyle)) {
            errors.push(`Content style must be one of: ${validStyles.join(', ')}`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Extract keywords from topic text
 */
function extractKeywords(topicText) {
    if (!topicText) return [];
    
    // Simple keyword extraction - remove common words and split
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    const words = topicText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.includes(word))
        .slice(0, 10); // Limit to 10 keywords
    
    return [...new Set(words)]; // Remove duplicates
}

/**
 * Build update expression for DynamoDB
 */
function buildUpdateExpression(data) {
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // Always update the updatedAt timestamp
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Update topic and extract new keywords if provided
    if (data.topic !== undefined) {
        updateExpression.push('#topic = :topic');
        updateExpression.push('#keywords = :keywords');
        expressionAttributeNames['#topic'] = 'topic';
        expressionAttributeNames['#keywords'] = 'keywords';
        expressionAttributeValues[':topic'] = data.topic.trim();
        expressionAttributeValues[':keywords'] = extractKeywords(data.topic);
    }
    
    // Update other fields if provided
    const fieldsToUpdate = ['dailyFrequency', 'priority', 'status', 'targetAudience', 'region', 'contentStyle'];
    
    fieldsToUpdate.forEach(field => {
        if (data[field] !== undefined) {
            updateExpression.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = data[field];
        }
    });
    
    return {
        updateExpression: `SET ${updateExpression.join(', ')}`,
        expressionAttributeNames,
        expressionAttributeValues
    };
}

/**
 * Create standardized API response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}