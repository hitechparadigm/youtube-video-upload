/**
 * Workflow Orchestrator
 * Manages Step Functions executions for the video pipeline
 */

const { SFNClient, StartExecutionCommand, DescribeExecutionCommand, ListExecutionsCommand } = require('@aws-sdk/client-sfn');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

class WorkflowOrchestrator {
    constructor() {
        this.sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
        
        this.config = {
            stateMachineArn: process.env.STATE_MACHINE_ARN || 'arn:aws:states:us-east-1:786673323159:stateMachine:AutomatedVideoPipeline',
            executionsTable: process.env.EXECUTIONS_TABLE_NAME || 'automated-video-pipeline-executions',
            topicsTable: process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics'
        };
    }

    /**
     * Start video pipeline execution for a topic
     */
    async startPipelineExecution(topicRequest) {
        const {
            topicId,
            topic,
            keywords = [],
            priority = 5,
            scheduledBy = 'manual'
        } = topicRequest;

        try {
            console.log(`🚀 Starting pipeline execution for topic: ${topic}`);

            // Generate unique execution name
            const executionName = `video-pipeline-${topicId}-${Date.now()}`;

            // Prepare Step Functions input
            const stepFunctionsInput = {
                topicId: topicId,
                topic: topic,
                keywords: keywords,
                priority: priority,
                scheduledBy: scheduledBy,
                requestedAt: new Date().toISOString()
            };

            // Start Step Functions execution
            const startResponse = await this.sfnClient.send(new StartExecutionCommand({
                stateMachineArn: this.config.stateMachineArn,
                name: executionName,
                input: JSON.stringify(stepFunctionsInput)
            }));

            // Create execution record
            const executionRecord = {
                executionId: executionName,
                executionArn: startResponse.executionArn,
                topicId: topicId,
                topic: topic,
                status: 'RUNNING',
                startedAt: new Date().toISOString(),
                scheduledBy: scheduledBy,
                priority: priority,
                input: stepFunctionsInput
            };

            // Store execution record
            await this.storeExecutionRecord(executionRecord);

            console.log(`✅ Pipeline execution started: ${executionName}`);

            return {
                success: true,
                executionId: executionName,
                executionArn: startResponse.executionArn,
                status: 'RUNNING',
                estimatedCompletionTime: new Date(Date.now() + (15 * 60 * 1000)).toISOString() // 15 minutes
            };

        } catch (error) {
            console.error(`❌ Failed to start pipeline execution:`, error);
            throw new Error(`Pipeline execution failed: ${error.message}`);
        }
    }

