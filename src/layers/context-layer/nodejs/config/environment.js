/**
 * Configuration Helper
 * Centralized configuration management for Lambda functions
 */

export const getEnvironmentConfig = () => ({
  aws: {
    region: process.env.AWS_REGION || 'us-east-1'
  },
  tables: {
    topics: process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics',
    scripts: process.env.SCRIPTS_TABLE_NAME || 'automated-video-pipeline-scripts',
    audio: process.env.AUDIO_TABLE_NAME || 'automated-video-pipeline-audio',
    videos: process.env.VIDEOS_TABLE_NAME || 'automated-video-pipeline-videos',
    trends: process.env.TRENDS_TABLE_NAME || 'automated-video-pipeline-trends'
  },
  s3: {
    bucket: process.env.S3_BUCKET_NAME || `automated-video-pipeline-${process.env.AWS_ACCOUNT_ID || '123456789012'}-${process.env.AWS_REGION || 'us-east-1'}`
  },
  ai: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    region: process.env.BEDROCK_MODEL_REGION || 'us-east-1',
    temperature: parseFloat(process.env.BEDROCK_MODEL_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.BEDROCK_MODEL_MAX_TOKENS || '4000')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

export const getTableName = (tableName) => {
  const config = getEnvironmentConfig();
  return config.tables[tableName] || `automated-video-pipeline-${tableName}`;
};
