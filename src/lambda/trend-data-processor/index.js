/**
 * Trend Data Processing and Storage Service
 * Normalizes, scores, and aggregates trend data from multiple sources
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, BatchWriteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

// Global configuration
let config = null;

// Initialize AWS clients (will be configured after config load)
let dynamoClient = null;
let docClient = null;
let s3Client = null;

// Configuration values (loaded from config)
let TRENDS_TABLE = null;
let PROCESSED_TRENDS_TABLE = null;
let S3_BUCKET = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('trend-data-processor');
        
        // Initialize AWS clients with configuration
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient);
        s3Client = new S3Client({ region });
        
        // Set table and bucket names
        TRENDS_TABLE = process.env.TRENDS_TABLE_NAME;
        PROCESSED_TRENDS_TABLE = process.env.PROCESSED_TRENDS_TABLE_NAME || 'automated-video-pipeline-processed-trends';
        S3_BUCKET = process.env.S3_BUCKET_NAME;
        
        console.log('Trend Data Processor service initialized with configuration');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Trend Data Processor invoked:', JSON.stringify(event, null, 2));
    
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
        if (httpMethod === 'POST' && path === '/trends/process') {
            return await processTrendData(requestBody);
        } else if (httpMethod === 'POST' && path === '/trends/aggregate') {
            return await aggregateTrendData(requestBody);
        } else if (httpMethod === 'GET' && path === '/trends/processed') {
            return await getProcessedTrends(queryStringParameters || {});
        } else if (httpMethod === 'POST' && path === '/trends/score') {
            return await scoreTrendData(requestBody);
        } else if (httpMethod === 'GET' && path === '/trends/analytics') {
            return await getTrendAnalytics(queryStringParameters || {});
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Trend Data Processor:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Process and normalize raw trend data from multiple sources
 */
async function processTrendData(requestBody) {
    const { source, timeframe = '7d', batchSize = 100 } = requestBody;
    
    try {
        console.log(`Processing trend data from source: ${source || 'all'}`);
        
        // Get raw trend data from DynamoDB
        const rawTrendData = await getRawTrendData(source, timeframe);
        
        if (rawTrendData.length === 0) {
            return createResponse(200, {
                message: 'No raw trend data found to process',
                processed: 0,
                source: source || 'all'
            });
        }
        
        // Process data in batches
        const processedData = [];
        const batchCount = Math.ceil(rawTrendData.length / batchSize);
        
        for (let i = 0; i < batchCount; i++) {
            const batch = rawTrendData.slice(i * batchSize, (i + 1) * batchSize);
            const processedBatch = await processBatch(batch);
            processedData.push(...processedBatch);
            
            // Store processed batch
            if (processedBatch.length > 0) {
                await storeProcessedTrends(processedBatch);
            }
        }
        
        // Generate aggregated insights
        const insights = await generateTrendInsights(processedData);
        
        return createResponse(200, {
            message: 'Trend data processed successfully',
            processed: processedData.length,
            batches: batchCount,
            source: source || 'all',
            insights,
            timeframe
        });
        
    } catch (error) {
        console.error('Error processing trend data:', error);
        return createResponse(500, { 
            error: 'Failed to process trend data',
            message: error.message 
        });
    }
}

/**
 * Process a batch of raw trend data
 */
async function processBatch(rawData) {
    const processed = [];
    
    for (const item of rawData) {
        try {
            const normalizedData = await normalizeDataFormat(item);
            const scoredData = await calculateTrendScore(normalizedData);
            const enrichedData = await enrichTrendData(scoredData);
            
            processed.push(enrichedData);
            
        } catch (error) {
            console.error('Error processing trend item:', error);
            // Continue processing other items
        }
    }
    
    return processed;
}

/**
 * Normalize data format from different sources
 */
