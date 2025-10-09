/**
 * 📝 SCRIPT GENERATOR AI LAMBDA FUNCTION
 * 
 * ROLE: AI-Powered Video Script Generation using Claude 3 Sonnet
 * This Lambda function transforms topic contexts into professional video scripts
 * with scene breakdowns, hooks, and SEO-optimized metadata.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 🤖 AI Script Generation - Uses Claude 3 Sonnet for professional scripts
 * 2. 🎬 Scene Breakdown - Creates detailed scene-by-scene structure
 * 3. 🎯 Hook Creation - Generates engaging opening hooks for retention
 * 4. 📊 SEO Optimization - Creates YouTube-optimized titles and descriptions
 * 5. 🔄 Context Flow - Retrieves topic context and stores scene context
 * 
 * AI MODEL: Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)
 * - Advanced reasoning and creativity
 * - Professional writing quality
 * - Context-aware content generation
 * 
 * ENDPOINTS:
 * - POST /scripts/generate - Basic script generation
 * - POST /scripts/generate-enhanced - Enhanced generation with context (main endpoint)
 * - POST /scripts/generate-from-project - Generate from existing project
 * - GET /health - Health check
 * 
 * CONTEXT FLOW:
 * 1. INPUT: Retrieves topic context from Topic Management AI
 * 2. PROCESSING: Generates professional script using Claude 3 Sonnet
 * 3. OUTPUT: Stores scene context for Media Curator AI
 * 
 * SCRIPT STRUCTURE:
 * - Hook (0-15 seconds) - Attention-grabbing opening
 * - Introduction (15-30 seconds) - Topic overview
 * - Main Content (30-420 seconds) - Core information with scenes
 * - Call to Action (420-480 seconds) - Engagement and subscription
 * 
 * INTEGRATION FLOW:
 * Topic Management AI → Script Generator AI → Media Curator AI
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { generateS3Paths } = require('/opt/nodejs/s3-folder-structure');
// Try to import optional dependencies
let configManager = null;
let contextIntegration = null;

try {
    const configModule = require('/opt/nodejs/config-manager');
    configManager = configModule;
} catch (error) {
    console.log('Config manager not available, using defaults');
}

try {
    contextIntegration = require('/opt/nodejs/context-integration');
} catch (error) {
    console.log('Context integration not available, using standalone mode');
}

// Global configuration
let config = null;

// Initialize AWS clients
let bedrockClient = null;
let dynamoClient = null;
let docClient = null;
let s3Client = null;

// Configuration values
let SCRIPTS_TABLE = null;
let TOPICS_TABLE = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration (with fallback)
        if (configManager) {
            const configManagerInstance = await configManager.initializeConfig();
            config = configManagerInstance.getServiceConfig('script-generator');
        } else {
            // Fallback configuration
            config = {
                ai: {
                    models: {
                        primary: {
                            region: 'us-east-1',
                            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                        }
                    }
                }
            };
        }
        
        // Initialize AWS clients
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        bedrockClient = new BedrockRuntimeClient({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true
            }
        });
        s3Client = new S3Client({ region });
        
        // Set table names
        SCRIPTS_TABLE = process.env.SCRIPTS_TABLE_NAME || 'automated-video-pipeline-scripts';
        TOPICS_TABLE = process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics';
        
        console.log('Script Generator service initialized');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Script Generator invoked:', JSON.stringify(event, null, 2));
    
    try {
        // Initialize service on first invocation
        await initializeService();
        
        const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
        
        // Parse request body if present
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        // Route requests
        if (httpMethod === 'GET' && path === '/health') {
            return createResponse(200, {
                service: 'script-generator',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        } else if (httpMethod === 'POST' && path === '/scripts/generate') {
            return await generateScript(requestBody);
        } else if (httpMethod === 'POST' && path === '/scripts/generate-enhanced') {
            return await generateEnhancedScript(requestBody);
        } else if (httpMethod === 'POST' && path === '/scripts/generate-from-project') {
            return await generateScriptFromProject(requestBody);
        } else if (httpMethod === 'POST' && path === '/scripts/generate-from-topic') {
            return await generateScriptFromTopic(requestBody);
        } else if (httpMethod === 'GET' && path === '/scripts') {
            return await getScripts(queryStringParameters || {});
        } else if (httpMethod === 'GET' && path.startsWith('/scripts/')) {
            const scriptId = pathParameters?.scriptId || path.split('/').pop();
            return await getScript(scriptId);
        } else if (httpMethod === 'POST' && path === '/scripts/optimize') {
            return await optimizeScript(requestBody);
        } else if (httpMethod === 'POST' && path === '/scripts/validate') {
            return await validateScript(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Script Generator:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Generate script from topic data with enhanced context processing
 */
async function generateScript(requestBody) {
    const { 
        topic, 
        title, 
        hook, 
        targetLength = 600, // seconds (10 minutes)
        style = 'engaging_educational',
        targetAudience = 'general',
        includeVisuals = true,
        includeTiming = true,
        projectId = null, // Project ID for organized storage
        topicContext = null // Enhanced context from Topic Management AI
    } = requestBody;
    
    try {
        console.log(`Generating script for topic: ${topic}`);
        
        // Validate required fields
        if (!topic || !title) {
            return createResponse(400, { 
                error: 'Missing required fields: topic and title are required' 
            });
        }
        
        // Generate the script using AI with enhanced context
        const scriptData = await generateScriptWithAI({
            topic,
            title,
            hook,
            targetLength,
            style,
            targetAudience,
            includeVisuals,
            includeTiming,
            topicContext
        });
        
        // Store the generated script
        const storedScript = await storeScript(scriptData, projectId);
        
        return createResponse(200, {
            message: 'Script generated successfully',
            script: storedScript,
            wordCount: scriptData.wordCount,
            estimatedDuration: scriptData.estimatedDuration,
            sceneCount: scriptData.scenes?.length || 0
        });
        
    } catch (error) {
        console.error('Error generating script:', error);
        return createResponse(500, { 
            error: 'Failed to generate script',
            message: error.message 
        });
    }
}

/**
 * Generate enhanced script with topic context from Topic Management AI
 */
