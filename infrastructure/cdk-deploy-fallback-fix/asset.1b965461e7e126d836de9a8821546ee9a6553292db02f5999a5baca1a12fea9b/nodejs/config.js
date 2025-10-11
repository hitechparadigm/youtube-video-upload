/**
 * Configuration Layer - Shared configuration management
 * Used by Lambda functions for consistent configuration
 */

/**
 * Get environment-specific configuration
 */
const getConfig = () => {
  const environment = process.env.NODE_ENV || 'production';
  
  const baseConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    environment,
    
    // DynamoDB Tables
    topicsTable: process.env.TOPICS_TABLE_NAME,
    videosTable: process.env.VIDEOS_TABLE_NAME,
    contextTable: process.env.CONTEXT_TABLE_NAME,
    executionsTable: process.env.EXECUTIONS_TABLE_NAME,
    
    // S3 Buckets
    s3Bucket: process.env.S3_BUCKET_NAME || process.env.S3_BUCKET,
    
    // API Configuration
    bedrockModelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    
    // Timeouts
    defaultTimeout: 30000,
    bedrockTimeout: 25000,
    
    // Retry Configuration
    maxRetries: 3,
    baseRetryDelay: 1000
  };
  
  // Environment-specific overrides
  const envConfigs = {
    development: {
      defaultTimeout: 60000,
      bedrockTimeout: 45000
    },
    production: {
      defaultTimeout: 30000,
      bedrockTimeout: 25000
    }
  };
  
  return {
    ...baseConfig,
    ...(envConfigs[environment] || {})
  };
};

/**
 * Validate required configuration
 */
const validateConfig = (config, requiredFields = []) => {
  const missing = requiredFields.filter(field => !config[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  getConfig,
  validateConfig
};