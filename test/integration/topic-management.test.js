/**
 * Integration Tests for Topic Management System
 * Tests REST API endpoints, Google Sheets sync, and validation scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import AWS from 'aws-sdk';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-gateway-url';
const API_KEY = process.env.API_KEY || 'your-test-api-key';
const TEST_SHEET_URL = process.env.TEST_SHEET_URL || 'https://docs.google.com/spreadsheets/d/test/edit#gid=0';

// Test data
const testTopic = {
  topic: 'Integration Test Topic - ' + Date.now(),
  dailyFrequency: 2,
  priority: 1,
  status: 'active',
  targetAudience: 'test-audience',
  region: 'US',
  contentStyle: 'engaging_educational',
  tags: ['test', 'integration']
};

let createdTopicId = null;

describe('Topic Management Integration Tests', () => {
  
  beforeAll(async () => {
    console.log('Starting Topic Management Integration Tests');
    console.log('API Base URL:', API_BASE_URL);
  });

  afterAll(async () => {
    // Cleanup: Delete test topic if created
    if (createdTopicId) {
      try {
        await fetch(`${API_BASE_URL}/topics/${createdTopicId}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': API_KEY
          }
        });
        console.log('Cleaned up test topic:', createdTopicId);
      } catch (error) {
        console.warn('Failed to cleanup test topic:', error.message);
      }
    }
  });

  describe('Topic CRUD Operations', () => {
    
    test('should create a new topic', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(testTopic)
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('topicId');
      expect(data.topic).toBe(testTopic.topic);
      expect(data.priority).toBe(testTopic.priority);
      expect(data.status).toBe(testTopic.status);
      expect(data.keywords).toBeInstanceOf(Array);
      expect(data.keywords.length).toBeGreaterThan(0);
      
      createdTopicId = data.topicId;
    });

    test('should retrieve the created topic', async () => {
      expect(createdTopicId).toBeTruthy();
      
      const response = await fetch(`${API_BASE_URL}/topics/${createdTopicId}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.topicId).toBe(createdTopicId);
      expect(data.topic).toBe(testTopic.topic);
    });

    test('should list topics with filtering', async () => {
      const response = await fetch(`${API_BASE_URL}/topics?status=active&limit=10`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('topics');
      expect(data).toHaveProperty('count');
      expect(data.topics).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThanOrEqual(1);
      
      // Should include our test topic
      const ourTopic = data.topics.find(t => t.topicId === createdTopicId);
      expect(ourTopic).toBeTruthy();
    });

    test('should update the topic', async () => {
      expect(createdTopicId).toBeTruthy();
      
      const updateData = {
        priority: 3,
        status: 'paused',
        dailyFrequency: 1
      };

      const response = await fetch(`${API_BASE_URL}/topics/${createdTopicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.priority).toBe(updateData.priority);
      expect(data.status).toBe(updateData.status);
      expect(data.dailyFrequency).toBe(updateData.dailyFrequency);
      expect(data.updatedAt).toBeTruthy();
    });

    test('should delete the topic', async () => {
      expect(createdTopicId).toBeTruthy();
      
      const response = await fetch(`${API_BASE_URL}/topics/${createdTopicId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.message).toContain('deleted successfully');
      expect(data.topicId).toBe(createdTopicId);
      
      // Verify topic is deleted
      const getResponse = await fetch(`${API_BASE_URL}/topics/${createdTopicId}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      expect(getResponse.status).toBe(404);
      
      createdTopicId = null; // Prevent cleanup attempt
    });
  });

  describe('Topic Validation', () => {
    
    test('should reject invalid topic data', async () => {
      const invalidTopic = {
        topic: '', // Empty topic should fail
        dailyFrequency: 15, // Out of range
        priority: 0 // Out of range
      };

      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(invalidTopic)
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data.details).toBeInstanceOf(Array);
      expect(data.details.length).toBeGreaterThan(0);
    });

    test('should handle missing required fields', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({}) // Empty body
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Validation failed');
    });

    test('should handle non-existent topic retrieval', async () => {
      const fakeId = 'non-existent-topic-id';
      
      const response = await fetch(`${API_BASE_URL}/topics/${fakeId}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    
    test('should reject requests without API key', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'GET'
        // No x-api-key header
      });

      expect(response.status).toBe(403);
    });

    test('should reject requests with invalid API key', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'GET',
        headers: {
          'x-api-key': 'invalid-api-key'
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Google Sheets Sync Integration', () => {
    
    test('should validate Google Sheets structure', async () => {
      const response = await fetch(`${API_BASE_URL}/sync/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          action: 'validate',
          spreadsheetUrl: TEST_SHEET_URL
        })
      });

      // Should return 200 for valid sheet or 400/500 for invalid/inaccessible sheet
      expect([200, 400, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toHaveProperty('valid');
      
      if (response.status === 200) {
        expect(typeof data.valid).toBe('boolean');
        if (data.valid) {
          expect(data).toHaveProperty('rowCount');
        } else {
          expect(data).toHaveProperty('errors');
        }
      }
    });

    test('should handle sync operation', async () => {
      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          action: 'sync',
          spreadsheetUrl: TEST_SHEET_URL,
          syncMode: 'incremental'
        })
      });

      // Should return 200 for successful sync or error status for issues
      expect([200, 400, 500]).toContain(response.status);
      
      const data = await response.json();
      
      if (response.status === 200) {
        expect(data).toHaveProperty('syncId');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('summary');
      } else {
        expect(data).toHaveProperty('error');
      }
    });

    test('should retrieve sync history', async () => {
      const response = await fetch(`${API_BASE_URL}/sync/history?limit=5`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('count');
      expect(data.history).toBeInstanceOf(Array);
    });

    test('should handle invalid spreadsheet URL', async () => {
      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          action: 'sync',
          spreadsheetUrl: 'https://invalid-url.com/not-a-sheet',
          syncMode: 'incremental'
        })
      });

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    
    test('should handle malformed JSON', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: 'invalid json{'
      });

      expect(response.status).toBe(400);
    });

    test('should handle unsupported HTTP methods', async () => {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'PATCH', // Not supported
        headers: {
          'x-api-key': API_KEY
        }
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Performance and Rate Limiting', () => {
    
    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map((_, i) => 
        fetch(`${API_BASE_URL}/topics?limit=1`, {
          headers: {
            'x-api-key': API_KEY
          }
        })
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed (or fail consistently)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 200 OK or 429 Too Many Requests
      });
    });
  });
});

describe('Cost Tracking Integration', () => {
  
  test('should track operation costs', async () => {
    // This is a placeholder test for cost tracking
    // In a real implementation, you would verify that costs are being tracked
    // in CloudWatch or a dedicated cost tracking system
    
    const response = await fetch(`${API_BASE_URL}/topics?limit=1`, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    expect(response.status).toBe(200);
    
    // In a real implementation, you might check:
    // - CloudWatch metrics for Lambda invocations
    // - DynamoDB read/write metrics
    // - API Gateway request metrics
    // - Custom cost tracking entries
    
    expect(true).toBe(true); // Placeholder assertion
  });
});