async function generateEnhancedScript(requestBody) {
    const { 
        topicContext,
        baseTopic,
        targetLength,
        style = 'engaging_educational',
        targetAudience = 'general',
        projectId = null
    } = requestBody;
    
    try {
        console.log(`Generating enhanced script with topic context for: ${baseTopic}`);
        
        // Validate required fields
        if (!topicContext || !baseTopic) {
            return createResponse(400, { 
                error: 'Missing required fields: topicContext and baseTopic are required' 
            });
        }
        
        // Extract information from topic context
        const optimalDuration = topicContext.videoStructure?.mainContentDuration + 
                               topicContext.videoStructure?.hookDuration + 
                               topicContext.videoStructure?.conclusionDuration || targetLength;
        
        const title = topicContext.expandedTopics?.[0]?.subtopic || baseTopic;
        
        // Generate the enhanced script using AI with full context
        const scriptData = await generateScriptWithAI({
            topic: baseTopic,
            title: title,
            hook: null, // Let AI create based on context
            targetLength: optimalDuration,
            style,
            targetAudience,
            includeVisuals: true,
            includeTiming: true,
            topicContext
        });
        
        // Add context metadata to script
        scriptData.enhancedFeatures = {
            usedTopicContext: true,
            contextSource: 'topic_management_ai',
            intelligentScenes: true,
            sceneOptimization: 'duration_and_complexity_based',
            expandedTopicsUsed: topicContext.expandedTopics?.length || 0,
            seoOptimized: !!topicContext.seoContext?.primaryKeywords?.length
        };
        
        // Store the generated script
        const storedScript = await storeScript(scriptData, projectId);
        
        return createResponse(200, {
            message: 'Enhanced script generated successfully',
            script: storedScript,
            wordCount: scriptData.wordCount,
            estimatedDuration: scriptData.estimatedDuration,
            sceneCount: scriptData.scenes?.length || 0,
            enhancedFeatures: scriptData.enhancedFeatures,
            contextUsed: {
                expandedTopics: topicContext.expandedTopics?.length || 0,
                sceneContexts: topicContext.sceneContexts?.length || 0,
                seoKeywords: topicContext.seoContext?.primaryKeywords?.length || 0
            }
        });
        
    } catch (error) {
        console.error('Error generating enhanced script:', error);
        return createResponse(500, { 
            error: 'Failed to generate enhanced script',
            message: error.message 
        });
    }
}

/**
 * Generate script from project using stored topic context
 */
async function generateScriptFromProject(requestBody) {
    const { 
        projectId,
        scriptOptions = {}
    } = requestBody;
    
    try {
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }
        
        console.log(`📝 Generating script for project: ${projectId}`);
        
        // Retrieve topic context from Context Manager
        console.log('🔍 Retrieving topic context from Context Manager...');
        const topicContext = await contextIntegration.getTopicContext(projectId);
        
        console.log('✅ Retrieved topic context:');
        console.log(`   - Expanded topics: ${topicContext.expandedTopics?.length || 0}`);
        console.log(`   - Video structure: ${topicContext.videoStructure?.recommendedScenes || 0} scenes`);
        console.log(`   - SEO keywords: ${topicContext.seoContext?.primaryKeywords?.length || 0}`);
        
        // Extract optimal parameters from topic context
        const optimalDuration = topicContext.videoStructure?.mainContentDuration + 
                               topicContext.videoStructure?.hookDuration + 
                               topicContext.videoStructure?.conclusionDuration || 480;
        
        const selectedSubtopic = topicContext.expandedTopics?.[0]?.subtopic || topicContext.mainTopic;
        
        // Generate enhanced script using topic context
        const scriptData = await generateScriptWithAI({
            topic: topicContext.mainTopic,
            title: selectedSubtopic,
            hook: null, // Let AI create based on context
            targetLength: optimalDuration,
            style: scriptOptions.style || 'engaging_educational',
            targetAudience: scriptOptions.targetAudience || 'general',
            includeVisuals: true,
            includeTiming: true,
            topicContext
        });
        
        // Add context metadata to script
        scriptData.enhancedFeatures = {
            usedTopicContext: true,
            contextSource: 'topic_management_ai',
            intelligentScenes: true,
            sceneOptimization: 'duration_and_complexity_based',
            expandedTopicsUsed: topicContext.expandedTopics?.length || 0,
            seoOptimized: !!topicContext.seoContext?.primaryKeywords?.length,
            projectId: projectId
        };
        
        // Store the generated script
        const storedScript = await storeScript(scriptData, projectId);
        
        // Create scene context for Media Curator AI
        const sceneContext = {
            projectId: projectId,
            baseTopic: topicContext.mainTopic,
            selectedSubtopic: selectedSubtopic,
            scenes: scriptData.scenes || [],
            totalDuration: scriptData.estimatedDuration || optimalDuration,
            sceneCount: scriptData.scenes?.length || 0,
            overallStyle: scriptOptions.style || 'engaging_educational',
            targetAudience: scriptOptions.targetAudience || 'general',
            sceneFlow: scriptData.sceneFlow || {},
            contextUsage: {
                usedTopicContext: true,
                usedVideoStructure: true,
                usedContentGuidance: true,
                usedSeoKeywords: true
            }
        };
        
        // Store scene context for Media Curator AI
        await contextIntegration.storeSceneContext(projectId, sceneContext);
        console.log(`💾 Stored scene context for Media Curator AI`);
        
        // Update project summary
        await contextIntegration.updateProjectSummary(projectId, 'script', {
            scriptId: storedScript.scriptId,
            selectedSubtopic: selectedSubtopic,
            sceneCount: sceneContext.sceneCount,
            totalDuration: sceneContext.totalDuration,
            enhancedFeatures: scriptData.enhancedFeatures
        });
        
        return createResponse(200, {
            message: 'Context-aware script generated successfully',
            projectId: projectId,
            script: storedScript,
            sceneContext: {
                sceneCount: sceneContext.sceneCount,
                totalDuration: sceneContext.totalDuration,
                selectedSubtopic: selectedSubtopic
            },
            enhancedFeatures: scriptData.enhancedFeatures,
            contextFlow: {
                topicContextUsed: true,
                sceneContextStored: true,
                readyForMediaCuration: true
            }
        });
        
    } catch (error) {
        console.error('Error generating script from project:', error);
        return createResponse(500, { 
            error: 'Failed to generate script from project',
            message: error.message 
        });
    }
}

