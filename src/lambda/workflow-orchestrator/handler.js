/**
 * Workflow Orchestrator Lambda Handler
 * Main entry point for Step Functions workflow management
 */

const { WorkflowOrchestrator } = require('./orchestrator');

/**
 * Lambda handler for workflow orchestration requests
 */
exports.handler = async (event) => {
    console.log('Workflow Orchestrator Handler invoked:', JSON.stringify(event, null, 2));

    try {
        const orchestrator = new WorkflowOrchestrator();
        
        // Parse the event based on source
        let request;
        
        if (event.httpMethod) {
            // API Gateway request
            request = parseApiGatewayEvent(event);
        } else if (event.source === 'aws.events') {
            // EventBridge scheduled trigger
            request = parseEventBridgeEvent(event);
        } else {
            // Direct invocation
            request = event;
        }

        // Route to appropriate action
        switch (request.action) {
            case 'start':
                const result = await orchestrator.startPipelineExecution(request);
                return createResponse(event, result);

            case 'batch':
                const batchResult = await orchestrator.startBatchExecution(request.topics);
                return createResponse(event, batchResult);

            case 'status':
                const status = await orchestrator.getExecutionStatus(request.executionId);
                return createResponse(event, status);

            case 'list':
                const executions = await orchestrator.listRecentExecutions(request.limit);
                return createResponse(event, executions);

            case 'stats':
                const stats = await orchestrator.getPipelineStatistics(request.timeRange);
                return createResponse(event, stats);

            case 'stop':
                const stopResult = await orchestrator.stopExecution(request.executionId, request.reason);
                return createResponse(event, stopResult);

            case 'scheduled':
                // Handle scheduled execution from EventBridge
                const scheduledResult = await handleScheduledExecution(orchestrator, request);
                return scheduledResult;

            default:
                throw new Error(`Unsupported action: ${request.action}`);
        }

    } catch (error) {
        console.error('Workflow orchestration error:', error);

        if (event.httpMethod) {
            return createApiResponse(500, {
                success: false,
                error: 'Workflow orchestration failed',
                message: error.message
            });
        } else {
            throw error;
        }
    }
};

/**
 * Parse API Gateway event
 */
function parseApiGatewayEvent(event) {
    const { httpMethod, path, body, queryStringParameters } = event;

    if (httpMethod === 'POST' && path.includes('/start')) {
        const requestBody = body ? JSON.parse(body) : {};
        return {
            action: 'start',
            topicId: requestBody.topicId,
            topic: requestBody.topic,
            keywords: requestBody.keywords || [],
            priority: requestBody.priority || 5,
            scheduledBy: 'api'
        };
    } else if (httpMethod === 'POST' && path.includes('/batch')) {
        const requestBody = body ? JSON.parse(body) : {};
        return {
            action: 'batch',
            topics: requestBody.topics || []
        };
    } else if (httpMethod === 'GET' && path.includes('/status')) {
        return {
            action: 'status',
            executionId: queryStringParameters?.executionId
        };
    } else if (httpMethod === 'GET' && path.includes('/list')) {
        return {
            action: 'list',
            limit: parseInt(queryStringParameters?.limit || '20')
        };
    } else if (httpMethod === 'GET' && path.includes('/stats')) {
        return {
            action: 'stats',
            timeRange: queryStringParameters?.timeRange || '24h'
        };
    } else if (httpMethod === 'POST' && path.includes('/stop')) {
        const requestBody = body ? JSON.parse(body) : {};
        return {
            action: 'stop',
            executionId: requestBody.executionId,
            reason: requestBody.reason || 'Manual stop'
        };
    }

    throw new Error(`Unsupported API endpoint: ${httpMethod} ${path}`);
}

/**
 * Parse EventBridge scheduled event
 */
function parseEventBridgeEvent(event) {
    return {
        action: 'scheduled',
        scheduledTime: event.time,
        ruleArn: event.resources[0],
        detail: event.detail || {}
    };
}

/**
 * Handle scheduled execution from EventBridge
 */
async function handleScheduledExecution(orchestrator, request) {
    console.log('🕐 Processing scheduled execution...');

    try {
        // This would typically query active topics from DynamoDB
        // For now, we'll use a simple example
        const activeTopics = [
            {
                topicId: 'investing-basics-001',
                topic: 'Investing for beginners in the USA',
                keywords: ['investing', 'beginners', 'USA'],
                priority: 1
            },
            {
                topicId: 'travel-europe-001',
                topic: 'Travel tips for Europe',
                keywords: ['travel', 'Europe', 'tips'],
                priority: 2
            }
        ];

        console.log(`📋 Found ${activeTopics.length} active topics for scheduled execution`);

        // Start batch execution
        const batchResult = await orchestrator.startBatchExecution(activeTopics);

        console.log(`✅ Scheduled execution completed: ${batchResult.successful} successful, ${batchResult.failed} failed`);

        return {
            success: true,
            message: 'Scheduled execution completed',
            result: batchResult
        };

    } catch (error) {
        console.error('❌ Scheduled execution failed:', error);
        throw error;
    }
}

/**
 * Create appropriate response based on event source
 */
function createResponse(event, result) {
    if (event.httpMethod) {
        return createApiResponse(200, {
            success: true,
            result: result
        });
    } else {
        return result;
    }
}

/**
 * Create API Gateway response
 */
function createApiResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body, null, 2)
    };
}

/**
 * Health check endpoint
 */
exports.healthCheck = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            service: 'workflow-orchestrator',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        })
    };
};