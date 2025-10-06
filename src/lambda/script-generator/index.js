/**
 * AI Script Generation Service
 * Converts AI-generated topics into complete video scripts with scene breakdowns
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

// Global configuration
let config = null;

// Initialize AWS clients
let bedrockClient = null;
let dynamoClient = null;
let docClient = null;

// Configuration values
let SCRIPTS_TABLE = null;
let TOPICS_TABLE = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('script-generator');
        
        // Initialize AWS clients
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        bedrockClient = new BedrockRuntimeClient({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient);
        
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
        if (httpMethod === 'POST' && path === '/scripts/generate') {
            return await generateScript(requestBody);
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
 * Generate script from topic data
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
        includeTiming = true 
    } = requestBody;
    
    try {
        console.log(`Generating script for topic: ${topic}`);
        
        // Validate required fields
        if (!topic || !title) {
            return createResponse(400, { 
                error: 'Missing required fields: topic and title are required' 
            });
        }
        
        // Generate the script using AI
        const scriptData = await generateScriptWithAI({
            topic,
            title,
            hook,
            targetLength,
            style,
            targetAudience,
            includeVisuals,
            includeTiming
        });
        
        // Store the generated script
        const storedScript = await storeScript(scriptData);
        
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
 * Generate script using AI (Claude 3 Sonnet)
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
        includeTiming
    } = params;
    
    // Create the AI prompt for script generation
    const prompt = createScriptGenerationPrompt({
        topic,
        title,
        hook,
        targetLength,
        style,
        targetAudience,
        includeVisuals,
        includeTiming
    });
    
    // Get AI model configuration
    const modelId = config.ai?.models?.primary?.id || process.env.BEDROCK_MODEL_ID;
    const temperature = config.ai?.models?.primary?.temperature || 0.7;
    const maxTokens = config.ai?.models?.primary?.maxTokens || 4000;
    
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
 * Create AI prompt for script generation
 */
function createScriptGenerationPrompt(params) {
    const {
        topic,
        title,
        hook,
        targetLength,
        style,
        targetAudience,
        includeVisuals,
        includeTiming
    } = params;
    
    const targetMinutes = Math.round(targetLength / 60);
    const wordsPerMinute = 150; // Average speaking pace
    const targetWords = targetLength * (wordsPerMinute / 60);
    
    return `You are an expert YouTube script writer specializing in ${style} content for ${targetAudience} audiences. 

Create a compelling ${targetMinutes}-minute video script (approximately ${targetWords} words) for:

**Topic:** ${topic}
**Title:** ${title}
**Hook:** ${hook || 'Create an engaging opening hook'}

**Requirements:**
- Target length: ${targetMinutes} minutes (${targetWords} words)
- Style: ${style}
- Audience: ${targetAudience}
- Include visual cues: ${includeVisuals ? 'Yes' : 'No'}
- Include timing: ${includeTiming ? 'Yes' : 'No'}

**Script Structure Guidelines:**
1. **Hook (0-15 seconds):** Grab attention immediately with the provided hook or create a compelling one
2. **Introduction (15-45 seconds):** Introduce the topic and what viewers will learn
3. **Main Content (70% of video):** Break into 3-5 key sections with smooth transitions
4. **Conclusion (Last 30-60 seconds):** Summarize key points and strong call-to-action

**Format Requirements:**
Return the script as a JSON object with this exact structure:

\`\`\`json
{
  "title": "${title}",
  "topic": "${topic}",
  "hook": "The opening hook text",
  "estimatedDuration": ${targetLength},
  "wordCount": 0,
  "style": "${style}",
  "targetAudience": "${targetAudience}",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Hook",
      "startTime": 0,
      "endTime": 15,
      "duration": 15,
      "script": "The actual script text for this scene...",
      "visualCues": ["Visual description 1", "Visual description 2"],
      "notes": "Direction notes for this scene",
      "keyPoints": ["Key point 1", "Key point 2"]
    }
  ],
  "callToAction": "Subscribe for more content like this!",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "description": "YouTube description text",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`

**Content Guidelines:**
- Use conversational, engaging language
- Include rhetorical questions to maintain engagement
- Add pattern interrupts every 30-45 seconds
- Include specific examples and stories
- Use the "curiosity gap" technique
- End scenes with hooks to the next section
- Include clear visual cues for each scene
- Make it actionable and valuable

**Visual Cues (if includeVisuals=true):**
- Describe what should be shown on screen
- Include text overlays, graphics, or B-roll suggestions
- Specify when to show the presenter vs. other visuals

**Timing (if includeTiming=true):**
- Provide precise start/end times for each scene
- Ensure total duration matches target length
- Account for natural speaking pace and pauses

Generate an engaging, high-retention script that will perform well on YouTube!`;
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
        
        // Validate scenes structure
        if (scriptData.scenes && Array.isArray(scriptData.scenes)) {
            scriptData.scenes = scriptData.scenes.map((scene, index) => ({
                sceneNumber: scene.sceneNumber || index + 1,
                title: scene.title || `Scene ${index + 1}`,
                startTime: scene.startTime || 0,
                endTime: scene.endTime || 0,
                duration: scene.duration || (scene.endTime - scene.startTime),
                script: scene.script || '',
                visualCues: scene.visualCues || [],
                notes: scene.notes || '',
                keyPoints: scene.keyPoints || [],
                ...scene
            }));
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
async function storeScript(scriptData) {
    const item = {
        PK: `SCRIPT#${scriptData.scriptId}`,
        SK: 'METADATA',
        ...scriptData,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    };
    
    await docClient.send(new PutCommand({
        TableName: SCRIPTS_TABLE,
        Item: item
    }));
    
    console.log(`Script stored with ID: ${scriptData.scriptId}`);
    return scriptData;
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