/**
 * Google Sheets Sync Lambda Handler
 * 
 * This Lambda function handles synchronization of topics from Google Sheets
 * to the DynamoDB topic table. It can be triggered:
 * - Manually via API call
 * - On a schedule (e.g., every 15 minutes)
 * - Via EventBridge when sheet changes are detected
 * 
 * Features:
 * - Reads topics from your Google Sheets document
 * - Validates and parses sheet data
 * - Syncs with existing topics in DynamoDB
 * - Handles conflicts and merging
 * - Provides detailed sync reports
 * - Tracks costs and performance
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, ScheduledEvent } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { GoogleSheetsService, createGoogleSheetsService } from './google-sheets-service';
import { TopicService, Topic } from './topic-service';
import { CostTracker } from '../shared/cost-tracker';

interface SyncReport {
  success: boolean;
  timestamp: string;
  spreadsheetId: string;
  totalRowsProcessed: number;
  topicsCreated: number;
  topicsUpdated: number;
  topicsSkipped: number;
  errors: string[];
  processingTimeMs: number;
  cost: number;
}

export class SheetsSyncHandler {
  private sheetsService: GoogleSheetsService;
  private topicService: TopicService;
  private dynamodb: DynamoDB.DocumentClient;
  private costTracker: CostTracker;

  constructor(costTracker?: CostTracker) {
    this.costTracker = costTracker || new CostTracker('sheets-sync');
    this.sheetsService = createGoogleSheetsService(this.costTracker);
    this.topicService = new TopicService(this.costTracker);
    this.dynamodb = new DynamoDB.DocumentClient();
  }

  /**
   * Main sync function - reads from Google Sheets and updates DynamoDB
   */
  async syncTopics(): Promise<SyncReport> {
    const startTime = Date.now();
    
    const report: SyncReport = {
      success: false,
      timestamp: new Date().toISOString(),
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      totalRowsProcessed: 0,
      topicsCreated: 0,
      topicsUpdated: 0,
      topicsSkipped: 0,
      errors: [],
      processingTimeMs: 0,
      cost: 0
    };

    try {
      console.log('Starting Google Sheets sync...');

      // Test connection first
      const connectionTest = await this.sheetsService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Cannot connect to Google Sheets: ${connectionTest.error}`);
      }

      console.log(`Connected to spreadsheet: ${connectionTest.spreadsheetTitle}`);

      // Sync topics from sheets
      const syncResult = await this.sheetsService.syncTopicsFromSheet();
      report.totalRowsProcessed = syncResult.totalRows;
      report.errors = syncResult.errors;

      if (syncResult.validTopics === 0) {
        console.log('No valid topics found in spreadsheet');
        report.success = true;
        return report;
      }

      // Get existing topics from DynamoDB
      const existingTopics = await this.getExistingTopicsFromSheets();
      
      // Process each topic from sheets
      const sheetTopics = await this.getTopicsFromSyncResult(syncResult);
      
      for (const sheetTopic of sheetTopics) {
        try {
          const existingTopic = existingTopics.find(t => 
            t.source === 'google_sheets' && 
            t.sourceMetadata?.rowIndex === sheetTopic.sourceMetadata?.rowIndex
          );

          if (existingTopic) {
            // Update existing topic if content has changed
            if (this.hasTopicChanged(existingTopic, sheetTopic)) {
              await this.topicService.updateTopic(existingTopic.topicId, {
                topic: sheetTopic.topic,
                keywords: sheetTopic.keywords,
                priority: sheetTopic.priority,
                schedule: sheetTopic.schedule,
                status: sheetTopic.status
              });
              report.topicsUpdated++;
              console.log(`Updated topic: ${sheetTopic.topic}`);
            } else {
              report.topicsSkipped++;
            }
          } else {
            // Create new topic
            await this.topicService.createTopic({
              topic: sheetTopic.topic,
              keywords: sheetTopic.keywords,
              priority: sheetTopic.priority,
              schedule: sheetTopic.schedule
            });
            report.topicsCreated++;
            console.log(`Created topic: ${sheetTopic.topic}`);
          }
        } catch (error) {
          const errorMsg = `Failed to process topic "${sheetTopic.topic}": ${error.message}`;
          report.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Archive topics that are no longer in the sheet
      await this.archiveRemovedTopics(existingTopics, sheetTopics);

      report.success = true;
      console.log('Google Sheets sync completed successfully');

    } catch (error) {
      const errorMsg = `Sync failed: ${error.message}`;
      report.errors.push(errorMsg);
      console.error(errorMsg);
    } finally {
      report.processingTimeMs = Date.now() - startTime;
      
      // Finalize cost tracking
      const costBreakdown = await this.costTracker.finalizeCostTracking();
      report.cost = costBreakdown.totalCost;

      // Store sync report in DynamoDB for history
      await this.storeSyncReport(report);
    }

    return report;
  }

  /**
   * Get existing topics that came from Google Sheets
   */
  private async getExistingTopicsFromSheets(): Promise<Topic[]> {
    const result = await this.topicService.listTopics();
    return result.topics.filter(topic => topic.source === 'google_sheets');
  }

  /**
   * Convert sync result to Topic objects (placeholder - would use actual conversion)
   */
  private async getTopicsFromSyncResult(syncResult: any): Promise<Topic[]> {
    // This would be implemented to convert the sync result to Topic objects
    // For now, returning empty array as placeholder
    return [];
  }

  /**
   * Check if topic content has changed
   */
  private hasTopicChanged(existing: Topic, updated: Topic): boolean {
    return (
      existing.topic !== updated.topic ||
      JSON.stringify(existing.keywords.sort()) !== JSON.stringify(updated.keywords.sort()) ||
      existing.priority !== updated.priority ||
      JSON.stringify(existing.schedule) !== JSON.stringify(updated.schedule) ||
      existing.status !== updated.status
    );
  }

  /**
   * Archive topics that were removed from the sheet
   */
  private async archiveRemovedTopics(existingTopics: Topic[], sheetTopics: Topic[]): Promise<void> {
    const sheetRowIndexes = new Set(
      sheetTopics.map(t => t.sourceMetadata?.rowIndex).filter(Boolean)
    );

    for (const existingTopic of existingTopics) {
      const rowIndex = existingTopic.sourceMetadata?.rowIndex;
      if (rowIndex && !sheetRowIndexes.has(rowIndex)) {
        // Topic was removed from sheet, archive it
        await this.topicService.updateTopic(existingTopic.topicId, {
          status: 'archived'
        });
        console.log(`Archived removed topic: ${existingTopic.topic}`);
      }
    }
  }

  /**
   * Store sync report in DynamoDB for history tracking
   */
  private async storeSyncReport(report: SyncReport): Promise<void> {
    try {
      const item = {
        PK: `SYNC#${report.timestamp.split('T')[0]}`, // SYNC#2025-01-15
        SK: `SHEETS#${report.timestamp}`,
        ...report,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
      };

      await this.dynamodb.put({
        TableName: process.env.TOPIC_TABLE_NAME || 'automated-video-topics',
        Item: item
      }).promise();

      this.costTracker.logDynamoDBUsage('write', 1);
    } catch (error) {
      console.error('Failed to store sync report:', error);
      // Don't throw - sync report storage failure shouldn't break the main sync
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(days: number = 7): Promise<SyncReport[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      const result = await this.dynamodb.query({
        TableName: process.env.TOPIC_TABLE_NAME || 'automated-video-topics',
        KeyConditionExpression: 'PK BETWEEN :startKey AND :endKey AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':startKey': `SYNC#${startDate.toISOString().split('T')[0]}`,
          ':endKey': `SYNC#${new Date().toISOString().split('T')[0]}`,
          ':skPrefix': 'SHEETS#'
        },
        ScanIndexForward: false, // Most recent first
        Limit: 50
      }).promise();

      return (result.Items || []).map(item => {
        const { PK, SK, ttl, ...report } = item;
        return report as SyncReport;
      });
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }
}

