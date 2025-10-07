/**
 * Enhanced Video Pipeline Infrastructure Stack
 * Includes proper descriptions, environment management, and CI/CD support
 */

import { Stack, Duration, RemovalPolicy, CfnOutput, Tags } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RestApi, LambdaIntegration, Cors, ApiKey, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { StateMachine, DefinitionBody, StateMachineType } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';
import { join } from 'path';

export class VideoPipelineStackV2 extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const environment = 'production'; // Single environment
    const projectName = 'automated-video-pipeline';
    const stackVersion = 'v3'; // New version for CI/CD

    // Add stack-level tags
    Tags.of(this).add('Project', projectName);
    Tags.of(this).add('Environment', environment);
    Tags.of(this).add('ManagedBy', 'github-actions');
    Tags.of(this).add('Version', stackVersion);

    // ========================================
    // S3 Storage Infrastructure
    // ========================================

    // Primary S3 bucket for video pipeline assets
    const primaryBucket = new Bucket(this, 'PrimaryBucket', {
      bucketName: `${projectName}-${stackVersion}-${environment}-${this.account}-${this.region}`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'AutoDeleteAfter7Days',
          enabled: true,
          expiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1)
        }
      ],
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Add bucket tags
    Tags.of(primaryBucket).add('Purpose', 'Video Pipeline Storage');
    Tags.of(primaryBucket).add('DataClassification', 'Internal');

    // ========================================
    // DynamoDB Tables
    // ========================================

    // Topics table
    const topicsTable = new Table(this, 'TopicsTable', {
      tableName: `${projectName}-topics-${stackVersion}-${environment}`,
      partitionKey: { name: 'topicId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true
    });

    topicsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: AttributeType.STRING },
      sortKey: { name: 'priority', type: AttributeType.NUMBER }
    });

    // Video production table
    const videosTable = new Table(this, 'VideosTable', {
      tableName: `${projectName}-production-${stackVersion}-${environment}`,
      partitionKey: { name: 'videoId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true
    });

    // Executions table for workflow tracking
    const executionsTable = new Table(this, 'ExecutionsTable', {
      tableName: `${projectName}-executions-${stackVersion}-${environment}`,
      partitionKey: { name: 'executionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Add table tags
    [topicsTable, videosTable, executionsTable].forEach(table => {
      Tags.of(table).add('Purpose', 'Video Pipeline Data');
      Tags.of(table).add('DataClassification', 'Internal');
    });

    // ========================================
    // IAM Roles and Policies
    // ========================================

    // Lambda execution role with comprehensive permissions
    const lambdaRole = new Role(this, 'LambdaExecutionRole', {
      roleName: `${projectName}-lambda-role-${stackVersion}-${environment}`,
      description: `Lambda execution role for Automated Video Pipeline (${environment})`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
      ]
    });

    // Add comprehensive permissions
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        // S3 permissions
        's3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket',
        // DynamoDB permissions
        'dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem',
        'dynamodb:Query', 'dynamodb:Scan',
        // Secrets Manager permissions
        'secretsmanager:GetSecretValue',
        // Bedrock permissions
        'bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream',
        // Polly permissions
        'polly:SynthesizeSpeech',
        // Rekognition permissions
        'rekognition:DetectLabels', 'rekognition:DetectText',
        // Step Functions permissions
        'states:StartExecution', 'states:DescribeExecution', 'states:ListExecutions', 'states:StopExecution',
        // ECS permissions
        'ecs:RunTask', 'ecs:DescribeTasks', 'ecs:DescribeTaskDefinition'
      ],
      resources: ['*']
    }));

    // ========================================
    // Lambda Functions with Descriptions
    // ========================================

    // Topic Management Lambda
    const topicManagementFunction = new Function(this, 'TopicManagementFunction', {
      functionName: `${projectName}-topic-management-${stackVersion}-${environment}`,
      description: `Topic Management service for Automated Video Pipeline (${environment}) - Handles CRUD operations for video topics with Google Sheets sync`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/topic-management')),
      timeout: Duration.seconds(30),
      memorySize: 256,
      role: lambdaRole,
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        S3_BUCKET_NAME: primaryBucket.bucketName,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Script Generator Lambda
    const scriptGeneratorFunction = new Function(this, 'ScriptGeneratorFunction', {
      functionName: `${projectName}-script-generator-${stackVersion}-${environment}`,
      description: `AI Script Generator for Automated Video Pipeline (${environment}) - Creates engaging video scripts using Claude 3 Sonnet with trend analysis`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/script-generator')),
      timeout: Duration.minutes(5),
      memorySize: 1024,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
        BEDROCK_MODEL_REGION: this.region,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Media Curator Lambda
    const mediaCuratorFunction = new Function(this, 'MediaCuratorFunction', {
      functionName: `${projectName}-media-curator-${stackVersion}-${environment}`,
      description: `Media Curator for Automated Video Pipeline (${environment}) - Searches and downloads relevant media from Pexels/Pixabay with AI relevance scoring`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/media-curator')),
      timeout: Duration.minutes(10),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        MEDIA_SECRET_NAME: `${projectName}/media-credentials`,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Audio Generator Lambda
    const audioGeneratorFunction = new Function(this, 'AudioGeneratorFunction', {
      functionName: `${projectName}-audio-generator-${stackVersion}-${environment}`,
      description: `Audio Generator for Automated Video Pipeline (${environment}) - Converts scripts to high-quality speech using Amazon Polly Neural voices`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/audio-generator')),
      timeout: Duration.minutes(5),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Video Assembler Lambda
    const videoAssemblerFunction = new Function(this, 'VideoAssemblerFunction', {
      functionName: `${projectName}-video-assembler-${stackVersion}-${environment}`,
      description: `Video Assembler for Automated Video Pipeline (${environment}) - Combines media assets with audio using FFmpeg processing on ECS Fargate`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/video-assembler')),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        ECS_CLUSTER_NAME: `${projectName}-cluster-${environment}`,
        ECS_TASK_DEFINITION: 'video-processor-task',
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // YouTube Publisher Lambda
    const youtubePublisherFunction = new Function(this, 'YouTubePublisherFunction', {
      functionName: `${projectName}-youtube-publisher-${stackVersion}-${environment}`,
      description: `YouTube Publisher for Automated Video Pipeline (${environment}) - Uploads videos to YouTube with SEO-optimized metadata and thumbnails`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/youtube-publisher')),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        YOUTUBE_SECRET_NAME: `${projectName}/youtube-credentials`,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Workflow Orchestrator Lambda
    const workflowOrchestratorFunction = new Function(this, 'WorkflowOrchestratorFunction', {
      functionName: `${projectName}-workflow-orchestrator-${stackVersion}-${environment}`,
      description: `Workflow Orchestrator for Automated Video Pipeline (${environment}) - Manages Step Functions executions and provides API endpoints for pipeline control`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/workflow-orchestrator')),
      timeout: Duration.minutes(5),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        EXECUTIONS_TABLE_NAME: executionsTable.tableName,
        TOPICS_TABLE_NAME: topicsTable.tableName,
        NODE_ENV: environment,
        ENVIRONMENT: environment,
        STACK_VERSION: stackVersion
      }
    });

    // Add function tags
    [topicManagementFunction, scriptGeneratorFunction, mediaCuratorFunction, 
     audioGeneratorFunction, videoAssemblerFunction, youtubePublisherFunction, 
     workflowOrchestratorFunction].forEach(func => {
      Tags.of(func).add('Purpose', 'Video Pipeline Processing');
      Tags.of(func).add('Runtime', 'Node.js 20.x');
    });

    // ========================================
    // Step Functions State Machine
    // ========================================

    // Step Functions role
    const stepFunctionsRole = new Role(this, 'StepFunctionsRole', {
      roleName: `${projectName}-stepfunctions-role-${stackVersion}-${environment}`,
      description: `Step Functions execution role for Automated Video Pipeline (${environment})`,
      assumedBy: new ServicePrincipal('states.amazonaws.com')
    });

    stepFunctionsRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        scriptGeneratorFunction.functionArn,
        mediaCuratorFunction.functionArn,
        audioGeneratorFunction.functionArn,
        videoAssemblerFunction.functionArn,
        youtubePublisherFunction.functionArn
      ]
    }));

    // Read and process state machine definition
    const stateMachineDefinition = readFileSync(
      join(process.cwd(), '../src/step-functions/video-pipeline-workflow.json'),
      'utf8'
    );

    const processedDefinition = stateMachineDefinition
      .replace(/automated-video-pipeline-trend-analyzer/g, scriptGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-script-generator/g, scriptGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-media-curator/g, mediaCuratorFunction.functionArn)
      .replace(/automated-video-pipeline-audio-generator/g, audioGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-video-assembler/g, videoAssemblerFunction.functionArn)
      .replace(/automated-video-pipeline-youtube-publisher/g, youtubePublisherFunction.functionArn);

    // Create the state machine
    const stateMachine = new StateMachine(this, 'VideoPipelineStateMachine', {
      stateMachineName: `${projectName}-state-machine-${stackVersion}-${environment}`,
      comment: `Automated Video Pipeline State Machine (${environment}) - Orchestrates end-to-end video generation from topic to YouTube upload`,
      definitionBody: DefinitionBody.fromString(processedDefinition),
      role: stepFunctionsRole,
      stateMachineType: StateMachineType.STANDARD
    });

    // Update workflow orchestrator with state machine ARN
    workflowOrchestratorFunction.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);

    // ========================================
    // API Gateway
    // ========================================

    // Create REST API
    const api = new RestApi(this, 'VideoPipelineAPI', {
      restApiName: `${projectName}-api-${stackVersion}-${environment}`,
      description: `REST API for Automated Video Pipeline (${environment}) - Provides endpoints for topic management and workflow control`,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // API Key and Usage Plan
    const apiKey = new ApiKey(this, 'VideoPipelineApiKey', {
      apiKeyName: `${projectName}-api-key-${stackVersion}-${environment}`,
      description: `API Key for Video Pipeline (${environment})`
    });

    const usagePlan = new UsagePlan(this, 'VideoPipelineUsagePlan', {
      name: `${projectName}-usage-plan-${stackVersion}-${environment}`,
      description: `Usage plan for Video Pipeline API (${environment})`,
      throttle: {
        rateLimit: 1000,
        burstLimit: 2000
      },
      quota: {
        limit: 100000,
        period: 'MONTH'
      }
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage
    });

    // API Resources and Methods (same as before but with new functions)
    const topicsResource = api.root.addResource('topics');
    topicsResource.addMethod('GET', new LambdaIntegration(topicManagementFunction), { apiKeyRequired: true });
    topicsResource.addMethod('POST', new LambdaIntegration(topicManagementFunction), { apiKeyRequired: true });

    const topicResource = topicsResource.addResource('{topicId}');
    topicResource.addMethod('GET', new LambdaIntegration(topicManagementFunction), { apiKeyRequired: true });
    topicResource.addMethod('PUT', new LambdaIntegration(topicManagementFunction), { apiKeyRequired: true });
    topicResource.addMethod('DELETE', new LambdaIntegration(topicManagementFunction), { apiKeyRequired: true });

    // Workflow endpoints
    const workflowResource = api.root.addResource('workflow');
    workflowResource.addResource('start').addMethod('POST', new LambdaIntegration(workflowOrchestratorFunction), { apiKeyRequired: true });
    workflowResource.addResource('status').addMethod('GET', new LambdaIntegration(workflowOrchestratorFunction), { apiKeyRequired: true });
    workflowResource.addResource('list').addMethod('GET', new LambdaIntegration(workflowOrchestratorFunction), { apiKeyRequired: true });
    workflowResource.addResource('stats').addMethod('GET', new LambdaIntegration(workflowOrchestratorFunction), { apiKeyRequired: true });

    // Video endpoints
    const videoResource = api.root.addResource('video');
    videoResource.addResource('assemble').addMethod('POST', new LambdaIntegration(videoAssemblerFunction), { apiKeyRequired: true });
    videoResource.addResource('publish').addMethod('POST', new LambdaIntegration(youtubePublisherFunction), { apiKeyRequired: true });

    // ========================================
    // EventBridge Scheduling
    // ========================================

    const dailySchedule = new Rule(this, 'DailyVideoGeneration', {
      ruleName: `${projectName}-daily-schedule-${environment}`,
      description: `Daily video generation trigger for Automated Video Pipeline (${environment})`,
      schedule: Schedule.cron({ hour: '10', minute: '0' }) // 10 AM UTC daily
    });

    dailySchedule.addTarget(new LambdaFunction(workflowOrchestratorFunction, {
      event: {
        source: 'aws.events',
        detail: {
          scheduleName: 'daily-video-generation',
          frequency: 'daily',
          environment: environment
        }
      }
    }));

    // ========================================
    // Outputs
    // ========================================

    new CfnOutput(this, 'Environment', {
      value: environment,
      description: 'Deployment environment'
    });

    new CfnOutput(this, 'StackVersion', {
      value: stackVersion,
      description: 'Stack version'
    });

    new CfnOutput(this, 'PrimaryBucketName', {
      value: primaryBucket.bucketName,
      description: 'Primary S3 bucket for video assets'
    });

    new CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL'
    });

    new CfnOutput(this, 'APIKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID for authentication'
    });

    new CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN'
    });

    new CfnOutput(this, 'TopicsTableName', {
      value: topicsTable.tableName,
      description: 'DynamoDB topics table name'
    });

    new CfnOutput(this, 'VideosTableName', {
      value: videosTable.tableName,
      description: 'DynamoDB videos table name'
    });

    new CfnOutput(this, 'LambdaFunctions', {
      value: JSON.stringify({
        topicManagement: topicManagementFunction.functionName,
        scriptGenerator: scriptGeneratorFunction.functionName,
        mediaCurator: mediaCuratorFunction.functionName,
        audioGenerator: audioGeneratorFunction.functionName,
        videoAssembler: videoAssemblerFunction.functionName,
        youtubePublisher: youtubePublisherFunction.functionName,
        workflowOrchestrator: workflowOrchestratorFunction.functionName
      }),
      description: 'Lambda function names'
    });
  }
}