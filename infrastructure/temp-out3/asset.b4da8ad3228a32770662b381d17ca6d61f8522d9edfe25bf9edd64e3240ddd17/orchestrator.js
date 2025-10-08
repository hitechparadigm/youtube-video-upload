/**
 * Workflow Orchestrator
 * Direct agent coordination without Step Functions
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// Import context management for enhanced coordination (with fallback)
let createProject, validateContextFlow, getProjectSummary;
try {
    const contextIntegration = require('/opt/nodejs/context-integration');
    createProject = contextIntegration.createProject;
    validateContextFlow = contextIntegration.validateContextFlow;
    getProjectSummary = contextIntegration.getProjectSummary;
} catch (error) {
    console.log('Context integration layer not available, using fallback');
    // Fallback implementations
    createProject = async (baseTopic, options) => ({
        projectId: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    validateContextFlow = async () => ({ valid: true });
    getProjectSummary = async () => ({ summary: 'No context layer' });
}

class WorkflowOrchestrator {
    constructor() {
        this.lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
        
        this.config = {
            executionsTable: process.env.EXECUTIONS_TABLE_NAME || 'automated-video-pipeline-executions',
            topicsTable: process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics'
        };

        // Agent configuration for direct invocation
        this.agents = {
            topicManagement: 'automated-video-pipeline-topic-management-v2',
            scriptGenerator: 'automated-video-pipeline-script-generator-v2',
            mediaCurator: 'automated-video-pipeline-media-curator-v2',
            audioGenerator: 'automated-video-pipeline-audio-generator-v2',
            videoAssembler: 'automated-video-pipeline-video-assembler-v2',
            youtubePublisher: 'automated-video-pipeline-youtube-publisher-v2'
        };
    }

    /**
     * Direct agent orchestration without Step Functions
     */
    async runDirectPipeline(topicRequest) {
        const {
            baseTopic,
            targetAudience = 'general',
            contentType = 'educational',
            videoDuration = 480,
            videoStyle = 'engaging_educational',
            scheduledBy = 'manual'
        } = topicRequest;

        try {
            console.log(`🚀 Starting direct pipeline execution for topic: ${baseTopic}`);

            // Step 1: Create project with context management
            const projectResult = await createProject(baseTopic, {
                targetAudience,
                contentType,
                videoDuration,
                videoStyle
            });

            const projectId = projectResult.projectId;
            console.log(`📁 Created project: ${projectId}`);

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
            console.error(`❌ Failed to run direct pipeline:`, error);
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
            const topicResult = await this.invokeAgent('topicManagement', 'POST', '/topics/enhanced', {
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

            // Step 2: Script Generation
            console.log('📝 Step 2: Script Generation...');
            const scriptResult = await this.invokeAgent('scriptGenerator', 'POST', '/scripts/generate-enhanced', {
                projectId: projectId,
                baseTopic: config.baseTopic,
                targetLength: config.videoDuration,
                videoStyle: config.videoStyle
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
            const mediaResult = await this.invokeAgent('mediaCurator', 'POST', '/media/curate-from-project', {
                projectId: projectId,
                mediaCount: 6,
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
            const audioResult = await this.invokeAgent('audioGenerator', 'POST', '/audio/generate-from-project', {
                projectId: projectId,
                voiceId: 'Joanna',
                engine: 'standard'
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

            // Step 5: Video Assembly
            console.log('🎬 Step 5: Video Assembly...');
            const videoResult = await this.invokeAgent('videoAssembler', 'POST', '/video/assemble-from-project', {
                projectId: projectId,
                outputOptions: {
                    resolution: '1920x1080',
                    fps: 30,
                    format: 'mp4'
                }
            });

            flowResults.steps.push({
                step: 5,
                agent: 'Video Assembler',
                success: videoResult.success,
                timestamp: new Date().toISOString()
            });

            if (videoResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ Video Assembler: SUCCESS');
            } else {
                console.log('   ❌ Video Assembler: FAILED');
            }

            // Step 6: YouTube Publishing
            console.log('📺 Step 6: YouTube Publishing...');
            const youtubeResult = await this.invokeAgent('youtubePublisher', 'POST', '/youtube/publish', {
                projectId: projectId,
                privacy: 'public'
            });

            flowResults.steps.push({
                step: 6,
                agent: 'YouTube Publisher',
                success: youtubeResult.success,
                timestamp: new Date().toISOString()
            });

            if (youtubeResult.success) {
                flowResults.workingAgents++;
                console.log('   ✅ YouTube Publisher: SUCCESS');
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
        const functionName = this.agents[agentKey];
        
        try {
            const payload = {
                httpMethod: method,
                path: path,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            };

            const command = new InvokeCommand({
                FunctionName: functionName,
                Payload: JSON.stringify(payload),
                InvocationType: 'RequestResponse'
            });

            const response = await this.lambdaClient.send(command);
            
            let result = null;
            if (response.Payload) {
                const payloadString = new TextDecoder().decode(response.Payload);
                result = JSON.parse(payloadString);
            }

            const success = response.StatusCode === 200 && (!result.statusCode || result.statusCode === 200);

            return {
                success,
                statusCode: response.StatusCode,
                data: result,
                functionError: response.FunctionError
            };

        } catch (error) {
            console.error(`❌ Failed to invoke ${agentKey}:`, error);
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
                Key: { executionId }
            });

            const response = await this.docClient.send(command);
            return response.Item || null;

        } catch (error) {
            console.error('❌ Failed to get execution status:', error);
            return null;
        }
    }
}

module.exports = { WorkflowOrchestrator };