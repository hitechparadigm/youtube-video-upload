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
 * AGENT COORDINATION FLOW WITH CONTINUOUS VALIDATION:
 * 1. 📋 Topic Management AI → Manifest Builder (validation)
 * 2. 📝 Script Generator AI → Manifest Builder (validation)
 * 3. 🎨 Media Curator AI → Manifest Builder (validation)
 * 4. 🎵 Audio Generator AI → Manifest Builder (validation)
 * 5. 📋 Manifest Builder AI - Final Quality Gatekeeper (≥3 visuals per scene)
 * 6. 🎬 Video Assembler AI → Manifest Builder (validation) - Only if final validation passes
 * 7. 📺 YouTube Publisher AI - Publishing with SEO optimization
 * 
 * SCHEDULING INTEGRATION:
 * - EventBridge triggers every 8 hours for regular content
 * - High-priority schedule every 4 hours (optional)
 * - Google Sheets frequency settings respected
 * - Automatic topic selection based on priority and usage
 * 
 * SUCCESS CRITERIA:
 * - At least 4/7 agents working = SUCCESS (including Final Manifest Builder)
 * - Complete pipeline = OPTIMAL
 * - Partial pipeline = ACCEPTABLE (manual intervention may be needed)
 * - Final Manifest Builder failure = HARD STOP (prevents bad video rendering)
 * - Intermediate validations = WARNINGS ONLY (pipeline continues)
 * 
 * ERROR HANDLING:
 * - Individual agent failures don't stop the pipeline
 * - Retry logic for transient failures
 * - Comprehensive logging for debugging
 * - Graceful degradation when agents are unavailable
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const fetch = require('node-fetch'); // For API Gateway calls
// Import context management for enhanced coordination (with fallback)
let createProject;
try {
  const contextManager = require('/opt/nodejs/context-manager');
  createProject = contextManager.createProject; // Use the readable name version
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
}

