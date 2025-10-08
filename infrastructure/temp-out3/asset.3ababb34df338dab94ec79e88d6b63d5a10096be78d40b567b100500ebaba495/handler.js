/**
 * YouTube Publisher Lambda Handler
 * Main entry point for YouTube video publishing
 */

const { YouTubeService } = require('./youtube-service');

/**
 * Lambda handler for YouTube publishing requests
 */
exports.handler = async (event) => {
    console.log('YouTube Publisher Handler invoked:', JSON.stringify(event, null, 2));

    try {
        const youtubeService = new YouTubeService();
        
        // Parse the event based on source
        let publishRequest;
        
        if (event.httpMethod) {
            // API Gateway request
            publishRequest = parseApiGatewayEvent(event);
        } else if (event.Records) {
            // S3 or SQS trigger
            publishRequest = parseEventTrigger(event);
        } else {
            // Direct invocation (Step Functions)
            publishRequest = event;
        }

        // Validate required fields
        if (!publishRequest.videoId || !publishRequest.videoFilePath) {
            throw new Error('videoId and videoFilePath are required');
        }

        // Route to appropriate action
        if (publishRequest.action === 'publish') {
            const result = await youtubeService.publishVideo(publishRequest);
            return createResponse(event, result);
        } else if (publishRequest.action === 'status') {
            const status = await youtubeService.getUploadStatus(publishRequest.videoId);
            return createResponse(event, { status });
        } else {
            // Default to publish
            const result = await youtubeService.publishVideo(publishRequest);
            return createResponse(event, result);
        }

    } catch (error) {
        console.error('YouTube publishing error:', error);

        if (event.httpMethod) {
            return createApiResponse(500, {
                success: false,
                error: 'YouTube publishing failed',
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

    if (httpMethod === 'POST' && path.includes('/publish')) {
        const requestBody = body ? JSON.parse(body) : {};
        return {
            action: 'publish',
            videoId: requestBody.videoId || queryStringParameters?.videoId,
            videoFilePath: requestBody.videoFilePath,
            title: requestBody.title,
            description: requestBody.description,
            tags: requestBody.tags || [],
            thumbnail: requestBody.thumbnail,
            privacy: requestBody.privacy || 'public',
            category: requestBody.category || '22'
        };
    } else if (httpMethod === 'GET' && path.includes('/status')) {
        return {
            action: 'status',
            videoId: queryStringParameters?.videoId
        };
    }

    throw new Error(`Unsupported API endpoint: ${httpMethod} ${path}`);
}

/**
 * Parse event trigger (S3, SQS, etc.)
 */
function parseEventTrigger(event) {
    // Handle S3 trigger for completed video files
    if (event.Records && event.Records[0].eventSource === 'aws:s3') {
        const s3Record = event.Records[0].s3;
        const bucket = s3Record.bucket.name;
        const key = s3Record.object.key;

        // Extract video ID from S3 key pattern
        const videoIdMatch = key.match(/final-videos\/([^\/]+)\//);
        const videoId = videoIdMatch ? videoIdMatch[1] : `video-${Date.now()}`;

        return {
            action: 'publish',
            videoId: videoId,
            videoFilePath: `s3://${bucket}/${key}`,
            trigger: 's3',
            // Default metadata - would be enhanced with actual script data
            title: `Automated Video: ${videoId}`,
            description: 'Automatically generated video content.',
            tags: ['automated', 'ai-generated', '2025'],
            privacy: 'public'
        };
    }

    throw new Error('Unsupported event trigger');
}

/**
 * Create appropriate response based on event source
 */
function createResponse(event, result) {
    if (event.httpMethod) {
        return createApiResponse(200, {
            success: true,
            message: 'YouTube publishing completed successfully',
            result: result
        });
    } else {
        return result;
    }
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
            service: 'youtube-publisher',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        })
    };
};