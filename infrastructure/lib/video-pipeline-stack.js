/**
 * Complete Video Pipeline Infrastructure Stack
 * Deploys all components for the automated video pipeline
 */

import { Stack, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Function, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RestApi, LambdaIntegration, Cors, ApiKey, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { StateMachine, DefinitionBody, StateMachineType } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';
import { join } from 'path';

export class VideoPipelineStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const environment = props.environment || 'production';
    const projectName = 'automated-video-pipeline';

    // ========================================
    // S3 Storage Infrastructure
    // ========================================

    // Primary S3 bucket for video pipeline assets
    const primaryBucket = new Bucket(this, 'PrimaryBucket', {
      bucketName: `${projectName}-v2-${this.account}-${this.region}`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'AutoDeleteAfter7Days',
          enabled: true,
          expiration: Duration.days(7),
          abortIncompleteMultipartUploadAfter: Duration.days(1)
        }
      ],
      removalPolicy: RemovalPolicy.DESTROY // For development - change for production
    });

    // Backup bucket for cross-region replication
    const backupBucket = new Bucket(this, 'BackupBucket', {
      bucketName: `${projectName}-backup-v2-${this.account}-us-west-2`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // ========================================
    // DynamoDB Tables
    // ========================================

    // Topics table
    const topicsTable = new Table(this, 'TopicsTable', {
      tableName: `${projectName}-topics-v2`,
      partitionKey: { name: 'topicId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Add GSI for status queries
    topicsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: AttributeType.STRING },
      sortKey: { name: 'priority', type: AttributeType.NUMBER }
    });

    // Video production table
    const videosTable = new Table(this, 'VideosTable', {
      tableName: `${projectName}-production-v2`,
      partitionKey: { name: 'videoId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Executions table for workflow tracking
    const executionsTable = new Table(this, 'ExecutionsTable', {
      tableName: `${projectName}-executions-v2`,
      partitionKey: { name: 'executionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // ========================================
    // IAM Roles and Policies
    // ========================================

    // Lambda execution role with comprehensive permissions
    const lambdaRole = new Role(this, 'LambdaExecutionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' }
      ]
    });

    // Add permissions for all AWS services used
    lambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        // S3 permissions
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
        // DynamoDB permissions
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        // Secrets Manager permissions
        'secretsmanager:GetSecretValue',
        // Bedrock permissions
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        // Polly permissions
        'polly:SynthesizeSpeech',
        'polly:DescribeVoices',
        // Rekognition permissions
        'rekognition:DetectLabels',
        'rekognition:DetectText',
        // Step Functions permissions
        'states:StartExecution',
        'states:DescribeExecution',
        'states:ListExecutions',
        'states:StopExecution',
        // ECS permissions
        'ecs:RunTask',
        'ecs:DescribeTasks',
        'ecs:DescribeTaskDefinition'
      ],
      resources: ['*']
    }));

    // ========================================
    // Lambda Layers
    // ========================================

    // Configuration Layer for shared configuration management
    const configLayer = new LayerVersion(this, 'ConfigLayer', {
      layerVersionName: 'automated-video-pipeline-config',
      code: Code.fromAsset(join(process.cwd(), '../src/layers/config-layer')),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      description: 'Shared configuration management layer',
      removalPolicy: RemovalPolicy.RETAIN
    });

    // ========================================
    // Lambda Functions
    // ========================================

    // Topic Management Lambda
    const topicManagementFunction = new Function(this, 'TopicManagementFunction', {
      functionName: `${projectName}-topic-management-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/topic-management')),
      timeout: Duration.seconds(30),
      memorySize: 256,
      role: lambdaRole,
      environment: {
        TOPICS_TABLE_NAME: topicsTable.tableName,
        S3_BUCKET_NAME: primaryBucket.bucketName,
        NODE_ENV: environment
      }
    });

    // Script Generator Lambda
    const scriptGeneratorFunction = new Function(this, 'ScriptGeneratorFunction', {
      functionName: `${projectName}-script-generator-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/script-generator')),
      timeout: Duration.minutes(5),
      memorySize: 1024,
      role: lambdaRole,
      layers: [configLayer],
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
        BEDROCK_MODEL_REGION: this.region,
        NODE_ENV: environment
      }
    });

    // Media Curator Lambda
    const mediaCuratorFunction = new Function(this, 'MediaCuratorFunction', {
      functionName: `${projectName}-media-curator-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/media-curator')),
      timeout: Duration.minutes(10),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        API_KEYS_SECRET_NAME: `${projectName}/api-keys`,
        NODE_ENV: environment
      }
    });

    // Audio Generator Lambda
    const audioGeneratorFunction = new Function(this, 'AudioGeneratorFunction', {
      functionName: `${projectName}-audio-generator-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/audio-generator')),
      timeout: Duration.minutes(5),
      memorySize: 512,
      role: lambdaRole,
      layers: [configLayer],
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        NODE_ENV: environment
      }
    });

    // Video Assembler Lambda
    const videoAssemblerFunction = new Function(this, 'VideoAssemblerFunction', {
      functionName: `${projectName}-video-assembler-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/video-assembler')),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      role: lambdaRole,
      environment: {
        S3_BUCKET_NAME: primaryBucket.bucketName,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        ECS_CLUSTER_NAME: `${projectName}-cluster`,
        ECS_TASK_DEFINITION: 'video-processor-task',
        NODE_ENV: environment
      }
    });

    // YouTube Publisher Lambda
    const youtubePublisherFunction = new Function(this, 'YouTubePublisherFunction', {
      functionName: `${projectName}-youtube-publisher-v2`,
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
        NODE_ENV: environment
      }
    });

    // Workflow Orchestrator Lambda
    const workflowOrchestratorFunction = new Function(this, 'WorkflowOrchestratorFunction', {
      functionName: `${projectName}-workflow-orchestrator-v2`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/workflow-orchestrator')),
      timeout: Duration.minutes(5),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        EXECUTIONS_TABLE_NAME: executionsTable.tableName,
        TOPICS_TABLE_NAME: topicsTable.tableName,
        NODE_ENV: environment
      }
    });

    // ========================================
    // Step Functions State Machine
    // ========================================

    // Read the state machine definition
    const stateMachineDefinition = readFileSync(
      join(process.cwd(), '../src/step-functions/video-pipeline-workflow.json'),
      'utf8'
    );

    // Replace function ARNs in the definition
    const processedDefinition = stateMachineDefinition
      .replace(/automated-video-pipeline-trend-analyzer/g, scriptGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-script-generator/g, scriptGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-media-curator/g, mediaCuratorFunction.functionArn)
      .replace(/automated-video-pipeline-audio-generator/g, audioGeneratorFunction.functionArn)
      .replace(/automated-video-pipeline-video-assembler/g, videoAssemblerFunction.functionArn)
      .replace(/automated-video-pipeline-youtube-publisher/g, youtubePublisherFunction.functionArn);

    // Create Step Functions role
    const stepFunctionsRole = new Role(this, 'StepFunctionsRole', {
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

    // Create the state machine
    const stateMachine = new StateMachine(this, 'VideoPipelineStateMachine', {
      stateMachineName: `${projectName}-state-machine`,
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
      restApiName: `${projectName}-api`,
      description: 'API for Automated Video Pipeline',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // API Key and Usage Plan
    const apiKey = new ApiKey(this, 'VideoPipelineApiKey', {
      apiKeyName: `${projectName}-api-key`,
      description: 'API Key for Video Pipeline'
    });

    const usagePlan = new UsagePlan(this, 'VideoPipelineUsagePlan', {
      name: `${projectName}-usage-plan`,
      description: 'Usage plan for Video Pipeline API',
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

    // API Resources and Methods
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

    // Media endpoints
    const mediaResource = api.root.addResource('media');
    mediaResource.addResource('search').addMethod('POST', new LambdaIntegration(mediaCuratorFunction), { apiKeyRequired: true });
    mediaResource.addResource('curate').addMethod('POST', new LambdaIntegration(mediaCuratorFunction), { apiKeyRequired: true });

    // Video endpoints
    const videoResource = api.root.addResource('video');
    videoResource.addResource('assemble').addMethod('POST', new LambdaIntegration(videoAssemblerFunction), { apiKeyRequired: true });
    videoResource.addResource('publish').addMethod('POST', new LambdaIntegration(youtubePublisherFunction), { apiKeyRequired: true });

    // ========================================
    // EventBridge Scheduling
    // ========================================

    // Daily video generation schedule
    const dailySchedule = new Rule(this, 'DailyVideoGeneration', {
      ruleName: `${projectName}-daily-schedule`,
      description: 'Trigger daily video generation',
      schedule: Schedule.cron({ hour: '10', minute: '0' }) // 10 AM UTC daily
    });

    dailySchedule.addTarget(new LambdaFunction(workflowOrchestratorFunction));

    // ========================================
    // ECS Cluster for Video Processing
    // Note: ECS cluster will be created separately when needed
    // For now, video assembly uses Lambda with processing instructions
    // ========================================

    // ========================================
    // Outputs
    // ========================================

    this.addOutput('PrimaryBucketName', {
      value: primaryBucket.bucketName,
      description: 'Primary S3 bucket for video assets'
    });

    this.addOutput('APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL'
    });

    this.addOutput('APIKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID for authentication'
    });

    this.addOutput('StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN'
    });

    this.addOutput('TopicsTableName', {
      value: topicsTable.tableName,
      description: 'DynamoDB topics table name'
    });

    this.addOutput('VideosTableName', {
      value: videosTable.tableName,
      description: 'DynamoDB videos table name'
    });
  }

  addOutput(id, props) {
    new CfnOutput(this, id, props);
  }
}

