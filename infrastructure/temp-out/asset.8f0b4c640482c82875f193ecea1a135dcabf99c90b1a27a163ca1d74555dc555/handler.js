/**
 * Video Assembly Lambda Handler
 * Main entry point for video assembly and synchronization
 */

const { VideoProcessor } = require('./video-processor');

/**
 * Lambda handler for video assembly requests
 */
exports.handler = async (event) => {
    console.log('Video Assembly Handler invoked:', JSON.stringify(event, null, 2));

    try {
        const processor = new VideoProcessor();
        
        // Parse the event based on source
        let assemblyRequest;
        
        if (event.httpMethod) {
            // API Gateway request
            assemblyRequest = parseApiGatewayEvent(event);
        } else if (event.Records) {
            // S3 or SQS trigger
            assemblyRequest = parseEventTrigger(event);
        } else {
            // Direct invocation
            assemblyRequest = event;
        }

        // Validate required fields
        if (!assemblyRequest.videoId) {
            throw new Error('videoId is required');
        }

        // Process video assembly
        const result = await processor.assembleVideo(assemblyRequest);

        // Return appropriate response based on event source
        if (event.httpMethod) {
            return createApiResponse(200, {
                success: true,
                message: 'Video assembly completed successfully',
                result: result
            });
        } else {
            return result;
        }

    } catch (error) {
        console.error('Video assembly error:', error);

        if (event.httpMethod) {
            return createApiResponse(500, {
                success: false,
                error: 'Video assembly failed',
                message: error.message
            });
        } else {
            throw error;
        }
    }
};

/**
 * Parse API Gateway event
 */
function parseApiGatewayEvent(event) {
    const { httpMethod, path, body, queryStringParameters } = event;

    if (httpMethod === 'POST' && path.includes('/assemble')) {
        const requestBody = body ? JSON.parse(body) : {};
        return {
            videoId: requestBody.videoId || queryStringParameters?.videoId,
            scriptData: requestBody.scriptData,
            mediaAssets: requestBody.mediaAssets || [],
            audioFile: requestBody.audioFile,
            outputOptions: requestBody.outputOptions || {}
        };
    }

    throw new Error(`Unsupported API endpoint: ${httpMethod} ${path}`);
}

/**
 * Parse event trigger (S3, SQS, etc.)
 */
function parseEventTrigger(event) {
    // Handle S3 trigger for new script/media uploads
    if (event.Records && event.Records[0].eventSource === 'aws:s3') {
        const s3Record = event.Records[0].s3;
        const bucket = s3Record.bucket.name;
        const key = s3Record.object.key;

        // Extract video ID from S3 key pattern
        const videoIdMatch = key.match(/videos\/([^\/]+)\//);
        const videoId = videoIdMatch ? videoIdMatch[1] : `video-${Date.now()}`;

        return {
            videoId: videoId,
            trigger: 's3',
            bucket: bucket,
            key: key,
            // These would be populated from S3 metadata or separate calls
            scriptData: null,
            mediaAssets: [],
            audioFile: null
        };
    }

    throw new Error('Unsupported event trigger');
}

/**
 * Create API Gateway response
 */
function createApiResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body, null, 2)
    };
}

/**
 * Health check endpoint
 */
exports.healthCheck = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            service: 'video-assembler',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        })
    };
};