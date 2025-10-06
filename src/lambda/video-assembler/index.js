/**
 * Video Assembly Orchestrator
 * 
 * This Lambda function orchestrates the complete video assembly process by:
 * 1. Receiving video assembly requests with script, audio, and media components
 * 2. Starting ECS Fargate tasks that run FFmpeg-based video processing
 * 3. Monitoring task progress and updating status in DynamoDB
 * 4. Providing APIs for status checking and preview generation
 * 
 * Key Features:
 * - Automatic component gathering from S3 and DynamoDB
 * - ECS Fargate Spot instances for cost optimization
 * - Real-time status tracking and monitoring
 * - Preview generation for quick testing
 * - Comprehensive error handling and retry logic
 * 
 * Architecture:
 * Lambda (Orchestrator) -> ECS Fargate (Video Processor) -> S3 (Final Videos)
 * 
 * @author Automated Video Pipeline Team
 * @version 1.0.0
 */

const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { initializeConfig, getConfigManager } = require('/opt/nodejs/config-manager');

// Global configuration
let config = null;

// Initialize AWS clients
let ecsClient = null;
let s3Client = null;
let dynamoClient = null;
let docClient = null;

// Configuration values
let CLUSTER_NAME = null;
let TASK_DEFINITION = null;
let SUBNET_IDS = null;
let SECURITY_GROUP_IDS = null;
let VIDEOS_TABLE = null;
let S3_BUCKET = null;

/**
 * Initialize configuration and AWS clients
 */
