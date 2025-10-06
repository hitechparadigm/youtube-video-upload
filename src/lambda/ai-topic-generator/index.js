/**
 * AI-Powered Topic Generation Service
 * Uses Amazon Bedrock to analyze trends and generate engaging video topics
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

// Global configuration
let config = null;

// Initialize AWS clients (will be configured after config load)
let bedrockClient = null;
let dynamoClient = null;
let docClient = null;

// Configuration values (loaded from config)
let TOPICS_TABLE = null;
let TRENDS_TABLE = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('ai-topic-generator');
        
        // Initialize AWS clients with configuration
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        bedrockClient = new BedrockRuntimeClient({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient);
        
        // Set table names
        TOPICS_TABLE = process.env.TOPICS_TABLE_NAME;
        TRENDS_TABLE = process.env.TRENDS_TABLE_NAME;
        
        console.log('AI Topic Generator service initialized with configuration');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('AI Topic Generator invoked:', JSON.stringify(event, null, 2));
    
    try {
        // Initialize service on first invocation
        await initializeService();
        
        const { httpMethod, path, pathParameters, body } = event;
        
        // Parse request body if present
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        // Route requests
        if (httpMethod === 'POST' && path === '/ai-topics/generate') {
            return await generateTopics(requestBody);
        } else if (httpMethod === 'POST' && path === '/ai-topics/analyze') {
            return await analyzeTrends(requestBody);
        } else if (httpMethod === 'GET' && path === '/ai-topics/suggestions') {
            return await getTopicSuggestions(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in AI Topic Generator:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Generate specific video topics from basic topic input using AI
 */
async function generateTopics(requestBody) {
    const { baseTopic, frequency = 2, targetAudience = 'general', contentStyle = 'engaging' } = requestBody;
    
    if (!baseTopic) {
        return createResponse(400, { error: 'baseTopic is required' });
    }
    
    try {
        // Get recent trend data for the base topic
        const trendData = await getTrendDataForTopic(baseTopic);
        
        // Generate AI-powered topic suggestions
        const aiTopics = await generateAITopics(baseTopic, trendData, frequency, targetAudience, contentStyle);
        
        // Score and rank the generated topics
        const rankedTopics = await scoreTopics(aiTopics, trendData);
        
        // Store the generated topics in DynamoDB
        const storedTopics = await storeGeneratedTopics(baseTopic, rankedTopics);
        
        return createResponse(200, {
            baseTopic,
            generatedTopics: rankedTopics,
            storedCount: storedTopics.length,
            trendDataUsed: trendData.length > 0
        });
        
    } catch (error) {
        console.error('Error generating topics:', error);
        return createResponse(500, { 
            error: 'Failed to generate topics',
            message: error.message 
        });
    }
}

/**
 * Analyze current trends for a given topic
 */
