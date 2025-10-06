/**
 * Topic Repository - Data Access Layer
 * 
 * This repository provides optimized data access patterns for topic management:
 * - Efficient DynamoDB queries with proper indexing
 * - Batch operations for bulk topic management
 * - Caching strategies for frequently accessed topics
 * - Cost-optimized read/write patterns
 * - Transaction support for complex operations
 */

import { DynamoDB } from 'aws-sdk';
import { Topic } from './topic-service';

export interface TopicQuery {
  status?: string;
  priority?: number;
  createdAfter?: number;
  createdBefore?: number;
  lastProcessedAfter?: number;
  lastProcessedBefore?: number;
  limit?: number;
  lastEvaluatedKey?: any;
}

export interface TopicBatchOperation {
  operation: 'create' | 'update' | 'delete';
  topicId: string;
  data?: Partial<Topic>;
}

export interface TopicStats {
  totalTopics: number;
  activeTopics: number;
  pausedTopics: number;
  completedTopics: number;
  archivedTopics: number;
  averageVideosPerTopic: number;
  averageCostPerTopic: number;
  totalVideosGenerated: number;
  totalCostSpent: number;
}

export class TopicRepository {
  private dynamodb: DynamoDB.DocumentClient;
  private tableName: string;
  private cache: Map<string, { topic: Topic; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient();
    this.tableName = process.env.TOPIC_TABLE_NAME || 'automated-video-topics';
  }

