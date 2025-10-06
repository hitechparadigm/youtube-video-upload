/**
 * AI Metadata Generation Service
 * Generates optimized titles, descriptions, tags, and SEO metadata for YouTube videos
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

// Global configuration
let config = null;

// Initialize AWS clients
let bedrockClient = null;
let dynamoClient = null;
let docClient = null;

// Configuration values
let SCRIPTS_TABLE = null;
let METADATA_TABLE = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('metadata-generator');
        
        // Initialize AWS clients
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        bedrockClient = new BedrockRuntimeClient({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true
            }
        });
        
        // Set table names
        SCRIPTS_TABLE = process.env.SCRIPTS_TABLE_NAME || 'automated-video-pipeline-scripts';
        METADATA_TABLE = process.env.METADATA_TABLE_NAME || 'automated-video-pipeline-metadata';
        
        console.log('Metadata Generator service initialized');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Metadata Generator invoked:', JSON.stringify(event, null, 2));
    
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
        if (httpMethod === 'POST' && path === '/metadata/generate') {
            return await generateMetadata(requestBody);
        } else if (httpMethod === 'POST' && path === '/metadata/generate-from-script') {
            return await generateMetadataFromScript(requestBody);
        } else if (httpMethod === 'GET' && path === '/metadata') {
            return await getMetadata(queryStringParameters || {});
        } else if (httpMethod === 'GET' && path.startsWith('/metadata/')) {
            const metadataId = pathParameters?.metadataId || path.split('/').pop();
            return await getMetadataById(metadataId);
        } else if (httpMethod === 'POST' && path === '/metadata/optimize') {
            return await optimizeMetadata(requestBody);
        } else if (httpMethod === 'POST' && path === '/metadata/validate') {
            return await validateMetadata(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Metadata Generator:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Generate metadata from provided content
 */
async function generateMetadata(requestBody) {
    const { 
        title, 
        script, 
        topic, 
        targetAudience = 'general',
        style = 'engaging_educational',
        category = 'Education',
        generateVariations = true,
        variationCount = 3
    } = requestBody;
    
    try {
        console.log(`Generating metadata for: ${title}`);
        
        // Validate required fields
        if (!title && !script && !topic) {
            return createResponse(400, { 
                error: 'At least one of title, script, or topic is required' 
            });
        }
        
        // Generate metadata using AI
        const metadata = await generateMetadataWithAI({
            title,
            script,
            topic,
            targetAudience,
            style,
            category,
            generateVariations,
            variationCount
        });
        
        // Store the generated metadata
        const storedMetadata = await storeMetadata(metadata);
        
        return createResponse(200, {
            message: 'Metadata generated successfully',
            metadata: storedMetadata,
            titleVariations: metadata.titleVariations?.length || 0,
            tagCount: metadata.tags?.length || 0,
            descriptionLength: metadata.description?.length || 0
        });
        
    } catch (error) {
        console.error('Error generating metadata:', error);
        return createResponse(500, { 
            error: 'Failed to generate metadata',
            message: error.message 
        });
    }
}

/**
 * Generate metadata from existing script ID
 */
async function generateMetadataFromScript(requestBody) {
    const { scriptId, metadataOptions = {} } = requestBody;
    
    try {
        if (!scriptId) {
            return createResponse(400, { error: 'scriptId is required' });
        }
        
        // Get script data from database
        const scriptData = await getScriptData(scriptId);
        if (!scriptData) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        // Extract script text from scenes
        const fullScript = scriptData.scenes?.map(scene => scene.script).join(' ') || '';
        
        // Generate metadata using script data
        const metadataRequest = {
            title: scriptData.title,
            script: fullScript,
            topic: scriptData.topic,
            targetAudience: scriptData.targetAudience || 'general',
            style: scriptData.style || 'engaging_educational',
            ...metadataOptions
        };
        
        return await generateMetadata(metadataRequest);
        
    } catch (error) {
        console.error('Error generating metadata from script:', error);
        return createResponse(500, { 
            error: 'Failed to generate metadata from script',
            message: error.message 
        });
    }
}

/**
 * Generate metadata using AI (Claude 3 Sonnet)
 */
