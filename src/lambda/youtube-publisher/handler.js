/**
 * 📺 YOUTUBE PUBLISHER AI LAMBDA FUNCTION
 * 
 * ROLE: Automated YouTube Publishing with SEO Optimization
 * This Lambda function handles the final step of the video production pipeline
 * by publishing videos to YouTube with AI-optimized metadata and SEO.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 📺 YouTube Publishing - Automated video upload to YouTube
 * 2. 🎯 SEO Optimization - AI-generated titles, descriptions, and tags
 * 3. 🖼️ Thumbnail Management - Custom thumbnail upload and optimization
 * 4. 📊 Metadata Generation - Strategic keywords and descriptions
 * 5. 📈 Performance Tracking - Upload status and initial metrics
 * 
 * INTEGRATED SEO FEATURES (replaces separate YouTube SEO Optimizer):
 * - AI-generated clickbait titles (while maintaining accuracy)
 * - Keyword-optimized descriptions with proper formatting
 * - Strategic tag selection for maximum discoverability
 * - Thumbnail A/B testing capabilities
 * - Category and playlist optimization
 * 
 * YOUTUBE API INTEGRATION:
 * - OAuth 2.0 authentication with refresh tokens
 * - Video upload with resumable uploads for large files
 * - Metadata optimization using YouTube Data API v3
 * - Thumbnail upload and management
 * - Analytics integration for performance tracking
 * 
 * ENDPOINTS:
 * - POST /youtube/publish - Main publishing endpoint
 * - POST /youtube/optimize - SEO optimization for existing videos
 * - GET /youtube/status - Check upload status
 * - POST /youtube/thumbnail - Upload custom thumbnails
 * - GET /health - Health check
 * 
 * SEO OPTIMIZATION STRATEGY:
 * - Title: Hook + Keywords + Emotional trigger (60 chars max)
 * - Description: Value proposition + timestamps + CTAs + keywords
 * - Tags: Primary keywords + long-tail + trending terms
 * - Category: Most relevant YouTube category for algorithm
 * 
 * CONTEXT FLOW:
 * 1. INPUT: Retrieves video file and metadata from Video Assembler
 * 2. PROCESSING: Uploads to YouTube with optimized metadata
 * 3. OUTPUT: Returns YouTube video URL and performance data
 * 
 * INTEGRATION FLOW:
 * Video Assembler AI → YouTube Publisher AI (with integrated SEO) → Complete!
 * 
 * CURRENT ISSUES:
 * - Endpoint configuration needs refinement
 * - OAuth token refresh mechanism
 * - Error handling for upload failures
 * 
 * ENHANCEMENT NEEDED:
 * - Better error handling and retry logic
 * - Improved SEO optimization algorithms
 * - Thumbnail generation automation
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

        // Handle health check
        if (publishRequest.action === 'health') {
            const healthResult = {
                service: 'youtube-publisher',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                type: 'youtube-publishing-with-seo'
            };
            
            if (event.httpMethod) {
                return createApiResponse(200, {
                    success: true,
                    result: healthResult
                });
            } else {
                return healthResult;
            }
        }

        // Validate required fields for non-health requests
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

    // Handle health check endpoint
    if (httpMethod === 'GET' && path === '/health') {
        return {
            action: 'health'
        };
    }

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