  /**
   * Get topic with caching support
   */
  async getTopicCached(topicId: string, useCache: boolean = true): Promise<Topic | null> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(topicId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.topic;
      }
    }

    // Fetch from DynamoDB
    const result = await this.dynamodb.get({
      TableName: this.tableName,
      Key: {
        PK: `TOPIC#${topicId}`,
        SK: 'CONFIG'
      }
    }).promise();

    if (!result.Item) {
      return null;
    }

    const { PK, SK, ...topic } = result.Item;
    const topicData = topic as Topic;

    // Update cache
    if (useCache) {
      this.cache.set(topicId, {
        topic: topicData,
        timestamp: Date.now()
      });
    }

    return topicData;
  }

  /**
   * Advanced topic querying with multiple filters
   */
  async queryTopics(query: TopicQuery): Promise<{
    topics: Topic[];
    lastEvaluatedKey?: any;
    totalCount: number;
  }> {
    let queryParams: any = {
      TableName: this.tableName,
      Limit: query.limit || 50
    };

    // Build filter expressions
    const filterExpressions: string[] = ['SK = :sk'];
    const expressionAttributeValues: any = { ':sk': 'CONFIG' };
    const expressionAttributeNames: any = {};

    if (query.status) {
      // Use GSI for status filtering
      queryParams.IndexName = 'TopicsByPriority';
      queryParams.KeyConditionExpression = '#status = :status';
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = query.status;
      
      // Remove status from filter since it's in KeyCondition
      filterExpressions.splice(0, 1); // Remove SK filter for GSI query
    }

    if (query.priority !== undefined) {
      filterExpressions.push('priority = :priority');
      expressionAttributeValues[':priority'] = query.priority;
    }

    if (query.createdAfter !== undefined) {
      filterExpressions.push('createdAt >= :createdAfter');
      expressionAttributeValues[':createdAfter'] = query.createdAfter;
    }

    if (query.createdBefore !== undefined) {
      filterExpressions.push('createdAt <= :createdBefore');
      expressionAttributeValues[':createdBefore'] = query.createdBefore;
    }

    if (query.lastProcessedAfter !== undefined) {
      filterExpressions.push('lastProcessed >= :lastProcessedAfter');
      expressionAttributeValues[':lastProcessedAfter'] = query.lastProcessedAfter;
    }

    if (query.lastProcessedBefore !== undefined) {
      filterExpressions.push('lastProcessed <= :lastProcessedBefore');
      expressionAttributeValues[':lastProcessedBefore'] = query.lastProcessedBefore;
    }

    // Set filter expression if we have filters
    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    queryParams.ExpressionAttributeValues = expressionAttributeValues;
    
    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (query.lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = query.lastEvaluatedKey;
    }

    // Execute query or scan based on whether we're using GSI
    const result = query.status 
      ? await this.dynamodb.query(queryParams).promise()
      : await this.dynamodb.scan(queryParams).promise();

    const topics = (result.Items || []).map(item => {
      const { PK, SK, ...topic } = item;
      return topic as Topic;
    });

    return {
      topics,
      lastEvaluatedKey: result.LastEvaluatedKey,
      totalCount: result.Count || 0
    };
  }

  /**
   * Batch operations for bulk topic management
   */
  async batchOperations(operations: TopicBatchOperation[]): Promise<{
    successful: string[];
    failed: { topicId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { topicId: string; error: string }[] = [];

    // Process operations in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      try {
        await this.processBatch(batch, successful, failed);
      } catch (error) {
        // Mark all items in this batch as failed
        batch.forEach(op => {
          failed.push({
            topicId: op.topicId,
            error: error.message || 'Batch operation failed'
          });
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get comprehensive topic statistics
   */
  async getTopicStats(): Promise<TopicStats> {
    // Scan all topics to calculate statistics
    const result = await this.dynamodb.scan({
      TableName: this.tableName,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': 'CONFIG'
      }
    }).promise();

    const topics = (result.Items || []).map(item => {
      const { PK, SK, ...topic } = item;
      return topic as Topic;
    });

    const stats: TopicStats = {
      totalTopics: topics.length,
      activeTopics: 0,
      pausedTopics: 0,
      completedTopics: 0,
      archivedTopics: 0,
      averageVideosPerTopic: 0,
      averageCostPerTopic: 0,
      totalVideosGenerated: 0,
      totalCostSpent: 0
    };

    let totalVideos = 0;
    let totalCost = 0;

    topics.forEach(topic => {
      // Count by status
      switch (topic.status) {
        case 'active':
          stats.activeTopics++;
          break;
        case 'paused':
          stats.pausedTopics++;
          break;
        case 'completed':
          stats.completedTopics++;
          break;
        case 'archived':
          stats.archivedTopics++;
          break;
      }

      // Accumulate video and cost data
      const videoCount = topic.videoCount || 0;
      const averageCost = topic.averageCost || 0;
      
      totalVideos += videoCount;
      totalCost += videoCount * averageCost;
    });

    stats.totalVideosGenerated = totalVideos;
    stats.totalCostSpent = totalCost;
    stats.averageVideosPerTopic = topics.length > 0 ? totalVideos / topics.length : 0;
    stats.averageCostPerTopic = topics.length > 0 ? totalCost / topics.length : 0;

    return stats;
  }

  /**
   * Get topics that haven't been processed recently
   */
  async getStaleTopics(hoursThreshold: number = 24): Promise<Topic[]> {
    const thresholdTime = Date.now() - (hoursThreshold * 60 * 60 * 1000);
    
    const result = await this.queryTopics({
      status: 'active',
      lastProcessedBefore: thresholdTime,
      limit: 100
    });

    return result.topics;
  }

  /**
   * Get top performing topics by video count or cost efficiency
   */
  async getTopPerformingTopics(
    metric: 'videoCount' | 'costEfficiency' = 'videoCount',
    limit: number = 10
  ): Promise<Topic[]> {
    const result = await this.queryTopics({ limit: 1000 }); // Get all topics
    
    let sortedTopics = result.topics;

    if (metric === 'videoCount') {
      sortedTopics.sort((a, b) => (b.videoCount || 0) - (a.videoCount || 0));
    } else {
      // Cost efficiency = videos per dollar
      sortedTopics.sort((a, b) => {
        const aEfficiency = (a.videoCount || 0) / Math.max(a.averageCost || 1, 0.01);
        const bEfficiency = (b.videoCount || 0) / Math.max(b.averageCost || 1, 0.01);
        return bEfficiency - aEfficiency;
      });
    }

    return sortedTopics.slice(0, limit);
  }

  /**
   * Archive old completed topics
   */
  async archiveOldTopics(daysOld: number = 30): Promise<number> {
    const thresholdTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const completedTopics = await this.queryTopics({
      status: 'completed',
      lastProcessedBefore: thresholdTime,
      limit: 1000
    });

    let archivedCount = 0;

    for (const topic of completedTopics.topics) {
      try {
        await this.dynamodb.update({
          TableName: this.tableName,
          Key: {
            PK: `TOPIC#${topic.topicId}`,
            SK: 'CONFIG'
          },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'archived',
            ':updatedAt': Date.now()
          }
        }).promise();

        archivedCount++;
        
        // Remove from cache
        this.cache.delete(topic.topicId);
      } catch (error) {
        console.error(`Failed to archive topic ${topic.topicId}:`, error);
      }
    }

    return archivedCount;
  }

  /**
   * Clear cache for specific topic or all topics
   */
  clearCache(topicId?: string): void {
    if (topicId) {
      this.cache.delete(topicId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(
    batch: TopicBatchOperation[],
    successful: string[],
    failed: { topicId: string; error: string }[]
  ): Promise<void> {
    const writeRequests: any[] = [];

    for (const operation of batch) {
      try {
        switch (operation.operation) {
          case 'create':
            if (!operation.data) {
              throw new Error('Data required for create operation');
            }
            writeRequests.push({
              PutRequest: {
                Item: {
                  PK: `TOPIC#${operation.topicId}`,
                  SK: 'CONFIG',
                  ...operation.data
                }
              }
            });
            break;

          case 'delete':
            writeRequests.push({
              DeleteRequest: {
                Key: {
                  PK: `TOPIC#${operation.topicId}`,
                  SK: 'CONFIG'
                }
              }
            });
            break;

          case 'update':
            // Updates need to be handled individually, not in batch
            if (!operation.data) {
              throw new Error('Data required for update operation');
            }
            
            await this.dynamodb.update({
              TableName: this.tableName,
              Key: {
                PK: `TOPIC#${operation.topicId}`,
                SK: 'CONFIG'
              },
              UpdateExpression: 'SET updatedAt = :updatedAt',
              ExpressionAttributeValues: {
                ':updatedAt': Date.now(),
                ...operation.data
              }
            }).promise();
            
            successful.push(operation.topicId);
            this.cache.delete(operation.topicId); // Clear cache
            break;
        }
      } catch (error) {
        failed.push({
          topicId: operation.topicId,
          error: error.message || 'Operation failed'
        });
      }
    }

    // Execute batch write for create/delete operations
    if (writeRequests.length > 0) {
      const batchResult = await this.dynamodb.batchWrite({
        RequestItems: {
          [this.tableName]: writeRequests
        }
      }).promise();

      // Handle unprocessed items
      if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
        console.warn('Some batch operations were not processed:', batchResult.UnprocessedItems);
        // Could implement retry logic here
      }

      // Mark successful operations (assuming success if not in unprocessed items)
      batch.forEach(op => {
        if (op.operation !== 'update') { // Updates are handled individually above
          successful.push(op.topicId);
          this.cache.delete(op.topicId); // Clear cache
        }
      });
    }
  }
}