async function generateMetadataWithAI(params) {
    const {
        title,
        script,
        topic,
        targetAudience,
        style,
        category,
        generateVariations,
        variationCount
    } = params;
    
    // Create the AI prompt for metadata generation
    const prompt = createMetadataGenerationPrompt({
        title,
        script,
        topic,
        targetAudience,
        style,
        category,
        generateVariations,
        variationCount
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
    
    console.log('Sending request to Bedrock for metadata generation');
    
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
    
    // Parse the AI response into structured metadata
    const metadata = parseAIMetadataResponse(aiResponse, params);
    
    return metadata;
}

/**
 * Create AI prompt for metadata generation
 */
function createMetadataGenerationPrompt(params) {
    const {
        title,
        script,
        topic,
        targetAudience,
        style,
        category,
        generateVariations,
        variationCount
    } = params;
    
    const scriptPreview = script ? script.substring(0, 500) + '...' : 'No script provided';
    
    return `You are an expert YouTube SEO specialist and content strategist. Generate optimized metadata for a YouTube video.

**Video Information:**
- Title: ${title || 'Generate from content'}
- Topic: ${topic || 'Extract from content'}
- Target Audience: ${targetAudience}
- Content Style: ${style}
- Category: ${category}
- Script Preview: ${scriptPreview}

**Requirements:**
- Generate ${generateVariations ? variationCount : 1} title variation(s)
- Create SEO-optimized description (150-200 words)
- Generate 10-15 relevant tags
- Optimize for YouTube algorithm and search
- Include trending keywords where appropriate
- Make titles click-worthy but not clickbait

**Format Requirements:**
Return the metadata as a JSON object with this exact structure:

\`\`\`json
{
  "primaryTitle": "Main optimized title",
  "titleVariations": [
    "Alternative title 1",
    "Alternative title 2",
    "Alternative title 3"
  ],
  "description": "SEO-optimized YouTube description with keywords, timestamps, and call-to-action",
  "tags": [
    "tag1", "tag2", "tag3", "tag4", "tag5",
    "tag6", "tag7", "tag8", "tag9", "tag10"
  ],
  "keywords": [
    "primary keyword", "secondary keyword", "long-tail keyword"
  ],
  "category": "YouTube category (Education, Science & Technology, etc.)",
  "thumbnailConcepts": [
    "Concept 1: Description of thumbnail idea",
    "Concept 2: Alternative thumbnail concept"
  ],
  "seoScore": 85,
  "estimatedCTR": "8.5%",
  "competitionLevel": "medium",
  "trendingPotential": "high"
}
\`\`\`

**Title Guidelines:**
- 60 characters or less for full visibility
- Include primary keyword near the beginning
- Use emotional triggers (curiosity, urgency, benefit)
- Avoid excessive capitalization or special characters
- Make it specific and valuable

**Description Guidelines:**
- First 125 characters are crucial (mobile preview)
- Include primary and secondary keywords naturally
- Add relevant timestamps if applicable
- Include call-to-action (subscribe, like, comment)
- Add relevant links and social media
- Use line breaks for readability

**Tag Guidelines:**
- Mix of broad and specific tags
- Include variations of main keywords
- Add trending related terms
- Include category-specific tags
- Use both single words and phrases

**SEO Optimization:**
- Research trending keywords in the topic area
- Consider search volume and competition
- Optimize for YouTube's algorithm preferences
- Include related topics and subtopics

Generate metadata that will maximize discoverability, engagement, and click-through rates!`;
}

/**
 * Parse AI response into structured metadata
 */
function parseAIMetadataResponse(aiResponse, originalParams) {
    try {
        // Try to extract JSON from the AI response
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        let metadata;
        
        if (jsonMatch) {
            metadata = JSON.parse(jsonMatch[1]);
        } else {
            // If no JSON block found, try to parse the entire response
            metadata = JSON.parse(aiResponse);
        }
        
        // Validate and enhance the metadata
        metadata.metadataId = `metadata-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        metadata.createdAt = new Date().toISOString();
        metadata.generatedBy = 'ai';
        metadata.version = '1.0';
        
        // Ensure required fields exist
        metadata.primaryTitle = metadata.primaryTitle || originalParams.title || 'Generated Title';
        metadata.titleVariations = metadata.titleVariations || [];
        metadata.description = metadata.description || 'Generated description';
        metadata.tags = metadata.tags || [];
        metadata.keywords = metadata.keywords || [];
        metadata.category = metadata.category || originalParams.category || 'Education';
        
        // Add analytics and scoring
        metadata.analytics = {
            titleLength: metadata.primaryTitle.length,
            descriptionLength: metadata.description.length,
            tagCount: metadata.tags.length,
            keywordDensity: calculateKeywordDensity(metadata),
            seoScore: metadata.seoScore || calculateSEOScore(metadata),
            estimatedCTR: metadata.estimatedCTR || 'Unknown',
            competitionLevel: metadata.competitionLevel || 'medium',
            trendingPotential: metadata.trendingPotential || 'medium'
        };
        
        // Add metadata
        metadata.metadata = {
            originalParams,
            processingTime: new Date().toISOString(),
            aiModel: config.ai?.models?.primary?.id || 'claude-3-sonnet',
            promptVersion: '1.0'
        };
        
        return metadata;
        
    } catch (error) {
        console.error('Error parsing AI metadata response:', error);
        
        // Fallback: create basic metadata structure
        return createFallbackMetadata(aiResponse, originalParams);
    }
}

/**
 * Create fallback metadata if AI response parsing fails
 */
function createFallbackMetadata(aiResponse, originalParams) {
    const { title, topic, targetAudience, category } = originalParams;
    
    return {
        metadataId: `metadata-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        primaryTitle: title || `${topic} - Complete Guide`,
        titleVariations: [
            `${topic} Explained`,
            `Everything You Need to Know About ${topic}`,
            `${topic} - Beginner's Guide`
        ],
        description: `Learn everything about ${topic} in this comprehensive video. Perfect for ${targetAudience} looking to understand this topic better.`,
        tags: [topic, targetAudience, 'tutorial', 'guide', 'education'],
        keywords: [topic, `${topic} tutorial`, `${topic} guide`],
        category: category || 'Education',
        thumbnailConcepts: [
            `Show ${topic} with clear text overlay`,
            `Use bright colors with ${topic} imagery`
        ],
        analytics: {
            titleLength: (title || `${topic} - Complete Guide`).length,
            descriptionLength: 100,
            tagCount: 5,
            seoScore: 60,
            estimatedCTR: '5.0%',
            competitionLevel: 'medium',
            trendingPotential: 'medium'
        },
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
 * Calculate keyword density for SEO analysis
 */
function calculateKeywordDensity(metadata) {
    const text = `${metadata.primaryTitle} ${metadata.description}`.toLowerCase();
    const words = text.split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords === 0) return 0;
    
    let keywordCount = 0;
    metadata.keywords.forEach(keyword => {
        const keywordWords = keyword.toLowerCase().split(/\s+/);
        keywordWords.forEach(word => {
            keywordCount += words.filter(w => w.includes(word)).length;
        });
    });
    
    return Math.round((keywordCount / totalWords) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate SEO score based on various factors
 */
function calculateSEOScore(metadata) {
    let score = 0;
    
    // Title optimization (30 points)
    const titleLength = metadata.primaryTitle.length;
    if (titleLength >= 30 && titleLength <= 60) score += 15;
    else if (titleLength >= 20 && titleLength <= 70) score += 10;
    else score += 5;
    
    // Check if title contains keywords
    const titleLower = metadata.primaryTitle.toLowerCase();
    const hasKeywords = metadata.keywords.some(keyword => 
        titleLower.includes(keyword.toLowerCase())
    );
    if (hasKeywords) score += 15;
    
    // Description optimization (25 points)
    const descLength = metadata.description.length;
    if (descLength >= 150 && descLength <= 300) score += 15;
    else if (descLength >= 100 && descLength <= 400) score += 10;
    else score += 5;
    
    // Check description keyword usage
    const descLower = metadata.description.toLowerCase();
    const descKeywordCount = metadata.keywords.filter(keyword => 
        descLower.includes(keyword.toLowerCase())
    ).length;
    if (descKeywordCount >= 2) score += 10;
    else if (descKeywordCount >= 1) score += 5;
    
    // Tag optimization (20 points)
    const tagCount = metadata.tags.length;
    if (tagCount >= 8 && tagCount <= 15) score += 20;
    else if (tagCount >= 5 && tagCount <= 20) score += 15;
    else score += 10;
    
    // Keyword optimization (15 points)
    const keywordCount = metadata.keywords.length;
    if (keywordCount >= 3 && keywordCount <= 7) score += 15;
    else if (keywordCount >= 2 && keywordCount <= 10) score += 10;
    else score += 5;
    
    // Content quality indicators (10 points)
    if (metadata.thumbnailConcepts && metadata.thumbnailConcepts.length > 0) score += 5;
    if (metadata.category && metadata.category !== 'Unknown') score += 5;
    
    return Math.min(score, 100); // Cap at 100
}

/**
 * Store generated metadata in DynamoDB
 */
async function storeMetadata(metadata) {
    const item = {
        PK: `METADATA#${metadata.metadataId}`,
        SK: 'DETAILS',
        ...metadata,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    };
    
    await docClient.send(new PutCommand({
        TableName: METADATA_TABLE,
        Item: item
    }));
    
    console.log(`Metadata stored with ID: ${metadata.metadataId}`);
    return metadata;
}

/**
 * Get script data from database
 */
async function getScriptData(scriptId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: SCRIPTS_TABLE,
            Key: {
                PK: `SCRIPT#${scriptId}`,
                SK: 'METADATA'
            }
        }));
        
        return result.Item;
    } catch (error) {
        console.error('Error getting script data:', error);
        return null;
    }
}

/**
 * Get metadata with filtering and pagination
 */
async function getMetadata(queryParams) {
    const {
        category,
        minSeoScore = 0,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = queryParams;
    
    try {
        // For now, implement a simple scan
        const params = {
            TableName: METADATA_TABLE,
            FilterExpression: 'begins_with(PK, :pk)',
            ExpressionAttributeValues: {
                ':pk': 'METADATA#'
            },
            Limit: parseInt(limit)
        };
        
        // Add additional filters
        if (category) {
            params.FilterExpression += ' AND category = :category';
            params.ExpressionAttributeValues[':category'] = category;
        }
        
        if (minSeoScore > 0) {
            params.FilterExpression += ' AND analytics.seoScore >= :minScore';
            params.ExpressionAttributeValues[':minScore'] = parseFloat(minSeoScore);
        }
        
        const result = await docClient.send(new ScanCommand(params));
        let metadata = result.Items || [];
        
        // Sort results
        metadata.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            return sortOrder === 'desc' ? 
                (bVal > aVal ? 1 : -1) : 
                (aVal > bVal ? 1 : -1);
        });
        
        return createResponse(200, {
            metadata: metadata.map(item => ({
                metadataId: item.metadataId,
                primaryTitle: item.primaryTitle,
                category: item.category,
                seoScore: item.analytics?.seoScore || 0,
                titleVariations: item.titleVariations?.length || 0,
                tagCount: item.tags?.length || 0,
                createdAt: item.createdAt
            })),
            count: metadata.length,
            filters: { category, minSeoScore },
            sorting: { sortBy, sortOrder }
        });
        
    } catch (error) {
        console.error('Error getting metadata:', error);
        return createResponse(500, { 
            error: 'Failed to get metadata',
            message: error.message 
        });
    }
}

