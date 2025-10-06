/**
 * AWS CDK Stack for Topic Management Infrastructure
 * Deploys Lambda function, DynamoDB table, and API Gateway
 */

import { Stack, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Function, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { RestApi, LambdaIntegration, Cors, ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class TopicManagementStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Import existing DynamoDB Tables
    const topicsTable = Table.fromTableName(this, 'TopicsTable', 'automated-video-pipeline-topics');
    const syncHistoryTable = Table.fromTableName(this, 'SyncHistoryTable', 'automated-video-pipeline-sync-history');
    const trendsTable = Table.fromTableName(this, 'TrendsTable', 'automated-video-pipeline-trends');

    // Create Processed Trends Table for normalized and scored data
    const processedTrendsTable = new Table(this, 'ProcessedTrendsTable', {
      tableName: 'automated-video-pipeline-processed-trends',
      partitionKey: {
        name: 'processedId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'processedAt',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      },
      timeToLiveAttribute: 'ttl',
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-processing',
        Environment: 'production',
        CostCenter: 'content-creation',
        ManagedBy: 'cdk'
      }
    });

    // Add GSI for querying by category and score
    processedTrendsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryScoreIndex',
      partitionKey: {
        name: 'category',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'normalizedScore',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    });

    // Add GSI for querying by source and timestamp
    processedTrendsTable.addGlobalSecondaryIndex({
      indexName: 'SourceTimeIndex',
      partitionKey: {
        name: 'source',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'processedAt',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // Import existing S3 Bucket
    const trendDataBucket = Bucket.fromBucketName(this, 'TrendDataBucket', `automated-video-pipeline-${this.account}-${this.region}`);

    // Import existing API Credentials Secret
    const apiCredentialsSecret = Secret.fromSecretNameV2(this, 'APICredentialsSecret', 'automated-video-pipeline/api-credentials');

    // Configuration Layer for shared configuration management
    const configLayer = new LayerVersion(this, 'ConfigLayer', {
      layerVersionName: 'automated-video-pipeline-config',
      code: Code.fromAsset('../src/layers/config-layer'),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      description: 'Shared configuration management layer',
      removalPolicy: RemovalPolicy.RETAIN
    });

    // IAM Role for Lambda function
    const lambdaRole = new Role(this, 'TopicManagementLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Topic Management Lambda function',
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });

    // Add DynamoDB permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [
        topicsTable.tableArn,
        `${topicsTable.tableArn}/index/*`
      ]
    }));



    // IAM Role for Google Sheets Sync Lambda
    const googleSheetsSyncRole = new Role(this, 'GoogleSheetsSyncLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Google Sheets Sync Lambda function',
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });

    // Add permissions for Google Sheets Sync Lambda
    googleSheetsSyncRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [
        topicsTable.tableArn,
        `${topicsTable.tableArn}/index/*`,
        syncHistoryTable.tableArn,
        `${syncHistoryTable.tableArn}/index/*`
      ]
    }));

    // IAM Role for Trend Data Collection Lambda
    const trendCollectionRole = new Role(this, 'TrendCollectionLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Trend Data Collection Lambda function',
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });

    // Add permissions for Trend Collection Lambda
    trendCollectionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:Query',
        'dynamodb:GetItem'
      ],
      resources: [
        trendsTable.tableArn,
        `${trendsTable.tableArn}/index/*`
      ]
    }));

    trendCollectionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl'
      ],
      resources: [
        `${trendDataBucket.bucketArn}/*`
      ]
    }));

    trendCollectionRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue'
      ],
      resources: [
        apiCredentialsSecret.secretArn
      ]
    }));

    // IAM Role for AI Topic Generator Lambda
    const aiTopicGeneratorRole = new Role(this, 'AITopicGeneratorLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for AI Topic Generator Lambda function',
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });

    // Add permissions for AI Topic Generator Lambda
    aiTopicGeneratorRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [
        topicsTable.tableArn,
        `${topicsTable.tableArn}/index/*`,
        trendsTable.tableArn,
        `${trendsTable.tableArn}/index/*`
      ]
    }));

    aiTopicGeneratorRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel'
      ],
      resources: [
        // Support multiple Claude models
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-instant-v1',
        // Support other model families if needed
        'arn:aws:bedrock:*::foundation-model/amazon.titan-text-*',
        'arn:aws:bedrock:*::foundation-model/ai21.j2-*'
      ]
    }));

    // IAM Role for Trend Data Processor Lambda
    const trendDataProcessorRole = new Role(this, 'TrendDataProcessorLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Trend Data Processor Lambda function',
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        }
      ]
    });

    // Add permissions for Trend Data Processor Lambda
    trendDataProcessorRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchWriteItem'
      ],
      resources: [
        trendsTable.tableArn,
        `${trendsTable.tableArn}/index/*`,
        processedTrendsTable.tableArn,
        `${processedTrendsTable.tableArn}/index/*`
      ]
    }));

    trendDataProcessorRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject'
      ],
      resources: [
        `${trendDataBucket.bucketArn}/*`
      ]
    }));

    // CloudWatch Log Group
    const logGroup = new LogGroup(this, 'TopicManagementLogGroup', {
      logGroupName: '/aws/lambda/topic-management',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Lambda Function
    const topicManagementFunction = new Function(this, 'TopicManagementFunction', {
      functionName: 'topic-management',
      runtime: Runtime.NODEJS_20_X, // Using Node.js 20.x as required
      handler: 'index.handler',
      code: Code.fromAsset('../src/lambda/topic-management'),
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
      layers: [configLayer],
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        NODE_ENV: process.env.NODE_ENV || 'production',
        CONFIG_SECRET_NAME: process.env.CONFIG_SECRET_NAME || '',
        // Configurable environment variables
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        BEDROCK_MODEL_REGION: process.env.BEDROCK_MODEL_REGION || 'us-east-1',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
      },
      description: 'Handles CRUD operations for video topics with validation and priority scheduling',
      logGroup: logGroup,
      // reservedConcurrentExecutions: 10, // Removed due to account limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'topic-management',
        Environment: process.env.NODE_ENV || 'production',
        Runtime: 'nodejs20.x'
      }
    });

    // Google Sheets Sync Lambda Log Group
    const googleSheetsSyncLogGroup = new LogGroup(this, 'GoogleSheetsSyncLogGroup', {
      logGroupName: '/aws/lambda/google-sheets-sync',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Google Sheets Sync Lambda Function
    const googleSheetsSyncFunction = new Function(this, 'GoogleSheetsSyncFunction', {
      functionName: 'google-sheets-sync',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('../src/lambda/google-sheets-sync'),
      role: googleSheetsSyncRole,
      timeout: Duration.minutes(5), // Longer timeout for sync operations
      memorySize: 512, // More memory for Google Sheets API operations
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        SYNC_HISTORY_TABLE_NAME: syncHistoryTable.tableName,
        NODE_ENV: 'production'
      },
      description: 'Syncs topics from Google Sheets to DynamoDB with conflict resolution',
      logGroup: googleSheetsSyncLogGroup,
      // reservedConcurrentExecutions: 5, // Removed due to account limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'google-sheets-sync',
        Environment: 'production',
        Runtime: 'nodejs20.x'
      }
    });

    // Trend Data Collection Lambda Log Group
    const trendCollectionLogGroup = new LogGroup(this, 'TrendCollectionLogGroup', {
      logGroupName: '/aws/lambda/trend-data-collection',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Trend Data Collection Lambda Function
    const trendCollectionFunction = new Function(this, 'TrendCollectionFunction', {
      functionName: 'trend-data-collection',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('../src/lambda/trend-data-collection'),
      role: trendCollectionRole,
      timeout: Duration.minutes(10), // Longer timeout for API calls
      memorySize: 1024, // More memory for data processing
      environment: {
        TRENDS_TABLE_NAME: trendsTable.tableName,
        S3_BUCKET_NAME: trendDataBucket.bucketName,
        API_CREDENTIALS_SECRET_NAME: apiCredentialsSecret.secretName,
        NODE_ENV: 'production'
      },
      description: 'Collects trend data from multiple sources (Google Trends, YouTube, Twitter, News)',
      logGroup: trendCollectionLogGroup,
      // reservedConcurrentExecutions: 3, // Removed due to account limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-data-collection',
        Environment: 'production',
        Runtime: 'nodejs20.x'
      }
    });

    // AI Topic Generator Lambda Log Group
    const aiTopicGeneratorLogGroup = new LogGroup(this, 'AITopicGeneratorLogGroup', {
      logGroupName: '/aws/lambda/ai-topic-generator',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // AI Topic Generator Lambda Function
    const aiTopicGeneratorFunction = new Function(this, 'AITopicGeneratorFunction', {
      functionName: 'ai-topic-generator',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('../src/lambda/ai-topic-generator'),
      role: aiTopicGeneratorRole,
      timeout: Duration.minutes(5), // Longer timeout for AI processing
      memorySize: 1024, // More memory for AI model invocation
      layers: [configLayer],
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        TRENDS_TABLE_NAME: trendsTable.tableName,
        NODE_ENV: process.env.NODE_ENV || 'production',
        CONFIG_SECRET_NAME: process.env.CONFIG_SECRET_NAME || '',
        // Configurable AI settings
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        BEDROCK_MODEL_REGION: process.env.BEDROCK_MODEL_REGION || 'us-east-1',
        BEDROCK_MODEL_TEMPERATURE: process.env.BEDROCK_MODEL_TEMPERATURE || '0.7',
        BEDROCK_MODEL_MAX_TOKENS: process.env.BEDROCK_MODEL_MAX_TOKENS || '4000',
        // Content generation settings
        CONTENT_FREQUENCY: process.env.CONTENT_FREQUENCY || '2',
        MIN_ENGAGEMENT_SCORE: process.env.MIN_ENGAGEMENT_SCORE || '6.0',
        // Monitoring settings
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
      },
      description: 'AI-powered topic generation using Amazon Bedrock for trend analysis and content creation',
      logGroup: aiTopicGeneratorLogGroup,
      // reservedConcurrentExecutions: 2, // Removed due to account limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'ai-topic-generator',
        Environment: process.env.NODE_ENV || 'production',
        Runtime: 'nodejs20.x'
      }
    });

    // Trend Data Processor Lambda Log Group
    const trendDataProcessorLogGroup = new LogGroup(this, 'TrendDataProcessorLogGroup', {
      logGroupName: '/aws/lambda/trend-data-processor',
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Trend Data Processor Lambda Function
    const trendDataProcessorFunction = new Function(this, 'TrendDataProcessorFunction', {
      functionName: 'trend-data-processor',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('../src/lambda/trend-data-processor'),
      role: trendDataProcessorRole,
      timeout: Duration.minutes(10), // Longer timeout for data processing
      memorySize: 1536, // More memory for data processing operations
      layers: [configLayer],
      environment: {
        TRENDS_TABLE_NAME: trendsTable.tableName,
        PROCESSED_TRENDS_TABLE_NAME: processedTrendsTable.tableName,
        S3_BUCKET_NAME: trendDataBucket.bucketName,
        NODE_ENV: process.env.NODE_ENV || 'production',
        CONFIG_SECRET_NAME: process.env.CONFIG_SECRET_NAME || '',
        // Processing settings
        PROCESSING_BATCH_SIZE: process.env.PROCESSING_BATCH_SIZE || '100',
        MAX_PROCESSING_TIME: process.env.MAX_PROCESSING_TIME || '300',
        // Scoring settings
        SCORING_ALGORITHM: process.env.SCORING_ALGORITHM || 'weighted_composite',
        HIGH_SCORE_THRESHOLD: process.env.HIGH_SCORE_THRESHOLD || '80',
        // Monitoring settings
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
      },
      description: 'Processes and normalizes trend data with scoring and aggregation capabilities',
      logGroup: trendDataProcessorLogGroup,
      // reservedConcurrentExecutions: 3, // Removed due to account limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-data-processor',
        Environment: process.env.NODE_ENV || 'production',
        Runtime: 'nodejs20.x'
      }
    });

    // API Gateway
    const api = new RestApi(this, 'TopicManagementApi', {
      restApiName: 'Topic Management API',
      description: 'REST API for managing video topics',
      apiKeySourceType: ApiKeySourceType.HEADER,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      },
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'topic-management-api',
        Environment: 'production'
      }
    });

    // Lambda integration
    const lambdaIntegration = new LambdaIntegration(topicManagementFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
    });

    // API Resources and Methods
    const topicsResource = api.root.addResource('topics');

    // GET /topics - List all topics
    topicsResource.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // POST /topics - Create new topic
    topicsResource.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true
    });

    // Single topic resource
    const singleTopicResource = topicsResource.addResource('{topicId}');

    // GET /topics/{topicId} - Get specific topic
    singleTopicResource.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true
    });

    // PUT /topics/{topicId} - Update topic
    singleTopicResource.addMethod('PUT', lambdaIntegration, {
      apiKeyRequired: true
    });

    // DELETE /topics/{topicId} - Delete topic
    singleTopicResource.addMethod('DELETE', lambdaIntegration, {
      apiKeyRequired: true
    });

    // Google Sheets sync endpoints
    const syncResource = api.root.addResource('sync');
    const googleSheetsSyncIntegration = new LambdaIntegration(googleSheetsSyncFunction);

    // POST /sync - Trigger Google Sheets sync
    syncResource.addMethod('POST', googleSheetsSyncIntegration, {
      apiKeyRequired: true
    });

    // GET /sync/history - Get sync history
    const syncHistoryResource = syncResource.addResource('history');
    syncHistoryResource.addMethod('GET', googleSheetsSyncIntegration, {
      apiKeyRequired: true
    });

    // POST /sync/validate - Validate Google Sheets structure
    const syncValidateResource = syncResource.addResource('validate');
    syncValidateResource.addMethod('POST', googleSheetsSyncIntegration, {
      apiKeyRequired: true
    });

    // Trend data collection endpoints
    const trendsResource = api.root.addResource('trends');
    const trendCollectionIntegration = new LambdaIntegration(trendCollectionFunction);

    // POST /trends/collect - Trigger trend data collection
    const collectResource = trendsResource.addResource('collect');
    collectResource.addMethod('POST', trendCollectionIntegration, {
      apiKeyRequired: true
    });

    // GET /trends - Get trend data
    trendsResource.addMethod('GET', trendCollectionIntegration, {
      apiKeyRequired: true
    });

    // AI Topic Generator endpoints
    const aiTopicsResource = api.root.addResource('ai-topics');
    const aiTopicGeneratorIntegration = new LambdaIntegration(aiTopicGeneratorFunction);

    // POST /ai-topics/generate - Generate AI-powered topics
    const generateResource = aiTopicsResource.addResource('generate');
    generateResource.addMethod('POST', aiTopicGeneratorIntegration, {
      apiKeyRequired: true
    });

    // POST /ai-topics/analyze - Analyze trends with AI
    const analyzeResource = aiTopicsResource.addResource('analyze');
    analyzeResource.addMethod('POST', aiTopicGeneratorIntegration, {
      apiKeyRequired: true
    });

    // GET /ai-topics/suggestions - Get topic suggestions
    const suggestionsResource = aiTopicsResource.addResource('suggestions');
    suggestionsResource.addMethod('GET', aiTopicGeneratorIntegration, {
      apiKeyRequired: true
    });

    // Trend Data Processing endpoints
    const trendProcessingIntegration = new LambdaIntegration(trendDataProcessorFunction);

    // POST /trends/process - Process raw trend data
    const processResource = trendsResource.addResource('process');
    processResource.addMethod('POST', trendProcessingIntegration, {
      apiKeyRequired: true
    });

    // POST /trends/aggregate - Aggregate processed trend data
    const aggregateResource = trendsResource.addResource('aggregate');
    aggregateResource.addMethod('POST', trendProcessingIntegration, {
      apiKeyRequired: true
    });

    // GET /trends/processed - Get processed trends with filtering
    const processedResource = trendsResource.addResource('processed');
    processedResource.addMethod('GET', trendProcessingIntegration, {
      apiKeyRequired: true
    });

    // POST /trends/score - Score/rescore trend data
    const scoreResource = trendsResource.addResource('score');
    scoreResource.addMethod('POST', trendProcessingIntegration, {
      apiKeyRequired: true
    });

    // GET /trends/analytics - Get trend analytics and insights
    const analyticsResource = trendsResource.addResource('analytics');
    analyticsResource.addMethod('GET', trendProcessingIntegration, {
      apiKeyRequired: true
    });

    // API Key for authentication
    const apiKey = api.addApiKey('TopicManagementApiKey', {
      apiKeyName: 'topic-management-api-key',
      description: 'API key for topic management endpoints'
    });

    // Usage Plan
    const usagePlan = api.addUsagePlan('TopicManagementUsagePlan', {
      name: 'Topic Management Usage Plan',
      description: 'Usage plan for topic management API',
      throttle: {
        rateLimit: 100,
        burstLimit: 200
      },
      quota: {
        limit: 10000,
        period: 'MONTH'
      }
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage
    });

    // Outputs
    new CfnOutput(this, 'TopicsTableName', {
      value: topicsTable.tableName,
      description: 'Name of the Topics DynamoDB table'
    });

    new CfnOutput(this, 'TopicManagementFunctionName', {
      value: topicManagementFunction.functionName,
      description: 'Name of the Topic Management Lambda function'
    });

    new CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'URL of the Topic Management API Gateway'
    });

    new CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'ID of the API key for authentication'
    });

    new CfnOutput(this, 'TrendsTableName', {
      value: trendsTable.tableName,
      description: 'Name of the Trends DynamoDB table'
    });

    new CfnOutput(this, 'TrendDataBucketName', {
      value: trendDataBucket.bucketName,
      description: 'Name of the S3 bucket for trend data storage'
    });

    new CfnOutput(this, 'TrendCollectionFunctionName', {
      value: trendCollectionFunction.functionName,
      description: 'Name of the Trend Data Collection Lambda function'
    });

    new CfnOutput(this, 'APICredentialsSecretName', {
      value: apiCredentialsSecret.secretName,
      description: 'Name of the API credentials secret'
    });

    new CfnOutput(this, 'AITopicGeneratorFunctionName', {
      value: aiTopicGeneratorFunction.functionName,
      description: 'Name of the AI Topic Generator Lambda function'
    });

    new CfnOutput(this, 'TrendDataProcessorFunctionName', {
      value: trendDataProcessorFunction.functionName,
      description: 'Name of the Trend Data Processor Lambda function'
    });

    new CfnOutput(this, 'ProcessedTrendsTableName', {
      value: processedTrendsTable.tableName,
      description: 'Name of the Processed Trends DynamoDB table'
    });

    // Export values for other stacks
    this.topicsTable = topicsTable;
    this.topicManagementFunction = topicManagementFunction;
    this.api = api;
  }
}