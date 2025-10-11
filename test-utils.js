/**
 * 🛠️ TEST UTILITIES
 * Common functions for real pipeline testing
 */

import AWS from 'aws-sdk';

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export const lambda = new AWS.Lambda();
export const s3 = new AWS.S3();
export const dynamodb = new AWS.DynamoDB.DocumentClient();

// Test configuration
export const TEST_CONFIG = {
  s3Bucket: 'automated-video-pipeline-v2-786673323159-us-east-1',
  contextTable: 'automated-video-pipeline-context-v2',
  region: 'us-east-1'
};

/**
 * Invoke Lambda function with error handling
 */
export async function invokeLambdaFunction(functionName, payload, timeout = 120000) {
  try {
    console.log(`🔄 Invoking ${functionName}...`);
    
    const result = await lambda.invoke({
      FunctionName: functionName,
      Payload: JSON.stringify(payload)
    }).promise();
    
    const response = JSON.parse(result.Payload);
    
    if (result.FunctionError) {
      throw new Error(`Lambda error: ${result.FunctionError} - ${JSON.stringify(response)}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Lambda invocation failed for ${functionName}:`, error.message);
    throw error;
  }
}

/**
 * Check if S3 file exists and get metadata
 */
export async function checkS3File(bucket, key) {
  try {
    const result = await s3.headObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    return {
      exists: true,
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType
    };
  } catch (error) {
    if (error.code === 'NotFound') {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * List S3 files with prefix
 */
export async function listS3Files(bucket, prefix) {
  try {
    const result = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix
    }).promise();
    
    return result.Contents || [];
  } catch (error) {
    console.error(`❌ Error listing S3 files:`, error.message);
    return [];
  }
}

/**
 * Download S3 file content
 */
export async function downloadS3File(bucket, key) {
  try {
    const result = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    return {
      content: result.Body.toString(),
      contentType: result.ContentType,
      size: result.ContentLength
    };
  } catch (error) {
    console.error(`❌ Error downloading S3 file ${key}:`, error.message);
    throw error;
  }
}

/**
 * Verify project folder structure in S3
 */
export async function verifyProjectStructure(projectId) {
  const expectedFolders = [
    '01-context/',
    '02-script/',
    '03-media/',
    '04-audio/',
    '05-video/',
    '06-metadata/'
  ];
  
  const results = {};
  
  for (const folder of expectedFolders) {
    const prefix = `videos/${projectId}/${folder}`;
    const files = await listS3Files(TEST_CONFIG.s3Bucket, prefix);
    results[folder] = {
      exists: files.length > 0,
      fileCount: files.length,
      files: files.map(f => ({
        key: f.Key,
        size: f.Size,
        lastModified: f.LastModified
      }))
    };
  }
  
  return results;
}

/**
 * Generate test project ID
 */
export function generateTestProjectId(topic) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const topicSlug = topic.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  
  return `${timestamp}_${topicSlug}`;
}

/**
 * Wait for specified time
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Validate JSON content
 */
export function validateJSON(content, requiredFields = []) {
  try {
    const parsed = JSON.parse(content);
    
    const missing = requiredFields.filter(field => !parsed[field]);
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        data: parsed
      };
    }
    
    return {
      valid: true,
      data: parsed
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`
    };
  }
}