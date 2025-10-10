/**
 * ☁️ AWS SERVICE MANAGER UTILITY
 * 
 * Shared utility for common AWS service operations across all Lambda functions.
 * Provides consistent patterns for S3, DynamoDB, and Secrets Manager interactions.
 * 
 * KEY FEATURES:
 * - S3 operations (upload, download, list, delete) with error handling
 * - DynamoDB operations (query, put, update, delete) with consistent patterns
 * - Secrets Manager integration for secure credential retrieval
 * - Lambda invocation utilities for inter-service communication
 * - Retry logic and exponential backoff for resilient operations
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * S3 OPERATIONS
 */

/**
 * Uploads data to S3 with error handling and metadata
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {Buffer|string} data - Data to upload
 * @param {Object} options - Upload options (contentType, metadata, etc.)
 * @returns {Promise<string>} S3 object URL
 */
async function uploadToS3(bucket, key, data, options = {}) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata || {},
      ServerSideEncryption: 'AES256',
      ...options.additionalParams
    });

    await s3Client.send(command);
    return `s3://${bucket}/${key}`;
  } catch (error) {
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Downloads data from S3 with error handling
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {Object} options - Download options
 * @returns {Promise<Buffer>} Downloaded data
 */
async function downloadFromS3(bucket, key, options = {}) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...options.additionalParams
    });

    const response = await s3Client.send(command);
    return await response.Body.transformToByteArray();
  } catch (error) {
    throw new Error(`Failed to download from S3: ${error.message}`);
  }
}

/**
 * Lists objects in S3 bucket with pagination support
 * @param {string} bucket - S3 bucket name
 * @param {string} prefix - Object key prefix filter
 * @param {Object} options - List options (maxKeys, continuationToken)
 * @returns {Promise<Object>} List result with objects and pagination info
 */
async function listS3Objects(bucket, prefix = '', options = {}) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
      ...options.additionalParams
    });

    const response = await s3Client.send(command);
    return {
      objects: response.Contents || [],
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken,
      keyCount: response.KeyCount
    };
  } catch (error) {
    throw new Error(`Failed to list S3 objects: ${error.message}`);
  }
}

/**
 * Deletes object from S3
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteFromS3(bucket, key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await s3Client.send(command);
  } catch (error) {
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
}

/**
 * DYNAMODB OPERATIONS
 */

/**
 * Queries DynamoDB table with consistent error handling
 * @param {string} tableName - DynamoDB table name
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function queryDynamoDB(tableName, queryParams) {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      ...queryParams
    });

    const response = await docClient.send(command);
    return response.Items || [];
  } catch (error) {
    throw new Error(`Failed to query DynamoDB: ${error.message}`);
  }
}

/**
 * Puts item into DynamoDB table
 * @param {string} tableName - DynamoDB table name
 * @param {Object} item - Item to put
 * @param {Object} options - Put options (conditionExpression, etc.)
 * @returns {Promise<void>}
 */
async function putDynamoDBItem(tableName, item, options = {}) {
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      ...options
    });

    await docClient.send(command);
  } catch (error) {
    throw new Error(`Failed to put DynamoDB item: ${error.message}`);
  }
}

/**
 * Updates item in DynamoDB table
 * @param {string} tableName - DynamoDB table name
 * @param {Object} key - Item key
 * @param {Object} updateParams - Update parameters
 * @returns {Promise<Object>} Updated item attributes
 */
async function updateDynamoDBItem(tableName, key, updateParams) {
  try {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      ...updateParams,
      ReturnValues: 'ALL_NEW'
    });

    const response = await docClient.send(command);
    return response.Attributes;
  } catch (error) {
    throw new Error(`Failed to update DynamoDB item: ${error.message}`);
  }
}

/**
 * Deletes item from DynamoDB table
 * @param {string} tableName - DynamoDB table name
 * @param {Object} key - Item key
 * @returns {Promise<void>}
 */
async function deleteDynamoDBItem(tableName, key) {
  try {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key
    });

    await docClient.send(command);
  } catch (error) {
    throw new Error(`Failed to delete DynamoDB item: ${error.message}`);
  }
}

