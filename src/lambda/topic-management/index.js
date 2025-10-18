/**
 * SIMPLIFIED Topic Management Lambda - No Shared Layer Dependencies
 * Eliminates architectural complexity and configuration drift
 */

const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    DynamoDBClient,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
    marshall
} = require('@aws-sdk/util-dynamodb');

const s3Client = new S3Client({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new DynamoDBClient({
    region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});

/**
 * Main Lambda handler
 */
exports.handler = async (event, context) => {
    console.log('Simplified Topic Management invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/topics/health') {
        return createResponse(200, {
            service: 'topic-management-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Topic creation
    if (httpMethod === 'POST' && path === '/topics') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                topic,
                projectId,
                targetAudience = 'general',
                videoDuration = 300
            } = requestBody;

            if (!topic) {
                return createResponse(400, {
                    success: false,
                    error: 'Topic is required'
                });
            }

            // Create project ID
            const finalProjectId = projectId || createProjectId(topic);

            // Generate enhanced topic context
            const topicContext = await generateTopicContext(topic, targetAudience, videoDuration);

            // Store context
            await storeContext(topicContext, 'topic', finalProjectId);

            console.log(`✅ Topic Management completed for project: ${finalProjectId}`);

            return createResponse(200, {
                success: true,
                projectId: finalProjectId,
                topic: topic,
                expandedTopics: topicContext.expandedTopics,
                seoContext: topicContext.seoContext,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Topic Management error:', error);
            return createResponse(500, {
                success: false,
                error: error.message
            });
        }
    }

    return createResponse(404, {
        success: false,
        error: 'Endpoint not found'
    });
};

/**
 * Generate enhanced topic context
 */
async function generateTopicContext(topic, targetAudience, videoDuration) {
    // Simplified topic expansion logic
    const expandedTopics = [{
            subtopic: `Complete guide to ${topic}`,
            priority: 'high',
            trendScore: 95,
            valueProposition: `Comprehensive ${topic} guide with practical tips`,
            visualNeeds: ['overview', 'key points', 'examples']
        },
        {
            subtopic: `Best practices for ${topic}`,
            priority: 'high',
            trendScore: 90,
            valueProposition: `Expert tips and proven strategies`,
            visualNeeds: ['best practices', 'tips', 'strategies']
        },
        {
            subtopic: `Common mistakes in ${topic}`,
            priority: 'medium',
            trendScore: 85,
            valueProposition: `Avoid costly errors and pitfalls`,
            visualNeeds: ['mistakes', 'warnings', 'solutions']
        }
    ];

    // Generate SEO context
    const topicWords = topic.toLowerCase().split(' ');
    const seoContext = {
        primaryKeywords: [topic.toLowerCase(), ...topicWords],
        longTailKeywords: [
            `${topic.toLowerCase()} guide`,
            `${topic.toLowerCase()} tips`,
            `how to ${topic.toLowerCase()}`
        ]
    };

    return {
        mainTopic: topic,
        targetAudience,
        videoDuration,
        expandedTopics,
        seoContext,
        projectMetadata: {
            createdAt: new Date().toISOString(),
            architecture: 'simplified',
            version: '4.0.0'
        }
    };
}

/**
 * Store context in S3 and DynamoDB
 */
async function storeContext(context, contextType, projectId) {
    try {
        // Store in S3
        const s3Key = `videos/${projectId}/01-context/${contextType}-context.json`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: JSON.stringify(context, null, 2),
            ContentType: 'application/json'
        }));

        // Store reference in DynamoDB
        const contextRecord = {
            PK: `${contextType}#${projectId}`,
            SK: projectId,
            s3Location: s3Key,
            contextType,
            projectId,
            createdAt: new Date().toISOString(),
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Item: marshall(contextRecord)
        }));

        console.log(`✅ Stored ${contextType} context for project ${projectId}`);
        return {
            success: true,
            s3Location: s3Key
        };

    } catch (error) {
        console.error(`❌ Error storing ${contextType} context:`, error);
        throw error;
    }
}

/**
 * Create project ID
 */
function createProjectId(baseTopic) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const topicSlug = baseTopic.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30);

    return `${timestamp}_${topicSlug}`;
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body, null, 2)
    };
}