/**
 * Get specific metadata by ID
 */
async function getMetadataById(metadataId) {
    try {
        const result = await docClient.send(new GetCommand({
            TableName: METADATA_TABLE,
            Key: {
                PK: `METADATA#${metadataId}`,
                SK: 'DETAILS'
            }
        }));
        
        if (!result.Item) {
            return createResponse(404, { error: 'Metadata not found' });
        }
        
        return createResponse(200, {
            metadata: result.Item
        });
        
    } catch (error) {
        console.error('Error getting metadata:', error);
        return createResponse(500, { 
            error: 'Failed to get metadata',
            message: error.message 
        });
    }
}

/**
 * Optimize existing metadata
 */
async function optimizeMetadata(requestBody) {
    const { metadataId, optimizations = [] } = requestBody;
    
    try {
        // Get existing metadata
        const metadataResult = await getMetadataById(metadataId);
        if (metadataResult.statusCode !== 200) {
            return metadataResult;
        }
        
        const metadata = metadataResult.body ? JSON.parse(metadataResult.body).metadata : null;
        if (!metadata) {
            return createResponse(404, { error: 'Metadata not found' });
        }
        
        // Apply optimizations using AI
        const optimizedMetadata = await optimizeMetadataWithAI(metadata, optimizations);
        
        // Store optimized version
        optimizedMetadata.metadataId = `${metadataId}-optimized-${Date.now()}`;
        optimizedMetadata.parentMetadataId = metadataId;
        optimizedMetadata.optimizations = optimizations;
        
        const storedMetadata = await storeMetadata(optimizedMetadata);
        
        return createResponse(200, {
            message: 'Metadata optimized successfully',
            originalMetadata: metadata,
            optimizedMetadata: storedMetadata,
            optimizations: optimizations
        });
        
    } catch (error) {
        console.error('Error optimizing metadata:', error);
        return createResponse(500, { 
            error: 'Failed to optimize metadata',
            message: error.message 
        });
    }
}