async function analyzeTrends(requestBody) {
    const { topic, timeframe = '7d' } = requestBody;
    
    if (!topic) {
        return createResponse(400, { error: 'topic is required' });
    }
    
    try {
        // Get trend data from DynamoDB
        const trendData = await getTrendDataForTopic(topic, timeframe);
        
        // Use AI to analyze and synthesize trend insights
        const analysis = await analyzeWithAI(topic, trendData);
        
        return createResponse(200, {
            topic,
            timeframe,
            trendCount: trendData.length,
            analysis,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error analyzing trends:', error);
        return createResponse(500, { 
            error: 'Failed to analyze trends',
            message: error.message 
        });
    }
}

/**
 * Get topic suggestions based on performance and trends
 */
async function getTopicSuggestions(queryParams) {
    const { category, limit = 10 } = queryParams;
    
    try {
        // Query recent high-performing topics
        const suggestions = await getHighPerformingTopics(category, limit);
        
        return createResponse(200, {
            suggestions,
            category: category || 'all',
            count: suggestions.length
        });
        
    } catch (error) {
        console.error('Error getting suggestions:', error);
        return createResponse(500, { 
            error: 'Failed to get suggestions',
            message: error.message 
        });
    }
}

/**
 * Generate AI-powered topic variations using Amazon Bedrock
 */
async function generateAITopics(baseTopic, trendData, frequency, targetAudience, contentStyle) {
    const trendContext = trendData.length > 0 
        ? trendData.map(t => `${t.keyword}: ${t.searchVolume || 'trending'}`).join(', ')
        : 'No recent trend data available';
    
    // Get configuration values
    const aiConfig = config.ai || {};
    const promptConfig = aiConfig.prompts?.topicGeneration || {};
    const systemPrompt = promptConfig.systemPrompt || 'You are an expert YouTube content strategist.';
    const multiplier = promptConfig.maxTopicsMultiplier || 3;
    const formats = promptConfig.formats || [
        "The Shocking Truth About...",
        "5 Secrets [Experts] Don't Want You to Know",
        "I Tried [Trend] for 30 Days - Here's What Happened"
    ];
    const engagementElements = promptConfig.engagementElements || [
        "Hook viewers in the first 5 seconds",
        "Drive high watch time and engagement"
    ];
    
    const prompt = `${systemPrompt}

Base Topic: "${baseTopic}"
Target Audience: ${targetAudience}
Content Style: ${contentStyle}
Videos Needed: ${frequency} per day
Current Trends: ${trendContext}

Generate ${frequency * multiplier} highly engaging, specific video topic ideas that will:
${engagementElements.map((element, index) => `${index + 1}. ${element}`).join('\n')}

For each topic, provide:
- Engaging title (8-12 words, curiosity-driven)
- Hook concept (opening line/question)
- Content angle (why it's compelling now)
- Engagement score (1-10)

Focus on formats like:
${formats.map(format => `- "${format}"`).join('\n')}

Make each topic feel urgent, valuable, and irresistible to click.

Return as JSON array with format:
[
  {
    "title": "engaging title",
    "hook": "opening hook",
    "angle": "content angle",
    "keywords": ["keyword1", "keyword2"],
    "engagementScore": 8,
    "format": "format type"
  }
]`;

    try {
        // Get AI model configuration
        const modelConfig = config.ai?.models?.primary || {};
        const modelId = modelConfig.id || 'anthropic.claude-3-sonnet-20240229-v1:0';
        const maxTokens = modelConfig.maxTokens || 4000;
        const temperature = modelConfig.temperature || 0.7;
        
        const response = await bedrockClient.send(new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        }));
        
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiResponse = responseBody.content[0].text;
        
        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Could not parse AI response as JSON');
        }
        
    } catch (error) {
        console.error('Error calling Bedrock:', error);
        
        // Try fallback model if configured
        const fallbackConfig = config.ai?.models?.fallback;
        if (fallbackConfig && fallbackConfig.id !== modelConfig.id) {
            console.log('Attempting fallback model:', fallbackConfig.id);
            try {
                const fallbackResponse = await bedrockClient.send(new InvokeModelCommand({
                    modelId: fallbackConfig.id,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify({
                        anthropic_version: 'bedrock-2023-05-31',
                        max_tokens: fallbackConfig.maxTokens || 2000,
                        temperature: fallbackConfig.temperature || 0.5,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ]
                    })
                }));
                
                const responseBody = JSON.parse(new TextDecoder().decode(fallbackResponse.body));
                const aiResponse = responseBody.content[0].text;
                
                const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (fallbackError) {
                console.error('Fallback model also failed:', fallbackError);
            }
        }
        
        // Final fallback to basic topic generation
        return generateFallbackTopics(baseTopic, frequency);
    }
}

/**
 * Analyze trends using AI to provide insights
 */
async function analyzeWithAI(topic, trendData) {
    if (trendData.length === 0) {
        return {
            summary: 'No recent trend data available for analysis',
            insights: [],
            recommendations: ['Consider broader keyword research', 'Check trend data collection']
        };
    }
    
    const trendsText = trendData.map(t => 
        `${t.keyword}: ${t.searchVolume || 'N/A'} searches, Source: ${t.source}`
    ).join('\n');
    
    const prompt = `Analyze these trending topics related to "${topic}":

${trendsText}

Provide insights about:
1. Current momentum and direction
2. Audience interest patterns
3. Content opportunities
4. Timing recommendations
5. Keyword optimization suggestions

Return as JSON:
{
  "summary": "brief overview",
  "momentum": "increasing/stable/declining",
  "insights": ["insight1", "insight2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "recommendations": ["rec1", "rec2"]
}`;

    try {
        // Get AI model configuration for analysis
        const modelConfig = config.ai?.models?.primary || {};
        const analysisConfig = config.ai?.prompts?.trendAnalysis || {};
        const modelId = modelConfig.id || 'anthropic.claude-3-sonnet-20240229-v1:0';
        const maxTokens = analysisConfig.maxTokens || 1500;
        const temperature = analysisConfig.temperature || 0.3;
        
        const response = await bedrockClient.send(new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: maxTokens,
                temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        }));
        
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiResponse = responseBody.content[0].text;
        
        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Could not parse AI analysis as JSON');
        }
        
    } catch (error) {
        console.error('Error analyzing with AI:', error);
        return {
            summary: 'AI analysis unavailable',
            insights: ['Manual trend review recommended'],
            recommendations: ['Check AI service availability']
        };
    }
}

/**
 * Score and rank generated topics based on engagement potential
 */