async function initializeService() {
    if (config) return; // Already initialized
    
    try {
        // Load configuration
        const configManager = await initializeConfig();
        config = configManager.getServiceConfig('video-assembler');
        
        // Initialize AWS clients
        const region = config.ai?.models?.primary?.region || process.env.AWS_REGION || 'us-east-1';
        ecsClient = new ECSClient({ region });
        s3Client = new S3Client({ region });
        dynamoClient = new DynamoDBClient({ region });
        docClient = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true
            }
        });
        
        // Set configuration values
        CLUSTER_NAME = process.env.ECS_CLUSTER_NAME || 'automated-video-pipeline-cluster';
        TASK_DEFINITION = process.env.ECS_TASK_DEFINITION || 'video-processor-task';
        SUBNET_IDS = (process.env.SUBNET_IDS || '').split(',').filter(id => id.trim());
        SECURITY_GROUP_IDS = (process.env.SECURITY_GROUP_IDS || '').split(',').filter(id => id.trim());
        VIDEOS_TABLE = process.env.VIDEOS_TABLE_NAME || 'automated-video-pipeline-videos';
        S3_BUCKET = process.env.S3_BUCKET_NAME || 'automated-video-pipeline-final-videos';
        
        console.log('Video Assembler service initialized');
        
    } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
    }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Video Assembler invoked:', JSON.stringify(event, null, 2));
    
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
        if (httpMethod === 'POST' && path === '/video/assemble') {
            return await assembleVideo(requestBody);
        } else if (httpMethod === 'POST' && path === '/video/assemble-from-script') {
            return await assembleVideoFromScript(requestBody);
        } else if (httpMethod === 'GET' && path === '/video/status') {
            return await getVideoStatus(queryStringParameters || {});
        } else if (httpMethod === 'GET' && path.startsWith('/video/')) {
            const videoId = pathParameters?.videoId || path.split('/').pop();
            return await getVideo(videoId);
        } else if (httpMethod === 'POST' && path === '/video/preview') {
            return await generateVideoPreview(requestBody);
        } else {
            return createResponse(404, { error: 'Endpoint not found' });
        }
        
    } catch (error) {
        console.error('Error in Video Assembler:', error);
        return createResponse(500, { 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

/**
 * Assemble video from provided components
 */
async function assembleVideo(requestBody) {
    const { 
        scriptId,
        audioId,
        mediaItems = [],
        videoOptions = {},
        outputFormat = 'mp4',
        resolution = '1920x1080',
        fps = 30,
        bitrate = '5000k'
    } = requestBody;
    
    try {
        console.log(`Assembling video with script: ${scriptId}, audio: ${audioId}`);
        
        // Validate required components
        if (!scriptId || !audioId) {
            return createResponse(400, { 
                error: 'scriptId and audioId are required' 
            });
        }
        
        // Get script and audio data
        const scriptData = await getScriptData(scriptId);
        const audioData = await getAudioData(audioId);
        
        if (!scriptData) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        if (!audioData) {
            return createResponse(404, { error: 'Audio not found' });
        }
        
        // Create video assembly job
        const videoJob = {
            videoId: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scriptId: scriptId,
            audioId: audioId,
            mediaItems: mediaItems,
            videoOptions: {
                outputFormat,
                resolution,
                fps,
                bitrate,
                ...videoOptions
            },
            status: 'queued',
            createdAt: new Date().toISOString(),
            estimatedDuration: scriptData.estimatedDuration || audioData.estimatedDuration || 600
        };
        
        // Store video job in database
        await storeVideoJob(videoJob);
        
        // Start ECS Fargate task for video processing
        const taskArn = await startVideoProcessingTask(videoJob);
        
        // Update job with task information
        videoJob.taskArn = taskArn;
        videoJob.status = 'processing';
        videoJob.startedAt = new Date().toISOString();
        
        await updateVideoJob(videoJob);
        
        return createResponse(200, {
            message: 'Video assembly started successfully',
            video: videoJob,
            taskArn: taskArn,
            estimatedCompletionTime: new Date(Date.now() + (10 * 60 * 1000)).toISOString() // 10 minutes
        });
        
    } catch (error) {
        console.error('Error assembling video:', error);
        return createResponse(500, { 
            error: 'Failed to assemble video',
            message: error.message 
        });
    }
}

/**
 * Assemble video from script ID (auto-gather components)
 */
async function assembleVideoFromScript(requestBody) {
    const { 
        scriptId, 
        videoOptions = {},
        autoSelectMedia = true,
        mediaPerScene = 2
    } = requestBody;
    
    try {
        if (!scriptId) {
            return createResponse(400, { error: 'scriptId is required' });
        }
        
        console.log(`Auto-assembling video from script: ${scriptId}`);
        
        // Get script data
        const scriptData = await getScriptData(scriptId);
        if (!scriptData) {
            return createResponse(404, { error: 'Script not found' });
        }
        
        // Find associated audio (look for audio generated from this script)
        const audioData = await findAudioForScript(scriptId);
        if (!audioData) {
            return createResponse(404, { 
                error: 'No audio found for script. Generate audio first.',
                suggestion: 'Use /audio/generate-from-script endpoint'
            });
        }
        
        // Find or curate media for the script
        let mediaItems = [];
        if (autoSelectMedia) {
            mediaItems = await findOrCurateMediaForScript(scriptId, mediaPerScene);
        }
        
        // Assemble the video
        return await assembleVideo({
            scriptId: scriptId,
            audioId: audioData.audioId,
            mediaItems: mediaItems,
            videoOptions: videoOptions
        });
        
    } catch (error) {
        console.error('Error auto-assembling video from script:', error);
        return createResponse(500, { 
            error: 'Failed to auto-assemble video from script',
            message: error.message 
        });
    }
}

/**
 * Start ECS Fargate task for video processing
 */
async function startVideoProcessingTask(videoJob) {
    try {
        // Prepare task environment variables
        const environment = [
            { name: 'VIDEO_ID', value: videoJob.videoId },
            { name: 'SCRIPT_ID', value: videoJob.scriptId },
            { name: 'AUDIO_ID', value: videoJob.audioId },
            { name: 'OUTPUT_FORMAT', value: videoJob.videoOptions.outputFormat },
            { name: 'RESOLUTION', value: videoJob.videoOptions.resolution },
            { name: 'FPS', value: videoJob.videoOptions.fps.toString() },
            { name: 'BITRATE', value: videoJob.videoOptions.bitrate },
            { name: 'S3_BUCKET', value: S3_BUCKET },
            { name: 'MEDIA_ITEMS', value: JSON.stringify(videoJob.mediaItems) },
            { name: 'AWS_REGION', value: process.env.AWS_REGION || 'us-east-1' }
        ];
        
        // Run ECS task with Fargate Spot for cost optimization
        const runTaskParams = {
            cluster: CLUSTER_NAME,
            taskDefinition: TASK_DEFINITION,
            launchType: 'FARGATE',
            capacityProviderStrategy: [
                {
                    capacityProvider: 'FARGATE_SPOT',
                    weight: 1,
                    base: 0
                }
            ],
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: SUBNET_IDS,
                    securityGroups: SECURITY_GROUP_IDS,
                    assignPublicIp: 'ENABLED'
                }
            },
            overrides: {
                containerOverrides: [
                    {
                        name: 'video-processor',
                        environment: environment,
                        cpu: 2048,
                        memory: 4096
                    }
                ]
            },
            tags: [
                { key: 'Project', value: 'AutomatedVideoPipeline' },
                { key: 'VideoId', value: videoJob.videoId },
                { key: 'ScriptId', value: videoJob.scriptId },
                { key: 'Service', value: 'VideoProcessing' },
                { key: 'CostCenter', value: 'video-assembly' }
            ]
        };
        
        console.log('Starting ECS Fargate task for video processing');
        console.log('Task parameters:', JSON.stringify(runTaskParams, null, 2));
        
        const response = await ecsClient.send(new RunTaskCommand(runTaskParams));
        
        if (!response.tasks || response.tasks.length === 0) {
            throw new Error('Failed to start ECS task - no tasks returned');
        }
        
        const task = response.tasks[0];
        const taskArn = task.taskArn;
        
        console.log(`ECS task started successfully: ${taskArn}`);
        console.log(`Task definition: ${task.taskDefinitionArn}`);
        console.log(`Cluster: ${task.clusterArn}`);
        
        return taskArn;
        
    } catch (error) {
        console.error('Error starting video processing task:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            requestId: error.$metadata?.requestId
        });
        throw error;
    }
}
/
**
 * Get video status and processing information
 */
