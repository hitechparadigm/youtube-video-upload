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
    // Clean project ID to prevent dash multiplication
    const cleanProjectId = projectId ? projectId.replace(/-{2,}/g, '-') : `${contextType}-${Date.now()}`;
    
    // Use proper folder structure utility
    const { generateS3Paths } = require('./s3-folder-structure.js');
    const paths = generateS3Paths(cleanProjectId, contextType);
    const s3Key = paths.context[contextType] || `videos/${cleanProjectId}/01-context/${contextType}-context.json`;
    
    // Store in S3 using standard structure
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(context),
      ContentType: 'application/json'
    }));
    
    // Store reference in DynamoDB with consistent key format
    const contextRecord = {
      PK: `${contextType}#${cleanProjectId}`,
      SK: cleanProjectId,
      s3Location: s3Key,
      contextType,
      projectId: cleanProjectId,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours TTL
    };
    
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.CONTEXT_TABLE,
      Item: marshall(contextRecord)
    }));
    
    console.log(`✅ Stored ${contextType} context for project ${cleanProjectId} at standard path: ${s3Key}`);
    return { success: true, contextKey: cleanProjectId, s3Location: s3Key };
    
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
    // Clean project ID to prevent dash multiplication
    const cleanProjectId = projectId ? projectId.replace(/-{2,}/g, '-') : `${contextType}-context`;
    
    // Get reference from DynamoDB with consistent key format
    const response = await dynamoClient.send(new GetItemCommand({
      TableName: process.env.CONTEXT_TABLE,
      Key: marshall({
        PK: `${contextType}#${cleanProjectId}`,
        SK: cleanProjectId
      })
    }));
    
    if (!response.Item) {
      console.log(`⚠️ No ${contextType} context found for project ${cleanProjectId}`);
      return null;
    }
    
    const contextRecord = unmarshall(response.Item);
    
    // STANDARD PATH: Always use videos/{projectId}/01-context/{contextType}-context.json
    const standardS3Key = `videos/${cleanProjectId}/01-context/${contextType}-context.json`;
    
    try {
      // Try standard path first
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: standardS3Key
      }));
      
      const contextData = JSON.parse(await s3Response.Body.transformToString());
      console.log(`✅ Retrieved ${contextType} context for project ${cleanProjectId} from standard path`);
      
      // Update DynamoDB record to use standard path if it's different
      if (contextRecord.s3Location !== standardS3Key) {
        const updatedRecord = {
          ...contextRecord,
          s3Location: standardS3Key,
          updatedAt: new Date().toISOString()
        };
        
        await dynamoClient.send(new PutItemCommand({
          TableName: process.env.CONTEXT_TABLE,
          Item: marshall(updatedRecord)
        }));
        
        console.log(`🔄 Updated DynamoDB record to use standard path: ${standardS3Key}`);
      }
      
      return contextData;
      
    } catch (standardError) {
      console.log(`⚠️ Standard path not found: ${standardS3Key}`);
      
      // Fallback: try the stored location (for backward compatibility)
      if (contextRecord.s3Location && contextRecord.s3Location !== standardS3Key) {
        try {
          console.log(`🔄 Trying stored path: ${contextRecord.s3Location}`);
          const fallbackResponse = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: contextRecord.s3Location
          }));
          
          const contextData = JSON.parse(await fallbackResponse.Body.transformToString());
          console.log(`✅ Retrieved ${contextType} context from stored path: ${contextRecord.s3Location}`);
          
          // Copy to standard location for future use
          await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: standardS3Key,
            Body: JSON.stringify(contextData),
            ContentType: 'application/json'
          }));
          
          console.log(`📋 Copied context to standard path: ${standardS3Key}`);
          
          // Update DynamoDB record
          const updatedRecord = {
            ...contextRecord,
            s3Location: standardS3Key,
            updatedAt: new Date().toISOString()
          };
          
          await dynamoClient.send(new PutItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Item: marshall(updatedRecord)
          }));
          
          return contextData;
          
        } catch (fallbackError) {
          console.log(`⚠️ Stored path also failed: ${contextRecord.s3Location}`);
        }
      }
      
      throw new Error(`Context not found at standard path: ${standardS3Key}`);
    }
    
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