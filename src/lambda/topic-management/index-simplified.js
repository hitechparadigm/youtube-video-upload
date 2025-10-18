/**
 * 📋 TOPIC MANAGEMENT AI LAMBDA FUNCTION - SIMPLIFIED VERSION
 * 
 * ROLE: Fast Topic Analysis and Project Creation
 * This is a simplified version that avoids timeouts by skipping complex AI processing
 */

const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'automated-video-pipeline-v2-786673323159-us-east-1';
const TOPICS_TABLE = process.env.TOPICS_TABLE_NAME || 'automated-video-pipeline-topics-v2';

/**
 * Main Lambda handler - simplified version
 */
const handler = async (event, context) => {
    console.log('Topic Management invoked:', JSON.stringify(event, null, 2));

    try {
        const { httpMethod, path, body } = event;

        // Parse request body
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }

        // Route requests
        switch (httpMethod) {
            case 'GET':
                if (path === '/health' || path === '/topics/health') {
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: true,
                            service: 'topic-management',
                            status: 'healthy',
                            timestamp: new Date().toISOString(),
                            version: '3.0.0-simplified'
                        })
                    };
                }
                break;

            case 'POST':
                return await generateTopicContext(requestBody);

            default:
                return {
                    statusCode: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Method not allowed'
                    })
                };
        }

    } catch (error) {
        console.error('Topic Management error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: {
                    message: 'Internal server error',
                    type: 'INTERNAL',
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
};

/**
 * Generate topic context quickly without complex AI processing
 */
async function generateTopicContext(requestBody) {
    const {
        topic,
        targetAudience = 'general',
        videoDuration = 180,
        contentType = 'educational'
    } = requestBody;

    if (!topic) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Topic is required'
            })
        };
    }

    try {
        console.log(`Generating context for topic: ${topic}`);

        // Create project ID
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substr(0, 19);
        const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substr(0, 30);
        const projectId = `${timestamp}_${topicSlug}`;

        console.log(`Created project ID: ${projectId}`);

        // Create simplified topic context (no AI processing to avoid timeout)
        const topicContext = {
            mainTopic: topic,
            projectId: projectId,
            expandedTopics: [
                {
                    subtopic: `Introduction to ${topic}`,
                    priority: 'high',
                    trendScore: 90,
                    valueProposition: `Complete guide to ${topic}`,
                    visualNeeds: ['overview', 'introduction', 'key concepts']
                },
                {
                    subtopic: `Key aspects of ${topic}`,
                    priority: 'high', 
                    trendScore: 85,
                    valueProposition: `Essential information about ${topic}`,
                    visualNeeds: ['details', 'examples', 'demonstrations']
                },
                {
                    subtopic: `Practical tips for ${topic}`,
                    priority: 'medium',
                    trendScore: 80,
                    valueProposition: `Actionable advice for ${topic}`,
                    visualNeeds: ['tips', 'advice', 'recommendations']
                }
            ],
            contentGuidance: {
                concreteDetails: [`Specific information about ${topic}`, 'Practical examples', 'Real-world applications'],
                actionableAdvice: ['Step-by-step guidance', 'Best practices', 'Common mistakes to avoid'],
                visualOpportunities: ['Charts and diagrams', 'Examples and demonstrations', 'Before/after comparisons'],
                engagementHooks: ['Interesting facts', 'Common questions', 'Surprising insights'],
                callToActionSuggestions: [`Learn more about ${topic}`, 'Share your experience', 'Subscribe for more guides']
            },
            seoContext: {
                primaryKeywords: [
                    topic.toLowerCase(),
                    `${topic.toLowerCase()} guide`,
                    `${topic.toLowerCase()} tips`,
                    `${topic.toLowerCase()} 2025`,
                    `best ${topic.toLowerCase()}`,
                    `${topic.toLowerCase()} tutorial`,
                    `${topic.toLowerCase()} strategy`,
                    `${topic.toLowerCase()} advice`
                ],
                longTailKeywords: [
                    `complete guide to ${topic.toLowerCase()}`,
                    `how to ${topic.toLowerCase()}`,
                    `${topic.toLowerCase()} for beginners`,
                    `best ${topic.toLowerCase()} tips`,
                    `${topic.toLowerCase()} step by step`,
                    `${topic.toLowerCase()} mistakes to avoid`,
                    `${topic.toLowerCase()} best practices`,
                    `${topic.toLowerCase()} examples`
                ]
            },
            videoStructure: {
                recommendedScenes: Math.max(3, Math.min(6, Math.ceil(videoDuration / 60))),
                hookDuration: 15,
                mainContentDuration: Math.floor(videoDuration * 0.75),
                conclusionDuration: videoDuration - 15 - Math.floor(videoDuration * 0.75),
                totalDuration: videoDuration,
                contentComplexity: 'moderate'
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                model: 'simplified-fast-generation',
                inputParameters: { topic, targetAudience, contentType, videoDuration },
                confidence: 0.85,
                processingTime: 'under-5-seconds'
            }
        };

        // Store topic context in S3
        const contextKey = `videos/${projectId}/01-context/topic-context.json`;
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: contextKey,
            Body: JSON.stringify(topicContext, null, 2),
            ContentType: 'application/json'
        }));

        console.log(`Stored topic context: ${contextKey}`);

        // Store topic record in DynamoDB
        const topicRecord = {
            topicId: { S: randomUUID() },
            topic: { S: topic },
            projectId: { S: projectId },
            status: { S: 'generated' },
            source: { S: 'simplified_generation' },
            createdAt: { S: new Date().toISOString() },
            targetAudience: { S: targetAudience },
            videoDuration: { N: videoDuration.toString() }
        };

        await dynamoClient.send(new PutItemCommand({
            TableName: TOPICS_TABLE,
            Item: topicRecord
        }));

        console.log(`Topic generation completed for: ${topic}`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                projectId: projectId,
                baseTopic: topic,
                expandedTopics: topicContext.expandedTopics,
                generatedAt: new Date().toISOString(),
                contextStored: true,
                approach: 'simplified-fast-generation',
                executionTime: 'under-10-seconds'
            })
        };

    } catch (error) {
        console.error('Topic context generation error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: {
                    message: 'Internal server error',
                    type: 'INTERNAL',
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
}

module.exports = { handler };
