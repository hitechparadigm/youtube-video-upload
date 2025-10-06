/**
 * Cost Tracking Utility for Automated Video Pipeline
 * 
 * This utility tracks the cost of generating each video by monitoring:
 * - AWS service usage (Lambda, Fargate, S3, DynamoDB, Bedrock, Polly, etc.)
 * - External API calls and estimated costs
 * - Resource consumption metrics
 * - Time-based cost calculations
 * 
 * Usage:
 * 1. Initialize cost tracker at the start of video generation
 * 2. Log service usage throughout the pipeline
 * 3. Calculate final costs when video is complete
 * 4. Store detailed cost breakdown in DynamoDB
 */

import { DynamoDB } from 'aws-sdk';

export interface ServiceUsage {
  serviceName: string;
  resourceType: string;
  quantity: number;
  unit: string;
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface CostBreakdown {
  totalCost: number;
  serviceBreakdown: {
    lambda: number;
    fargate: number;
    s3: number;
    dynamodb: number;
    bedrock: number;
    polly: number;
    transcribe: number;
    rekognition: number;
    externalApis: number;
  };
  resourceUsage: {
    lambdaInvocations: number;
    lambdaDurationMs: number;
    fargateTaskDurationMs: number;
    s3StorageBytes: number;
    s3Requests: number;
    dynamodbReadUnits: number;
    dynamodbWriteUnits: number;
    bedrockTokensUsed: number;
    pollyCharactersProcessed: number;
    transcribeMinutesProcessed: number;
    rekognitionImagesAnalyzed: number;
  };
}

/**
 * AWS Service Pricing (US East 1 - as of 2025)
 * These prices are used for cost estimation and should be updated regularly
 */
const AWS_PRICING = {
  lambda: {
    requestCost: 0.0000002, // $0.20 per 1M requests
    gbSecondCost: 0.0000166667, // $0.0000166667 per GB-second
  },
  fargate: {
    cpuPerSecond: 0.00001133, // $0.04048 per vCPU per hour / 3600
    memoryPerSecond: 0.00000124, // $0.004445 per GB per hour / 3600
  },
  s3: {
    standardStorage: 0.023, // $0.023 per GB per month
    putRequest: 0.0005, // $0.0005 per 1000 PUT requests
    getRequest: 0.0004, // $0.0004 per 1000 GET requests
  },
  dynamodb: {
    onDemandRead: 0.25, // $0.25 per million read request units
    onDemandWrite: 1.25, // $1.25 per million write request units
    storage: 0.25, // $0.25 per GB per month
  },
  bedrock: {
    claude3Sonnet: {
      inputTokens: 0.003, // $3 per 1M input tokens
      outputTokens: 0.015, // $15 per 1M output tokens
    },
  },
  polly: {
    standardVoice: 4.00, // $4.00 per 1M characters
    neuralVoice: 16.00, // $16.00 per 1M characters
  },
  transcribe: {
    standard: 0.024, // $0.024 per minute
  },
  rekognition: {
    imageAnalysis: 0.001, // $0.001 per image
  },
};

/**
 * External API Cost Estimates
 * These are rough estimates based on typical API pricing
 */
const EXTERNAL_API_COSTS = {
  googleTrends: 0.001, // Estimated $0.001 per request
  twitter: 0.002, // Estimated $0.002 per request
  youtube: 0.001, // Estimated $0.001 per request
  pexels: 0.0, // Free tier
  pixabay: 0.0, // Free tier
  news: 0.005, // Estimated $0.005 per request
};

export class CostTracker {
  private videoId: string;
  private startTime: Date;
  private serviceUsages: ServiceUsage[] = [];
  private dynamodb: DynamoDB.DocumentClient;
  private costTableName: string;

  constructor(videoId: string) {
    this.videoId = videoId;
    this.startTime = new Date();
    this.dynamodb = new DynamoDB.DocumentClient();
    this.costTableName = process.env.COST_TRACKING_TABLE_NAME || 'automated-video-cost-tracking';
  }

