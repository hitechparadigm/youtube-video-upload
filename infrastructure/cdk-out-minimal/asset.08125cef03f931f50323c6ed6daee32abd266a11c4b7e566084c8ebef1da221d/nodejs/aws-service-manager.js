/**
 * AWS Service Manager - Shared utility for AWS service operations
 * Used by all Lambda functions for consistent AWS interactions
 */

const { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Query DynamoDB table
 */
const queryDynamoDB = async (tableName, params) => {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      ...params
    });
    
    const response = await dynamoClient.send(command);
    return response.Items ? response.Items.map(item => unmarshall(item)) : [];
    
  } catch (error) {
    console.error(`❌ Error querying DynamoDB table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Put item to DynamoDB table
 */
const putDynamoDBItem = async (tableName, item, options = {}) => {
  try {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
      ...options
    });
    
    await dynamoClient.send(command);
    console.log(`✅ Put item to DynamoDB table ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Error putting item to DynamoDB table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Update item in DynamoDB table
 */
const updateDynamoDBItem = async (tableName, key, updateExpression, expressionAttributeValues) => {
  try {
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key),
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: marshall(expressionAttributeValues)
    });
    
    await dynamoClient.send(command);
    console.log(`✅ Updated item in DynamoDB table ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Error updating item in DynamoDB table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Delete item from DynamoDB table
 */
const deleteDynamoDBItem = async (tableName, key) => {
  try {
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key)
    });
    
    await dynamoClient.send(command);
    console.log(`✅ Deleted item from DynamoDB table ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Error deleting item from DynamoDB table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Scan DynamoDB table
 */
const scanDynamoDB = async (tableName, params = {}) => {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      ...params
    });
    
    const response = await dynamoClient.send(command);
    return response.Items ? response.Items.map(item => unmarshall(item)) : [];
    
  } catch (error) {
    console.error(`❌ Error scanning DynamoDB table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Upload to S3
 */
const uploadToS3 = async (bucket, key, body, contentType = 'application/octet-stream') => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    console.log(`✅ Uploaded to S3: s3://${bucket}/${key}`);
    
  } catch (error) {
    console.error(`❌ Error uploading to S3:`, error);
    throw error;
  }
};

/**
 * Download from S3
 */
const downloadFromS3 = async (bucket, key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3Client.send(command);
    return response.Body;
    
  } catch (error) {
    console.error(`❌ Error downloading from S3:`, error);
    throw error;
  }
};

/**
 * List S3 objects
 */
const listS3Objects = async (bucket, prefix = '') => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    });
    
    const response = await s3Client.send(command);
    return response.Contents || [];
    
  } catch (error) {
    console.error(`❌ Error listing S3 objects:`, error);
    throw error;
  }
};

/**
 * Get secret from Secrets Manager
 */
const getSecret = async (secretName) => {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });
    
    const response = await secretsClient.send(command);
    return JSON.parse(response.SecretString);
    
  } catch (error) {
    console.error(`❌ Error getting secret ${secretName}:`, error);
    throw error;
  }
};

/**
 * Execute function with retry logic
 */
const executeWithRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
};

module.exports = {
  queryDynamoDB,
  putDynamoDBItem,
  updateDynamoDBItem,
  deleteDynamoDBItem,
  scanDynamoDB,
  uploadToS3,
  downloadFromS3,
  listS3Objects,
  getSecret,
  executeWithRetry
};