/**
 * Cost Analytics and Reporting Service
 * 
 * Provides comprehensive cost analysis and reporting capabilities:
 * - Daily, weekly, and monthly cost summaries
 * - Cost per video analysis and trends
 * - Service-level cost breakdown and optimization suggestions
 * - Cost projections and budget alerts
 * - Export functionality for external analysis
 * 
 * This service helps optimize the video pipeline economics by providing
 * detailed insights into where costs are incurred and how to reduce them.
 */

import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface CostSummary {
  date: string;
  totalCost: number;
  videosGenerated: number;
  averageCostPerVideo: number;
  costBreakdownByService: Record<string, number>;
  monthlyProjection: number;
}

interface CostTrend {
  period: string;
  totalCost: number;
  videoCount: number;
  averageCost: number;
  costChange: number;
  costChangePercent: number;
}

interface OptimizationSuggestion {
  service: string;
  currentCost: number;
  potentialSavings: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export class CostAnalytics {
  private dynamodb: DynamoDB.DocumentClient;
  private costTableName: string;

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient();
    this.costTableName = process.env.COST_TRACKING_TABLE_NAME || 'automated-video-cost-tracking';
  }

  /**
   * Get daily cost summary for a specific date
   */
  async getDailyCostSummary(date: string): Promise<CostSummary | null> {
    try {
      const result = await this.dynamodb.get({
        TableName: this.costTableName,
        Key: {
          PK: `COST#${date}`,
          SK: 'SUMMARY',
        },
      }).promise();

      return result.Item as CostSummary || null;
    } catch (error) {
      console.error('Error fetching daily cost summary:', error);
      throw error;
    }
  }

