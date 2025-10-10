/**
 * AWS Clients Factory
 * Centralized AWS client creation with consistent configuration
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { LambdaClient } from '@aws-sdk/client-lambda';

const DEFAULT_REGION = process.env.AWS_REGION || 'us-east-1';

export const createAWSClients = (region = DEFAULT_REGION) => {
  const dynamoClient = new DynamoDBClient({ region });
  
  return {
    dynamodb: dynamoClient,
    docClient: DynamoDBDocumentClient.from(dynamoClient),
    s3: new S3Client({ region }),
    lambda: new LambdaClient({ region })
  };
};

export const getTableName = (tableName) => 
  process.env[`${tableName.toUpperCase()}_TABLE_NAME`] || 
  `automated-video-pipeline-${tableName}`;
