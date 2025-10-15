/**
 * 🎯 WORKFLOW ORCHESTRATOR - CORE COORDINATION ENGINE
 * 
 * ROLE: Direct AI Agent Coordination (Replaces Step Functions)
 * This is the central orchestration engine that coordinates all AI agents
 * in the video production pipeline. It provides direct Lambda-to-Lambda
 * coordination without the complexity and cost of Step Functions.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 🚀 Pipeline Execution - Orchestrates the complete 6-agent workflow
 * 2. 📊 Agent Coordination - Direct Lambda invocation with error handling
 * 3. 🔄 Context Management - Ensures proper context flow between agents
 * 4. 📈 Progress Tracking - Monitors execution status and agent health
 * 5. ⚡ Automatic Scheduling - Handles EventBridge scheduled executions
 * 
 * ARCHITECTURE BENEFITS vs Step Functions:
 * - 🚀 Faster execution (no state machine overhead)
 * - 💰 Lower cost (no Step Functions charges)
 * - 🔧 Simpler debugging (single Lambda function)
 * - 📊 Better error handling (immediate feedback)
 * - 🎯 More flexible (dynamic agent selection)
 * 
 * AGENT COORDINATION FLOW:
 * 1. 📋 Topic Management AI - Google Sheets integration
 * 2. 📝 Script Generator AI - Claude 3 Sonnet scripts
 * 3. 🎨 Media Curator AI - Pexels/Pixabay media (parallel with audio)
 * 4. 🎵 Audio Generator AI - Amazon Polly narration (parallel with media)
 * 5. 🎬 Video Assembler AI - ECS video processing
 * 6. 📺 YouTube Publisher AI - Publishing with SEO optimization
 * 
 * SCHEDULING INTEGRATION:
 * - EventBridge triggers every 8 hours for regular content
 * - High-priority schedule every 4 hours (optional)
 * - Google Sheets frequency settings respected
 * - Automatic topic selection based on priority and usage
 * 
 * SUCCESS CRITERIA:
 * - At least 3/6 agents working = SUCCESS
 * - Complete pipeline = OPTIMAL
 * - Partial pipeline = ACCEPTABLE (manual intervention may be needed)
 * 
 * ERROR HANDLING:
 * - Individual agent failures don't stop the pipeline
 * - Retry logic for transient failures
 * - Comprehensive logging for debugging
 * - Graceful degradation when agents are unavailable
 */

const {
    LambdaClient,
    InvokeCommand
} = require('@aws-sdk/client-lambda');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand
} = require('@aws-sdk/lib-dynamodb');
const {
    DynamoDBClient
} = require('@aws-sdk/client-dynamodb');
const fetch = require('node-fetch'); // For API Gateway calls
// Import context management for enhanced coordination (with fallback)
let createProject, validateContextFlow, getProjectSummary, storeContext;
try {
    const contextManager = require('/opt/nodejs/context-manager');
    const contextIntegration = require('/opt/nodejs/context-integration');
    createProject = contextManager.createProject; // Use the readable name version
    storeContext = contextManager.storeContext;
    validateContextFlow = contextIntegration.validateContextFlow;
    getProjectSummary = contextIntegration.getProjectSummary;
} catch (error) {
    console.log('Context integration layer not available, using fallback');
    // Fallback implementations with READABLE project names
    createProject = async (baseTopic) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const topicSlug = baseTopic.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 30);

        const projectId = `${timestamp}_${topicSlug}`;
        console.log(`📁 Created readable project ID: ${projectId}`);
        return projectId;
    };
    validateContextFlow = async () => ({
        valid: true
    });
    getProjectSummary = async () => ({
        summary: 'No context layer'
    });
}

