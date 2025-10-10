/**
 * Context Manager - Shared utility for AI agent context flow
 * Used by all Lambda functions for consistent context handling
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Store context for AI agent coordination
 */
const storeContext = async (context, contextType, projectId) => {
  try {
    const contextKey = projectId || `${contextType}-${Date.now()}`;
    const s3Key = `context/${contextKey}/${contextType}-context.json`;
    
    // Store in S3 for large contexts
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(context),
      ContentType: 'application/json'
    }));
    
    // Store reference in DynamoDB
    const contextRecord = {
      PK: `CONTEXT#${contextKey}`,
      SK: contextType,
      s3Location: s3Key,
      contextType,
      projectId: projectId || contextKey,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours TTL
    };
    
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.CONTEXT_TABLE,
      Item: marshall(contextRecord)
    }));
    
    console.log(`✅ Stored ${contextType} context for project ${projectId || contextKey}`);
    return { success: true, contextKey, s3Location: s3Key };
    
  } catch (error) {
    console.error(`❌ Error storing ${contextType} context:`, error);
    throw error;
  }
};

/**
 * Retrieve context from previous agents
 */
const retrieveContext = async (contextType, projectId) => {
  try {
    const contextKey = projectId || `${contextType}-context`;
    
    // Get reference from DynamoDB
    const response = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.CONTEXT_TABLE,
      Key: marshall({
        PK: `CONTEXT#${contextKey}`,
        SK: contextType
      })
    }));
    
    if (!response.Item) {
      console.log(`⚠️ No ${contextType} context found for project ${projectId}`);
      return null;
    }
    
    const contextRecord = unmarshall(response.Item);
    
    // Retrieve from S3
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: contextRecord.s3Location
    }));
    
    const contextData = JSON.parse(await s3Response.Body.transformToString());
    console.log(`✅ Retrieved ${contextType} context for project ${projectId}`);
    
    return contextData;
    
  } catch (error) {
    console.error(`❌ Error retrieving ${contextType} context:`, error);
    return null;
  }
};

/**
 * Create project with timestamp-based naming
 */
const createProject = async (baseTopic) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const topicSlug = baseTopic.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  
  const projectId = `${timestamp}_${topicSlug}`;
  console.log(`📁 Created project: ${projectId}`);
  
  return projectId;
};

/**
 * Validate context structure (basic validation)
 */
const validateContext = (context, requiredFields = []) => {
  if (!context || typeof context !== 'object') {
    return { isValid: false, errors: ['Context must be an object'] };
  }
  
  const errors = [];
  requiredFields.forEach(field => {
    if (!context[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  storeContext,
  retrieveContext,
  createProject,
  validateContext
};