/**
 * Generate script from existing topic ID
 */
async function generateScriptFromTopic(requestBody) {
    const { topicId, scriptOptions = {} } = requestBody;
    
    try {
        if (!topicId) {
            return createResponse(400, { error: 'topicId is required' });
        }
        
        // Get topic data from database
        const topicData = await getTopicData(topicId);
        if (!topicData) {
            return createResponse(404, { error: 'Topic not found' });
        }
        
        // Generate script using topic data
        const scriptRequest = {
            topic: topicData.topic,
            title: topicData.title || topicData.topic,
            hook: topicData.hook,
            targetAudience: topicData.targetAudience || 'general',
            style: topicData.contentStyle || 'engaging_educational',
            ...scriptOptions
        };
        
        return await generateScript(scriptRequest);
        
    } catch (error) {
        console.error('Error generating script from topic:', error);
        return createResponse(500, { 
            error: 'Failed to generate script from topic',
            message: error.message 
        });
    }
}

/**
 * Generate script using AI (Claude 3 Sonnet) with enhanced topic context
 */
async function generateScriptWithAI(params) {
    const {
        topic,
        title,
        hook,
        targetLength,
        style,
        targetAudience,
        includeVisuals,
        includeTiming,
        topicContext
    } = params;
    
    // Create the enhanced AI prompt for script generation
    const prompt = createEnhancedScriptGenerationPrompt({
        topic,
        title,
        hook,
        targetLength,
        style,
        targetAudience,
        includeVisuals,
        includeTiming,
        topicContext
    });
    
    // Get AI model configuration with defaults
    const modelId = config?.ai?.models?.primary?.id || process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
    const temperature = config?.ai?.models?.primary?.temperature || 0.7;
    const maxTokens = config?.ai?.models?.primary?.maxTokens || 4000;
    
    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };
    
    console.log('Sending request to Bedrock for script generation');
    
    const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
    });
    
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
        throw new Error('Invalid response from AI model');
    }
    
    const aiResponse = responseBody.content[0].text;
    
    // Parse the AI response into structured script data
    const scriptData = parseAIScriptResponse(aiResponse, params);
    
    return scriptData;
}

/**
 * Create enhanced AI prompt for script generation with industry best practices
 */