  /**
   * Initialize cost tracking for a new video
   */
  async initializeTracking(): Promise<void> {
    const initialRecord = {
      PK: `COST#${this.getDateString()}`,
      SK: `DETAIL#${this.videoId}`,
      videoId: this.videoId,
      startTime: this.startTime.toISOString(),
      status: 'tracking',
      serviceUsages: [],
      createdAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    };

    await this.dynamodb.put({
      TableName: this.costTableName,
      Item: initialRecord,
    }).promise();
  }

  /**
   * Log Lambda function usage
   */
  logLambdaUsage(functionName: string, durationMs: number, memoryMb: number): void {
    this.serviceUsages.push({
      serviceName: 'lambda',
      resourceType: 'execution',
      quantity: 1,
      unit: 'invocation',
      startTime: new Date(),
      metadata: {
        functionName,
        durationMs,
        memoryMb,
        gbSeconds: (memoryMb / 1024) * (durationMs / 1000),
      },
    });
  }

  /**
   * Log Fargate task usage
   */
  logFargateUsage(taskArn: string, durationMs: number, cpuUnits: number, memoryMb: number): void {
    this.serviceUsages.push({
      serviceName: 'fargate',
      resourceType: 'task',
      quantity: durationMs,
      unit: 'milliseconds',
      startTime: new Date(),
      metadata: {
        taskArn,
        cpuUnits,
        memoryMb,
        cpuSeconds: (cpuUnits / 1024) * (durationMs / 1000),
        memoryGbSeconds: (memoryMb / 1024) * (durationMs / 1000),
      },
    });
  }

  /**
   * Log S3 usage
   */
  logS3Usage(operation: 'put' | 'get' | 'storage', quantity: number, sizeBytes?: number): void {
    this.serviceUsages.push({
      serviceName: 's3',
      resourceType: operation,
      quantity,
      unit: operation === 'storage' ? 'bytes' : 'requests',
      startTime: new Date(),
      metadata: {
        sizeBytes: sizeBytes || 0,
      },
    });
  }

  /**
   * Log DynamoDB usage
   */
  logDynamoDBUsage(operation: 'read' | 'write', requestUnits: number): void {
    this.serviceUsages.push({
      serviceName: 'dynamodb',
      resourceType: operation,
      quantity: requestUnits,
      unit: 'request-units',
      startTime: new Date(),
    });
  }

  /**
   * Log Bedrock usage
   */
  logBedrockUsage(modelId: string, inputTokens: number, outputTokens: number): void {
    this.serviceUsages.push({
      serviceName: 'bedrock',
      resourceType: 'model-invocation',
      quantity: inputTokens + outputTokens,
      unit: 'tokens',
      startTime: new Date(),
      metadata: {
        modelId,
        inputTokens,
        outputTokens,
      },
    });
  }

  /**
   * Log Polly usage
   */
  logPollyUsage(characters: number, voiceType: 'standard' | 'neural'): void {
    this.serviceUsages.push({
      serviceName: 'polly',
      resourceType: 'synthesis',
      quantity: characters,
      unit: 'characters',
      startTime: new Date(),
      metadata: {
        voiceType,
      },
    });
  }

  /**
   * Log external API usage
   */
  logExternalApiUsage(apiName: string, requestCount: number): void {
    this.serviceUsages.push({
      serviceName: 'external-api',
      resourceType: apiName,
      quantity: requestCount,
      unit: 'requests',
      startTime: new Date(),
    });
  }

