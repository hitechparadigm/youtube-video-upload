/**
 * AWS CDK Stack for EventBridge Scheduling and Cost Tracking
 * 
 * This stack creates the infrastructure for:
 * 1. EventBridge Scheduler Lambda Function
 * 2. Cost Tracker Lambda Function
 * 3. Supporting DynamoDB tables
 * 4. EventBridge rules and targets
 * 5. CloudWatch monitoring and SNS alerts
 */

import { Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Function, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Alarm, Metric, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { join } from 'path';

export class SchedulingCostStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const environment = props.environment || 'production';
    const projectName = 'automated-video-pipeline';

    // Get shared utilities layer from existing stack
    const sharedUtilitiesLayer = LayerVersion.fromLayerVersionArn(
      this,
      'SharedUtilitiesLayer',
      props.sharedUtilitiesLayerArn
    );

    // ========================================
    // DynamoDB Tables
    // ========================================

    // Cost Tracking Table
    const costTrackingTable = new Table(this, 'CostTrackingTable', {
      tableName: 'automated-video-pipeline-costs',
      partitionKey: { name: 'costId', type: AttributeType.STRING },
      sortKey: { name: 'timestamp', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true
    });

    // Add GSI for project-based queries
    costTrackingTable.addGlobalSecondaryIndex({
      indexName: 'ProjectIndex',
      partitionKey: { name: 'projectId', type: AttributeType.STRING },
      sortKey: { name: 'timestamp', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });

    // Add GSI for service-based queries
    costTrackingTable.addGlobalSecondaryIndex({
      indexName: 'ServiceIndex',
      partitionKey: { name: 'service', type: AttributeType.STRING },
      sortKey: { name: 'timestamp', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });

    // Add GSI for date-based queries
    costTrackingTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: { name: 'date', type: AttributeType.STRING },
      sortKey: { name: 'timestamp', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });

    // Schedule Metadata Table
    const scheduleMetadataTable = new Table(this, 'ScheduleMetadataTable', {
      tableName: 'automated-video-pipeline-schedules',
      partitionKey: { name: 'topicId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // ========================================
    // SNS Topics for Alerts
    // ========================================

    // Budget Alert Topic
    const budgetAlertTopic = new Topic(this, 'BudgetAlertTopic', {
      topicName: 'automated-video-pipeline-budget-alerts',
      displayName: 'Video Pipeline Budget Alerts'
    });

    // Add email subscription (replace with actual email)
    budgetAlertTopic.addSubscription(
      new EmailSubscription(props.alertEmail || 'admin@example.com')
    );

    // Schedule Alert Topic
    const scheduleAlertTopic = new Topic(this, 'ScheduleAlertTopic', {
      topicName: 'automated-video-pipeline-schedule-alerts',
      displayName: 'Video Pipeline Schedule Alerts'
    });

    // ========================================
    // Lambda Functions
    // ========================================

    // EventBridge Scheduler Lambda
    const eventBridgeScheduler = new Function(this, 'EventBridgeScheduler', {
      functionName: `${projectName}-eventbridge-scheduler`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/eventbridge-scheduler')),
      timeout: Duration.seconds(25),
      memorySize: 512,
      layers: [sharedUtilitiesLayer],
      environment: {
        TOPICS_TABLE: props.topicsTableName || 'automated-video-pipeline-topics',
        SCHEDULE_METADATA_TABLE: scheduleMetadataTable.tableName,
        WORKFLOW_ORCHESTRATOR_ARN: props.workflowOrchestratorArn,
        AWS_ACCOUNT_ID: this.account,
        SCHEDULE_ALERT_TOPIC_ARN: scheduleAlertTopic.topicArn
      }
    });

    // Cost Tracker Lambda
    const costTracker = new Function(this, 'CostTracker', {
      functionName: `${projectName}-cost-tracker`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(join(process.cwd(), '../src/lambda/cost-tracker')),
      timeout: Duration.seconds(25),
      memorySize: 512,
      layers: [sharedUtilitiesLayer],
      environment: {
        COST_TRACKING_TABLE: costTrackingTable.tableName,
        BUDGET_ALERT_TOPIC_ARN: budgetAlertTopic.topicArn,
        SCHEDULE_ALERT_TOPIC_ARN: scheduleAlertTopic.topicArn
      }
    });

    // ========================================
    // IAM Permissions
    // ========================================

    // EventBridge Scheduler Permissions
    eventBridgeScheduler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'events:PutRule',
        'events:DeleteRule',
        'events:PutTargets',
        'events:RemoveTargets',
        'events:ListRules',
        'events:DescribeRule'
      ],
      resources: ['*']
    }));

    eventBridgeScheduler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction'
      ],
      resources: [props.workflowOrchestratorArn]
    }));

    // Grant DynamoDB permissions
    scheduleMetadataTable.grantReadWriteData(eventBridgeScheduler);
    
    // Grant SNS permissions
    scheduleAlertTopic.grantPublish(eventBridgeScheduler);

    // Cost Tracker Permissions
    costTracker.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ce:GetCostAndUsage',
        'ce:GetDimensionValues',
        'ce:GetReservationCoverage',
        'ce:GetReservationPurchaseRecommendation',
        'ce:GetReservationUtilization',
        'ce:GetUsageReport'
      ],
      resources: ['*']
    }));

    costTracker.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
      resources: ['*']
    }));

    // Grant DynamoDB permissions
    costTrackingTable.grantReadWriteData(costTracker);
    
    // Grant SNS permissions
    budgetAlertTopic.grantPublish(costTracker);

    // ========================================
    // CloudWatch Alarms
    // ========================================

    // High Cost Alarm
    const highCostAlarm = new Alarm(this, 'HighCostAlarm', {
      alarmName: 'video-pipeline-high-cost',
      alarmDescription: 'Alert when video production costs exceed threshold',
      metric: new Metric({
        namespace: 'AutomatedVideoPipeline/Costs',
        metricName: 'TotalCost',
        statistic: 'Sum'
      }),
      threshold: 5.0, // $5.00 threshold
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    highCostAlarm.addAlarmAction(new SnsAction(budgetAlertTopic));

    // Schedule Failure Alarm
    const scheduleFailureAlarm = new Alarm(this, 'ScheduleFailureAlarm', {
      alarmName: 'video-pipeline-schedule-failures',
      alarmDescription: 'Alert when scheduled video generation fails',
      metric: eventBridgeScheduler.metricErrors({
        period: Duration.minutes(5)
      }),
      threshold: 3,
      evaluationPeriods: 2
    });

    scheduleFailureAlarm.addAlarmAction(new SnsAction(scheduleAlertTopic));

    // ========================================
    // EventBridge Rules for Monitoring
    // ========================================

    // Daily cost report rule
    const dailyCostReportRule = new Rule(this, 'DailyCostReportRule', {
      ruleName: 'daily-cost-report',
      description: 'Generate daily cost reports',
      schedule: Schedule.cron({ hour: '9', minute: '0' }) // 9 AM daily
    });

    dailyCostReportRule.addTarget(new LambdaFunction(costTracker));

    // Weekly schedule optimization rule
    const weeklyOptimizationRule = new Rule(this, 'WeeklyOptimizationRule', {
      ruleName: 'weekly-schedule-optimization',
      description: 'Optimize schedules based on performance data',
      schedule: Schedule.cron({ weekDay: '1', hour: '8', minute: '0' }) // Monday 8 AM
    });

    weeklyOptimizationRule.addTarget(new LambdaFunction(eventBridgeScheduler));

    // ========================================
    // Outputs
    // ========================================

    this.eventBridgeSchedulerFunction = eventBridgeScheduler;
    this.costTrackerFunction = costTracker;
    this.costTrackingTable = costTrackingTable;
    this.scheduleMetadataTable = scheduleMetadataTable;
    this.budgetAlertTopic = budgetAlertTopic;
    this.scheduleAlertTopic = scheduleAlertTopic;
  }
}