function createEnhancedScriptGenerationPrompt(params) {
    const {
        topic,
        title,
        hook,
        targetLength,
        style,
        targetAudience,
        includeVisuals,
        includeTiming,
        topicContext
    } = params;
    
    const targetMinutes = Math.round(targetLength / 60);
    const wordsPerMinute = 140; // Industry standard: 120-150 words per minute
    const targetWords = Math.round(targetLength * (wordsPerMinute / 60));
    
    // Extract context information if available
    const contextInfo = topicContext ? {
        expandedTopics: topicContext.expandedTopics || [],
        videoStructure: topicContext.videoStructure || {},
        contentGuidance: topicContext.contentGuidance || {},
        sceneContexts: topicContext.sceneContexts || [],
        seoContext: topicContext.seoContext || {}
    } : {};
    
    // Determine optimal number of scenes based on duration and topic complexity
    const recommendedScenes = topicContext?.videoStructure?.recommendedScenes || 
        Math.max(4, Math.min(7, Math.ceil(targetLength / 75))); // 75 seconds per scene average for better pacing
    
    // Build context-aware prompt sections
    const expandedTopicsText = (contextInfo.expandedTopics?.length > 0)
        ? `\n\n**EXPANDED TOPIC IDEAS (use these for scene content):**\n${contextInfo.expandedTopics.map(t => `- ${t.subtopic} (${t.priority} priority, ${t.estimatedDuration}s, needs: ${t.visualNeeds})`).join('\n')}`
        : '';
        
    const contentGuidanceText = (contextInfo.contentGuidance?.complexConcepts?.length > 0) || (contextInfo.contentGuidance?.quickWins?.length > 0) || (contextInfo.contentGuidance?.visualOpportunities?.length > 0)
        ? `\n\n**CONTENT GUIDANCE:**\n- Complex concepts needing explanation: ${contextInfo.contentGuidance?.complexConcepts?.join(', ') || 'None'}\n- Quick wins for engagement: ${contextInfo.contentGuidance?.quickWins?.join(', ') || 'None'}\n- Visual opportunities: ${contextInfo.contentGuidance?.visualOpportunities?.join(', ') || 'None'}`
        : '';
        
    const seoKeywordsText = (contextInfo.seoContext?.primaryKeywords?.length > 0)
        ? `\n\n**SEO KEYWORDS TO NATURALLY INCORPORATE:**\n- Primary: ${contextInfo.seoContext.primaryKeywords?.join(', ')}\n- Long-tail: ${contextInfo.seoContext.longTailKeywords?.join(', ')}`
        : '';
    
    return `**ROLE:** You are an expert video scriptwriter specializing in creating engaging, high-performing video content for YouTube with proven industry expertise in ${style} content for ${targetAudience} audiences.

**OBJECTIVE:** Generate a complete, production-ready video script for a ${targetMinutes}-minute video on the topic: ${topic}. The video's primary goal is to educate and engage ${targetAudience} viewers, achieving these specific outcomes:
1. Clearly explain the concept to the target audience
2. Drive viewers to watch until the end (high retention)
3. Generate engagement (likes, comments, subscriptions)
4. Provide actionable value that viewers can immediately use

**TARGET AUDIENCE:** ${targetAudience} who consume content on mobile and desktop devices, seek quick actionable insights, and have varying knowledge levels about ${topic}. They value authentic, conversational content that respects their time and intelligence.${expandedTopicsText}${contentGuidanceText}${seoKeywordsText}

**SCRIPT STRUCTURE REQUIREMENTS (Industry Best Practices):**

**Opening Hook (5-10 seconds):** Start with a powerful question, surprising statistic, bold statement, or relatable problem that immediately grabs attention. Examples:
- "What if I told you that [surprising fact about topic]?"
- "Most people get [topic] completely wrong, and here's why..."
- "In the next ${targetMinutes} minutes, you'll discover [specific benefit]..."

**Introduction (10-20 seconds):** Briefly introduce the topic, establish credibility, and clearly state what viewers will learn. Use "you" language and make a promise you'll deliver on.

**Main Content (${recommendedScenes-2} Scenes):** Break the core content into ${recommendedScenes-2} distinct scenes, each focusing on one key point. Each scene should:
- Have a clear mini-objective that builds toward the overall message
- Flow logically from the previous scene
- Include concrete examples, data, or stories to illustrate points
- Maintain viewer engagement with variety in pacing and delivery
- End with a transition that creates curiosity for the next scene

**Conclusion (10-15 seconds):** Summarize the key takeaways in 2-3 concise, memorable points.

**Call to Action (5-10 seconds):** End with a specific, actionable CTA that aligns with the video's objective.

**TONE AND STYLE REQUIREMENTS:**
- Use a conversational tone that sounds natural and authentic
- Write as if speaking directly to one person, not a crowd
- Keep sentences short and punchy (under 12 words when possible) for easy comprehension
- Use active voice and present tense for immediacy and engagement
- Incorporate emotional and sensory words that spark feelings (e.g., "imagine freeing up 3 hours daily" instead of "saves time")
- Avoid jargon, acronyms, or complex terminology—when used, immediately explain them
- Include rhetorical questions and direct audience engagement prompts
- Aim for approximately ${targetWords} words (${wordsPerMinute} words/minute speaking pace)

**SCENE BREAKDOWN REQUIREMENTS:**
For each scene, provide:
- **Scene Number and Title:** Clear identifier for production reference
- **Duration:** Estimated time for this segment (must add up to ${targetLength} seconds total)
- **Purpose:** What this scene accomplishes in the overall narrative
- **Narration/Dialogue:** Exact words to be spoken, written conversationally
- **Visual Cues:** Detailed description of what should appear on screen
- **Engagement Elements:** Hooks, questions, or surprises to maintain attention
- **Transition:** How this scene connects to the next

**MANDATORY QUALITY REQUIREMENTS:**
1. **Accessibility:** Script must be fully comprehensible through audio alone
2. **Pacing:** Include natural pauses for emphasis and breathing
3. **Engagement:** Include at least one quotable line or unique insight per scene
4. **Focus:** Stay on one core message with 3-5 supporting points maximum
5. **Retention:** Hook viewers every 30-45 seconds with questions, surprises, or value
6. **Conversational Flow:** Must sound natural when read aloud
7. **Specific Value:** Provide concrete, actionable takeaways, not vague advice

**CRITICAL OUTPUT FORMAT:**
Return the script as a JSON object with this EXACT structure:

\`\`\`json
{
  "title": "${title}",
  "topic": "${topic}",
  "hook": "The opening hook text that grabs attention in first 5 seconds",
  "estimatedDuration": ${targetLength},
  "totalDuration": ${targetLength},
  "wordCount": ${targetWords},
  "style": "${style}",
  "targetAudience": "${targetAudience}",
  "sceneStructure": {
    "totalScenes": ${recommendedScenes},
    "averageSceneLength": "${Math.round(targetLength/recommendedScenes)} seconds",
    "structureRationale": "Explain why this scene structure serves the topic and audience"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Hook - [Descriptive Title]",
      "purpose": "grab_attention_immediately",
      "startTime": 0,
      "endTime": 10,
      "duration": 10,
      "script": "Conversational script text that hooks viewers in first 5 seconds...",
      "visualStyle": "dynamic_engaging",
      "mediaNeeds": ["specific visual type", "mood/style"],
      "tone": "exciting_curious",
      "visualCues": ["Specific visual description", "Text overlay suggestion"],
      "keyPoints": ["Main point of this scene"],
      "engagementHooks": ["Question", "Surprise", "Pattern interrupt"],
      "transitionToNext": "Natural bridge to next scene that creates curiosity"
    }
  ],
  "sceneFlow": {
    "narrativeArc": "How scenes build logically toward the conclusion",
    "engagementStrategy": "Specific retention techniques used throughout",
    "visualProgression": "How visuals support and enhance the narrative"
  },
  "callToAction": "Specific, actionable CTA that drives engagement",
  "keywords": ["naturally incorporated SEO keywords"],
  "description": "Compelling YouTube description with value proposition",
  "tags": ["relevant", "searchable", "tags"]
}
\`\`\`

**FINAL QUALITY CHECKS - ENSURE THE SCRIPT:**
✓ Opens with attention-grabbing hook within 5 seconds
✓ Maintains conversational flow when read aloud
✓ Delivers on the promise made in the opening
✓ Includes specific, actionable takeaways in each scene
✓ Ends with clear, compelling call to action
✓ Stays focused without tangents or unnecessary details
✓ Uses short sentences (under 12 words) for mobile viewing
✓ Incorporates emotional language that connects with viewers
✓ Provides concrete examples and specific details, not vague concepts
✓ Creates curiosity gaps that pull viewers through each scene

Generate a professional, engaging script that follows these industry best practices and will achieve high retention and engagement on YouTube!`;
}

/**
 * Create AI prompt for script generation (legacy function for backward compatibility)
 */
function createScriptGenerationPrompt(params) {
    // For backward compatibility, call the enhanced version without topic context
    return createEnhancedScriptGenerationPrompt({
        ...params,
        topicContext: null
    });
}

/**
 * Parse AI response into structured script data
 */
