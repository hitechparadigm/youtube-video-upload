/**
 * Unit Tests for DynamoDB Table Infrastructure
 * 
 * Tests DynamoDB table creation, schemas, indexes, and configuration
 * for the automated video pipeline data storage.
 */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AutomatedVideoPipelineStack } from '../../lib/automated-video-pipeline-stack';

describe('DynamoDB Tables Infrastructure', () => {
  let template: Template;
  let stack: AutomatedVideoPipelineStack;

  beforeAll(() => {
    const app = new cdk.App();
    stack = new AutomatedVideoPipelineStack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });
    template = Template.fromStack(stack);
  });

  describe('Topic Configuration Table', () => {
    test('should create topic table with correct name', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics'
      });
    });

    test('should have correct partition and sort key schema', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        KeySchema: [
          {
            AttributeName: 'PK',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'SK',
            KeyType: 'RANGE'
          }
        ],
        AttributeDefinitions: expect.arrayContaining([
          {
            AttributeName: 'PK',
            AttributeType: 'S'
          },
          {
            AttributeName: 'SK',
            AttributeType: 'S'
          }
        ])
      });
    });

    test('should use on-demand billing mode', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        BillingMode: 'PAY_PER_REQUEST'
      });
    });

    test('should have point-in-time recovery enabled', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        }
      });
    });

    test('should have AWS managed encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        SSESpecification: {
          SSEEnabled: true
        }
      });
    });

    test('should have TopicsByPriority GSI', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        GlobalSecondaryIndexes: expect.arrayContaining([
          {
            IndexName: 'TopicsByPriority',
            KeySchema: [
              {
                AttributeName: 'status',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'priority',
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'ALL'
            }
          }
        ])
      });
    });

    test('should have proper resource tags', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-topics',
        Tags: expect.arrayContaining([
          {
            Key: 'youtube-video-upload',
            Value: 'true'
          },
          {
            Key: 'Project',
            Value: 'youtube-video-upload'
          }
        ])
      });
    });
  });

  describe('Trend Data Table', () => {
    test('should create trend data table with correct name', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-trends'
      });
    });

    test('should have correct key schema for trend data', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-trends',
        KeySchema: [
          {
            AttributeName: 'PK',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'SK',
            KeyType: 'RANGE'
          }
        ]
      });
    });

    test('should have TTL attribute configured', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-trends',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true
        }
      });
    });

    test('should have TrendsByTopic GSI', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-trends',
        GlobalSecondaryIndexes: expect.arrayContaining([
          {
            IndexName: 'TrendsByTopic',
            KeySchema: [
              {
                AttributeName: 'topicId',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'timestamp',
                KeyType: 'RANGE'
              }
            ]
          }
        ])
      });
    });
  });

  describe('Video Production Table', () => {
    test('should create video production table with correct name', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-production'
      });
    });

    test('should have multiple GSIs for different query patterns', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-production',
        GlobalSecondaryIndexes: expect.arrayContaining([
          {
            IndexName: 'VideosByStatus',
            KeySchema: [
              {
                AttributeName: 'status',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE'
              }
            ]
          },
          {
            IndexName: 'VideosByTopic',
            KeySchema: [
              {
                AttributeName: 'topicId',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'createdAt',
                KeyType: 'RANGE'
              }
            ]
          },
          {
            IndexName: 'VideosByCost',
            KeySchema: [
              {
                AttributeName: 'costCategory',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'totalCost',
                KeyType: 'RANGE'
              }
            ]
          }
        ])
      });
    });

    test('should have all required attribute definitions', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-production',
        AttributeDefinitions: expect.arrayContaining([
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'status', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'N' },
          { AttributeName: 'topicId', AttributeType: 'S' },
          { AttributeName: 'costCategory', AttributeType: 'S' },
          { AttributeName: 'totalCost', AttributeType: 'N' }
        ])
      });
    });
  });

  describe('Cost Tracking Table', () => {
    test('should create cost tracking table with correct name', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-cost-tracking'
      });
    });

    test('should have TTL for automatic data cleanup', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-cost-tracking',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true
        }
      });
    });

    test('should have cost analysis GSIs', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'automated-video-cost-tracking',
        GlobalSecondaryIndexes: expect.arrayContaining([
          {
            IndexName: 'CostsByMonth',
            KeySchema: [
              {
                AttributeName: 'month',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'totalCost',
                KeyType: 'RANGE'
              }
            ]
          },
          {
            IndexName: 'CostsByService',
            KeySchema: [
              {
                AttributeName: 'primaryService',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'serviceCost',
                KeyType: 'RANGE'
              }
            ]
          }
        ])
      });
    });
  });

  describe('Table Configuration Validation', () => {
    test('should create exactly 4 DynamoDB tables', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      expect(Object.keys(tables).length).toBe(4);
    });

    test('all tables should use on-demand billing', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        expect(table.Properties.BillingMode).toBe('PAY_PER_REQUEST');
      });
    });

    test('all tables should have encryption enabled', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        expect(table.Properties.SSESpecification.SSEEnabled).toBe(true);
      });
    });

    test('all tables should have point-in-time recovery enabled', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        expect(table.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled).toBe(true);
      });
    });

    test('all tables should have proper tagging', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        const tags = table.Properties.Tags;
        expect(tags).toEqual(expect.arrayContaining([
          expect.objectContaining({
            Key: 'youtube-video-upload',
            Value: 'true'
          })
        ]));
      });
    });
  });

  describe('GSI Configuration', () => {
    test('should have correct projection types for GSIs', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        if (table.Properties.GlobalSecondaryIndexes) {
          table.Properties.GlobalSecondaryIndexes.forEach((gsi: any) => {
            expect(gsi.Projection.ProjectionType).toBe('ALL');
          });
        }
      });
    });

    test('should not have provisioned throughput for GSIs (on-demand)', () => {
      const tables = template.findResources('AWS::DynamoDB::Table');
      Object.values(tables).forEach((table: any) => {
        if (table.Properties.GlobalSecondaryIndexes) {
          table.Properties.GlobalSecondaryIndexes.forEach((gsi: any) => {
            expect(gsi.ProvisionedThroughput).toBeUndefined();
          });
        }
      });
    });
  });
});