class WorkflowOrchestrator {
  constructor() {
    this.lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
        
    this.config = {
      executionsTable: process.env.EXECUTIONS_TABLE_NAME || 'automated-video-pipeline-executions-v2',
      topicsTable: process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics-v2'
    };

    // Agent configuration for direct invocation
    this.agents = {
      topicManagement: 'automated-video-pipeline-topic-management-v2',
      scriptGenerator: 'automated-video-pipeline-script-generator-v2',
      mediaCurator: 'automated-video-pipeline-media-curator-v2',
      audioGenerator: 'automated-video-pipeline-audio-generator-v2',
      manifestBuilder: 'automated-video-pipeline-manifest-builder',
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
      totalAgents: 7  // Updated to include Manifest Builder
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
        
        // Validate after Topic Management
        const topicValidation = await this.validateWithManifestBuilder(projectId, 'topic-complete');
        if (!topicValidation.success) {
          console.log('   ❌ Topic validation failed - continuing with warnings');
        }
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
        
        // Validate after Script Generation
        const scriptValidation = await this.validateWithManifestBuilder(projectId, 'script-complete');
        if (!scriptValidation.success) {
          console.log('   ❌ Script validation failed - continuing with warnings');
        }
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
        
        // Validate after Media Curation
        const mediaValidation = await this.validateWithManifestBuilder(projectId, 'media-complete');
        if (!mediaValidation.success) {
          console.log('   ❌ Media validation failed - continuing with warnings');
        }
      } else {
        console.log('   ❌ Media Curator: FAILED');
      }

      // Step 4: Audio Generation
      console.log('🎵 Step 4: Audio Generation...');
      const audioResult = await this.invokeAgent('audioGenerator', 'POST', '/audio/generate', {
        projectId: projectId,
        text: scriptResult.data?.script?.narration || `Welcome to our guide on ${config.baseTopic}. This comprehensive tutorial will walk you through everything you need to know.`,
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
        
        // Validate after Audio Generation
        const audioValidation = await this.validateWithManifestBuilder(projectId, 'audio-complete');
        if (!audioValidation.success) {
          console.log('   ❌ Audio validation failed - continuing with warnings');
        }
      } else {
        console.log('   ❌ Audio Generator: FAILED');
      }

      // Step 5: Final Manifest Builder Validation (Quality Gatekeeper)
      console.log('📋 Step 5: Final Manifest Builder Validation (Quality Gatekeeper)...');
      const manifestResult = await this.invokeAgent('manifestBuilder', 'POST', '/manifest/build', {
        projectId: projectId,
        minVisualsPerScene: 3,
        strict: true,
        phase: 'final-validation'
      });

      flowResults.steps.push({
        step: 5,
        agent: 'Manifest Builder (Final)',
        success: manifestResult.success,
        timestamp: new Date().toISOString()
      });

      if (manifestResult.success) {
        flowResults.workingAgents++;
        console.log('   ✅ Final Manifest Validation: SUCCESS - Ready for video assembly');
      } else {
        console.log('   ❌ Final Manifest Validation: FAILED - Insufficient content quality');
        console.log('   🚫 Short-circuiting pipeline - cannot proceed to video assembly');
        
        // Short-circuit the pipeline - don't proceed to video assembly
        flowResults.success = flowResults.workingAgents >= 4;
        flowResults.error = 'Final manifest validation failed - insufficient content quality for video rendering';
        return flowResults;
      }

      // Step 6: Video Assembly (Only if manifest validation passed)
      console.log('🎬 Step 6: Video Assembly...');
      const videoResult = await this.invokeAgent('videoAssembler', 'POST', '/video/assemble', {
        projectId: projectId,
        script: scriptResult.data?.script,
        mediaAssets: mediaResult.data?.mediaAssets || [],
        audioUrl: audioResult.data?.audioUrl
      });

      flowResults.steps.push({
        step: 6,
        agent: 'Video Assembler',
        success: videoResult.success,
        timestamp: new Date().toISOString()
      });

      if (videoResult.success) {
        flowResults.workingAgents++;
        console.log('   ✅ Video Assembler: SUCCESS');
        
        // Validate after Video Assembly
        const videoValidation = await this.validateWithManifestBuilder(projectId, 'video-complete');
        if (!videoValidation.success) {
          console.log('   ❌ Video validation failed - continuing with warnings');
        }
      } else {
        console.log('   ❌ Video Assembler: FAILED');
      }

      // Step 7: YouTube Publishing
      console.log('📺 Step 7: YouTube Publishing...');
      
      // Normalize metadata from script generator results
      const scriptData = scriptResult?.data?.script || scriptResult?.data;
      const topicData = topicResult?.data?.topic || topicResult?.data;
      
      console.log('🔍 Debug - Script result data:', JSON.stringify(scriptResult?.data, null, 2));
      console.log('🔍 Debug - Topic result data:', JSON.stringify(topicResult?.data, null, 2));
      
      const normalizedMetadata = {
        title: scriptData?.title || topicData?.title || `Video: ${config.baseTopic}`,
        description: scriptData?.description || topicData?.description || `Automated video about ${config.baseTopic}`,
        tags: scriptData?.tags || topicData?.tags || [config.baseTopic.toLowerCase(), 'automated', 'ai-generated'],
        category: scriptData?.category || 'Education'
      };
      
      console.log('📋 Normalized metadata for YouTube:', JSON.stringify(normalizedMetadata, null, 2));
      
      const youtubeResult = await this.invokeAgent('youtubePublisher', 'POST', '/youtube/publish', {
        projectId: projectId,                   // REQUIRED by the complete-metadata publisher
        privacy: 'public',
        metadata: normalizedMetadata
      });

      flowResults.steps.push({
        step: 7,
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

      // Determine overall success (at least 4 agents working, including Manifest Builder)
      flowResults.success = flowResults.workingAgents >= 4;

      console.log(`📊 Agent Flow Results: ${flowResults.workingAgents}/${flowResults.totalAgents} agents working`);
      console.log(`🎯 Overall Status: ${flowResults.success ? 'SUCCESS' : 'PARTIAL'}`);
      
      if (flowResults.error) {
        console.log(`⚠️  Pipeline Error: ${flowResults.error}`);
      }

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
    // For manifest builder, use direct Lambda invocation since it may not have API Gateway endpoint yet
    if (agentKey === 'manifestBuilder') {
      return await this.invokeLambdaDirect(this.agents[agentKey], method, path, body);
    }

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
   * Validate project state with Manifest Builder after each agent
   */
  async validateWithManifestBuilder(projectId, phase) {
    try {
      console.log(`🔍 Validating project state after ${phase}...`);
      
      const validationResult = await this.invokeLambdaDirect(
        this.agents.manifestBuilder, 
        'POST', 
        '/manifest/validate', 
        {
          projectId: projectId,
          phase: phase,
          strict: false  // Non-strict for intermediate validations
        }
      );

      if (validationResult.success) {
        console.log(`   ✅ ${phase} validation passed`);
      } else {
        console.log(`   ⚠️  ${phase} validation warnings: ${validationResult.data?.issues?.length || 0} issues`);
      }

      return validationResult;
    } catch (error) {
      console.error(`   ❌ ${phase} validation error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Direct Lambda invocation for agents without API Gateway endpoints
   */
  async invokeLambdaDirect(functionName, method, path, body) {
    try {
      console.log(`🔗 Invoking ${functionName} directly via Lambda: ${method} ${path}`);

      const payload = {
        httpMethod: method,
        path: path,
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify(payload)
      });

      const response = await this.lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      const success = !response.FunctionError && result.statusCode === 200;
      const data = result.body ? JSON.parse(result.body) : result;

      console.log(`${success ? '✅' : '❌'} ${functionName} direct response: ${result.statusCode}`);

      return {
        success,
        statusCode: result.statusCode,
        data: data,
        functionError: response.FunctionError
      };

    } catch (error) {
      console.error(`❌ Failed to invoke ${functionName} directly:`, error);
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
     * Get execution status (unified format)
     */
  async getExecutionStatus(executionId) {
    try {
      const command = new GetCommand({
        TableName: this.config.executionsTable,
        Key: { executionId }
      });

      const response = await this.docClient.send(command);
      const execution = response.Item;
      
      if (!execution) {
        return {
          success: false,
          error: 'Execution not found',
          executionId: executionId
        };
      }

      // Return unified status format
      return {
        success: true,
        executionId: execution.executionId,
        projectId: execution.projectId,
        status: execution.status,
        baseTopic: execution.baseTopic,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        type: execution.type,
        workingAgents: execution.result?.workingAgents || 0,
        totalAgents: execution.result?.totalAgents || 7,
        steps: execution.result?.steps || [],
        error: execution.result?.error || null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to get execution status:', error);
      return {
        success: false,
        error: error.message,
        executionId: executionId
      };
    }
  }

  /**
     * Get enhanced execution status (same as regular status for consistency)
     */
  async getEnhancedExecutionStatus(executionId) {
    // Use the same unified format for consistency
    return await this.getExecutionStatus(executionId);
  }

  /**
     * List recent executions
     */
  async listRecentExecutions(limit = 20) {
    try {
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
            
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
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
            
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

module.exports = { WorkflowOrchestrator };