function parseAIScriptResponse(aiResponse, originalParams) {
    try {
        // Try to extract JSON from the AI response
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        let scriptData;
        
        if (jsonMatch) {
            scriptData = JSON.parse(jsonMatch[1]);
        } else {
            // If no JSON block found, try to parse the entire response
            scriptData = JSON.parse(aiResponse);
        }
        
        // Validate and enhance the script data
        scriptData.scriptId = `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        scriptData.createdAt = new Date().toISOString();
        scriptData.generatedBy = 'ai';
        scriptData.version = '1.0';
        
        // Calculate actual word count
        const fullScript = scriptData.scenes?.map(scene => scene.script).join(' ') || '';
        scriptData.wordCount = fullScript.split(/\s+/).length;
        
        // Validate scenes structure and calculate total duration
        if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
            let calculatedTotalDuration = 0;
            
            scriptData.scenes = scriptData.scenes.map((scene, index) => {
                const enhancedScene = {
                    sceneNumber: scene.sceneNumber || index + 1,
                    title: scene.title || `Scene ${index + 1}`,
                    startTime: scene.startTime || 0,
                    endTime: scene.endTime || 0,
                    duration: scene.duration || (scene.endTime - scene.startTime) || 0,
                    script: scene.script || '',
                    visualCues: scene.visualCues || [],
                    notes: scene.notes || '',
                    keyPoints: scene.keyPoints || [],
                    ...scene
                };
                
                // Add to total duration calculation
                calculatedTotalDuration += enhancedScene.duration;
                
                return enhancedScene;
            });
            
            // Set totalDuration based on calculated value or use estimatedDuration as fallback
            scriptData.totalDuration = calculatedTotalDuration > 0 ? calculatedTotalDuration : scriptData.estimatedDuration;
            
            // INDUSTRY STANDARDS VALIDATION
            const validationResult = validateScriptAgainstIndustryStandards(scriptData, originalParams);
            if (!validationResult.isValid) {
                console.warn('Script validation failed:', validationResult.errors);
                // Add validation warnings to metadata
                scriptData.validationWarnings = validationResult.errors;
            }
        } else {
            // If no scenes, use estimatedDuration
            scriptData.totalDuration = scriptData.estimatedDuration || originalParams.targetLength || 0;
        }
        
        // Add metadata
        scriptData.metadata = {
            originalParams,
            processingTime: new Date().toISOString(),
            aiModel: config.ai?.models?.primary?.id || 'claude-3-sonnet',
            promptVersion: '1.0'
        };
        
        return scriptData;
        
    } catch (error) {
        console.error('Error parsing AI script response:', error);
        
        // Fallback: create a basic script structure
        return createFallbackScript(aiResponse, originalParams);
    }
}

/**
 * Create fallback script if AI response parsing fails
 */
function createFallbackScript(aiResponse, originalParams) {
    const { topic, title, targetLength } = originalParams;
    
    return {
        scriptId: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        topic: topic,
        hook: "Welcome to today's video!",
        estimatedDuration: targetLength,
        wordCount: aiResponse.split(/\s+/).length,
        style: originalParams.style,
        targetAudience: originalParams.targetAudience,
        scenes: [
            {
                sceneNumber: 1,
                title: "Full Script",
                startTime: 0,
                endTime: targetLength,
                duration: targetLength,
                script: aiResponse,
                visualCues: ["Show presenter talking"],
                notes: "AI response could not be parsed into scenes",
                keyPoints: []
            }
        ],
        callToAction: "Thanks for watching!",
        keywords: [topic],
        description: `A video about ${topic}`,
        tags: [topic],
        createdAt: new Date().toISOString(),
        generatedBy: 'ai-fallback',
        version: '1.0',
        metadata: {
            originalParams,
            processingTime: new Date().toISOString(),
            fallbackReason: 'Could not parse structured AI response'
        }
    };
}

/**
 * Store generated script in DynamoDB
 */
async function storeScript(scriptData, projectId = null) {
    const item = {
        PK: `SCRIPT#${scriptData.scriptId}`,
        SK: 'METADATA',
        ...scriptData,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    };
    
    // Store in DynamoDB
    await docClient.send(new PutCommand({
        TableName: SCRIPTS_TABLE,
        Item: item
    }));
    
    // Also save to S3 in organized project structure
    if (projectId && process.env.S3_BUCKET_NAME) {
        try {
            const scriptContent = {
                scriptId: scriptData.scriptId,
                title: scriptData.title,
                topic: scriptData.topic,
                scenes: scriptData.scenes,
                metadata: {
                    wordCount: scriptData.wordCount,
                    estimatedDuration: scriptData.estimatedDuration,
                    style: scriptData.style,
                    targetAudience: scriptData.targetAudience,
                    createdAt: scriptData.createdAt
                }
            };
            
            // Generate organized S3 paths
            const s3Paths = generateS3Paths(projectId, scriptData.title || 'Generated Video');
            
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Paths.script.json,
                Body: JSON.stringify(scriptContent, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    scriptId: scriptData.scriptId,
                    projectId: projectId,
                    wordCount: scriptData.wordCount?.toString() || '0',
                    estimatedDuration: scriptData.estimatedDuration?.toString() || '0'
                }
            }));
            
            console.log(`Script saved to S3: ${s3Key}`);
            scriptData.s3Key = s3Key;
            scriptData.s3Url = `s3://${process.env.S3_BUCKET_NAME}/${s3Key}`;
            
            // Also generate and save YouTube metadata
            await generateAndSaveMetadata(scriptData, projectId);
            
        } catch (error) {
            console.error('Error saving script to S3:', error);
            // Don't fail the whole operation if S3 save fails
        }
    }
    
    console.log(`Script stored with ID: ${scriptData.scriptId}`);
    return scriptData;
}

/**
 * Generate and save YouTube metadata for the video
 */
async function generateAndSaveMetadata(scriptData, projectId) {
    try {
        console.log(`Generating YouTube metadata for project: ${projectId}`);
        
        // Generate YouTube-optimized metadata using AI
        const metadata = await generateYouTubeMetadata(scriptData);
        
        // Save metadata to S3 using organized structure
        const s3Paths = generateS3Paths(projectId, scriptData.title || 'Generated Video');
        
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Paths.metadata.youtube,
            Body: JSON.stringify(metadata, null, 2),
            ContentType: 'application/json',
            Metadata: {
                projectId: projectId,
                scriptId: scriptData.scriptId,
                generatedAt: new Date().toISOString()
            }
        }));
        
        console.log(`YouTube metadata saved to S3: ${metadataKey}`);
        
        // Also save project summary
        const projectSummary = {
            projectId: projectId,
            createdAt: new Date().toISOString(),
            topic: scriptData.topic,
            title: scriptData.title,
            estimatedDuration: scriptData.estimatedDuration,
            wordCount: scriptData.wordCount,
            components: {
                script: {
                    scriptId: scriptData.scriptId,
                    s3Key: scriptData.s3Key
                },
                metadata: {
                    s3Key: metadataKey
                }
                // Audio and media will be added by their respective services
            },
            status: 'script_generated'
        };
        
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Paths.metadata.project,
            Body: JSON.stringify(projectSummary, null, 2),
            ContentType: 'application/json',
            Metadata: {
                projectId: projectId,
                createdAt: new Date().toISOString()
            }
        }));
        
        console.log(`Project summary saved to S3: ${summaryKey}`);
        
    } catch (error) {
        console.error('Error generating/saving metadata:', error);
        // Don't fail the whole operation if metadata generation fails
    }
}

