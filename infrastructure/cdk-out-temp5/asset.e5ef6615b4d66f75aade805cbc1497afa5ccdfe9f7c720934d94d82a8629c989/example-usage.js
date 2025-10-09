/**
 * Example usage of Workflow Orchestrator
 * Shows how to manage Step Functions executions
 */

const { WorkflowOrchestrator } = require('./orchestrator');

/**
 * Example: Start a single video pipeline execution
 */
async function exampleStartExecution() {
    const orchestrator = new WorkflowOrchestrator();

    const topicRequest = {
        topicId: 'investing-apps-2025-001',
        topic: 'Best Investment Apps for Beginners in 2025',
        keywords: ['investment apps', 'beginners', '2025', 'mobile investing'],
        priority: 1,
        scheduledBy: 'manual'
    };

    try {
        console.log('🚀 Starting video pipeline execution...');
        
        const result = await orchestrator.startPipelineExecution(topicRequest);
        
        console.log('✅ Pipeline execution started successfully!');
        console.log(`📋 Execution ID: ${result.executionId}`);
        console.log(`🔗 Execution ARN: ${result.executionArn}`);
        console.log(`⏱️  Estimated completion: ${result.estimatedCompletionTime}`);

        return result;

    } catch (error) {
        console.error('❌ Failed to start execution:', error.message);
        throw error;
    }
}

/**
 * Example: Start batch execution for multiple topics
 */