  /**
   * Get cost trends over a date range
   */
  async getCostTrends(startDate: string, endDate: string): Promise<CostTrend[]> {
    try {
      const result = await this.dynamodb.query({
        TableName: this.costTableName,
        KeyConditionExpression: 'PK BETWEEN :startKey AND :endKey AND SK = :sk',
        ExpressionAttributeValues: {
          ':startKey': `COST#${startDate}`,
          ':endKey': `COST#${endDate}`,
          ':sk': 'SUMMARY',
        },
      }).promise();

      const summaries = result.Items as CostSummary[];
      const trends: CostTrend[] = [];

      for (let i = 0; i < summaries.length; i++) {
        const current = summaries[i];
        const previous = i > 0 ? summaries[i - 1] : null;

        const costChange = previous ? current.totalCost - previous.totalCost : 0;
        const costChangePercent = previous && previous.totalCost > 0 
          ? ((costChange / previous.totalCost) * 100) 
          : 0;

        trends.push({
          period: current.date,
          totalCost: current.totalCost,
          videoCount: current.videosGenerated,
          averageCost: current.averageCostPerVideo,
          costChange,
          costChangePercent,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching cost trends:', error);
      throw error;
    }
  }

  /**
   * Get detailed cost breakdown for a specific video
   */
  async getVideoCostBreakdown(videoId: string): Promise<any> {
    try {
      // Find the cost record for this video
      const result = await this.dynamodb.query({
        TableName: this.costTableName,
        IndexName: 'VideosByDate', // Assuming we have this GSI
        KeyConditionExpression: 'SK = :sk',
        FilterExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
          ':sk': `DETAIL#${videoId}`,
          ':videoId': videoId,
        },
      }).promise();

      return result.Items?.[0] || null;
    } catch (error) {
      console.error('Error fetching video cost breakdown:', error);
      throw error;
    }
  }

  /**
   * Generate cost optimization suggestions
   */
  async generateOptimizationSuggestions(dateRange: { start: string; end: string }): Promise<OptimizationSuggestion[]> {
    const trends = await this.getCostTrends(dateRange.start, dateRange.end);
    const suggestions: OptimizationSuggestion[] = [];

    if (trends.length === 0) return suggestions;

    // Calculate average costs by service
    const serviceCosts: Record<string, number[]> = {};
    trends.forEach(trend => {
      const summary = trend as any; // Type assertion for accessing costBreakdownByService
      if (summary.costBreakdownByService) {
        Object.entries(summary.costBreakdownByService).forEach(([service, cost]) => {
          if (!serviceCosts[service]) serviceCosts[service] = [];
          serviceCosts[service].push(cost as number);
        });
      }
    });

    // Generate suggestions based on cost patterns
    Object.entries(serviceCosts).forEach(([service, costs]) => {
      const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      const maxCost = Math.max(...costs);
      
      if (avgCost > 0.01) { // Only suggest for services costing more than $0.01
        switch (service) {
          case 'fargate':
            if (avgCost > 0.05) {
              suggestions.push({
                service: 'fargate',
                currentCost: avgCost,
                potentialSavings: avgCost * 0.7, // Up to 70% with Spot instances
                suggestion: 'Use Fargate Spot instances for video processing to save up to 70% on compute costs',
                priority: 'high',
              });
            }
            break;

          case 's3':
            if (avgCost > 0.02) {
              suggestions.push({
                service: 's3',
                currentCost: avgCost,
                potentialSavings: avgCost * 0.5, // 50% with lifecycle policies
                suggestion: 'Implement aggressive S3 lifecycle policies to move data to cheaper storage classes faster',
                priority: 'medium',
              });
            }
            break;

          case 'bedrock':
            if (avgCost > 0.10) {
              suggestions.push({
                service: 'bedrock',
                currentCost: avgCost,
                potentialSavings: avgCost * 0.3, // 30% with prompt optimization
                suggestion: 'Optimize Bedrock prompts to reduce token usage and consider using smaller models for simple tasks',
                priority: 'medium',
              });
            }
            break;

          case 'lambda':
            if (avgCost > 0.01) {
              suggestions.push({
                service: 'lambda',
                currentCost: avgCost,
                potentialSavings: avgCost * 0.2, // 20% with optimization
                suggestion: 'Optimize Lambda memory allocation and consider provisioned concurrency for frequently used functions',
                priority: 'low',
              });
            }
            break;
        }
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate monthly cost projection based on recent trends
   */
  async getMonthlyProjection(currentMonth: string): Promise<{
    projectedCost: number;
    projectedVideos: number;
    averageCostPerVideo: number;
    confidenceLevel: number;
  }> {
    const startDate = `${currentMonth}-01`;
    const endDate = `${currentMonth}-31`;
    
    const trends = await this.getCostTrends(startDate, endDate);
    
    if (trends.length === 0) {
      return {
        projectedCost: 0,
        projectedVideos: 0,
        averageCostPerVideo: 0,
        confidenceLevel: 0,
      };
    }

    const totalCost = trends.reduce((sum, trend) => sum + trend.totalCost, 0);
    const totalVideos = trends.reduce((sum, trend) => sum + trend.videoCount, 0);
    const daysWithData = trends.length;
    const daysInMonth = 30; // Simplified

    const projectedCost = (totalCost / daysWithData) * daysInMonth;
    const projectedVideos = Math.round((totalVideos / daysWithData) * daysInMonth);
    const averageCostPerVideo = totalVideos > 0 ? totalCost / totalVideos : 0;
    const confidenceLevel = Math.min(daysWithData / daysInMonth, 1) * 100;

    return {
      projectedCost,
      projectedVideos,
      averageCostPerVideo,
      confidenceLevel,
    };
  }
}

/**
 * Lambda handler for cost analytics API endpoints
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const costAnalytics = new CostAnalytics();
  
  try {
    const path = event.path;
    const method = event.httpMethod;
    const queryParams = event.queryStringParameters || {};

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    let response: any;

    switch (path) {
      case '/cost/daily':
        if (!queryParams.date) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Date parameter is required' }),
          };
        }
        response = await costAnalytics.getDailyCostSummary(queryParams.date);
        break;

      case '/cost/trends':
        if (!queryParams.startDate || !queryParams.endDate) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'startDate and endDate parameters are required' }),
          };
        }
        response = await costAnalytics.getCostTrends(queryParams.startDate, queryParams.endDate);
        break;

      case '/cost/video':
        if (!queryParams.videoId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'videoId parameter is required' }),
          };
        }
        response = await costAnalytics.getVideoCostBreakdown(queryParams.videoId);
        break;

      case '/cost/optimization':
        if (!queryParams.startDate || !queryParams.endDate) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'startDate and endDate parameters are required' }),
          };
        }
        response = await costAnalytics.generateOptimizationSuggestions({
          start: queryParams.startDate,
          end: queryParams.endDate,
        });
        break;

      case '/cost/projection':
        if (!queryParams.month) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'month parameter is required (YYYY-MM format)' }),
          };
        }
        response = await costAnalytics.getMonthlyProjection(queryParams.month);
        break;

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Cost analytics error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};