/**
 * Generate YouTube-optimized metadata using AI
 */
async function generateYouTubeMetadata(scriptData) {
    try {
        // Extract scene timestamps for description
        const sceneTimestamps = scriptData.scenes ? 
            scriptData.scenes.map((scene, index) => ({
                time: `${Math.floor(index * (scriptData.estimatedDuration / scriptData.scenes.length) / 60)}:${String(Math.floor(index * (scriptData.estimatedDuration / scriptData.scenes.length) % 60)).padStart(2, '0')}`,
                title: scene.title || `Section ${index + 1}`,
                description: scene.script.substring(0, 100) + '...'
            })) : [];

        const prompt = `You are a YouTube SEO expert. Generate highly optimized metadata for this video that will maximize views, engagement, and subscriber growth.

TOPIC: ${scriptData.topic}
TITLE: ${scriptData.title}
ESTIMATED DURATION: ${scriptData.estimatedDuration} seconds (${Math.floor(scriptData.estimatedDuration / 60)}:${String(scriptData.estimatedDuration % 60).padStart(2, '0')})
WORD COUNT: ${scriptData.wordCount} words

SCRIPT CONTENT:
${scriptData.scenes ? scriptData.scenes.map((scene, i) => `Scene ${i + 1}: ${scene.script}`).join('\n\n') : scriptData.content || ''}

REQUIREMENTS:
1. TITLE: Create 3 engaging, clickable titles (under 60 chars each) with high-volume keywords
2. DESCRIPTION: Write a comprehensive description (300-500 words) including:
   - Hook in first 125 characters (mobile preview)
   - Detailed video overview with keywords
   - Timestamps for each major section
   - Strong call-to-action to subscribe
   - Related video suggestions
   - Social media links placeholders
   - Relevant hashtags
3. TAGS: 15-20 highly relevant tags mixing:
   - Primary keywords (high volume)
   - Long-tail keywords (specific)
   - Trending related terms
   - Competitor analysis terms
4. SEO OPTIMIZATION:
   - Target 3-5 primary keywords
   - Include semantic keywords
   - Optimize for YouTube search algorithm
   - Consider trending topics in the niche

Focus on:
- Emotional triggers in titles (curiosity, urgency, benefit)
- Search intent matching
- Beginner-friendly but authoritative tone
- Clear value proposition
- Engagement optimization (CTR, watch time, comments)

Respond in JSON format:
{
    "titles": [
        "Primary SEO title (main recommendation)",
        "Alternative clickbait title",
        "Long-tail keyword title"
    ],
    "description": "Complete optimized description with timestamps and CTAs",
    "tags": ["primary-keyword", "long-tail-keyword", "trending-term"],
    "primaryKeywords": ["main keyword 1", "main keyword 2"],
    "secondaryKeywords": ["semantic keyword 1", "semantic keyword 2"],
    "hashtags": ["#MainTopic", "#Trending", "#Educational"],
    "category": "Education",
    "thumbnailSuggestions": [
        "Bold text: 'MAIN BENEFIT' with excited face",
        "Before/After split screen with arrows",
        "Step numbers (1,2,3) with key visuals"
    ],
    "timestamps": [
        {"time": "0:00", "title": "Introduction", "description": "What you'll learn"},
        {"time": "1:30", "title": "Main Topic", "description": "Core content"}
    ],
    "callToActions": {
        "subscribe": "🔔 Subscribe for more beginner-friendly tutorials!",
        "like": "👍 Like this video if it helped you!",
        "comment": "💬 What's your biggest challenge with [topic]? Let me know below!",
        "share": "📤 Share this with someone who needs to see it!"
    },
    "seoOptimization": {
        "searchVolume": "High/Medium/Low",
        "competition": "Low/Medium/High",
        "trendingScore": "1-10",
        "clickThroughRate": "Expected 8-12%",
        "watchTimeOptimization": "Hooks every 30 seconds"
    },
    "bestPostingTime": "Tuesday-Thursday 2-4 PM EST",
    "estimatedPerformance": {
        "views": "10K-25K in first month",
        "retention": "65-75% average",
        "engagement": "4-6% engagement rate"
    }
}`;

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 800,
                temperature: 0.3,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        const metadata = JSON.parse(result.content[0].text);
        
        // Add additional metadata
        metadata.generatedAt = new Date().toISOString();
        metadata.scriptId = scriptData.scriptId;
        metadata.originalTopic = scriptData.topic;
        metadata.estimatedDuration = scriptData.estimatedDuration;
        metadata.wordCount = scriptData.wordCount;
        
        return metadata;
        
    } catch (error) {
        console.error('Error generating YouTube metadata:', error);
        
        // Comprehensive fallback metadata if AI generation fails
        const topicKeywords = scriptData.topic.toLowerCase().split(' ');
        const duration = Math.floor(scriptData.estimatedDuration / 60);
        
        return {
            titles: [
                `${scriptData.topic} - Complete Beginner's Guide 2025`,
                `How to ${scriptData.topic}: Step-by-Step Tutorial`,
                `${scriptData.topic} Explained Simply (${duration} Min Guide)`
            ],
            description: `🎯 Master ${scriptData.topic} with this comprehensive beginner's guide!\n\nIn this ${duration}-minute tutorial, you'll discover everything you need to know about ${scriptData.topic}. Perfect for beginners who want to get started quickly and effectively.\n\n📚 What You'll Learn:\n✅ Essential ${scriptData.topic} concepts\n✅ Step-by-step practical guidance\n✅ Common mistakes to avoid\n✅ Pro tips for success\n\n⏰ Timestamps:\n0:00 Introduction\n1:30 Getting Started\n${Math.floor(duration/2)}:00 Advanced Tips\n${duration-1}:30 Conclusion & Next Steps\n\n🔔 SUBSCRIBE for more beginner-friendly tutorials!\n👍 LIKE if this video helped you!\n💬 COMMENT your biggest ${scriptData.topic} question below!\n📤 SHARE with someone who needs this!\n\n🔗 Related Videos:\n• ${scriptData.topic} Mistakes to Avoid\n• Advanced ${scriptData.topic} Strategies\n• ${scriptData.topic} Tools & Resources\n\n📱 Follow us:\n• Instagram: @YourChannel\n• Twitter: @YourChannel\n• Website: yourwebsite.com\n\n#${topicKeywords.join('').replace(/\s+/g, '')} #Tutorial #Beginners #Education #HowTo #Guide #Tips #Learn #2025`,
            tags: [
                ...topicKeywords,
                `${scriptData.topic.toLowerCase()} tutorial`,
                `${scriptData.topic.toLowerCase()} guide`,
                `${scriptData.topic.toLowerCase()} for beginners`,
                `how to ${scriptData.topic.toLowerCase()}`,
                `${scriptData.topic.toLowerCase()} explained`,
                `${scriptData.topic.toLowerCase()} tips`,
                `${scriptData.topic.toLowerCase()} 2025`,
                'tutorial',
                'guide',
                'beginners',
                'education',
                'how to',
                'explained',
                'tips',
                'step by step',
                'complete guide',
                'beginner friendly'
            ],
            primaryKeywords: [scriptData.topic.toLowerCase(), `${scriptData.topic.toLowerCase()} tutorial`, `how to ${scriptData.topic.toLowerCase()}`],
            secondaryKeywords: [`${scriptData.topic.toLowerCase()} guide`, `${scriptData.topic.toLowerCase()} for beginners`, `${scriptData.topic.toLowerCase()} tips`],
            hashtags: [`#${topicKeywords.join('').replace(/\s+/g, '')}`, '#Tutorial', '#Beginners', '#Education', '#HowTo'],
            category: 'Education',
            thumbnailSuggestions: [
                `Bold text: "${scriptData.topic.toUpperCase()}" with excited person pointing`,
                `"COMPLETE GUIDE" with step numbers 1,2,3 and topic imagery`,
                `Before/After split with "${scriptData.topic} MASTERY" text overlay`
            ],
            timestamps: [
                {"time": "0:00", "title": "Introduction", "description": `Welcome to ${scriptData.topic} guide`},
                {"time": "1:30", "title": "Getting Started", "description": "Basic concepts and setup"},
                {"time": `${Math.floor(duration/2)}:00`, "title": "Advanced Tips", "description": "Pro strategies and techniques"},
                {"time": `${duration-1}:30`, "title": "Conclusion", "description": "Summary and next steps"}
            ],
            callToActions: {
                subscribe: `🔔 Subscribe for more ${scriptData.topic.toLowerCase()} content and beginner tutorials!`,
                like: "👍 Like this video if it helped you understand the topic better!",
                comment: `💬 What's your biggest ${scriptData.topic.toLowerCase()} challenge? Share it in the comments!`,
                share: "📤 Share this guide with someone who's just getting started!"
            },
            seoOptimization: {
                searchVolume: "Medium",
                competition: "Medium",
                trendingScore: "6",
                clickThroughRate: "Expected 6-10%",
                watchTimeOptimization: "Educational hooks every 45 seconds"
            },
            bestPostingTime: 'Tuesday-Thursday 2-4 PM EST',
            estimatedPerformance: {
                views: '5K-15K in first month',
                retention: '60-70% average',
                engagement: '3-5% engagement rate'
            },
            generatedAt: new Date().toISOString(),
            scriptId: scriptData.scriptId,
            originalTopic: scriptData.topic,
            estimatedDuration: scriptData.estimatedDuration,
            wordCount: scriptData.wordCount
        };
    }
}