async function scoreTopics(topics, trendData) {
    const trendKeywords = new Set(trendData.map(t => t.keyword.toLowerCase()));
    
    // Get scoring configuration
    const contentConfig = config.content?.generation || {};
    const minEngagementScore = contentConfig.minEngagementScore || 6.0;
    const formatConfig = config.ai?.prompts?.topicGeneration?.formats || [];
    
    // Extract format keywords for scoring
    const formatKeywords = formatConfig.flatMap(format => 
        format.toLowerCase().match(/\b\w+\b/g) || []
    ).filter(word => word.length > 3);
    
    return topics.map(topic => {
        let score = topic.engagementScore || 5;
        
        // Boost score for trending keywords
        const topicKeywords = topic.keywords || [];
        const trendingMatches = topicKeywords.filter(k => 
            trendKeywords.has(k.toLowerCase())
        ).length;
        
        score += trendingMatches * 1.5;
        
        // Boost for configured proven formats
        const hasProvenFormat = formatKeywords.some(keyword => 
            topic.title.toLowerCase().includes(keyword)
        );
        
        if (hasProvenFormat) score += 1;
        
        // Apply minimum engagement score filter
        if (score < minEngagementScore) {
            score = minEngagementScore;
        }
        
        // Ensure score is within bounds
        score = Math.min(Math.max(score, 1), 10);
        
        return {
            ...topic,
            finalScore: Math.round(score * 10) / 10,
            trendingKeywords: trendingMatches,
            createdAt: new Date().toISOString()
        };
    }).sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Get trend data for a specific topic from DynamoDB
 */
async function getTrendDataForTopic(topic, timeframe = '7d') {
    try {
        // Get trend data max age from configuration
        const contentConfig = config.content?.generation || {};
        const maxAgeDays = contentConfig.trendDataMaxAge || 7;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
        
        const params = {
            TableName: TRENDS_TABLE,
            IndexName: 'TopicIndex',
            KeyConditionExpression: 'topic = :topic AND collectedAt >= :date',
            ExpressionAttributeValues: {
                ':topic': topic.toLowerCase(),
                ':date': cutoffDate.toISOString()
            },
            Limit: contentConfig.maxTopicsPerGeneration || 50
        };
        
        const result = await docClient.send(new QueryCommand(params));
        return result.Items || [];
        
    } catch (error) {
        console.error('Error getting trend data:', error);
        return [];
    }
}

/**
 * Store generated topics in DynamoDB
 */
async function storeGeneratedTopics(baseTopic, topics) {
    const stored = [];
    
    for (const topic of topics.slice(0, 5)) { // Store top 5 topics
        try {
            const topicId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const item = {
                topicId,
                title: topic.title,
                baseTopic,
                hook: topic.hook,
                angle: topic.angle,
                keywords: topic.keywords || [],
                engagementScore: topic.finalScore,
                format: topic.format,
                status: 'generated',
                source: 'ai-generator',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await docClient.send(new PutCommand({
                TableName: TOPICS_TABLE,
                Item: item
            }));
            
            stored.push(item);
            
        } catch (error) {
            console.error('Error storing topic:', error);
        }
    }
    
    return stored;
}

/**
 * Get high-performing topics for suggestions
 */
async function getHighPerformingTopics(category, limit) {
    try {
        const params = {
            TableName: TOPICS_TABLE,
            FilterExpression: 'attribute_exists(engagementScore) AND engagementScore >= :minScore',
            ExpressionAttributeValues: {
                ':minScore': 7
            },
            Limit: limit
        };
        
        if (category) {
            params.FilterExpression += ' AND contains(keywords, :category)';
            params.ExpressionAttributeValues[':category'] = category;
        }
        
        const result = await docClient.send(new QueryCommand(params));
        return result.Items || [];
        
    } catch (error) {
        console.error('Error getting high-performing topics:', error);
        return [];
    }
}

/**
 * Fallback topic generation when AI is unavailable
 */
function generateFallbackTopics(baseTopic, frequency) {
    const formats = [
        `5 Secrets About ${baseTopic} Nobody Tells You`,
        `The Shocking Truth About ${baseTopic}`,
        `I Tried ${baseTopic} for 30 Days - Here's What Happened`,
        `Why Everyone is Wrong About ${baseTopic}`,
        `The Biggest Mistakes People Make with ${baseTopic}`,
        `${baseTopic}: What Experts Don't Want You to Know`
    ];
    
    return formats.slice(0, frequency * 2).map((title, index) => ({
        title,
        hook: `What if everything you knew about ${baseTopic} was wrong?`,
        angle: 'Contrarian perspective on popular topic',
        keywords: [baseTopic.toLowerCase()],
        engagementScore: 6 + (index % 3),
        format: 'fallback'
    }));
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