/**
 * SIMPLIFIED Media Curator Lambda - No Shared Layer Dependencies
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
const https = require('https');

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
    console.log('Simplified Media Curator invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/media/health') {
        return createResponse(200, {
            service: 'media-curator-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Media curation
    if (httpMethod === 'POST' && path === '/media/curate') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                projectId,
                baseTopic,
                sceneCount = 4,
                quality = '1080p'
            } = requestBody;

            if (!projectId) {
                return createResponse(400, {
                    success: false,
                    error: 'Project ID is required'
                });
            }

            // Retrieve scene context
            const sceneContext = await retrieveContext('scene', projectId);

            if (!sceneContext) {
                return createResponse(400, {
                    success: false,
                    error: 'No scene context found. Script Generator must run first.',
                    type: 'VALIDATION'
                });
            }

            // Curate media for each scene
            const mediaResults = await curateMediaForScenes(projectId, sceneContext, baseTopic);

            // Store media context
            await storeContext(mediaResults, 'media', projectId);

            console.log(`✅ Media Curator completed for project: ${projectId}`);

            return createResponse(200, {
                success: true,
                projectId: projectId,
                totalScenes: sceneContext.scenes.length,
                totalImages: mediaResults.totalImages,
                sceneMediaMapping: mediaResults.sceneMediaMapping,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Media Curator error:', error);
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
 * Curate media for all scenes
 */
async function curateMediaForScenes(projectId, sceneContext, baseTopic) {
    const scenes = sceneContext.scenes || [];
    const sceneMediaMapping = [];
    let totalImages = 0;

    for (const scene of scenes) {
        const sceneNumber = scene.sceneNumber;
        const searchKeywords = scene.visualRequirements ? .searchKeywords || [baseTopic];

        // Generate placeholder images for each scene (simplified approach)
        const sceneImages = await generatePlaceholderImages(projectId, sceneNumber, searchKeywords);

        sceneMediaMapping.push({
            sceneNumber: sceneNumber,
            images: sceneImages,
            imageCount: sceneImages.length
        });

        totalImages += sceneImages.length;
    }

    return {
        projectId: projectId,
        totalScenes: scenes.length,
        totalImages: totalImages,
        sceneMediaMapping: sceneMediaMapping,
        metadata: {
            generatedAt: new Date().toISOString(),
            architecture: 'simplified',
            approach: 'placeholder-images'
        }
    };
}

/**
 * Generate placeholder images for a scene (simplified approach)
 */
async function generatePlaceholderImages(projectId, sceneNumber, keywords) {
    const images = [];
    const imageCount = 4; // 4 images per scene

    for (let i = 1; i <= imageCount; i++) {
        const imageName = `${i}-${keywords[0] || 'placeholder'}-scene-${sceneNumber}.jpg`;
        const s3Key = `videos/${projectId}/03-media/scene-${sceneNumber}/images/${imageName}`;

        // Create placeholder image data (simplified - would normally download from Pexels/Pixabay)
        const placeholderImageData = createPlaceholderImageData(keywords[0] || 'placeholder', sceneNumber, i);

        // Store placeholder image in S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: placeholderImageData,
            ContentType: 'image/jpeg'
        }));

        images.push({
            imageNumber: i,
            s3Key: s3Key,
            keywords: keywords,
            size: placeholderImageData.length
        });
    }

    return images;
}

/**
 * Create placeholder image data (simplified approach)
 */
function createPlaceholderImageData(keyword, sceneNumber, imageNumber) {
    // Create a simple text-based placeholder (in real implementation, would download actual images)
    const placeholderText = `Placeholder Image: ${keyword} - Scene ${sceneNumber} - Image ${imageNumber}`;
    return Buffer.from(placeholderText, 'utf8');
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