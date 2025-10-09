/**
 * 🔄 CONTEXT MANAGER UTILITY
 * 
 * Shared utility for context validation, storage, and retrieval across all Lambda functions.
 * Provides consistent context handling patterns for the automated video pipeline.
 * 
 * KEY FEATURES:
 * - Schema validation for all context types (topic, scene, media, audio, video)
 * - Context compression and caching for performance optimization
 * - Error handling and retry logic for context operations
 * - Consistent storage patterns across S3 and DynamoDB
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { gzipSync, gunzipSync } from 'zlib';

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Context validation schemas
const CONTEXT_SCHEMAS = {
  topic: {
    required: ['projectId', 'selectedTopic', 'expandedTopics', 'videoStructure', 'seoContext'],
    optional: ['contentGuidance', 'sceneContexts', 'targetAudience']
  },
  scene: {
    required: ['projectId', 'scenes', 'totalDuration', 'selectedSubtopic'],
    optional: ['videoStructure', 'contentStrategy', 'engagementElements']
  },
  media: {
    required: ['projectId', 'sceneMediaMapping', 'totalAssets'],
    optional: ['industryStandards', 'qualityMetrics', 'fallbackAssets']
  },
  audio: {
    required: ['projectId', 'masterAudioId', 'timingMarks'],
    optional: ['synchronizationData', 'voiceSettings', 'qualityMetrics']
  },
  video: {
    required: ['projectId', 'videoMetadata', 'processingResults'],
    optional: ['qualityMetrics', 'technicalSpecs', 'optimizationData']
  }
};

/**
 * Validates context object against schema
 * @param {Object} context - Context object to validate
 * @param {string} contextType - Type of context (topic, scene, media, audio, video)
 * @returns {Object} Validation result with success flag and errors
 */
function validateContext(context, contextType) {
  const schema = CONTEXT_SCHEMAS[contextType];
  if (!schema) {
    return { success: false, errors: [`Unknown context type: ${contextType}`] };
  }

  const errors = [];
  
  // Check required fields
  for (const field of schema.required) {
    if (!context[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate projectId format
  if (context.projectId && !context.projectId.match(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/)) {
    errors.push('Invalid projectId format. Expected: YYYY-MM-DD_HH-MM-SS_topic-name');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings: []
  };
}

/**
 * Compresses context object for storage optimization
 * @param {Object} context - Context object to compress
 * @returns {Buffer} Compressed context data
 */
function compressContext(context) {
  const jsonString = JSON.stringify(context);
  return gzipSync(Buffer.from(jsonString, 'utf8'));
}

/**
 * Decompresses context object from storage
 * @param {Buffer} compressedData - Compressed context data
 * @returns {Object} Decompressed context object
 */
function decompressContext(compressedData) {
  const decompressed = gunzipSync(compressedData);
  return JSON.parse(decompressed.toString('utf8'));
}

/**
 * Stores context in appropriate storage (S3 for large objects, DynamoDB for small ones)
 * @param {Object} context - Context object to store
 * @param {string} contextType - Type of context
 * @returns {Promise<string>} Storage location identifier
 */
async function storeContext(context, contextType) {
  const validation = validateContext(context, contextType);
  if (!validation.success) {
    throw new Error(`Context validation failed: ${validation.errors.join(', ')}`);
  }

  const contextSize = JSON.stringify(context).length;
  const storageKey = `${context.projectId}/${contextType}-context.json`;

  try {
    // Use S3 for large contexts (>100KB) or DynamoDB for small ones
    if (contextSize > 100000) {
      const compressedData = compressContext(context);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `contexts/${storageKey}`,
        Body: compressedData,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
        Metadata: {
          contextType,
          projectId: context.projectId,
          size: contextSize.toString(),
          compressed: 'true'
        }
      }));

      return `s3://${process.env.S3_BUCKET}/contexts/${storageKey}`;
    } else {
      // Store in DynamoDB for smaller contexts
      await docClient.send(new PutCommand({
        TableName: process.env.CONTEXT_TABLE,
        Item: {
          contextId: storageKey,
          contextType,
          projectId: context.projectId,
          data: context,
          createdAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days TTL
        }
      }));

      return `dynamodb://${process.env.CONTEXT_TABLE}/${storageKey}`;
    }
  } catch (error) {
    throw new Error(`Failed to store context: ${error.message}`);
  }
}

