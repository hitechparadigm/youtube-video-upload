/**
 * AWS CDK Stack for Topic Management Infrastructure
 * Deploys Lambda function, DynamoDB table, and API Gateway
 */

import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
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

    // DynamoDB Table for Topics
    const topicsTable = new Table(this, 'TopicsTable', {
      tableName: 'automated-video-pipeline-topics',
      partitionKey: {
        name: 'topicId',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN, // Protect data in production
      pointInTimeRecovery: true,
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'topic-management',
        Environment: 'production',
        CostCenter: 'content-creation',
        ManagedBy: 'cdk'
      }
    });

    // Global Secondary Index for querying by status
    topicsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'priority',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    });

    // Global Secondary Index for querying by priority
    topicsTable.addGlobalSecondaryIndex({
      indexName: 'PriorityIndex',
      partitionKey: {
        name: 'priority',
        type: AttributeType.NUMBER
      },
      sortKey: {
        name: 'updatedAt',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // Global Secondary Index for querying by topic text (for Google Sheets sync)
    topicsTable.addGlobalSecondaryIndex({
      indexName: 'TopicTextIndex',
      partitionKey: {
        name: 'topic',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // DynamoDB Table for Sync History
    const syncHistoryTable = new Table(this, 'SyncHistoryTable', {
      tableName: 'automated-video-pipeline-sync-history',
      partitionKey: {
        name: 'partitionKey',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'sync-history',
        Environment: 'production',
        CostCenter: 'content-creation',
        ManagedBy: 'cdk'
      }
    });

    // DynamoDB Table for Trend Data
    const trendsTable = new Table(this, 'TrendsTable', {
      tableName: 'automated-video-pipeline-trends',
      partitionKey: {
        name: 'partitionKey',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'sortKey',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-analysis',
        Environment: 'production',
        CostCenter: 'content-creation',
        ManagedBy: 'cdk'
      }
    });

    // GSI for querying trends by topic
    trendsTable.addGlobalSecondaryIndex({
      indexName: 'TopicIndex',
      partitionKey: {
        name: 'topic',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'collectedAt',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // GSI for querying trends by collection date
    trendsTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: {
        name: 'partitionKey',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'collectedAt',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // GSI for querying sync history by timestamp
    syncHistoryTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: {
        name: 'partitionKey',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    });

    // S3 Bucket for storing raw trend data
    const trendDataBucket = new Bucket(this, 'TrendDataBucket', {
      bucketName: `automated-video-pipeline-trends-${this.account}-${this.region}`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteOldTrendData',
          enabled: true,
          expiration: Duration.days(30) // Keep trend data for 30 days
        }
      ],
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-data-storage',
        Environment: 'production',
        CostCenter: 'content-creation',
        ManagedBy: 'cdk'
      }
    });

    // API Credentials Secret for external APIs
    const apiCredentialsSecret = new Secret(this, 'APICredentialsSecret', {
      secretName: 'automated-video-pipeline/api-credentials',
      description: 'API credentials for external services (YouTube, Twitter, News)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          youtube: {
            apiKey: 'your-youtube-api-key'
          },
          twitter: {
            bearerToken: 'your-twitter-bearer-token'
          },
          news: {
            apiKey: 'your-news-api-key'
          }
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"\\/'
      },
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'api-credentials',
        Environment: 'production'
      }
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
      code: Code.fromAsset('src/lambda/topic-management'),
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        AWS_REGION: this.region,
        NODE_ENV: 'production'
      },
      description: 'Handles CRUD operations for video topics with validation and priority scheduling',
      logGroup: logGroup,
      reservedConcurrentExecutions: 10, // Cost optimization
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'topic-management',
        Environment: 'production',
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
      code: Code.fromAsset('src/lambda/google-sheets-sync'),
      role: googleSheetsSyncRole,
      timeout: Duration.minutes(5), // Longer timeout for sync operations
      memorySize: 512, // More memory for Google Sheets API operations
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        SYNC_HISTORY_TABLE_NAME: syncHistoryTable.tableName,
        AWS_REGION: this.region,
        NODE_ENV: 'production'
      },
      description: 'Syncs topics from Google Sheets to DynamoDB with conflict resolution',
      logGroup: googleSheetsSyncLogGroup,
      reservedConcurrentExecutions: 5, // Limit concurrent executions
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
      code: Code.fromAsset('src/lambda/trend-data-collection'),
      role: trendCollectionRole,
      timeout: Duration.minutes(10), // Longer timeout for API calls
      memorySize: 1024, // More memory for data processing
      environment: {
        TRENDS_TABLE_NAME: trendsTable.tableName,
        S3_BUCKET_NAME: trendDataBucket.bucketName,
        API_CREDENTIALS_SECRET_NAME: apiCredentialsSecret.secretName,
        AWS_REGION: this.region,
        NODE_ENV: 'production'
      },
      description: 'Collects trend data from multiple sources (Google Trends, YouTube, Twitter, News)',
      logGroup: trendCollectionLogGroup,
      reservedConcurrentExecutions: 3, // Limit concurrent executions to manage API rate limits
      tags: {
        Project: 'automated-video-pipeline',
        Service: 'trend-data-collection',
        Environment: 'production',
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
    this.addOutput('TopicsTableName', {
      value: topicsTable.tableName,
      description: 'Name of the Topics DynamoDB table'
    });

    this.addOutput('TopicManagementFunctionName', {
      value: topicManagementFunction.functionName,
      description: 'Name of the Topic Management Lambda function'
    });

    this.addOutput('ApiGatewayUrl', {
      value: api.url,
      description: 'URL of the Topic Management API Gateway'
    });

    this.addOutput('ApiKeyId', {
      value: apiKey.keyId,
      description: 'ID of the API key for authentication'
    });

    this.addOutput('TrendsTableName', {
      value: trendsTable.tableName,
      description: 'Name of the Trends DynamoDB table'
    });

    this.addOutput('TrendDataBucketName', {
      value: trendDataBucket.bucketName,
      description: 'Name of the S3 bucket for trend data storage'
    });

    this.addOutput('TrendCollectionFunctionName', {
      value: trendCollectionFunction.functionName,
      description: 'Name of the Trend Data Collection Lambda function'
    });

    this.addOutput('APICredentialsSecretName', {
      value: apiCredentialsSecret.secretName,
      description: 'Name of the API credentials secret'
    });

    // Export values for other stacks
    this.topicsTable = topicsTable;
    this.topicManagementFunction = topicManagementFunction;
    this.api = api;
  }
}