/**
 * Get topic data from database
 */
async function getTopicData(topicId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: TOPICS_TABLE,
            Key: {
                PK: `TOPIC#${topicId}`,
                SK: 'METADATA'
            }
        }));
        
        return result.Item;
    } catch (error) {
        console.error('Error getting topic data:', error);
        return null;
    }
}

/**
 * Get scripts with filtering and pagination
 */
async function getScripts(queryParams) {
    const {
        topic,
        style,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = queryParams;
    
    try {
        // For now, implement a simple scan
        // In production, you'd want to use GSI for better performance
        const params = {
            TableName: SCRIPTS_TABLE,
            FilterExpression: 'begins_with(PK, :pk)',
            ExpressionAttributeValues: {
                ':pk': 'SCRIPT#'
            },
            Limit: parseInt(limit)
        };
        
        // Add additional filters
        if (topic) {
            params.FilterExpression += ' AND contains(topic, :topic)';
            params.ExpressionAttributeValues[':topic'] = topic;
        }
        
        if (style) {
            params.FilterExpression += ' AND #style = :style';
            params.ExpressionAttributeNames = { '#style': 'style' };
            params.ExpressionAttributeValues[':style'] = style;
        }
        
        const result = await docClient.send(new ScanCommand(params));
        let scripts = result.Items || [];
        
        // Sort results
        scripts.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            return sortOrder === 'desc' ? 
                (bVal > aVal ? 1 : -1) : 
                (aVal > bVal ? 1 : -1);
        });
        
        return createResponse(200, {
            scripts: scripts.map(script => ({
                scriptId: script.scriptId,
                title: script.title,
                topic: script.topic,
                style: script.style,
                wordCount: script.wordCount,
                estimatedDuration: script.estimatedDuration,
                sceneCount: script.scenes?.length || 0,
                createdAt: script.createdAt
            })),
            count: scripts.length,
            filters: { topic, style },
            sorting: { sortBy, sortOrder }
        });
        
    } catch (error) {
        console.error('Error getting scripts:', error);
        return createResponse(500, { 
            error: 'Failed to get scripts',
            message: error.message 
        });
    }
}