  /**
   * Calculate total costs based on logged usage
   */
  calculateCosts(): CostBreakdown {
    const breakdown: CostBreakdown = {
      totalCost: 0,
      serviceBreakdown: {
        lambda: 0,
        fargate: 0,
        s3: 0,
        dynamodb: 0,
        bedrock: 0,
        polly: 0,
        transcribe: 0,
        rekognition: 0,
        externalApis: 0,
      },
      resourceUsage: {
        lambdaInvocations: 0,
        lambdaDurationMs: 0,
        fargateTaskDurationMs: 0,
        s3StorageBytes: 0,
        s3Requests: 0,
        dynamodbReadUnits: 0,
        dynamodbWriteUnits: 0,
        bedrockTokensUsed: 0,
        pollyCharactersProcessed: 0,
        transcribeMinutesProcessed: 0,
        rekognitionImagesAnalyzed: 0,
      },
    };

    for (const usage of this.serviceUsages) {
      switch (usage.serviceName) {
        case 'lambda':
          breakdown.serviceBreakdown.lambda += this.calculateLambdaCost(usage);
          breakdown.resourceUsage.lambdaInvocations += 1;
          breakdown.resourceUsage.lambdaDurationMs += usage.metadata?.durationMs || 0;
          break;

        case 'fargate':
          breakdown.serviceBreakdown.fargate += this.calculateFargateCost(usage);
          breakdown.resourceUsage.fargateTaskDurationMs += usage.quantity;
          break;

        case 's3':
          breakdown.serviceBreakdown.s3 += this.calculateS3Cost(usage);
          if (usage.resourceType === 'storage') {
            breakdown.resourceUsage.s3StorageBytes += usage.quantity;
          } else {
            breakdown.resourceUsage.s3Requests += usage.quantity;
          }
          break;

        case 'dynamodb':
          breakdown.serviceBreakdown.dynamodb += this.calculateDynamoDBCost(usage);
          if (usage.resourceType === 'read') {
            breakdown.resourceUsage.dynamodbReadUnits += usage.quantity;
          } else {
            breakdown.resourceUsage.dynamodbWriteUnits += usage.quantity;
          }
          break;

        case 'bedrock':
          breakdown.serviceBreakdown.bedrock += this.calculateBedrockCost(usage);
          breakdown.resourceUsage.bedrockTokensUsed += usage.quantity;
          break;

        case 'polly':
          breakdown.serviceBreakdown.polly += this.calculatePollyCost(usage);
          breakdown.resourceUsage.pollyCharactersProcessed += usage.quantity;
          break;

        case 'external-api':
          breakdown.serviceBreakdown.externalApis += this.calculateExternalApiCost(usage);
          break;
      }
    }

    breakdown.totalCost = Object.values(breakdown.serviceBreakdown).reduce((sum, cost) => sum + cost, 0);
    return breakdown;
  }

  /**
   * Finalize cost tracking and save to DynamoDB
   */
  async finalizeCostTracking(): Promise<CostBreakdown> {
    const endTime = new Date();
    const costBreakdown = this.calculateCosts();
    const totalDurationMs = endTime.getTime() - this.startTime.getTime();

    const finalRecord = {
      PK: `COST#${this.getDateString()}`,
      SK: `DETAIL#${this.videoId}`,
      videoId: this.videoId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDurationMs,
      status: 'completed',
      costBreakdown,
      serviceUsages: this.serviceUsages,
      costPerMinute: costBreakdown.totalCost / (totalDurationMs / 60000),
      updatedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    };

    await this.dynamodb.put({
      TableName: this.costTableName,
      Item: finalRecord,
    }).promise();

    // Update daily summary
    await this.updateDailySummary(costBreakdown);

    return costBreakdown;
  }

  /**
   * Calculate Lambda costs
   */
  private calculateLambdaCost(usage: ServiceUsage): number {
    const requestCost = AWS_PRICING.lambda.requestCost;
    const gbSecondCost = AWS_PRICING.lambda.gbSecondCost * (usage.metadata?.gbSeconds || 0);
    return requestCost + gbSecondCost;
  }

  /**
   * Calculate Fargate costs
   */
  private calculateFargateCost(usage: ServiceUsage): number {
    const cpuCost = AWS_PRICING.fargate.cpuPerSecond * (usage.metadata?.cpuSeconds || 0);
    const memoryCost = AWS_PRICING.fargate.memoryPerSecond * (usage.metadata?.memoryGbSeconds || 0);
    return cpuCost + memoryCost;
  }