async function exampleBatchExecution() {
    const orchestrator = new WorkflowOrchestrator();

    const topicsList = [
        {
            topicId: 'investing-basics-001',
            topic: 'Investing for beginners in the USA',
            keywords: ['investing', 'beginners', 'USA'],
            priority: 1
        },
        {
            topicId: 'travel-europe-001',
            topic: 'Travel tips for Europe in 2025',
            keywords: ['travel', 'Europe', 'tips', '2025'],
            priority: 2
        },
        {
            topicId: 'tech-trends-001',
            topic: 'Top tech trends to watch in 2025',
            keywords: ['technology', 'trends', '2025', 'AI'],
            priority: 3
        }
    ];

    try {
        console.log('📦 Starting batch execution...');
        
        const result = await orchestrator.startBatchExecution(topicsList);
        
        console.log('✅ Batch execution completed!');
        console.log(`📊 Total topics: ${result.totalTopics}`);
        console.log(`✅ Successful: ${result.successful}`);
        console.log(`❌ Failed: ${result.failed}`);

        // Show individual results
        result.results.forEach((item, index) => {
            const status = item.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${item.topic}`);
            if (item.success) {
                console.log(`      Execution ID: ${item.executionId}`);
            } else {
                console.log(`      Error: ${item.error}`);
            }
        });

        return result;

    } catch (error) {
        console.error('❌ Batch execution failed:', error.message);
        throw error;
    }
}

/**
 * Example: Monitor execution status
 */
async function exampleMonitorExecution(executionId) {
    const orchestrator = new WorkflowOrchestrator();

    try {
        console.log(`🔍 Monitoring execution: ${executionId}`);
        
        // Poll status every 30 seconds until completion
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 40; // 20 minutes max

        while (status === 'RUNNING' && attempts < maxAttempts) {
            const result = await orchestrator.getExecutionStatus(executionId);
            
            status = result.status;
            const processingTime = Math.round(result.processingTime / 1000); // seconds
            
            console.log(`📊 Status: ${status} | Processing time: ${processingTime}s`);
            
            if (status === 'RUNNING') {
                console.log('⏳ Waiting 30 seconds before next check...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                attempts++;
            } else {
                // Execution completed
                console.log('🎉 Execution completed!');
                console.log(`📋 Final status: ${status}`);
                console.log(`⏱️  Total processing time: ${processingTime}s`);
                
                if (result.output) {
                    console.log('📄 Output:', JSON.stringify(result.output, null, 2));
                }
                
                return result;
            }
        }

        if (attempts >= maxAttempts) {
            console.log('⏰ Monitoring timeout reached');
        }

    } catch (error) {
        console.error('❌ Monitoring failed:', error.message);
        throw error;
    }
}

/**
 * Example: Get pipeline statistics
 */
async function exampleGetStatistics() {
    const orchestrator = new WorkflowOrchestrator();

    try {
        console.log('📊 Getting pipeline statistics...');
        
        // Get stats for different time ranges
        const timeRanges = ['1h', '24h', '7d'];
        
        for (const timeRange of timeRanges) {
            const stats = await orchestrator.getPipelineStatistics(timeRange);
            
            console.log(`\n📈 Statistics for ${timeRange}:`);
            console.log(`   Total executions: ${stats.totalExecutions}`);
            console.log(`   Successful: ${stats.successful}`);
            console.log(`   Failed: ${stats.failed}`);
            console.log(`   Running: ${stats.running}`);
            console.log(`   Success rate: ${stats.successRate}%`);
            console.log(`   Average processing time: ${stats.averageProcessingTime}s`);
            console.log(`   Estimated cost: $${stats.estimatedCost.toFixed(2)}`);
        }

    } catch (error) {
        console.error('❌ Failed to get statistics:', error.message);
        throw error;
    }
}

/**
 * Example: List recent executions
 */
async function exampleListExecutions() {
    const orchestrator = new WorkflowOrchestrator();

    try {
        console.log('📋 Listing recent executions...');
        
        const result = await orchestrator.listRecentExecutions(10);
        
        console.log(`📊 Found ${result.totalCount} recent executions:`);
        
        result.executions.forEach((execution, index) => {
            const processingTime = Math.round(execution.processingTime / 1000);
            const statusIcon = execution.status === 'SUCCEEDED' ? '✅' : 
                              execution.status === 'FAILED' ? '❌' : 
                              execution.status === 'RUNNING' ? '🔄' : '⏸️';
            
            console.log(`   ${index + 1}. ${statusIcon} ${execution.executionId}`);
            console.log(`      Status: ${execution.status}`);
            console.log(`      Processing time: ${processingTime}s`);
            console.log(`      Started: ${execution.startDate.toISOString()}`);
        });

        return result;

    } catch (error) {
        console.error('❌ Failed to list executions:', error.message);
        throw error;
    }
}

/**
 * Example: Complete workflow management
 */
async function exampleCompleteWorkflow() {
    const orchestrator = new WorkflowOrchestrator();

    try {
        console.log('🎬 Starting complete workflow example...');

        // 1. Start execution
        const startResult = await exampleStartExecution();
        const executionId = startResult.executionId;

        // 2. Wait a bit then check status
        console.log('\n⏳ Waiting 10 seconds before status check...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const statusResult = await orchestrator.getExecutionStatus(executionId);
        console.log(`\n📊 Current status: ${statusResult.status}`);

        // 3. Get current statistics
        await exampleGetStatistics();

        // 4. List recent executions
        await exampleListExecutions();

        console.log('\n✅ Complete workflow example finished!');

    } catch (error) {
        console.error('❌ Complete workflow failed:', error.message);
        throw error;
    }
}

/**
 * Example: EventBridge scheduled execution simulation
 */
function exampleScheduledExecution() {
    console.log('🕐 Simulating EventBridge scheduled execution...');

    // This simulates what EventBridge would send
    const eventBridgeEvent = {
        source: 'aws.events',
        time: new Date().toISOString(),
        resources: ['arn:aws:events:us-east-1:123456789012:rule/video-pipeline-schedule'],
        detail: {
            scheduleName: 'daily-video-generation',
            frequency: 'daily'
        }
    };

    console.log('📅 Scheduled event:', JSON.stringify(eventBridgeEvent, null, 2));
    console.log('💡 This would trigger batch execution of active topics');

    return eventBridgeEvent;
}

// Export examples for testing
module.exports = {
    exampleStartExecution,
    exampleBatchExecution,
    exampleMonitorExecution,
    exampleGetStatistics,
    exampleListExecutions,
    exampleCompleteWorkflow,
    exampleScheduledExecution
};

// Run example if called directly
if (require.main === module) {
    console.log('🎬 Workflow Orchestrator Examples\n');
    
    // Run a simple example
    exampleScheduledExecution();
    
    console.log('\n💡 To test actual orchestration, ensure Step Functions state machine is deployed');
    console.log('💡 Use exampleStartExecution() to test with real AWS resources');
}