/**
 * Get specific script by ID
 */
async function getScript(scriptId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: SCRIPTS_TABLE,
            Key: {
                PK: `SCRIPT#${scriptId}`,
                SK: 'METADATA'
            }
        }));
        
        if (!result.Item) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        return createResponse(200, {
            script: result.Item
        });
        
    } catch (error) {
        console.error('Error getting script:', error);
        return createResponse(500, { 
            error: 'Failed to get script',
            message: error.message 
        });
    }
}

/**
 * Optimize existing script
 */
async function optimizeScript(requestBody) {
    const { scriptId, optimizations = [] } = requestBody;
    
    try {
        // Get existing script
        const scriptResult = await getScript(scriptId);
        if (scriptResult.statusCode !== 200) {
            return scriptResult;
        }
        
        const script = scriptResult.body ? JSON.parse(scriptResult.body).script : null;
        if (!script) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        // Apply optimizations using AI
        const optimizedScript = await optimizeScriptWithAI(script, optimizations);
        
        // Store optimized version
        optimizedScript.scriptId = `${scriptId}-optimized-${Date.now()}`;
        optimizedScript.parentScriptId = scriptId;
        optimizedScript.optimizations = optimizations;
        
        const storedScript = await storeScript(optimizedScript);
        
        return createResponse(200, {
            message: 'Script optimized successfully',
            originalScript: script,
            optimizedScript: storedScript,
            optimizations: optimizations
        });
        
    } catch (error) {
        console.error('Error optimizing script:', error);
        return createResponse(500, { 
            error: 'Failed to optimize script',
            message: error.message 
        });
    }
}

/**
 * Validate script quality and engagement
 */
async function validateScript(requestBody) {
    const { scriptId, script: scriptData } = requestBody;
    
    try {
        let script = scriptData;
        
        // If scriptId provided, get script from database
        if (scriptId && !script) {
            const scriptResult = await getScript(scriptId);
            if (scriptResult.statusCode !== 200) {
                return scriptResult;
            }
            script = JSON.parse(scriptResult.body).script;
        }
        
        if (!script) {
            return createResponse(400, { error: 'Script data or scriptId required' });
        }
        
        // Perform validation checks
        const validation = performScriptValidation(script);
        
        return createResponse(200, {
            validation,
            script: {
                scriptId: script.scriptId,
                title: script.title,
                wordCount: script.wordCount,
                estimatedDuration: script.estimatedDuration
            }
        });
        
    } catch (error) {
        console.error('Error validating script:', error);
        return createResponse(500, { 
            error: 'Failed to validate script',
            message: error.message 
        });
    }
}

/**
 * Perform script validation checks
 */
function performScriptValidation(script) {
    const validation = {
        overall: 'good',
        score: 0,
        checks: {},
        recommendations: [],
        warnings: []
    };
    
    // Check 1: Word count appropriateness
    const targetWords = (script.estimatedDuration / 60) * 150; // 150 words per minute
    const wordCountRatio = script.wordCount / targetWords;
    
    if (wordCountRatio >= 0.8 && wordCountRatio <= 1.2) {
        validation.checks.wordCount = { status: 'pass', score: 20 };
    } else if (wordCountRatio >= 0.6 && wordCountRatio <= 1.4) {
        validation.checks.wordCount = { status: 'warning', score: 10 };
        validation.warnings.push('Word count may be too high or low for target duration');
    } else {
        validation.checks.wordCount = { status: 'fail', score: 0 };
        validation.warnings.push('Word count significantly mismatched with target duration');
    }
    
    // Check 2: Scene structure
    const sceneCount = script.scenes?.length || 0;
    if (sceneCount >= 3 && sceneCount <= 8) {
        validation.checks.sceneStructure = { status: 'pass', score: 15 };
    } else if (sceneCount >= 2 && sceneCount <= 10) {
        validation.checks.sceneStructure = { status: 'warning', score: 10 };
    } else {
        validation.checks.sceneStructure = { status: 'fail', score: 5 };
        validation.recommendations.push('Consider restructuring into 3-8 main scenes');
    }
    
    // Check 3: Hook effectiveness
    const hook = script.hook || '';
    if (hook.length > 20 && (hook.includes('?') || hook.includes('!'))) {
        validation.checks.hook = { status: 'pass', score: 15 };
    } else if (hook.length > 10) {
        validation.checks.hook = { status: 'warning', score: 10 };
        validation.recommendations.push('Consider making the hook more engaging with questions or excitement');
    } else {
        validation.checks.hook = { status: 'fail', score: 5 };
        validation.recommendations.push('Hook needs to be more compelling and longer');
    }
    
    // Check 4: Call to action
    const cta = script.callToAction || '';
    if (cta.length > 10) {
        validation.checks.callToAction = { status: 'pass', score: 10 };
    } else {
        validation.checks.callToAction = { status: 'fail', score: 0 };
        validation.recommendations.push('Add a clear call to action');
    }
    
    // Check 5: Visual cues
    const hasVisualCues = script.scenes?.some(scene => 
        scene.visualCues && scene.visualCues.length > 0
    );
    if (hasVisualCues) {
        validation.checks.visualCues = { status: 'pass', score: 10 };
    } else {
        validation.checks.visualCues = { status: 'warning', score: 5 };
        validation.recommendations.push('Add visual cues to improve production quality');
    }
    
    // Check 6: Keywords and SEO
    const hasKeywords = script.keywords && script.keywords.length >= 3;
    if (hasKeywords) {
        validation.checks.seo = { status: 'pass', score: 10 };
    } else {
        validation.checks.seo = { status: 'warning', score: 5 };
        validation.recommendations.push('Add more keywords for better SEO');
    }
    
    // Calculate overall score
    validation.score = Object.values(validation.checks)
        .reduce((sum, check) => sum + check.score, 0);
    
    // Determine overall status
    if (validation.score >= 70) {
        validation.overall = 'excellent';
    } else if (validation.score >= 50) {
        validation.overall = 'good';
    } else if (validation.score >= 30) {
        validation.overall = 'fair';
    } else {
        validation.overall = 'poor';
    }
    
    return validation;
}

/**
 * Create standardized HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
        },
        body: JSON.stringify(body)
    };
}