  /**
   * Calculate S3 costs
   */
  private calculateS3Cost(usage: ServiceUsage): number {
    if (usage.resourceType === 'storage') {
      // Storage cost per month, prorated for actual usage time
      const gbMonths = (usage.quantity / (1024 ** 3)) * (1 / (30 * 24 * 60 * 60 * 1000)); // Convert to GB-months
      return AWS_PRICING.s3.standardStorage * gbMonths;
    } else if (usage.resourceType === 'put') {
      return AWS_PRICING.s3.putRequest * (usage.quantity / 1000);
    } else if (usage.resourceType === 'get') {
      return AWS_PRICING.s3.getRequest * (usage.quantity / 1000);
    }
    return 0;
  }

  /**
   * Calculate DynamoDB costs
   */
  private calculateDynamoDBCost(usage: ServiceUsage): number {
    if (usage.resourceType === 'read') {
      return AWS_PRICING.dynamodb.onDemandRead * (usage.quantity / 1000000);
    } else if (usage.resourceType === 'write') {
      return AWS_PRICING.dynamodb.onDemandWrite * (usage.quantity / 1000000);
    }
    return 0;
  }

  /**
   * Calculate Bedrock costs
   */
  private calculateBedrockCost(usage: ServiceUsage): number {
    const inputTokens = usage.metadata?.inputTokens || 0;
    const outputTokens = usage.metadata?.outputTokens || 0;
    
    const inputCost = AWS_PRICING.bedrock.claude3Sonnet.inputTokens * (inputTokens / 1000000);
    const outputCost = AWS_PRICING.bedrock.claude3Sonnet.outputTokens * (outputTokens / 1000000);
    
    return inputCost + outputCost;
  }

  /**
   * Calculate Polly costs
   */
  private calculatePollyCost(usage: ServiceUsage): number {
    const isNeural = usage.metadata?.voiceType === 'neural';
    const pricePerMillion = isNeural ? AWS_PRICING.polly.neuralVoice : AWS_PRICING.polly.standardVoice;
    return pricePerMillion * (usage.quantity / 1000000);
  }

  /**
   * Calculate external API costs
   */
  private calculateExternalApiCost(usage: ServiceUsage): number {
    const apiName = usage.resourceType as keyof typeof EXTERNAL_API_COSTS;
    const costPerRequest = EXTERNAL_API_COSTS[apiName] || 0;
    return costPerRequest * usage.quantity;
  }

  /**
   * Update daily cost summary
   */
  private async updateDailySummary(costBreakdown: CostBreakdown): Promise<void> {
    const dateString = this.getDateString();
    
    try {
      // Get existing daily summary
      const existingSummary = await this.dynamodb.get({
        TableName: this.costTableName,
        Key: {
          PK: `COST#${dateString}`,
          SK: 'SUMMARY',
        },
      }).promise();

      const currentSummary = existingSummary.Item || {
        PK: `COST#${dateString}`,
        SK: 'SUMMARY',
        date: dateString,
        totalDailyCost: 0,
        videosGenerated: 0,
        costBreakdownByService: {
          lambda: 0,
          fargate: 0,
          s3: 0,
          dynamodb: 0,
          bedrock: 0,
          polly: 0,
          transcribe: 0,
          rekognition: 0,
          externalApis: 0,
        },
        createdAt: Date.now(),
      };

      // Update summary with new video costs
      currentSummary.totalDailyCost += costBreakdown.totalCost;
      currentSummary.videosGenerated += 1;
      currentSummary.averageCostPerVideo = currentSummary.totalDailyCost / currentSummary.videosGenerated;
      
      // Update service breakdown
      Object.keys(costBreakdown.serviceBreakdown).forEach(service => {
        currentSummary.costBreakdownByService[service] += costBreakdown.serviceBreakdown[service as keyof typeof costBreakdown.serviceBreakdown];
      });

      currentSummary.monthlyProjection = currentSummary.totalDailyCost * 30; // Simple projection
      currentSummary.updatedAt = Date.now();

      await this.dynamodb.put({
        TableName: this.costTableName,
        Item: currentSummary,
      }).promise();

    } catch (error) {
      console.error('Error updating daily cost summary:', error);
      // Don't throw - cost tracking shouldn't break the main pipeline
    }
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(): string {
    return this.startTime.toISOString().split('T')[0];
  }
}