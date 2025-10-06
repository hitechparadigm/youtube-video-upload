/**
 * Main Infrastructure Stack for Automated Video Pipeline
 * 
 * This stack creates all the AWS resources needed for the automated video
 * generation system. It sets up a serverless architecture that can:
 * 
 * 1. Accept user-defined topics for video creation
 * 2. Analyze trends from multiple sources (Google, Twitter, YouTube, News)
 * 3. Generate video scripts using AI (Amazon Bedrock)
 * 4. Acquire free media assets from stock photo/video sites
 * 5. Produce professional videos with audio and subtitles
 * 6. Publish videos to YouTube with SEO optimization
 * 7. Run on a scheduled basis (2-3 times daily)
 * 
 * The architecture is designed to be cost-effective, scalable, and maintainable.
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class AutomatedVideoPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Common tags for all resources in this stack
    const commonTags = {
      'youtube-video-upload': 'true', // Main identifier for easy filtering
      'Project': 'youtube-video-upload',
      'Service': 'automated-video-pipeline',
      'Environment': 'development',
      'ManagedBy': 'CDK',
      'CostCenter': 'video-content-creation'
    };

    // ========================================
    // STORAGE LAYER - S3 Buckets
    // ========================================
    
    /**
     * Main S3 Bucket for Video Pipeline Data
     * 
     * This bucket stores all pipeline data including:
     * - Raw trend data from APIs (partitioned by date/source)
     * - Downloaded media assets (images/videos from Pexels/Pixabay)
     * - Generated video scripts and metadata
     * - Audio files created by Amazon Polly
     * - Final rendered videos before YouTube upload
     * - Archived content for cost optimization
     */
    const videoPipelineBucket = new s3.Bucket(this, 'VideoPipelineBucket', {
      bucketName: `automated-video-pipeline-${this.account}-${this.region}`,
      
      // Enable versioning to track changes to video assets
      versioned: true,
      
      // Encrypt all data at rest using AWS managed keys
      encryption: s3.BucketEncryption.S3_MANAGED,
      
      // Block all public access for security
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      
      // Automatically delete bucket contents when stack is destroyed (dev only)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      
      // Aggressive lifecycle rules for maximum cost optimization
      lifecycleRules: [
        {
          id: 'ArchiveOldContent',
          enabled: true,
          
          // Move to cheaper storage classes faster to reduce costs
          transitions: [
            {
              // Move to IA after 7 days (was 30) - saves ~50% on storage
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7)
            },
            {
              // Move to Glacier after 30 days (was 90) - saves ~80% on storage
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              // Move to Deep Archive after 90 days - saves ~95% on storage
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(90)
            }
          ],
          
          // Delete old files after 6 months (was 1 year) to control costs
          expiration: cdk.Duration.days(180)
        },
        {
          id: 'DeleteIncompleteMultipartUploads',
          enabled: true,
          // Clean up failed uploads after 1 day to avoid charges
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1)
        }
      ],
      
      // Enable server access logging for audit purposes
      serverAccessLogsPrefix: 'access-logs/'
    });

    // Apply common tags to S3 bucket
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(videoPipelineBucket).add(key, value);
    });

    // ========================================
    // DATABASE LAYER - DynamoDB Tables
    // ========================================
    
    /**
     * Topic Configuration Table
     * 
     * Stores user-defined topics for video creation such as:
     * - "investing in real estate in Canada"
     * - "tourism trends in Europe"
     * - "economic issues in technology sector"
     * 
     * Each topic includes keywords, priority, and scheduling information.
     */
    const topicTable = new dynamodb.Table(this, 'TopicConfigurationTable', {
      tableName: 'automated-video-topics',
      
      // Partition key: TOPIC#<topicId>
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      
      // Sort key: CONFIG (allows for future expansion)
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      
      // Use on-demand billing for cost efficiency with variable workloads
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      
      // Enable point-in-time recovery for data protection
      pointInTimeRecovery: true,
      
      // Encrypt data at rest
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      
      // Auto-delete table when stack is destroyed (dev only)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // Add GSI for querying topics by priority and status
      globalSecondaryIndexes: [
        {
          indexName: 'TopicsByPriority',
          partitionKey: {
            name: 'status',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'priority',
            type: dynamodb.AttributeType.NUMBER
          }
        }
      ]
    });

    // Apply common tags to topic table
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(topicTable).add(key, value);
    });

    /**
     * Trend Data Table
     * 
     * Stores processed trend information from various sources:
     * - Google Trends API results
     * - Twitter trending topics
     * - YouTube trending videos
     * - News article analysis
     * 
     * Data is partitioned by date for efficient querying and archival.
     */
    const trendDataTable = new dynamodb.Table(this, 'TrendDataTable', {
      tableName: 'automated-video-trends',
      
      // Partition key: TREND#<date>
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      
      // Sort key: TOPIC#<topicId>#<source>
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // TTL to automatically delete old trend data after 30 days (was 90) for cost savings
      timeToLiveAttribute: 'ttl',
      
      // GSI for querying trends by topic across all dates
      globalSecondaryIndexes: [
        {
          indexName: 'TrendsByTopic',
          partitionKey: {
            name: 'topicId',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'timestamp',
            type: dynamodb.AttributeType.NUMBER
          }
        }
      ]
    });

    // Apply common tags to trend data table
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(trendDataTable).add(key, value);
    });

    /**
     * Video Production Table
     * 
     * Tracks the entire video production pipeline from script generation
     * to YouTube publishing. Stores metadata about each video including:
     * - Production status and timestamps
     * - S3 locations of assets (script, audio, video files)
     * - YouTube video URL and SEO metadata
     * - Processing metrics for performance monitoring
     * - Detailed cost tracking and resource usage metrics
     */
    const videoProductionTable = new dynamodb.Table(this, 'VideoProductionTable', {
      tableName: 'automated-video-production',
      
      // Partition key: VIDEO#<videoId>
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      
      // Sort key: METADATA (allows for future expansion with additional data types)
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // GSI for querying videos by status and creation date
      globalSecondaryIndexes: [
        {
          indexName: 'VideosByStatus',
          partitionKey: {
            name: 'status',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'createdAt',
            type: dynamodb.AttributeType.NUMBER
          }
        },
        {
          indexName: 'VideosByTopic',
          partitionKey: {
            name: 'topicId',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'createdAt',
            type: dynamodb.AttributeType.NUMBER
          }
        },
        {
          indexName: 'VideosByCost',
          partitionKey: {
            name: 'costCategory',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'totalCost',
            type: dynamodb.AttributeType.NUMBER
          }
        }
      ]
    });

    /**
     * Cost Tracking Table
     * 
     * Stores daily cost summaries and analytics for the video pipeline:
     * - Daily total costs and video counts
     * - Cost breakdown by AWS service
     * - Average cost per video trends
     * - Monthly projections and optimization suggestions
     * - Cost alerts and threshold monitoring
     */
    const costTrackingTable = new dynamodb.Table(this, 'CostTrackingTable', {
      tableName: 'automated-video-cost-tracking',
      
      // Partition key: COST#<date>
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      
      // Sort key: SUMMARY|DETAIL#<videoId>
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      
      billingMode: dynamodb.BillingMode.ON_DEMAND,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // TTL to automatically delete detailed cost data after 90 days (keep summaries longer)
      timeToLiveAttribute: 'ttl',
      
      // GSI for cost analysis and reporting
      globalSecondaryIndexes: [
        {
          indexName: 'CostsByMonth',
          partitionKey: {
            name: 'month',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'totalCost',
            type: dynamodb.AttributeType.NUMBER
          }
        },
        {
          indexName: 'CostsByService',
          partitionKey: {
            name: 'primaryService',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'serviceCost',
            type: dynamodb.AttributeType.NUMBER
          }
        }
      ]
    });

    // Apply common tags to video production table
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(videoProductionTable).add(key, value);
    });

    // Apply common tags to cost tracking table
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(costTrackingTable).add(key, value);
    });

    // ========================================
    // SECRETS MANAGEMENT
    // ========================================
    
    /**
     * API Credentials Secret
     * 
     * Stores sensitive API keys and tokens for external services:
     * - Google Trends API key
     * - Twitter API credentials (Bearer token)
     * - YouTube Data API OAuth credentials
     * - Pexels API key
     * - Pixabay API key
     * 
     * These will need to be manually populated after deployment.
     */
    const apiCredentialsSecret = new secretsmanager.Secret(this, 'ApiCredentialsSecret', {
      secretName: 'automated-video-pipeline/api-credentials',
      description: 'API keys and OAuth tokens for external services used by the video pipeline',
      
      // Generate initial empty structure - values must be added manually
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          googleTrendsApiKey: '',
          twitterBearerToken: '',
          youtubeClientId: '',
          youtubeClientSecret: '',
          youtubeRefreshToken: '',
          pexelsApiKey: '',
          pixabayApiKey: '',
          newsApiKey: ''
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\'
      }
    });

    // Apply common tags to secrets manager
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(apiCredentialsSecret).add(key, value);
    });

    // ========================================
    // NETWORKING - Use Default VPC (Cost Optimization)
    // ========================================
    
    /**
     * Use Default VPC for Cost Optimization
     * 
     * Instead of creating a new VPC with NAT Gateway (~$45/month), 
     * we use the default VPC with public subnets. This saves significant costs:
     * - No NAT Gateway charges
     * - No additional VPC charges
     * - ECS tasks run in public subnets with direct internet access
     * 
     * Security is maintained through:
     * - Security groups restricting inbound access
     * - IAM roles for AWS service access
     * - No sensitive data in containers (uses environment variables)
     */
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });

    // ========================================
    // COMPUTE LAYER - ECS Cluster for Video Processing
    // ========================================
    
    /**
     * ECS Cluster for Video Processing (Cost Optimized)
     * 
     * Runs containerized FFmpeg tasks for video assembly and processing.
     * Uses Fargate for serverless container execution - no EC2 instances
     * to manage. Tasks are triggered by Lambda functions when video
     * assembly is needed.
     * 
     * Cost optimizations:
     * - Container insights disabled to save CloudWatch costs
     * - Uses public subnets to avoid NAT Gateway charges
     * - Fargate Spot pricing will be configured in task definitions
     */
    const ecsCluster = new ecs.Cluster(this, 'VideoProcessingCluster', {
      clusterName: 'automated-video-processing',
      vpc: vpc,
      
      // Disable container insights to reduce CloudWatch costs (~$0.50/container/month)
      containerInsights: false
    });

    // Apply common tags to ECS cluster
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(ecsCluster).add(key, value);
    });

    /**
     * ECS Task Definition for Video Processing (Cost Optimized)
     * 
     * Defines the container configuration for FFmpeg video processing:
     * - Reduced CPU and memory allocation for cost savings
     * - Container image with FFmpeg and required codecs
     * - Environment variables for S3 bucket access
     * - IAM permissions for AWS service access
     * 
     * Cost optimizations:
     * - Reduced to 1 vCPU and 2GB RAM (sufficient for 5-10 min videos)
     * - Will use Fargate Spot pricing when available (up to 70% savings)
     */
    const videoProcessingTaskDefinition = new ecs.FargateTaskDefinition(this, 'VideoProcessingTaskDefinition', {
      family: 'video-processing',
      
      // Reduced resources for cost optimization - sufficient for 5-10 minute videos
      cpu: 1024, // 1 vCPU (was 2048)
      memoryLimitMiB: 2048, // 2 GB RAM (was 4096)
      
      // Task execution role for pulling container images
      executionRole: new iam.Role(this, 'VideoProcessingExecutionRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
        ]
      }),
      
      // Task role for accessing AWS services during execution
      taskRole: new iam.Role(this, 'VideoProcessingTaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        inlinePolicies: {
          S3Access: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  's3:GetObject',
                  's3:PutObject',
                  's3:DeleteObject'
                ],
                resources: [
                  videoPipelineBucket.bucketArn,
                  `${videoPipelineBucket.bucketArn}/*`
                ]
              })
            ]
          }),
          DynamoDBAccess: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'dynamodb:UpdateItem',
                  'dynamodb:GetItem'
                ],
                resources: [videoProductionTable.tableArn]
              })
            ]
          })
        }
      })
    });

    // Add container to task definition
    // Note: Container image will be built and pushed separately
    const videoProcessingContainer = videoProcessingTaskDefinition.addContainer('VideoProcessor', {
      containerName: 'video-processor',
      
      // Placeholder image - will be replaced with custom FFmpeg image
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/alpine:latest'),
      
      // Configure minimal logging to reduce CloudWatch costs
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'video-processing',
        logGroup: new logs.LogGroup(this, 'VideoProcessingLogGroup', {
          logGroupName: '/aws/ecs/video-processing',
          // Reduced retention to 3 days to minimize CloudWatch costs
          retention: logs.RetentionDays.THREE_DAYS,
          removalPolicy: cdk.RemovalPolicy.DESTROY
        })
      }),
      
      // Environment variables for S3 bucket access
      environment: {
        S3_BUCKET_NAME: videoPipelineBucket.bucketName,
        DYNAMODB_TABLE_NAME: videoProductionTable.tableName,
        AWS_DEFAULT_REGION: this.region
      }
    });

    // Apply common tags to task definition, execution role, and task role
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(videoProcessingTaskDefinition).add(key, value);
      cdk.Tags.of(videoProcessingTaskDefinition.executionRole!).add(key, value);
      cdk.Tags.of(videoProcessingTaskDefinition.taskRole).add(key, value);
    });

    // ========================================
    // MONITORING AND NOTIFICATIONS
    // ========================================
    
    /**
     * SNS Topic for System Notifications
     * 
     * Sends alerts for:
     * - Pipeline failures and errors
     * - Video processing completion
     * - YouTube upload success/failure
     * - System health issues
     */
    const notificationTopic = new sns.Topic(this, 'PipelineNotifications', {
      topicName: 'automated-video-pipeline-notifications',
      displayName: 'Automated Video Pipeline Notifications'
    });

    // Apply common tags to SNS topic
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(notificationTopic).add(key, value);
    });

    // CloudWatch Dashboard removed for cost optimization
    // Use CloudWatch Logs Insights and basic metrics instead
    // Custom dashboard costs ~$3/month - not essential for MVP

    // ========================================
    // LAMBDA FUNCTIONS - Topic Management
    // ========================================
    
    /**
     * Topic Management Lambda Function
     * 
     * Handles CRUD operations for user-defined video topics:
     * - Create new topics with keywords and scheduling
     * - List and filter topics by status
     * - Update topic configuration and priority
     * - Delete topics and manage lifecycle
     * - Track topic statistics and costs
     * 
     * Cost optimizations:
     * - 512MB memory allocation (sufficient for API operations)
     * - Integrated cost tracking for all operations
     * - Efficient DynamoDB queries with GSI usage
     */
    const topicManagementFunction = new lambda.Function(this, 'TopicManagementFunction', {
      functionName: 'automated-video-topic-management',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'topic-service.handler',
      code: lambda.Code.fromAsset('src/topic-management'),
      
      // Cost-optimized memory allocation
      memorySize: 512, // Sufficient for API operations
      timeout: cdk.Duration.seconds(30), // Reasonable timeout for CRUD operations
      
      // Environment variables for service integration
      environment: {
        TOPIC_TABLE_NAME: topicTable.tableName,
        COST_TRACKING_TABLE_NAME: costTrackingTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // Improve performance
      },
      
      // IAM permissions for DynamoDB access
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan'
          ],
          resources: [
            topicTable.tableArn,
            `${topicTable.tableArn}/index/*`, // GSI access
            costTrackingTable.tableArn,
            `${costTrackingTable.tableArn}/index/*`
          ]
        })
      ]
    });

    // Apply common tags to Lambda function
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(topicManagementFunction).add(key, value);
    });

    /**
     * Google Sheets Sync Lambda Function
     * 
     * Handles synchronization of topics from Google Sheets to DynamoDB:
     * - Reads topics from your Google Sheets document
     * - Validates and parses sheet data format
     * - Syncs with existing topics in DynamoDB
     * - Handles conflicts and merging logic
     * - Provides detailed sync reports and history
     * - Can be triggered manually or on schedule
     * 
     * Cost optimizations:
     * - 1024MB memory for Google Sheets API processing
     * - 5-minute timeout for large spreadsheets
     * - Integrated cost tracking for all operations
     */
    const sheetsSyncFunction = new lambda.Function(this, 'SheetsSyncFunction', {
      functionName: 'automated-video-sheets-sync',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'sheets-sync-handler.apiHandler',
      code: lambda.Code.fromAsset('src/topic-management'),
      
      // Higher memory for Google Sheets API processing
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5), // Allow time for large spreadsheets
      
      // Environment variables for Google Sheets integration
      environment: {
        TOPIC_TABLE_NAME: topicTable.tableName,
        COST_TRACKING_TABLE_NAME: costTrackingTable.tableName,
        GOOGLE_SHEETS_SPREADSHEET_ID: '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao', // Your spreadsheet ID
        GOOGLE_SHEETS_SHEET_NAME: 'Sheet1',
        GOOGLE_SHEETS_RANGE: 'A:F', // Topic, Keywords, Priority, Schedule Times, Status, Notes
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      
      // IAM permissions for DynamoDB and Secrets Manager access
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan'
          ],
          resources: [
            topicTable.tableArn,
            `${topicTable.tableArn}/index/*`,
            costTrackingTable.tableArn,
            `${costTrackingTable.tableArn}/index/*`
          ]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue'
          ],
          resources: [apiCredentialsSecret.secretArn]
        })
      ]
    });

    // Apply common tags to Sheets sync function
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(sheetsSyncFunction).add(key, value);
    });

    // ========================================
    // SCHEDULED SYNC - EventBridge Rule
    // ========================================
    
    /**
     * Scheduled Google Sheets Sync
     * 
     * Automatically syncs topics from Google Sheets every 15 minutes
     * to ensure the system always has the latest topic definitions.
     * 
     * Schedule can be adjusted based on your update frequency needs:
     * - Every 15 minutes: For frequent topic changes
     * - Every hour: For moderate update frequency  
     * - Every 4 hours: For infrequent updates (cost optimized)
     */
    const sheetsSyncSchedule = new events.Rule(this, 'SheetsSyncSchedule', {
      ruleName: 'automated-video-sheets-sync-schedule',
      description: 'Automatically sync topics from Google Sheets every 15 minutes',
      
      // Sync every 15 minutes (adjust as needed)
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      
      // Enable the rule (set to false to disable automatic sync)
      enabled: true
    });

    // Add the Lambda function as target for the scheduled rule
    sheetsSyncSchedule.addTarget(new targets.LambdaFunction(sheetsSyncFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'eventbridge.schedule',
        trigger: 'automatic-sync'
      })
    }));

    // Apply common tags to EventBridge rule
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(sheetsSyncSchedule).add(key, value);
    });

    // ========================================
    // API GATEWAY - REST API for Topic Management
    // ========================================
    
    /**
     * REST API Gateway for Topic Management
     * 
     * Provides HTTP endpoints for topic CRUD operations:
     * - POST /topics - Create new topic
     * - GET /topics - List topics with filtering
     * - GET /topics/{topicId} - Get specific topic
     * - PUT /topics/{topicId} - Update topic
     * - DELETE /topics/{topicId} - Delete topic
     * - GET /topics/processing/ready - Get topics ready for processing
     * 
     * Cost optimizations:
     * - Regional API (cheaper than edge-optimized)
     * - Request/response caching disabled (not needed for CRUD)
     * - Throttling configured to prevent cost spikes
     */
    const topicApi = new apigateway.RestApi(this, 'TopicManagementApi', {
      restApiName: 'automated-video-topic-api',
      description: 'API for managing video generation topics',
      
      // Use regional endpoint for cost optimization
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      },
      
      // Enable CORS for web interface access
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      },
      
      // Disable caching to reduce costs (not needed for CRUD operations)
      deployOptions: {
        cachingEnabled: false,
        throttleRateLimit: 100, // Requests per second
        throttleBurstLimit: 200, // Burst capacity
        loggingLevel: apigateway.MethodLoggingLevel.ERROR, // Minimal logging for cost
      }
    });

    // Create API resources and methods
    const topicsResource = topicApi.root.addResource('topics');
    
    // Lambda integration for all topic operations
    const topicIntegration = new apigateway.LambdaIntegration(topicManagementFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true, // Use proxy integration for simplicity
    });

    // POST /topics - Create topic
    topicsResource.addMethod('POST', topicIntegration, {
      apiKeyRequired: false, // Can be enabled later for access control
      requestValidator: new apigateway.RequestValidator(this, 'TopicCreateValidator', {
        restApi: topicApi,
        requestValidatorName: 'topic-create-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'TopicCreateModel', {
          restApi: topicApi,
          modelName: 'TopicCreateModel',
          contentType: 'application/json',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ['topic'],
            properties: {
              topic: {
                type: apigateway.JsonSchemaType.STRING,
                minLength: 10,
                maxLength: 500
              },
              keywords: {
                type: apigateway.JsonSchemaType.ARRAY,
                items: { type: apigateway.JsonSchemaType.STRING }
              },
              priority: {
                type: apigateway.JsonSchemaType.INTEGER,
                minimum: 1,
                maximum: 10
              },
              schedule: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  frequency: {
                    type: apigateway.JsonSchemaType.STRING,
                    enum: ['daily', 'weekly', 'custom']
                  },
                  times: {
                    type: apigateway.JsonSchemaType.ARRAY,
                    items: { type: apigateway.JsonSchemaType.STRING }
                  }
                }
              }
            }
          }
        })
      }
    });

    // GET /topics - List topics
    topicsResource.addMethod('GET', topicIntegration);

    // Individual topic resource
    const topicResource = topicsResource.addResource('{topicId}');
    
    // GET /topics/{topicId} - Get specific topic
    topicResource.addMethod('GET', topicIntegration);
    
    // PUT /topics/{topicId} - Update topic
    topicResource.addMethod('PUT', topicIntegration);
    
    // DELETE /topics/{topicId} - Delete topic
    topicResource.addMethod('DELETE', topicIntegration);

    // GET /topics/processing/ready - Get topics ready for processing
    const processingResource = topicsResource.addResource('processing');
    const readyResource = processingResource.addResource('ready');
    readyResource.addMethod('GET', topicIntegration);

    // ========================================
    // GOOGLE SHEETS SYNC API ENDPOINTS
    // ========================================
    
    // Create sync resource under API
    const syncResource = topicApi.root.addResource('sync');
    const sheetsResource = syncResource.addResource('sheets');
    
    // Lambda integration for Google Sheets sync
    const sheetsSyncIntegration = new apigateway.LambdaIntegration(sheetsSyncFunction, {
      proxy: true
    });

    // POST /sync/sheets - Manual sync trigger
    sheetsResource.addMethod('POST', sheetsSyncIntegration, {
      apiKeyRequired: false,
      requestValidator: new apigateway.RequestValidator(this, 'SheetsSyncValidator', {
        restApi: topicApi,
        requestValidatorName: 'sheets-sync-validator',
        validateRequestBody: false,
        validateRequestParameters: false,
      })
    });

    // GET /sync/sheets/test - Test Google Sheets connection
    const sheetsTestResource = sheetsResource.addResource('test');
    sheetsTestResource.addMethod('GET', sheetsSyncIntegration);

    // GET /sync/sheets/history - Get sync history
    const sheetsHistoryResource = sheetsResource.addResource('history');
    sheetsHistoryResource.addMethod('GET', sheetsSyncIntegration);

    // Apply common tags to API Gateway and related resources
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(topicApi).add(key, value);
    });

    // ========================================
    // OUTPUT VALUES
    // ========================================
    
    // Export important resource identifiers for use by Lambda functions
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: videoPipelineBucket.bucketName,
      description: 'S3 bucket for storing video pipeline data'
    });

    new cdk.CfnOutput(this, 'TopicTableName', {
      value: topicTable.tableName,
      description: 'DynamoDB table for topic configuration'
    });

    new cdk.CfnOutput(this, 'TrendDataTableName', {
      value: trendDataTable.tableName,
      description: 'DynamoDB table for trend data storage'
    });

    new cdk.CfnOutput(this, 'VideoProductionTableName', {
      value: videoProductionTable.tableName,
      description: 'DynamoDB table for video production tracking'
    });

    new cdk.CfnOutput(this, 'ApiCredentialsSecretArn', {
      value: apiCredentialsSecret.secretArn,
      description: 'Secrets Manager ARN for API credentials'
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: ecsCluster.clusterName,
      description: 'ECS cluster for video processing tasks'
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS topic for pipeline notifications'
    });

    new cdk.CfnOutput(this, 'CostTrackingTableName', {
      value: costTrackingTable.tableName,
      description: 'DynamoDB table for cost tracking and analytics'
    });

    new cdk.CfnOutput(this, 'TopicApiUrl', {
      value: topicApi.url,
      description: 'REST API URL for topic management'
    });

    new cdk.CfnOutput(this, 'TopicManagementFunctionName', {
      value: topicManagementFunction.functionName,
      description: 'Lambda function for topic management operations'
    });

    new cdk.CfnOutput(this, 'SheetsSyncFunctionName', {
      value: sheetsSyncFunction.functionName,
      description: 'Lambda function for Google Sheets synchronization'
    });

    new cdk.CfnOutput(this, 'GoogleSheetsSpreadsheetId', {
      value: '1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao',
      description: 'Google Sheets spreadsheet ID for topic management'
    });

    new cdk.CfnOutput(this, 'SheetsSyncApiEndpoints', {
      value: `${topicApi.url}sync/sheets`,
      description: 'API endpoints for Google Sheets sync operations'
    });
  }
}