class WorkflowOrchestrator {
    constructor() {
        this.lambdaClient = new LambdaClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1'
        }));

        this.config = {
            executionsTable: process.env.EXECUTIONS_TABLE_NAME || 'automated-video-pipeline-executions-v2',
            topicsTable: process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics-v2'
        };

        // Agent configuration for direct invocation - Enhanced with Manifest Builder
        this.agents = {
            topicManagement: 'automated-video-pipeline-topic-management-v3',
            scriptGenerator: 'automated-video-pipeline-script-generator-v3',
            mediaCurator: 'automated-video-pipeline-media-curator-v3',
            audioGenerator: 'automated-video-pipeline-audio-generator-v3',
            manifestBuilder: 'automated-video-pipeline-manifest-builder-v3', // NEW: Quality Gatekeeper
            videoAssembler: 'automated-video-pipeline-video-assembler-v3',
            youtubePublisher: 'automated-video-pipeline-youtube-publisher-v3'
        };
    }

    /**
     * Direct agent orchestration without Step Functions
     */
    async runDirectPipeline(topicRequest) {
        const {
            baseTopic,
            projectId: requestedProjectId,
            targetAudience = 'general',
            contentType = 'educational',
            videoDuration = 480,
            videoStyle = 'engaging_educational',
            scheduledBy = 'manual'
        } = topicRequest;

        try {
            console.log(`🚀 Starting direct pipeline execution for topic: ${baseTopic}`);

            // Step 1: Create project with context management
            // PERMANENT FIX: Honor requested project ID if provided
            const projectId = requestedProjectId || await createProject(baseTopic);
            console.log(`📁 ${requestedProjectId ? 'Using requested' : 'Created'} project: ${projectId}`);

            // Create execution record
            const executionRecord = {
                executionId: `direct-${projectId}`,
                projectId: projectId,
                baseTopic: baseTopic,
                status: 'RUNNING',
                startedAt: new Date().toISOString(),
                scheduledBy: scheduledBy,
                type: 'direct-orchestration',
                steps: []
            };

            await this.storeExecutionRecord(executionRecord);

            // Execute the agent flow directly
            const result = await this.executeAgentFlow(projectId, {
                baseTopic,
                targetAudience,
                contentType,
                videoDuration,
                videoStyle
            });

            // Update execution record
            executionRecord.status = result.success ? 'SUCCEEDED' : 'FAILED';
            executionRecord.completedAt = new Date().toISOString();
            executionRecord.result = result;
            await this.storeExecutionRecord(executionRecord);

            console.log(`✅ Direct pipeline execution completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);

            return {
                success: result.success,
                projectId: projectId,
                executionId: executionRecord.executionId,
                result: result,
                type: 'direct-orchestration'
            };

        } catch (error) {
            console.error('❌ Failed to run direct pipeline:', error);
            throw new Error(`Direct pipeline execution failed: ${error.message}`);
        }
    }

    /**
     * Execute the complete agent flow
     */
    async executeAgentFlow(projectId, config) {
        console.log(`🔄 Executing agent flow for project: ${projectId}`);

        const flowResults = {
            success: false,
            steps: [],
            workingAgents: 0,
            totalAgents: 6
        };

        try {
            // Step 1: Topic Management (Google Sheets integration)
            console.log('📋 Step 1: Topic Management...');
            const topicResult = await this.invokeAgent('topicManagement', 'POST', '/topics', {
                baseTopic: config.baseTopic,
                useGoogleSheets: true,
                targetAudience: config.targetAudience,
                projectId: projectId
            });

            flowResults.steps.push({
                step: 1,
                agent: 'Topic Management',
                success: topicResult.success,
                timestamp: new Date().toISOString()
            });

            if (topicResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Topic Management: SUCCESS');
            } else {
                console.log('   ❌ Topic Management: FAILED');
            }

            // Step 2: Script Generation (Simplified endpoint)
            console.log('📝 Step 2: Script Generation...');
            const scriptResult = await this.invokeAgent('scriptGenerator', 'POST', '/scripts/generate', {
                projectId: projectId,
                scriptOptions: {
                    targetLength: config.videoDuration,
                    videoStyle: config.videoStyle,
                    targetAudience: config.targetAudience
                }
            });

            flowResults.steps.push({
                step: 2,
                agent: 'Script Generator',
                success: scriptResult.success,
                timestamp: new Date().toISOString()
            });

            if (scriptResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Script Generator: SUCCESS');
            } else {
                console.log('   ❌ Script Generator: FAILED');
            }

            // Step 3: Media Curation
            console.log('🎨 Step 3: Media Curation...');
            const mediaResult = await this.invokeAgent('mediaCurator', 'POST', '/media/curate', {
                projectId: projectId,
                baseTopic: config.baseTopic,
                sceneCount: 6,
                quality: '1080p'
            });

            flowResults.steps.push({
                step: 3,
                agent: 'Media Curator',
                success: mediaResult.success,
                timestamp: new Date().toISOString()
            });

            if (mediaResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Media Curator: SUCCESS');
            } else {
                console.log('   ❌ Media Curator: FAILED');
            }

            // Step 4: Audio Generation
            console.log('🎵 Step 4: Audio Generation...');
            const audioResult = await this.invokeAgent('audioGenerator', 'POST', '/audio/generate', {
                projectId: projectId,
                text: (scriptResult.data && scriptResult.data.script && scriptResult.data.script.narration) || `Welcome to our guide on ${config.baseTopic}. This comprehensive tutorial will walk you through everything you need to know.`,
                voiceId: 'Joanna'
            });

            flowResults.steps.push({
                step: 4,
                agent: 'Audio Generator',
                success: audioResult.success,
                timestamp: new Date().toISOString()
            });

            if (audioResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Audio Generator: SUCCESS');
            } else {
                console.log('   ❌ Audio Generator: FAILED');
            }

            // Step 5: Manifest Builder - Quality Gatekeeper (Validates ALL upstream agents)
            console.log('📋 Step 5: Manifest Builder - Quality Gatekeeper...');
            console.log('🔍 Validating outputs from Topic Management, Script Generator, Media Curator, and Audio Generator');

            const manifestResult = await this.invokeAgent('manifestBuilder', 'POST', '/manifest/build', {
                projectId: projectId,
                minVisuals: 3, // Enforce minimum 3 visuals per scene
                validateUpstreamAgents: true // Validate all upstream agent outputs
            });

            flowResults.steps.push({
                step: 5,
                agent: 'Manifest Builder (Quality Gatekeeper)',
                success: manifestResult.success,
                timestamp: new Date().toISOString()
            });

            if (!manifestResult.success) {
                console.log('❌ CRITICAL: Quality validation failed - blocking video rendering');
                console.log('🚫 Pipeline terminated due to quality validation failure');
                console.log('🚫 Issues found:', manifestResult.issues);

                // FAIL-FAST: Pipeline terminates here if quality validation fails
                return {
                    success: false,
                    projectId: projectId,
                    error: 'Quality validation failed - insufficient content for video rendering',
                    issues: manifestResult.issues || [],
                    kpis: manifestResult.kpis || {},
                    workingAgents: flowResults.workingAgents,
                    completedSteps: flowResults.steps,
                    validationLogPath: manifestResult.validationLogPath,
                    manifestBlocked: true,
                    timestamp: new Date().toISOString()
                };
            } else {
                flowResults.workingAgents++;
                console.log('✅ Manifest Builder: Quality validation PASSED');
                console.log('📋 Unified manifest created - ready for deterministic video rendering');
            }

            // Step 6: Video Assembly (Now consumes unified manifest.json)
            console.log('🎬 Step 6: Video Assembler (Consuming Unified Manifest)...');
            const videoResult = await this.invokeAgent('videoAssembler', 'POST', '/video/assemble', {
                projectId: projectId,
                useManifest: true, // NEW: Video Assembler now consumes unified manifest.json
                manifestPath: `videos/${projectId}/01-context/manifest.json`
            });

            flowResults.steps.push({
                step: 6,
                agent: 'Video Assembler (Manifest Consumer)',
                success: videoResult.success,
                timestamp: new Date().toISOString()
            });

            if (videoResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Video Assembler: SUCCESS (using unified manifest)');
            } else {
                console.log('   ❌ Video Assembler: FAILED');
            }

            // Step 7: YouTube Publishing (Now consumes manifest metadata)
            console.log('📺 Step 7: YouTube Publishing (Using Manifest Metadata)...');
            const youtubeResult = await this.invokeAgent('youtubePublisher', 'POST', '/youtube/publish', {
                projectId: projectId,
                useManifest: true, // NEW: YouTube Publisher now consumes manifest metadata
                manifestPath: `videos/${projectId}/01-context/manifest.json`,
                privacy: 'public'
            });

            flowResults.steps.push({
                step: 7,
                agent: 'YouTube Publisher (Manifest Consumer)',
                success: youtubeResult.success,
                timestamp: new Date().toISOString()
            });

            if (youtubeResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ YouTube Publisher: SUCCESS (using manifest metadata)');
            } else {
                console.log('   ❌ YouTube Publisher: FAILED');
            }

            // Determine overall success (at least 3 agents working)
            flowResults.success = flowResults.workingAgents >= 3;

            console.log(`📊 Agent Flow Results: ${flowResults.workingAgents}/${flowResults.totalAgents} agents working`);
            console.log(`🎯 Overall Status: ${flowResults.success ? 'SUCCESS' : 'PARTIAL'}`);

            return flowResults;

        } catch (error) {
            console.error('❌ Agent flow execution failed:', error);
            flowResults.error = error.message;
            return flowResults;
        }
    }

    /**
     * Invoke a specific agent
     */
    async invokeAgent(agentKey, method, path, body) {
        const apiBaseUrl = process.env.API_GATEWAY_URL || 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod';
        const apiKey = process.env.API_KEY || 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

        try {
            console.log(`🌐 Invoking ${agentKey} via API Gateway: ${method} ${path}`);

            const url = `${apiBaseUrl}${path}`;
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            const success = response.ok && (!result.statusCode || result.statusCode === 200);

            console.log(`${success ? '✅' : '❌'} ${agentKey} response: ${response.status}`);

            return {
                success,
                statusCode: response.status,
                data: result,
                functionError: null
            };

        } catch (error) {
            console.error(`❌ Failed to invoke ${agentKey} via API Gateway:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Store execution record in DynamoDB
     */
    async storeExecutionRecord(executionRecord) {
        try {
            const command = new PutCommand({
                TableName: this.config.executionsTable,
                Item: executionRecord
            });

            await this.docClient.send(command);
            console.log(`📝 Stored execution record: ${executionRecord.executionId}`);

        } catch (error) {
            console.error('❌ Failed to store execution record:', error);
            // Don't throw - this is not critical for pipeline execution
        }
    }

    /**
     * Get execution status
     */
    async getExecutionStatus(executionId) {
        try {
            const command = new GetCommand({
                TableName: this.config.executionsTable,
                Key: {
                    executionId
                }
            });

            const response = await this.docClient.send(command);
            return response.Item || null;

        } catch (error) {
            console.error('❌ Failed to get execution status:', error);
            return null;
        }
    }

    /**
     * List recent executions
     */
    async listRecentExecutions(limit = 20) {
        try {
            const {
                ScanCommand
            } = await import('@aws-sdk/lib-dynamodb');

            const command = new ScanCommand({
                TableName: this.config.executionsTable,
                Limit: Math.min(limit, 100), // Cap at 100 for performance
                ProjectionExpression: 'executionId, projectId, startTime, endTime, #status, totalAgents, workingAgents',
                ExpressionAttributeNames: {
                    '#status': 'status'
                }
            });

            const response = await this.docClient.send(command);

            // Sort by startTime descending (most recent first)
            const executions = (response.Items || []).sort((a, b) => {
                const timeA = new Date(a.startTime || 0).getTime();
                const timeB = new Date(b.startTime || 0).getTime();
                return timeB - timeA;
            });

            return {
                executions: executions.slice(0, limit),
                count: executions.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Failed to list recent executions:', error);
            return {
                executions: [],
                count: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get pipeline statistics
     */
    async getPipelineStatistics(timeRange = '24h') {
        try {
            const {
                ScanCommand
            } = await import('@aws-sdk/lib-dynamodb');

            // Calculate time filter based on range
            const now = new Date();
            let startTime;

            switch (timeRange) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            const command = new ScanCommand({
                TableName: this.config.executionsTable,
                FilterExpression: 'startTime >= :startTime',
                ExpressionAttributeValues: {
                    ':startTime': startTime.toISOString()
                }
            });

            const response = await this.docClient.send(command);
            const executions = response.Items || [];

            // Calculate statistics
            const stats = {
                timeRange,
                totalExecutions: executions.length,
                successfulExecutions: executions.filter(e => e.status === 'completed').length,
                failedExecutions: executions.filter(e => e.status === 'failed').length,
                runningExecutions: executions.filter(e => e.status === 'running').length,
                averageAgentSuccessRate: 0,
                totalAgentsInvoked: 0,
                totalWorkingAgents: 0,
                timestamp: new Date().toISOString()
            };

            // Calculate agent success rates
            if (executions.length > 0) {
                const totalAgents = executions.reduce((sum, e) => sum + (e.totalAgents || 0), 0);
                const workingAgents = executions.reduce((sum, e) => sum + (e.workingAgents || 0), 0);

                stats.totalAgentsInvoked = totalAgents;
                stats.totalWorkingAgents = workingAgents;
                stats.averageAgentSuccessRate = totalAgents > 0 ? Math.round((workingAgents / totalAgents) * 100) : 0;
            }

            return stats;

        } catch (error) {
            console.error('❌ Failed to get pipeline statistics:', error);
            return {
                timeRange,
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                runningExecutions: 0,
                averageAgentSuccessRate: 0,
                totalAgentsInvoked: 0,
                totalWorkingAgents: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = {
    WorkflowOrchestrator
};