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

    // CloudWatch Dashboard removed for cost optimization
    // Use CloudWatch Logs Insights and basic metrics instead
    // Custom dashboard costs ~$3/month - not essential for MVP

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
  }
}