/**
 * Lambda handler for API Gateway requests
 */
export const apiHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const costTracker = new CostTracker(`sheets-sync-api-${Date.now()}`);
  await costTracker.initializeTracking();

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

  try {
    const syncHandler = new SheetsSyncHandler(costTracker);
    
    if (event.httpMethod === 'POST' && event.path === '/sync/sheets') {
      // Manual sync trigger
      const report = await syncHandler.syncTopics();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Google Sheets sync completed',
          report
        })
      };
      
    } else if (event.httpMethod === 'GET' && event.path === '/sync/sheets/history') {
      // Get sync history
      const days = parseInt(event.queryStringParameters?.days || '7');
      const history = await syncHandler.getSyncHistory(days);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          history,
          count: history.length
        })
      };
      
    } else if (event.httpMethod === 'GET' && event.path === '/sync/sheets/test') {
      // Test connection
      const sheetsService = createGoogleSheetsService(costTracker);
      const connectionTest = await sheetsService.testConnection();
      
      if (connectionTest.success) {
        const preview = await sheetsService.getSheetPreview(3);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Connection successful',
            spreadsheet: connectionTest.spreadsheetTitle,
            sheets: connectionTest.sheetNames,
            preview
          })
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Connection failed',
            details: connectionTest.error
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Sheets sync API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  } finally {
    await costTracker.finalizeCostTracking();
  }
};

/**
 * Lambda handler for scheduled events (EventBridge)
 */
export const scheduledHandler = async (event: ScheduledEvent): Promise<void> => {
  const costTracker = new CostTracker(`sheets-sync-scheduled-${Date.now()}`);
  await costTracker.initializeTracking();

  try {
    console.log('Scheduled Google Sheets sync triggered:', event);
    
    const syncHandler = new SheetsSyncHandler(costTracker);
    const report = await syncHandler.syncTopics();
    
    console.log('Scheduled sync completed:', report);
    
    // Send notification if there were errors
    if (report.errors.length > 0) {
      // TODO: Send SNS notification about sync errors
      console.warn('Sync completed with errors:', report.errors);
    }
    
  } catch (error) {
    console.error('Scheduled sync failed:', error);
    // TODO: Send SNS notification about sync failure
  } finally {
    await costTracker.finalizeCostTracking();
  }
};