/**
 * Unit Tests for AWS Service Manager Shared Utility
 * Tests AWS service operations with mocked AWS SDK
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  uploadToS3,
  downloadFromS3,
  queryDynamoDB,
  putDynamoDBItem,
  getSecret,
  executeWithRetry
} from '../../../src/shared/aws-service-manager.js';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-secrets-manager');

describe('AWS Service Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('S3 operations', () => {
    it('should upload to S3 successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      const { S3Client } = await import('@aws-sdk/client-s3');
      S3Client.prototype.send = mockSend;

      const result = await uploadToS3('test-bucket', 'test-key', 'test-data');
      
      expect(result).toBe('s3://test-bucket/test-key');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle S3 upload errors', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('S3 Error'));
      const { S3Client } = await import('@aws-sdk/client-s3');
      S3Client.prototype.send = mockSend;

      await expect(uploadToS3('test-bucket', 'test-key', 'test-data'))
        .rejects.toThrow('Failed to upload to S3: S3 Error');
    });
  });

  describe('DynamoDB operations', () => {
    it('should query DynamoDB successfully', async () => {
      const mockItems = [{ id: '1', name: 'test' }];
      const mockSend = jest.fn().mockResolvedValue({ Items: mockItems });
      
      // Mock DynamoDBDocumentClient
      const mockDocClient = { send: mockSend };
      jest.doMock('@aws-sdk/lib-dynamodb', () => ({
        DynamoDBDocumentClient: {
          from: jest.fn().mockReturnValue(mockDocClient)
        },
        QueryCommand: jest.fn()
      }));

      const result = await queryDynamoDB('test-table', {
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '1' }
      });

      expect(result).toEqual(mockItems);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRetry(mockOperation, 3, 1000);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(mockOperation, 3, 100);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(executeWithRetry(mockOperation, 2, 100))
        .rejects.toThrow('Operation failed after 2 attempts: Persistent failure');
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});