async function getVideoStatus(queryParams) {
    const { videoId, taskArn } = queryParams;
    
    try {
        if (!videoId && !taskArn) {
            return createResponse(400, { error: 'videoId or taskArn is required' });
        }
        
        let videoData = null;
        let taskStatus = null;
        
        // Get video data from DynamoDB if videoId provided
        if (videoId) {
            videoData = await getVideoData(videoId);
            if (!videoData) {
                return createResponse(404, { error: 'Video not found' });
            }
        }
        
        // Get ECS task status if taskArn provided or available from video data
        const arn = taskArn || (videoData && videoData.taskArn);
        if (arn) {
            taskStatus = await getECSTaskStatus(arn);
        }
        
        return createResponse(200, {
            video: videoData,
            task: taskStatus,
            status: determineOverallStatus(videoData, taskStatus)
        });
        
    } catch (error) {
        console.error('Error getting video status:', error);
        return createResponse(500, { 
            error: 'Failed to get video status',
            message: error.message 
        });
    }
}

/**
 * Get specific video information
 */
async function getVideo(videoId) {
    try {
        if (!videoId) {
            return createResponse(400, { error: 'videoId is required' });
        }
        
        const videoData = await getVideoData(videoId);
        
        if (!videoData) {
            return createResponse(404, { error: 'Video not found' });
        }
        
        // Get task status if available
        let taskStatus = null;
        if (videoData.taskArn) {
            try {
                taskStatus = await getECSTaskStatus(videoData.taskArn);
            } catch (error) {
                console.warn('Failed to get task status:', error.message);
            }
        }
        
        return createResponse(200, {
            video: videoData,
            task: taskStatus
        });
        
    } catch (error) {
        console.error('Error getting video:', error);
        return createResponse(500, { 
            error: 'Failed to get video',
            message: error.message 
        });
    }
}

/**
 * Generate video preview (quick assembly for testing)
 */