    /**
     * Start batch pipeline executions for multiple topics
     */
    async startBatchExecution(topicsList) {
        console.log(`📦 Starting batch execution for ${topicsList.length} topics`);

        const results = [];
        const maxConcurrent = 3; // Limit concurrent executions

        // Process topics in batches
        for (let i = 0; i < topicsList.length; i += maxConcurrent) {
            const batch = topicsList.slice(i, i + maxConcurrent);
            
            const batchPromises = batch.map(async (topic) => {
                try {
                    const result = await this.startPipelineExecution(topic);
                    return { success: true, topic: topic.topic, ...result };
                } catch (error) {
                    console.error(`❌ Failed to start execution for ${topic.topic}:`, error);
                    return { success: false, topic: topic.topic, error: error.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Add delay between batches to avoid overwhelming the system
            if (i + maxConcurrent < topicsList.length) {
                console.log('⏳ Waiting 30 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`✅ Batch execution completed: ${successful} successful, ${failed} failed`);

        return {
            totalTopics: topicsList.length,
            successful: successful,
            failed: failed,
            results: results
        };
    }

    /**
     * Get execution status
     */
    async getExecutionStatus(executionId) {
        try {
            console.log(`🔍 Getting status for execution: ${executionId}`);

            // Get execution record from DynamoDB
            const executionRecord = await this.getExecutionRecord(executionId);
            
            if (!executionRecord) {
                throw new Error('Execution not found');
            }

            // Get current status from Step Functions
            const describeResponse = await this.sfnClient.send(new DescribeExecutionCommand({
                executionArn: executionRecord.executionArn
            }));

            // Update record if status changed
            if (describeResponse.status !== executionRecord.status) {
                await this.updateExecutionStatus(executionId, describeResponse.status, describeResponse.output);
            }

            return {
                executionId: executionId,
                status: describeResponse.status,
                startDate: describeResponse.startDate,
                stopDate: describeResponse.stopDate,
                input: JSON.parse(describeResponse.input),
                output: describeResponse.output ? JSON.parse(describeResponse.output) : null,
                topic: executionRecord.topic,
                processingTime: describeResponse.stopDate ? 
                    describeResponse.stopDate.getTime() - describeResponse.startDate.getTime() : 
                    Date.now() - describeResponse.startDate.getTime()
            };

        } catch (error) {
            console.error(`❌ Failed to get execution status:`, error);
            throw error;
        }
    }

    /**
     * List recent executions
     */
    async listRecentExecutions(limit = 20) {
        try {
            console.log(`📋 Listing recent executions (limit: ${limit})`);

            const response = await this.sfnClient.send(new ListExecutionsCommand({
                stateMachineArn: this.config.stateMachineArn,
                maxResults: limit
            }));

            const executions = response.executions.map(execution => ({
                executionId: execution.name,
                executionArn: execution.executionArn,
                status: execution.status,
                startDate: execution.startDate,
                stopDate: execution.stopDate,
                processingTime: execution.stopDate ? 
                    execution.stopDate.getTime() - execution.startDate.getTime() : 
                    Date.now() - execution.startDate.getTime()
            }));

            return {
                executions: executions,
                totalCount: executions.length
            };

        } catch (error) {
            console.error(`❌ Failed to list executions:`, error);
            throw error;
        }
    }

    /**
     * Get pipeline statistics
     */
    async getPipelineStatistics(timeRange = '24h') {
        try {
            console.log(`📊 Getting pipeline statistics for ${timeRange}`);

            // Calculate time range
            const now = new Date();
            let startTime;
            
            switch (timeRange) {
                case '1h':
                    startTime = new Date(now.getTime() - (60 * 60 * 1000));
                    break;
                case '24h':
                    startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                    break;
                default:
                    startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
            }

            // Get executions from Step Functions
            const response = await this.sfnClient.send(new ListExecutionsCommand({
                stateMachineArn: this.config.stateMachineArn,
                maxResults: 100
            }));

            // Filter by time range
            const recentExecutions = response.executions.filter(
                execution => execution.startDate >= startTime
            );

            // Calculate statistics
            const stats = {
                timeRange: timeRange,
                totalExecutions: recentExecutions.length,
                successful: recentExecutions.filter(e => e.status === 'SUCCEEDED').length,
                failed: recentExecutions.filter(e => e.status === 'FAILED').length,
                running: recentExecutions.filter(e => e.status === 'RUNNING').length,
                averageProcessingTime: 0,
                successRate: 0,
                estimatedCost: 0
            };

            // Calculate average processing time for completed executions
            const completedExecutions = recentExecutions.filter(e => e.stopDate);
            if (completedExecutions.length > 0) {
                const totalTime = completedExecutions.reduce((sum, execution) => {
                    return sum + (execution.stopDate.getTime() - execution.startDate.getTime());
                }, 0);
                stats.averageProcessingTime = Math.round(totalTime / completedExecutions.length / 1000); // seconds
            }

            // Calculate success rate
            const finishedExecutions = stats.successful + stats.failed;
            if (finishedExecutions > 0) {
                stats.successRate = Math.round((stats.successful / finishedExecutions) * 100);
            }

            // Estimate cost (rough calculation)
            stats.estimatedCost = stats.totalExecutions * 0.85; // $0.85 per video

            return stats;

        } catch (error) {
            console.error(`❌ Failed to get pipeline statistics:`, error);
            throw error;
        }
    }

    /**
     * Stop execution
     */
    async stopExecution(executionId, reason = 'Manual stop') {
        try {
            console.log(`🛑 Stopping execution: ${executionId}`);

            const executionRecord = await this.getExecutionRecord(executionId);
            
            if (!executionRecord) {
                throw new Error('Execution not found');
            }

            await this.sfnClient.send(new StopExecutionCommand({
                executionArn: executionRecord.executionArn,
                cause: reason
            }));

            await this.updateExecutionStatus(executionId, 'ABORTED', null);

            console.log(`✅ Execution stopped: ${executionId}`);

            return {
                success: true,
                executionId: executionId,
                status: 'ABORTED',
                reason: reason
            };

        } catch (error) {
            console.error(`❌ Failed to stop execution:`, error);
            throw error;
        }
    }

    /**
     * Store execution record in DynamoDB
     */
    async storeExecutionRecord(executionRecord) {
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.config.executionsTable,
                Item: executionRecord
            }));
            console.log(`📝 Stored execution record: ${executionRecord.executionId}`);
        } catch (error) {
            console.error('❌ Error storing execution record:', error);
            // Don't throw - continue processing
        }
    }

    /**
     * Get execution record from DynamoDB
     */
    async getExecutionRecord(executionId) {
        try {
            const response = await this.docClient.send(new GetCommand({
                TableName: this.config.executionsTable,
                Key: { executionId: executionId }
            }));
            return response.Item || null;
        } catch (error) {
            console.error('❌ Error getting execution record:', error);
            return null;
        }
    }

    /**
     * Update execution status in DynamoDB
     */
    async updateExecutionStatus(executionId, status, output) {
        try {
            const updates = {
                executionId: executionId,
                status: status,
                updatedAt: new Date().toISOString()
            };

            if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') {
                updates.completedAt = new Date().toISOString();
            }

            if (output) {
                updates.output = JSON.parse(output);
            }

            await this.docClient.send(new PutCommand({
                TableName: this.config.executionsTable,
                Item: updates
            }));

            console.log(`📝 Updated execution status: ${executionId} -> ${status}`);
        } catch (error) {
            console.error('❌ Error updating execution status:', error);
            // Don't throw - continue processing
        }
    }
}

module.exports = { WorkflowOrchestrator };