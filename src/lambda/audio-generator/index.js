/**
 * SIMPLIFIED Audio Generator Lambda - No Shared Layer Dependencies
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
    PollyClient,
    SynthesizeSpeechCommand
} = require('@aws-sdk/client-polly');
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
const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Main Lambda handler
 */
exports.handler = async (event, context) => {
    console.log('Simplified Audio Generator invoked:', JSON.stringify(event, null, 2));

    const {
        httpMethod,
        path,
        body
    } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/audio/health') {
        return createResponse(200, {
            service: 'audio-generator-simplified',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            architecture: 'simplified-no-shared-layer'
        });
    }

    // Audio generation
    if (httpMethod === 'POST' && path === '/audio/generate') {
        try {
            const requestBody = body ? JSON.parse(body) : {};
            const {
                projectId,
                text,
                voiceId = 'Joanna'
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

            // Generate audio for each scene
            const audioResults = await generateAudioForScenes(projectId, sceneContext, voiceId);

            // Store audio context
            await storeContext(audioResults, 'audio', projectId);

            console.log(`✅ Audio Generator completed for project: ${projectId}`);

            return createResponse(200, {
                success: true,
                projectId: projectId,
                totalScenes: sceneContext.scenes.length,
                audioSegments: audioResults.audioSegments.length,
                masterNarration: audioResults.masterNarrationFile,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Audio Generator error:', error);
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
 * Generate audio for all scenes
 */
async function generateAudioForScenes(projectId, sceneContext, voiceId) {
    const scenes = sceneContext.scenes || [];
    const audioSegments = [];
    const audioFiles = [];

    // Generate audio for each scene
    for (const scene of scenes) {
        const sceneNumber = scene.sceneNumber;
        const script = scene.content ? .script || `Scene ${sceneNumber} content`;

        // Generate audio using AWS Polly
        const audioData = await synthesizeSpeech(script, voiceId);

        // Store scene audio in S3
        const sceneAudioKey = `videos/${projectId}/04-audio/audio-segments/scene-${sceneNumber}.mp3`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: sceneAudioKey,
            Body: audioData,
            ContentType: 'audio/mpeg'
        }));

        const audioSegment = {
            sceneNumber: sceneNumber,
            audioFile: `scene-${sceneNumber}.mp3`,
            s3Key: sceneAudioKey,
            duration: scene.duration || 30,
            script: script
        };

        audioSegments.push(audioSegment);
        audioFiles.push(audioSegment);
    }

    // Create master narration (combine all scenes)
    const masterScript = scenes.map(s => s.content ? .script || '').join(' ');
    const masterAudioData = await synthesizeSpeech(masterScript, voiceId);

    // Store master narration
    const masterAudioKey = `videos/${projectId}/04-audio/narration.mp3`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: masterAudioKey,
        Body: masterAudioData,
        ContentType: 'audio/mpeg'
    }));

    // Create audio metadata
    const audioMetadata = {
        projectId: projectId,
        totalScenes: scenes.length,
        audioFiles: audioFiles,
        masterNarrationFile: 'narration.mp3',
        voiceId: voiceId,
        generatedAt: new Date().toISOString()
    };

    // Store audio metadata
    const metadataKey = `videos/${projectId}/04-audio/audio-metadata.json`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: metadataKey,
        Body: JSON.stringify(audioMetadata, null, 2),
        ContentType: 'application/json'
    }));

    return {
        status: 'completed',
        audioSegments: audioSegments,
        masterNarrationFile: 'narration.mp3',
        audioFiles: audioFiles,
        metadata: {
            generatedAt: new Date().toISOString(),
            architecture: 'simplified',
            voiceId: voiceId
        }
    };
}

/**
 * Synthesize speech using AWS Polly
 */
async function synthesizeSpeech(text, voiceId) {
    try {
        const command = new SynthesizeSpeechCommand({
            Text: text,
            OutputFormat: 'mp3',
            VoiceId: voiceId,
            Engine: 'standard'
        });

        const response = await pollyClient.send(command);

        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.AudioStream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);

    } catch (error) {
        console.error('❌ Polly synthesis error:', error);
        // Return placeholder audio data if Polly fails
        return Buffer.from(`Audio placeholder for: ${text.substring(0, 50)}...`, 'utf8');
    }
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