async function generateVideoPreview(requestBody) {
    const { 
        scriptId,
        audioId,
        mediaItems = [],
        previewDuration = 30 // 30 seconds preview
    } = requestBody;
    
    try {
        if (!scriptId || !audioId) {
            return createResponse(400, { 
                error: 'scriptId and audioId are required for preview' 
            });
        }
        
        console.log(`Generating preview for script: ${scriptId}, audio: ${audioId}`);
        
        // Create preview job (similar to full video but shorter)
        const previewJob = {
            videoId: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scriptId: scriptId,
            audioId: audioId,
            mediaItems: mediaItems.slice(0, 3), // Use only first 3 media items
            videoOptions: {
                outputFormat: 'mp4',
                resolution: '1280x720', // Lower resolution for preview
                fps: 24, // Lower FPS for faster processing
                bitrate: '2000k',
                duration: previewDuration
            },
            status: 'queued',
            type: 'preview',
            createdAt: new Date().toISOString(),
            estimatedDuration: previewDuration
        };
        
        // Store preview job
        await storeVideoJob(previewJob);
        
        // Start ECS task for preview processing
        const taskArn = await startVideoProcessingTask(previewJob);
        
        // Update job with task information
        previewJob.taskArn = taskArn;
        previewJob.status = 'processing';
        previewJob.startedAt = new Date().toISOString();
        
        await updateVideoJob(previewJob);
        
        return createResponse(200, {
            message: 'Video preview generation started',
            preview: previewJob,
            taskArn: taskArn,
            estimatedCompletionTime: new Date(Date.now() + (3 * 60 * 1000)).toISOString() // 3 minutes
        });
        
    } catch (error) {
        console.error('Error generating video preview:', error);
        return createResponse(500, { 
            error: 'Failed to generate video preview',
            message: error.message 
        });
    }
}

/**
 * Get script data from S3 or DynamoDB
 */
async function getScriptData(scriptId) {
    try {
        // Try to get from DynamoDB first
        const response = await docClient.send(new GetCommand({
            TableName: 'automated-video-pipeline-scripts',
            Key: { scriptId: scriptId }
        }));
        
        if (response.Item) {
            return response.Item;
        }
        
        // Fallback: try to get from S3
        try {
            const s3Response = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: `scripts/${scriptId}.json`
            }));
            
            const scriptContent = await streamToString(s3Response.Body);
            return JSON.parse(scriptContent);
        } catch (s3Error) {
            console.warn('Script not found in S3:', s3Error.message);
            return null;
        }
        
    } catch (error) {
        console.error('Error getting script data:', error);
        return null;
    }
}

/**
 * Get audio data from S3 or DynamoDB
 */
async function getAudioData(audioId) {
    try {
        // Try to get from DynamoDB first
        const response = await docClient.send(new GetCommand({
            TableName: 'automated-video-pipeline-audio',
            Key: { audioId: audioId }
        }));
        
        if (response.Item) {
            return response.Item;
        }
        
        // Fallback: check if audio file exists in S3
        try {
            const s3Response = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: `audio/${audioId}.mp3`
            }));
            
            // Return basic audio data
            return {
                audioId: audioId,
                s3Key: `audio/${audioId}.mp3`,
                format: 'mp3',
                estimatedDuration: 300 // Default 5 minutes
            };
        } catch (s3Error) {
            console.warn('Audio not found in S3:', s3Error.message);
            return null;
        }
        
    } catch (error) {
        console.error('Error getting audio data:', error);
        return null;
    }
}

/**
 * Find audio associated with a script
 */
async function findAudioForScript(scriptId) {
    try {
        // Query DynamoDB for audio generated from this script
        const response = await docClient.send(new GetCommand({
            TableName: 'automated-video-pipeline-audio',
            Key: { scriptId: scriptId }
        }));
        
        if (response.Item) {
            return response.Item;
        }
        
        // Fallback: look for audio file with script ID in name
        try {
            const s3Response = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: `audio/${scriptId}.mp3`
            }));
            
            return {
                audioId: scriptId,
                scriptId: scriptId,
                s3Key: `audio/${scriptId}.mp3`,
                format: 'mp3'
            };
        } catch (s3Error) {
            return null;
        }
        
    } catch (error) {
        console.error('Error finding audio for script:', error);
        return null;
    }
}