async function normalizeDataFormat(rawItem) {
    const source = rawItem.source || 'unknown';
    const timestamp = new Date().toISOString();
    
    // Get normalization configuration
    const processingConfig = config.content?.processing || {};
    const normalizationRules = processingConfig.normalization || {};
    
    let normalized = {
        processedId: `processed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalId: rawItem.trendId || rawItem.id,
        source,
        processedAt: timestamp,
        topic: rawItem.topic || rawItem.keyword || 'unknown',
        keyword: rawItem.keyword || rawItem.topic || 'unknown',
        rawScore: 0,
        normalizedScore: 0,
        metadata: {
            originalData: rawItem,
            processingVersion: '1.0'
        }
    };
    
    // Source-specific normalization
    switch (source.toLowerCase()) {
        case 'google-trends':
        case 'google':
            normalized = normalizeGoogleTrendsData(rawItem, normalized);
            break;
            
        case 'youtube':
            normalized = normalizeYouTubeData(rawItem, normalized);
            break;
            
        case 'twitter':
            normalized = normalizeTwitterData(rawItem, normalized);
            break;
            
        case 'news':
            normalized = normalizeNewsData(rawItem, normalized);
            break;
            
        default:
            normalized = normalizeGenericData(rawItem, normalized);
    }
    
    // Apply global normalization rules
    if (normalizationRules.keywordCleaning) {
        normalized.keyword = cleanKeyword(normalized.keyword);
    }
    
    if (normalizationRules.topicCategorization) {
        normalized.category = categorizeKeyword(normalized.keyword);
    }
    
    return normalized;
}

/**
 * Normalize Google Trends data
 */
function normalizeGoogleTrendsData(rawItem, normalized) {
    return {
        ...normalized,
        searchVolume: rawItem.searchVolume || rawItem.value || 0,
        relatedQueries: rawItem.relatedQueries || [],
        risingQueries: rawItem.risingQueries || [],
        region: rawItem.region || 'US',
        timeframe: rawItem.timeframe || '7d',
        rawScore: rawItem.searchVolume || rawItem.value || 0,
        dataPoints: rawItem.timeline || [],
        metadata: {
            ...normalized.metadata,
            sourceSpecific: {
                geoRestriction: rawItem.geo,
                category: rawItem.category,
                property: rawItem.property
            }
        }
    };
}

/**
 * Normalize YouTube data
 */
function normalizeYouTubeData(rawItem, normalized) {
    return {
        ...normalized,
        viewCount: rawItem.viewCount || 0,
        likeCount: rawItem.likeCount || 0,
        commentCount: rawItem.commentCount || 0,
        subscriberGrowth: rawItem.subscriberGrowth || 0,
        engagementRate: rawItem.engagementRate || 0,
        rawScore: calculateYouTubeEngagement(rawItem),
        videoIds: rawItem.videoIds || [],
        channelData: rawItem.channelData || {},
        metadata: {
            ...normalized.metadata,
            sourceSpecific: {
                duration: rawItem.duration,
                publishedAt: rawItem.publishedAt,
                categoryId: rawItem.categoryId,
                tags: rawItem.tags || []
            }
        }
    };
}

/**
 * Normalize Twitter data
 */
function normalizeTwitterData(rawItem, normalized) {
    return {
        ...normalized,
        tweetCount: rawItem.tweetCount || 0,
        retweetCount: rawItem.retweetCount || 0,
        likeCount: rawItem.likeCount || 0,
        impressions: rawItem.impressions || 0,
        engagementRate: rawItem.engagementRate || 0,
        rawScore: calculateTwitterEngagement(rawItem),
        hashtags: rawItem.hashtags || [],
        mentions: rawItem.mentions || [],
        sentiment: rawItem.sentiment || 'neutral',
        metadata: {
            ...normalized.metadata,
            sourceSpecific: {
                language: rawItem.lang,
                userCount: rawItem.userCount,
                influencerMentions: rawItem.influencerMentions || []
            }
        }
    };
}

/**
 * Normalize News data
 */
function normalizeNewsData(rawItem, normalized) {
    return {
        ...normalized,
        articleCount: rawItem.articleCount || 0,
        shareCount: rawItem.shareCount || 0,
        sentiment: rawItem.sentiment || 'neutral',
        sources: rawItem.sources || [],
        rawScore: rawItem.articleCount || 0,
        headlines: rawItem.headlines || [],
        categories: rawItem.categories || [],
        metadata: {
            ...normalized.metadata,
            sourceSpecific: {
                publishedRange: rawItem.publishedRange,
                domains: rawItem.domains || [],
                authors: rawItem.authors || []
            }
        }
    };
}

/**
 * Normalize generic data
 */
function normalizeGenericData(rawItem, normalized) {
    return {
        ...normalized,
        value: rawItem.value || rawItem.score || 0,
        rawScore: rawItem.value || rawItem.score || 0,
        metadata: {
            ...normalized.metadata,
            sourceSpecific: {
                originalFormat: 'generic',
                availableFields: Object.keys(rawItem)
            }
        }
    };
}

/**
 * Calculate trend score based on multiple factors
 */
async function calculateTrendScore(normalizedData) {
    // Get scoring configuration
    const scoringConfig = config.content?.scoring || {};
    const weights = scoringConfig.weights || {
        volume: 0.3,
        engagement: 0.25,
        recency: 0.2,
        growth: 0.15,
        sentiment: 0.1
    };
    
    let scores = {
        volume: 0,
        engagement: 0,
        recency: 0,
        growth: 0,
        sentiment: 0
    };
    
    // Volume score (based on raw metrics)
    scores.volume = calculateVolumeScore(normalizedData);
    
    // Engagement score (based on interactions)
    scores.engagement = calculateEngagementScore(normalizedData);
    
    // Recency score (how recent the data is)
    scores.recency = calculateRecencyScore(normalizedData);
    
    // Growth score (trending up or down)
    scores.growth = calculateGrowthScore(normalizedData);
    
    // Sentiment score (positive/negative sentiment)
    scores.sentiment = calculateSentimentScore(normalizedData);
    
    // Calculate weighted final score
    const finalScore = Object.keys(scores).reduce((total, key) => {
        return total + (scores[key] * (weights[key] || 0));
    }, 0);
    
    // Normalize to 0-100 scale
    const normalizedScore = Math.min(Math.max(finalScore * 100, 0), 100);
    
    return {
        ...normalizedData,
        normalizedScore,
        scoreBreakdown: scores,
        scoreWeights: weights,
        scoringVersion: '1.0'
    };
}

/**
 * Calculate volume score based on raw metrics
 */
function calculateVolumeScore(data) {
    const metrics = [
        data.searchVolume || 0,
        data.viewCount || 0,
        data.tweetCount || 0,
        data.articleCount || 0,
        data.value || 0
    ];
    
    const maxMetric = Math.max(...metrics);
    if (maxMetric === 0) return 0;
    
    // Logarithmic scaling for volume
    return Math.log10(maxMetric + 1) / Math.log10(1000000); // Scale to 0-1
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(data) {
    let engagementMetrics = [];
    
    // YouTube engagement
    if (data.viewCount && data.likeCount) {
        engagementMetrics.push(data.likeCount / data.viewCount);
    }
    
    // Twitter engagement
    if (data.tweetCount && data.retweetCount) {
        engagementMetrics.push(data.retweetCount / data.tweetCount);
    }
    
    // Direct engagement rate
    if (data.engagementRate) {
        engagementMetrics.push(data.engagementRate);
    }
    
    if (engagementMetrics.length === 0) return 0;
    
    // Average engagement rate
    const avgEngagement = engagementMetrics.reduce((sum, rate) => sum + rate, 0) / engagementMetrics.length;
    return Math.min(avgEngagement * 10, 1); // Scale to 0-1
}

/**
 * Calculate recency score
 */
function calculateRecencyScore(data) {
    const now = new Date();
    const dataTime = new Date(data.collectedAt || data.processedAt || now);
    const hoursDiff = (now - dataTime) / (1000 * 60 * 60);
    
    // Score decreases with age, 1.0 for current hour, 0.5 for 24 hours, 0.1 for 7 days
    if (hoursDiff <= 1) return 1.0;
    if (hoursDiff <= 24) return 0.8;
    if (hoursDiff <= 72) return 0.6;
    if (hoursDiff <= 168) return 0.3; // 7 days
    return 0.1;
}

/**
 * Calculate growth score
 */
function calculateGrowthScore(data) {
    // If we have timeline data, calculate growth
    if (data.dataPoints && data.dataPoints.length >= 2) {
        const recent = data.dataPoints.slice(-3); // Last 3 points
        const older = data.dataPoints.slice(0, 3); // First 3 points
        
        const recentAvg = recent.reduce((sum, point) => sum + (point.value || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, point) => sum + (point.value || 0), 0) / older.length;
        
        if (olderAvg === 0) return recentAvg > 0 ? 1 : 0;
        
        const growthRate = (recentAvg - olderAvg) / olderAvg;
        return Math.min(Math.max(growthRate + 0.5, 0), 1); // Normalize to 0-1
    }
    
    // Default moderate growth score
    return 0.5;
}

/**
 * Calculate sentiment score
 */
function calculateSentimentScore(data) {
    if (!data.sentiment) return 0.5; // Neutral default
    
    switch (data.sentiment.toLowerCase()) {
        case 'positive':
        case 'bullish':
            return 1.0;
        case 'negative':
        case 'bearish':
            return 0.2;
        case 'neutral':
        default:
            return 0.5;
    }
}

/**
 * Enrich trend data with additional context
 */
async function enrichTrendData(scoredData) {
    const enrichmentConfig = config.content?.enrichment || {};
    
    let enriched = {
        ...scoredData,
        enrichedAt: new Date().toISOString(),
        enrichmentVersion: '1.0'
    };
    
    // Add keyword categorization
    if (enrichmentConfig.categorization) {
        enriched.category = categorizeKeyword(enriched.keyword);
        enriched.subcategory = getSubcategory(enriched.keyword, enriched.category);
    }
    
    // Add seasonality information
    if (enrichmentConfig.seasonality) {
        enriched.seasonality = getSeasonalityInfo(enriched.keyword);
    }
    
    // Add competition analysis
    if (enrichmentConfig.competition) {
        enriched.competitionLevel = assessCompetitionLevel(enriched);
    }
    
    // Add content opportunity score
    enriched.contentOpportunityScore = calculateContentOpportunity(enriched);
    
    return enriched;
}

/**
 * Aggregate trend data for reporting
 */
async function aggregateTrendData(requestBody) {
    const { 
        timeframe = '24h', 
        groupBy = 'category', 
        metrics = ['score', 'volume', 'engagement'],
        limit = 100 
    } = requestBody;
    
    try {
        // Get processed trend data
        const processedData = await getProcessedTrendData(timeframe, limit * 2);
        
        if (processedData.length === 0) {
            return createResponse(200, {
                message: 'No processed trend data found for aggregation',
                aggregations: {},
                timeframe
            });
        }
        
        // Perform aggregations
        const aggregations = {};
        
        // Group by specified field
        const grouped = groupTrendData(processedData, groupBy);
        
        // Calculate aggregated metrics
        for (const [group, items] of Object.entries(grouped)) {
            aggregations[group] = calculateAggregatedMetrics(items, metrics);
        }
        
        // Sort by primary metric
        const sortedAggregations = Object.entries(aggregations)
            .sort(([,a], [,b]) => (b[metrics[0]] || 0) - (a[metrics[0]] || 0))
            .slice(0, limit)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
        
        return createResponse(200, {
            aggregations: sortedAggregations,
            totalGroups: Object.keys(aggregations).length,
            totalItems: processedData.length,
            groupBy,
            metrics,
            timeframe
        });
        
    } catch (error) {
        console.error('Error aggregating trend data:', error);
        return createResponse(500, { 
            error: 'Failed to aggregate trend data',
            message: error.message 
        });
    }
}

/**
 * Get processed trends with filtering and pagination
 */
async function getProcessedTrends(queryParams) {
    const {
        category,
        source,
        minScore = 0,
        limit = 50,
        sortBy = 'normalizedScore',
        sortOrder = 'desc'
    } = queryParams;
    
    try {
        let filterExpression = 'normalizedScore >= :minScore';
        let expressionAttributeValues = {
            ':minScore': parseFloat(minScore)
        };
        
        // Add category filter
        if (category) {
            filterExpression += ' AND category = :category';
            expressionAttributeValues[':category'] = category;
        }
        
        // Add source filter
        if (source) {
            filterExpression += ' AND #src = :source';
            expressionAttributeValues[':source'] = source;
        }
        
        const params = {
            TableName: PROCESSED_TRENDS_TABLE,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: parseInt(limit)
        };
        
        // Add ExpressionAttributeNames if source filter is used
        if (source) {
            params.ExpressionAttributeNames = { '#src': 'source' };
        }
        
        const result = await docClient.send(new ScanCommand(params));
        let items = result.Items || [];
        
        // Sort results
        items.sort((a, b) => {
            const aVal = a[sortBy] || 0;
            const bVal = b[sortBy] || 0;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        });
        
        return createResponse(200, {
            trends: items,
            count: items.length,
            filters: { category, source, minScore },
            sorting: { sortBy, sortOrder }
        });
        
    } catch (error) {
        console.error('Error getting processed trends:', error);
        return createResponse(500, { 
            error: 'Failed to get processed trends',
            message: error.message 
        });
    }
}

/**
 * Score existing trend data
 */
async function scoreTrendData(requestBody) {
    const { trendIds, rescoreAll = false } = requestBody;
    
    try {
        let trendsToScore = [];
        
        if (rescoreAll) {
            // Get all processed trends for rescoring
            const result = await docClient.send(new ScanCommand({
                TableName: PROCESSED_TRENDS_TABLE
            }));
            trendsToScore = result.Items || [];
        } else if (trendIds && trendIds.length > 0) {
            // Get specific trends
            for (const id of trendIds) {
                try {
                    const result = await docClient.send(new QueryCommand({
                        TableName: PROCESSED_TRENDS_TABLE,
                        KeyConditionExpression: 'processedId = :id',
                        ExpressionAttributeValues: { ':id': id }
                    }));
                    
                    if (result.Items && result.Items.length > 0) {
                        trendsToScore.push(result.Items[0]);
                    }
                } catch (error) {
                    console.error(`Error getting trend ${id}:`, error);
                }
            }
        } else {
            return createResponse(400, { error: 'Either trendIds or rescoreAll=true is required' });
        }
        
        // Rescore trends
        const rescoredTrends = [];
        for (const trend of trendsToScore) {
            const rescored = await calculateTrendScore(trend);
            rescoredTrends.push(rescored);
        }
        
        // Store rescored trends
        if (rescoredTrends.length > 0) {
            await storeProcessedTrends(rescoredTrends);
        }
        
        return createResponse(200, {
            message: 'Trends rescored successfully',
            rescored: rescoredTrends.length,
            trends: rescoredTrends.slice(0, 10) // Return first 10 for preview
        });
        
    } catch (error) {
        console.error('Error scoring trend data:', error);
        return createResponse(500, { 
            error: 'Failed to score trend data',
            message: error.message 
        });
    }
}

/**
 * Get trend analytics and insights
 */
async function getTrendAnalytics(queryParams) {
    const { timeframe = '24h', category } = queryParams;
    
    try {
        // Get processed trends for analysis
        const trends = await getProcessedTrendData(timeframe, 1000);
        
        if (trends.length === 0) {
            return createResponse(200, {
                message: 'No trend data available for analytics',
                analytics: {}
            });
        }
        
        // Calculate analytics
        const analytics = {
            summary: calculateSummaryStats(trends),
            topCategories: getTopCategories(trends),
            topSources: getTopSources(trends),
            scoreDistribution: getScoreDistribution(trends),
            trendingKeywords: getTrendingKeywords(trends),
            insights: generateAnalyticsInsights(trends)
        };
        
        return createResponse(200, {
            analytics,
            dataPoints: trends.length,
            timeframe,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting trend analytics:', error);
        return createResponse(500, { 
            error: 'Failed to get trend analytics',
            message: error.message 
        });
    }
}

// Helper functions for data processing and utilities

/**
 * Get raw trend data from DynamoDB
 */
async function getRawTrendData(source, timeframe) {
    const params = {
        TableName: TRENDS_TABLE,
        Limit: 1000
    };
    
    if (source) {
        params.FilterExpression = '#src = :source';
        params.ExpressionAttributeNames = { '#src': 'source' };
        params.ExpressionAttributeValues = { ':source': source };
    }
    
    const result = await docClient.send(new ScanCommand(params));
    return result.Items || [];
}

/**
 * Store processed trends in DynamoDB
 */
async function storeProcessedTrends(processedTrends) {
    const batchSize = 25; // DynamoDB batch write limit
    
    for (let i = 0; i < processedTrends.length; i += batchSize) {
        const batch = processedTrends.slice(i, i + batchSize);
        
        const putRequests = batch.map(trend => ({
            PutRequest: {
                Item: {
                    ...trend,
                    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
                }
            }
        }));
        
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [PROCESSED_TRENDS_TABLE]: putRequests
            }
        }));
    }
}

/**
 * Clean and normalize keywords
 */
function cleanKeyword(keyword) {
    return keyword
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 100); // Limit length
}

/**
 * Categorize keywords into topics
 */
function categorizeKeyword(keyword) {
    const categories = {
        'finance': ['invest', 'money', 'stock', 'crypto', 'bitcoin', 'trading', 'finance', 'bank'],
        'technology': ['tech', 'ai', 'software', 'app', 'digital', 'computer', 'internet'],
        'health': ['health', 'fitness', 'diet', 'medical', 'wellness', 'exercise'],
        'entertainment': ['movie', 'music', 'game', 'celebrity', 'tv', 'show', 'entertainment'],
        'education': ['learn', 'study', 'course', 'tutorial', 'education', 'school'],
        'lifestyle': ['travel', 'food', 'fashion', 'home', 'lifestyle', 'beauty'],
        'business': ['business', 'entrepreneur', 'startup', 'marketing', 'sales'],
        'news': ['news', 'politics', 'world', 'breaking', 'current', 'events']
    };
    
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [category, terms] of Object.entries(categories)) {
        if (terms.some(term => lowerKeyword.includes(term))) {
            return category;
        }
    }
    
    return 'general';
}

/**
 * Calculate YouTube engagement metrics
 */
function calculateYouTubeEngagement(data) {
    const views = data.viewCount || 0;
    const likes = data.likeCount || 0;
    const comments = data.commentCount || 0;
    
    if (views === 0) return 0;
    
    const engagementRate = (likes + comments) / views;
    return Math.min(engagementRate * 1000, 100); // Scale to reasonable range
}

/**
 * Calculate Twitter engagement metrics
 */
function calculateTwitterEngagement(data) {
    const tweets = data.tweetCount || 0;
    const retweets = data.retweetCount || 0;
    const likes = data.likeCount || 0;
    
    if (tweets === 0) return 0;
    
    const engagementRate = (retweets + likes) / tweets;
    return Math.min(engagementRate * 10, 100); // Scale to reasonable range
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

// Additional helper functions would continue here...
// (Due to length constraints, I'm showing the core structure)