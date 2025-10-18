/**
 * SIMPLIFIED Script Generator Lambda - No Shared Layer Dependencies
 * Eliminates architectural complexity and configuration drift
 */

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');
const {
    marshall,
    unmarshall
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
    console.log('Simplified Script Generator invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/scripts/health') {
        return createResponse(200, {
            service: 'script-generator-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Script generation
    if (httpMethod === 'POST' && path === '/scripts/generate') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                projectId,
                scriptOptions = {}
            } = requestBody;

            if (!projectId) {
                return createResponse(400, {
                    success: false,
                    error: 'Project ID is required'
                });
            }

            // Retrieve topic context
            const topicContext = await retrieveContext('topic', projectId);

            if (!topicContext) {
                return createResponse(400, {
                    success: false,
                    error: 'No topic context found. Topic Management must run first.',
                    type: 'VALIDATION'
                });
            }

            // Generate script
            const scriptData = await generateScript(topicContext, scriptOptions);

            // Store script and scene context
            await storeContext(scriptData.script, 'script', projectId);
            await storeContext(scriptData.scenes, 'scene', projectId);

            console.log(`✅ Script Generator completed for project: ${projectId}`);

            return createResponse(200, {
                success: true,
                projectId: projectId,
                totalScenes: scriptData.scenes.scenes.length,
                totalDuration: scriptData.script.totalDuration,
                script: scriptData.script,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Script Generator error:', error);
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
 * Generate script from topic context
 */
async function generateScript(topicContext, scriptOptions) {
    const {
        targetLength = 300, videoStyle = 'engaging', targetAudience = 'general'
    } = scriptOptions;

    // Calculate scene timing
    const sceneCount = Math.min(topicContext.expandedTopics.length, 6);
    const sceneLength = Math.floor(targetLength / sceneCount);

    const scenes = [];
    const scriptParts = [];

    // Generate scenes from expanded topics
    for (let i = 0; i < sceneCount; i++) {
        const topic = topicContext.expandedTopics[i];
        const sceneNumber = i + 1;

        const scene = {
            sceneNumber,
            title: topic.subtopic,
            duration: sceneLength,
            startTime: i * sceneLength,
            purpose: i === 0 ? 'hook' : i === sceneCount - 1 ? 'conclusion' : 'content',
            content: {
                script: generateSceneScript(topic, topicContext.mainTopic, i === 0)
            },
            visualRequirements: {
                searchKeywords: topic.visualNeeds,
                sceneType: i === 0 ? 'dynamic_intro' : 'informative',
                emotionalTone: videoStyle
            }
        };

        scenes.push(scene);
        scriptParts.push(scene.content.script);
    }

    const script = {
        title: `Complete Guide: ${topicContext.mainTopic}`,
        totalDuration: targetLength,
        sceneCount: sceneCount,
        fullScript: scriptParts.join(' '),
        scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            script: s.content.script,
            duration: s.duration
        })),
        metadata: {
            generatedAt: new Date().toISOString(),
            targetAudience,
            videoStyle,
            architecture: 'simplified'
        }
    };

    const sceneContext = {
        scenes: scenes,
        totalDuration: targetLength,
        metadata: {
            generatedAt: new Date().toISOString(),
            architecture: 'simplified'
        }
    };

    return {
        script,
        scenes: sceneContext
    };
}

/**
 * Generate script for individual scene
 */
function generateSceneScript(topic, mainTopic, isHook) {
    if (isHook) {
        return `Welcome to our comprehensive guide on ${mainTopic}. ${topic.valueProposition}. In this video, we'll cover everything you need to know to get started.`;
    }

    return `Let's explore ${topic.subtopic}. ${topic.valueProposition}. Here are the key points you need to understand.`;
}

/**
 * Retrieve context from S3
 */
async function retrieveContext(contextType, projectId) {
    try {
        // Get reference from DynamoDB
        const response = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.CONTEXT_TABLE,
            Key: marshall({
                PK: `${contextType}#${projectId}`,
                SK: projectId
            })
        }));

        if (!response.Item) {
            console.log(`⚠️ No ${contextType} context found for project ${projectId}`);
            return null;
        }

        const contextRecord = unmarshall(response.Item);

        // Get context from S3
        const s3Response = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: contextRecord.s3Location
        }));

        const contextData = JSON.parse(await s3Response.Body.transformToString());
        console.log(`✅ Retrieved ${contextType} context for project ${projectId}`);

        return contextData;

    } catch (error) {
        console.error(`❌ Error retrieving ${contextType} context:`, error);
        return null;
    }
}

/**
 * Store context in S3 and DynamoDB
 */
async function storeContext(context, contextType, projectId) {
    try {
        // Store in S3
        const s3Key = `videos/${projectId}/${contextType === 'script' ? '02-script' : '01-context'}/${contextType === 'script' ? 'script.json' : contextType + '-context.json'}`;

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