/**
 * Retrieves context from storage
 * @param {string} contextId - Context identifier (projectId/contextType format)
 * @param {string} contextType - Type of context to retrieve
 * @returns {Promise<Object>} Retrieved context object
 */
async function retrieveContext(contextId, contextType) {
  const storageKey = contextId.includes('/') ? contextId : `${contextId}/${contextType}-context.json`;

  try {
    // Try DynamoDB first (faster for small contexts)
    try {
      const result = await docClient.send(new GetCommand({
        TableName: process.env.CONTEXT_TABLE,
        Key: { contextId: storageKey }
      }));

      if (result.Item) {
        return result.Item.data;
      }
    } catch (dynamoError) {
      // Continue to S3 if DynamoDB fails
    }

    // Try S3 for larger contexts
    const s3Result = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `contexts/${storageKey}`
    }));

    const bodyBytes = await s3Result.Body.transformToByteArray();
    const isCompressed = s3Result.ContentEncoding === 'gzip';
    
    if (isCompressed) {
      return decompressContext(Buffer.from(bodyBytes));
    } else {
      return JSON.parse(Buffer.from(bodyBytes).toString('utf8'));
    }
  } catch (error) {
    throw new Error(`Failed to retrieve context: ${error.message}`);
  }
}

/**
 * Creates a new project with organized folder structure
 * @param {string} topic - Topic name for the project
 * @returns {Promise<string>} Generated project ID
 */
async function createProject(topic) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitizedTopic = topic.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  
  const projectId = `${timestamp}_${sanitizedTopic}`;

  // Create project folder structure in S3
  const folders = ['01-context', '02-script', '03-media', '04-audio', '05-video', '06-metadata'];
  
  for (const folder of folders) {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `videos/${projectId}/${folder}/.gitkeep`,
      Body: '',
      ContentType: 'text/plain'
    }));
  }

  return projectId;
}

/**
 * Gets context with retry logic and error handling
 * @param {string} contextId - Context identifier
 * @param {string} contextType - Type of context
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Retrieved context object
 */
async function getContextWithRetry(contextId, contextType, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await retrieveContext(contextId, contextType);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to retrieve context after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Validates context compatibility between agents
 * @param {Object} sourceContext - Context from source agent
 * @param {string} sourceType - Source context type
 * @param {string} targetType - Target context type expected
 * @returns {Object} Compatibility check result
 */
function validateContextCompatibility(sourceContext, sourceType, targetType) {
  const compatibilityRules = {
    'topic->scene': ['projectId', 'videoStructure', 'expandedTopics'],
    'scene->media': ['projectId', 'scenes', 'totalDuration'],
    'scene->audio': ['projectId', 'scenes', 'totalDuration'],
    'media->video': ['projectId', 'sceneMediaMapping'],
    'audio->video': ['projectId', 'masterAudioId', 'timingMarks']
  };

  const ruleKey = `${sourceType}->${targetType}`;
  const requiredFields = compatibilityRules[ruleKey];

  if (!requiredFields) {
    return { compatible: true, warnings: [`No compatibility rules defined for ${ruleKey}`] };
  }

  const missingFields = requiredFields.filter(field => !sourceContext[field]);
  
  return {
    compatible: missingFields.length === 0,
    missingFields,
    warnings: missingFields.length > 0 ? [`Missing required fields for ${ruleKey}: ${missingFields.join(', ')}`] : []
  };
}

module.exports = {
  validateContext,
  compressContext,
  decompressContext,
  storeContext,
  retrieveContext,
  createProject,
  getContextWithRetry,
  validateContextCompatibility
};