/**
 * Scans DynamoDB table with pagination support
 * @param {string} tableName - DynamoDB table name
 * @param {Object} scanParams - Scan parameters
 * @returns {Promise<Array>} Scan results
 */
async function scanDynamoDB(tableName, scanParams = {}) {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      ...scanParams
    });

    const response = await docClient.send(command);
    return response.Items || [];
  } catch (error) {
    throw new Error(`Failed to scan DynamoDB: ${error.message}`);
  }
}

/**
 * SECRETS MANAGER OPERATIONS
 */

/**
 * Retrieves secret from AWS Secrets Manager with caching
 * @param {string} secretName - Secret name or ARN
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Secret value (parsed JSON)
 */
async function getSecret(secretName, forceRefresh = false) {
  const cacheKey = secretName;
  const cached = secretsCache.get(cacheKey);

  // Return cached value if valid and not forcing refresh
  if (!forceRefresh && cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await secretsClient.send(command);
    const secretValue = JSON.parse(response.SecretString);

    // Cache the secret
    secretsCache.set(cacheKey, {
      value: secretValue,
      timestamp: Date.now()
    });

    return secretValue;
  } catch (error) {
    throw new Error(`Failed to get secret: ${error.message}`);
  }
}

/**
 * Gets specific secret key with fallback
 * @param {string} secretName - Secret name
 * @param {string} key - Secret key to retrieve
 * @param {string} fallback - Fallback value if key not found
 * @returns {Promise<string>} Secret key value
 */
async function getSecretKey(secretName, key, fallback = null) {
  try {
    const secrets = await getSecret(secretName);
    return secrets[key] || fallback;
  } catch (error) {
    if (fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

/**
 * LAMBDA OPERATIONS
 */

/**
 * Invokes another Lambda function
 * @param {string} functionName - Lambda function name
 * @param {Object} payload - Payload to send
 * @param {string} invocationType - Invocation type (RequestResponse, Event, DryRun)
 * @returns {Promise<Object>} Lambda response
 */
async function invokeLambda(functionName, payload, invocationType = 'RequestResponse') {
  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: invocationType,
      Payload: JSON.stringify(payload)
    });

    const response = await lambdaClient.send(command);
    
    if (response.Payload) {
      const payloadString = Buffer.from(response.Payload).toString();
      return JSON.parse(payloadString);
    }
    
    return { statusCode: response.StatusCode };
  } catch (error) {
    throw new Error(`Failed to invoke Lambda: ${error.message}`);
  }
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Executes operation with retry logic and exponential backoff
 * @param {Function} operation - Operation to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} Operation result
 */
async function executeWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.name === 'ValidationException' || error.name === 'AccessDenied') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Generates consistent resource names with environment prefix
 * @param {string} resourceType - Type of resource (table, bucket, function)
 * @param {string} name - Resource name
 * @returns {string} Full resource name
 */
export function getResourceName(resourceType, name) {
  const environment = process.env.ENVIRONMENT || 'dev';
  const prefix = process.env.RESOURCE_PREFIX || 'automated-video-pipeline';
  
  return `${prefix}-${environment}-${resourceType}-${name}`;
}

/**
 * Validates AWS service configuration
 * @returns {Object} Configuration validation result
 */
export function validateAWSConfig() {
  const requiredEnvVars = [
    'AWS_REGION',
    'S3_BUCKET',
    'CONTEXT_TABLE'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  return {
    valid: missing.length === 0,
    missingVariables: missing,
    region: process.env.AWS_REGION,
    bucket: process.env.S3_BUCKET,
    contextTable: process.env.CONTEXT_TABLE
  };
}
//
 Export all functions
module.exports = {
  uploadToS3,
  downloadFromS3,
  listS3Objects,
  deleteFromS3,
  queryDynamoDB,
  putDynamoDBItem,
  updateDynamoDBItem,
  deleteDynamoDBItem,
  scanDynamoDB,
  getSecret,
  getSecretKey,
  invokeLambda,
  executeWithRetry,
  validateEnvironment
};