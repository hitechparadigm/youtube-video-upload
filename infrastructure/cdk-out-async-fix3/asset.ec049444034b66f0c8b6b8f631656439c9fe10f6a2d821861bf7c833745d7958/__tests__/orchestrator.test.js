/**
 * Simple tests for Workflow Orchestrator
 */

// Mock AWS SDK modules before importing
jest.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: jest.fn(),
  StartExecutionCommand: jest.fn(),
  DescribeExecutionCommand: jest.fn(),
  ListExecutionsCommand: jest.fn(),
  StopExecutionCommand: jest.fn()
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn()
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  QueryCommand: jest.fn()
}));

const { WorkflowOrchestrator } = require('../orchestrator');

describe('WorkflowOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    // Set up environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:TestStateMachine';
    process.env.EXECUTIONS_TABLE_NAME = 'test-executions';
    process.env.TOPICS_TABLE_NAME = 'test-topics';

    orchestrator = new WorkflowOrchestrator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startPipelineExecution', () => {
    test('should start pipeline execution successfully', async () => {
      // Mock SFN client
      orchestrator.sfnClient = {
        send: jest.fn().mockResolvedValue({
          executionArn: 'arn:aws:states:us-east-1:123456789012:execution:TestStateMachine:test-execution'
        })
      };

      // Mock DynamoDB client
      orchestrator.storeExecutionRecord = jest.fn().mockResolvedValue();

      const topicRequest = {
        topicId: 'test-topic-001',
        topic: 'Test video topic',
        keywords: ['test', 'video'],
        priority: 1
      };

      const result = await orchestrator.startPipelineExecution(topicRequest);

      expect(result.success).toBe(true);
      expect(result.executionId).toContain('video-pipeline-test-topic-001');
      expect(result.status).toBe('RUNNING');
      expect(orchestrator.sfnClient.send).toHaveBeenCalled();
      expect(orchestrator.storeExecutionRecord).toHaveBeenCalled();
    });

    test('should handle execution start errors', async () => {
      // Mock SFN client to throw error
      orchestrator.sfnClient = {
        send: jest.fn().mockRejectedValue(new Error('State machine not found'))
      };

      const topicRequest = {
        topicId: 'test-topic-001',
        topic: 'Test video topic'
      };

      await expect(orchestrator.startPipelineExecution(topicRequest)).rejects.toThrow('Pipeline execution failed');
    });
  });

  describe('startBatchExecution', () => {
    test('should process multiple topics in batches', async () => {
      // Mock successful execution starts
      orchestrator.startPipelineExecution = jest.fn()
        .mockResolvedValueOnce({ success: true, executionId: 'exec-1' })
        .mockResolvedValueOnce({ success: true, executionId: 'exec-2' })
        .mockRejectedValueOnce(new Error('Failed'));

      const topicsList = [
        { topicId: 'topic-1', topic: 'Topic 1' },
        { topicId: 'topic-2', topic: 'Topic 2' },
        { topicId: 'topic-3', topic: 'Topic 3' }
      ];

      const result = await orchestrator.startBatchExecution(topicsList);

      expect(result.totalTopics).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(orchestrator.startPipelineExecution).toHaveBeenCalledTimes(3);
    });
  });

  describe('getExecutionStatus', () => {
    test('should get execution status successfully', async () => {
      // Mock DynamoDB response
      orchestrator.getExecutionRecord = jest.fn().mockResolvedValue({
        executionId: 'test-execution',
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:TestStateMachine:test-execution',
        topic: 'Test topic',
        status: 'RUNNING'
      });

      // Mock SFN response
      orchestrator.sfnClient = {
        send: jest.fn().mockResolvedValue({
          status: 'SUCCEEDED',
          startDate: new Date('2025-01-01T10:00:00Z'),
          stopDate: new Date('2025-01-01T10:15:00Z'),
          input: JSON.stringify({ topic: 'Test topic' }),
          output: JSON.stringify({ result: 'success' })
        })
      };

      orchestrator.updateExecutionStatus = jest.fn().mockResolvedValue();

      const result = await orchestrator.getExecutionStatus('test-execution');

      expect(result.executionId).toBe('test-execution');
      expect(result.status).toBe('SUCCEEDED');
      expect(result.topic).toBe('Test topic');
      expect(result.processingTime).toBe(15 * 60 * 1000); // 15 minutes
    });

    test('should handle execution not found', async () => {
      orchestrator.getExecutionRecord = jest.fn().mockResolvedValue(null);

      await expect(orchestrator.getExecutionStatus('nonexistent')).rejects.toThrow('Execution not found');
    });
  });

  describe('getPipelineStatistics', () => {
    test('should calculate pipeline statistics', async () => {
      const mockExecutions = [
        {
          name: 'exec-1',
          status: 'SUCCEEDED',
          startDate: new Date(Date.now() - 60000), // 1 minute ago
          stopDate: new Date(Date.now() - 30000)   // 30 seconds ago
        },
        {
          name: 'exec-2',
          status: 'FAILED',
          startDate: new Date(Date.now() - 120000), // 2 minutes ago
          stopDate: new Date(Date.now() - 90000)    // 1.5 minutes ago
        },
        {
          name: 'exec-3',
          status: 'RUNNING',
          startDate: new Date(Date.now() - 30000)   // 30 seconds ago
        }
      ];

      orchestrator.sfnClient = {
        send: jest.fn().mockResolvedValue({
          executions: mockExecutions
        })
      };

      const stats = await orchestrator.getPipelineStatistics('24h');

      expect(stats.totalExecutions).toBe(3);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.successRate).toBe(50); // 1 success out of 2 completed
      expect(stats.averageProcessingTime).toBe(30); // 30 seconds average
      expect(stats.estimatedCost).toBe(2.55); // 3 executions * $0.85
    });
  });

  describe('listRecentExecutions', () => {
    test('should list recent executions', async () => {
      const mockExecutions = [
        {
          name: 'exec-1',
          executionArn: 'arn:aws:states:us-east-1:123456789012:execution:TestStateMachine:exec-1',
          status: 'SUCCEEDED',
          startDate: new Date(),
          stopDate: new Date()
        }
      ];

      orchestrator.sfnClient = {
        send: jest.fn().mockResolvedValue({
          executions: mockExecutions
        })
      };

      const result = await orchestrator.listRecentExecutions(10);

      expect(result.executions).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.executions[0].executionId).toBe('exec-1');
    });
  });

  describe('storeExecutionRecord', () => {
    test('should store execution record without throwing', async () => {
      orchestrator.docClient = {
        send: jest.fn().mockResolvedValue()
      };

      const executionRecord = {
        executionId: 'test-execution',
        topic: 'Test topic',
        status: 'RUNNING'
      };

      // Should not throw even if DynamoDB fails
      await expect(orchestrator.storeExecutionRecord(executionRecord)).resolves.toBeUndefined();
    });

    test('should handle storage errors gracefully', async () => {
      orchestrator.docClient = {
        send: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      };

      const executionRecord = {
        executionId: 'test-execution',
        topic: 'Test topic',
        status: 'RUNNING'
      };

      // Should not throw even if DynamoDB fails
      await expect(orchestrator.storeExecutionRecord(executionRecord)).resolves.toBeUndefined();
    });
  });
});