/**
 * Validate metadata quality and SEO
 */
async function validateMetadata(requestBody) {
    const { metadataId, metadata: metadataData } = requestBody;
    
    try {
        let metadata = metadataData;
        
        // If metadataId provided, get metadata from database
        if (metadataId && !metadata) {
            const metadataResult = await getMetadataById(metadataId);
            if (metadataResult.statusCode !== 200) {
                return metadataResult;
            }
            metadata = JSON.parse(metadataResult.body).metadata;
        }
        
        if (!metadata) {
            return createResponse(400, { error: 'Metadata data or metadataId required' });
        }
        
        // Perform validation checks
        const validation = performMetadataValidation(metadata);
        
        return createResponse(200, {
            validation,
            metadata: {
                metadataId: metadata.metadataId,
                primaryTitle: metadata.primaryTitle,
                seoScore: metadata.analytics?.seoScore || 0
            }
        });
        
    } catch (error) {
        console.error('Error validating metadata:', error);
        return createResponse(500, { 
            error: 'Failed to validate metadata',
            message: error.message 
        });
    }
}

/**
 * Perform metadata validation checks
 */
function performMetadataValidation(metadata) {
    const validation = {
        overall: 'good',
        score: 0,
        checks: {},
        recommendations: [],
        warnings: []
    };
    
    // Check 1: Title optimization
    const titleLength = metadata.primaryTitle.length;
    if (titleLength >= 30 && titleLength <= 60) {
        validation.checks.titleLength = { status: 'pass', score: 20 };
    } else if (titleLength >= 20 && titleLength <= 70) {
        validation.checks.titleLength = { status: 'warning', score: 15 };
        validation.warnings.push('Title length could be optimized (30-60 characters ideal)');
    } else {
        validation.checks.titleLength = { status: 'fail', score: 5 };
        validation.recommendations.push('Optimize title length to 30-60 characters');
    }
    
    // Check 2: Description quality
    const descLength = metadata.description.length;
    if (descLength >= 150 && descLength <= 300) {
        validation.checks.description = { status: 'pass', score: 20 };
    } else if (descLength >= 100 && descLength <= 400) {
        validation.checks.description = { status: 'warning', score: 15 };
        validation.warnings.push('Description length could be optimized (150-300 characters ideal)');
    } else {
        validation.checks.description = { status: 'fail', score: 5 };
        validation.recommendations.push('Optimize description length to 150-300 characters');
    }
    
    // Check 3: Tag count
    const tagCount = metadata.tags?.length || 0;
    if (tagCount >= 8 && tagCount <= 15) {
        validation.checks.tags = { status: 'pass', score: 15 };
    } else if (tagCount >= 5 && tagCount <= 20) {
        validation.checks.tags = { status: 'warning', score: 10 };
        validation.warnings.push('Tag count could be optimized (8-15 tags ideal)');
    } else {
        validation.checks.tags = { status: 'fail', score: 5 };
        validation.recommendations.push('Add 8-15 relevant tags');
    }
    
    // Check 4: Keyword usage
    const keywordCount = metadata.keywords?.length || 0;
    if (keywordCount >= 3 && keywordCount <= 7) {
        validation.checks.keywords = { status: 'pass', score: 15 };
    } else if (keywordCount >= 2 && keywordCount <= 10) {
        validation.checks.keywords = { status: 'warning', score: 10 };
        validation.warnings.push('Keyword count could be optimized (3-7 keywords ideal)');
    } else {
        validation.checks.keywords = { status: 'fail', score: 5 };
        validation.recommendations.push('Add 3-7 relevant keywords');
    }
    
    // Check 5: SEO score
    const seoScore = metadata.analytics?.seoScore || 0;
    if (seoScore >= 80) {
        validation.checks.seoScore = { status: 'pass', score: 15 };
    } else if (seoScore >= 60) {
        validation.checks.seoScore = { status: 'warning', score: 10 };
        validation.warnings.push('SEO score could be improved');
    } else {
        validation.checks.seoScore = { status: 'fail', score: 5 };
        validation.recommendations.push('Improve SEO optimization');
    }
    
    // Check 6: Category and structure
    if (metadata.category && metadata.category !== 'Unknown') {
        validation.checks.category = { status: 'pass', score: 10 };
    } else {
        validation.checks.category = { status: 'fail', score: 0 };
        validation.recommendations.push('Set appropriate YouTube category');
    }
    
    // Check 7: Thumbnail concepts
    if (metadata.thumbnailConcepts && metadata.thumbnailConcepts.length > 0) {
        validation.checks.thumbnails = { status: 'pass', score: 5 };
    } else {
        validation.checks.thumbnails = { status: 'warning', score: 2 };
        validation.recommendations.push('Add thumbnail concepts for better visual planning');
    }
    
    // Calculate overall score
    validation.score = Object.values(validation.checks)
        .reduce((sum, check) => sum + check.score, 0);
    
    // Determine overall status
    if (validation.score >= 85) {
        validation.overall = 'excellent';
    } else if (validation.score >= 70) {
        validation.overall = 'good';
    } else if (validation.score >= 50) {
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