/**
 * Find or curate media for script
 */
async function findOrCurateMediaForScript(scriptId, mediaPerScene = 2) {
    try {
        // First, try to find existing media for this script
        const response = await docClient.send(new GetCommand({
            TableName: 'automated-video-pipeline-media',
            Key: { scriptId: scriptId }
        }));
        
        if (response.Item && response.Item.mediaItems) {
            console.log(`Found ${response.Item.mediaItems.length} existing media items for script`);
            return response.Item.mediaItems;
        }
        
        // If no existing media, return empty array (media curation should be done separately)
        console.log('No existing media found for script. Media curation needed.');
        return [];
        
    } catch (error) {
        console.error('Error finding media for script:', error);
        return [];
    }
}

/**
 * Store video job in DynamoDB
 */
async function storeVideoJob(videoJob) {
    try {
        await docClient.send(new PutCommand({
            TableName: VIDEOS_TABLE,
            Item: videoJob
        }));
        
        console.log(`Stored video job: ${videoJob.videoId}`);
        
    } catch (error) {
        console.error('Error storing video job:', error);
        throw error;
    }
}

/**
 * Update video job in DynamoDB
 */
async function updateVideoJob(videoJob) {
    try {
        await docClient.send(new PutCommand({
            TableName: VIDEOS_TABLE,
            Item: videoJob
        }));
        
        console.log(`Updated video job: ${videoJob.videoId}`);
        
    } catch (error) {
        console.error('Error updating video job:', error);
        throw error;
    }
}

/**
 * Get video data from DynamoDB
 */
async function getVideoData(videoId) {
    try {
        const response = await docClient.send(new GetCommand({
            TableName: VIDEOS_TABLE,
            Key: { videoId: videoId }
        }));
        
        return response.Item || null;
        
    } catch (error) {
        console.error('Error getting video data:', error);
        return null;
    }
}

/**
 * Get ECS task status
 */
async function getECSTaskStatus(taskArn) {
    try {
        const response = await ecsClient.send(new DescribeTasksCommand({
            cluster: CLUSTER_NAME,
            tasks: [taskArn]
        }));
        
        if (!response.tasks || response.tasks.length === 0) {
            return { status: 'NOT_FOUND', message: 'Task not found' };
        }
        
        const task = response.tasks[0];
        
        return {
            taskArn: task.taskArn,
            lastStatus: task.lastStatus,
            desiredStatus: task.desiredStatus,
            healthStatus: task.healthStatus,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            stoppedAt: task.stoppedAt,
            stoppedReason: task.stoppedReason,
            containers: task.containers?.map(container => ({
                name: container.name,
                lastStatus: container.lastStatus,
                exitCode: container.exitCode,
                reason: container.reason
            }))
        };
        
    } catch (error) {
        console.error('Error getting ECS task status:', error);
        return { status: 'ERROR', message: error.message };
    }
}

/**
 * Determine overall status from video and task data
 */
function determineOverallStatus(videoData, taskStatus) {
    if (!videoData) {
        return 'unknown';
    }
    
    if (videoData.status === 'completed') {
        return 'completed';
    }
    
    if (videoData.status === 'failed') {
        return 'failed';
    }
    
    if (taskStatus) {
        if (taskStatus.lastStatus === 'RUNNING') {
            return 'processing';
        }
        
        if (taskStatus.lastStatus === 'STOPPED') {
            if (taskStatus.stoppedReason === 'Essential container in task exited') {
                // Check exit code
                const container = taskStatus.containers?.[0];
                if (container?.exitCode === 0) {
                    return 'completed';
                } else {
                    return 'failed';
                }
            }
            return 'stopped';
        }
        
        if (taskStatus.lastStatus === 'PENDING' || taskStatus.lastStatus === 'PROVISIONING') {
            return 'starting';
        }
    }
    
    return videoData.status || 'unknown';
}

/**
 * Utility function to convert stream to string
 */
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

/**
 * Create HTTP response
 */
function createResponse(statusCode, body) {
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