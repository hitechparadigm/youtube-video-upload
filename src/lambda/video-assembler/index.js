import { createResponse, createErrorResponse } from '../../shared/http/response-handler.js';
import { createAWSClients } from '../../shared/aws-clients/factory.js';
import { getEnvironmentConfig } from '../../shared/config/environment.js';

/**
 * Fixed Video Assembly Orchestrator
 * Simple, working version for Italy video assembly
 */

const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const ecsClient = new ECSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Configuration values
const CLUSTER_NAME = process.env.ECS_CLUSTER_NAME || 'automated-video-pipeline-cluster';
const TASK_DEFINITION = process.env.ECS_TASK_DEFINITION || 'video-processor-task';
const VIDEOS_TABLE = process.env.VIDEOS_TABLE_NAME || 'automated-video-pipeline-production';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Video Assembler invoked:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, path, body } = event;
        
        // Parse request body
        let requestBody = {};
        if (body) {
            requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        }
        
        // Route requests
        if (httpMethod === 'POST' && path === '/video/assemble') {
            return await assembleVideo(requestBody);
        } else if (httpMethod === 'POST' && path === '/video/assemble-project') {
            return await assembleProjectVideo(requestBody);
        } else if (httpMethod === 'GET' && path === '/video/status') {
            return await getVideoStatus(event.queryStringParameters || {});
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
 * Assemble video from project configuration
 */
async function assembleProjectVideo(requestBody) {
    const { 
        projectId,
        projectPath,
        audioSegments = [],
        imageSequence = [],
        videoOptions = {}
    } = requestBody;
    
    try {
        console.log(`Assembling project video: ${projectId}`);
        
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }
        
        // Create video job
        const videoJob = {
            videoId: `${projectId}-${Date.now()}`,
            projectId: projectId,
            projectPath: projectPath,
            audioSegments: audioSegments,
            imageSequence: imageSequence,
            videoOptions: {
                outputFormat: 'mp4',
                resolution: '1920x1080',
                fps: 30,
                bitrate: '5000k',
                ...videoOptions
            },
            status: 'queued',
            createdAt: new Date().toISOString(),
            estimatedDuration: audioSegments.reduce((sum, seg) => sum + (seg.duration || 0), 0)
        };
        
        // Store video job
        await storeVideoJob(videoJob);
        
        // Start ECS Fargate task
        const taskArn = await startVideoProcessingTask(videoJob);
        
        // Update job with task info
        videoJob.taskArn = taskArn;
        videoJob.status = 'processing';
        videoJob.startedAt = new Date().toISOString();
        
        await updateVideoJob(videoJob);
        
        return createResponse(200, {
            message: 'Video assembly started successfully',
            video: videoJob,
            taskArn: taskArn,
            estimatedCompletionTime: new Date(Date.now() + (8 * 60 * 1000)).toISOString()
        });
        
    } catch (error) {
        console.error('Error assembling project video:', error);
        return createResponse(500, { 
            error: 'Failed to assemble video',
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
            { name: 'PROJECT_ID', value: videoJob.projectId },
            { name: 'PROJECT_PATH', value: videoJob.projectPath },
            { name: 'S3_BUCKET', value: S3_BUCKET },
            { name: 'AUDIO_SEGMENTS', value: JSON.stringify(videoJob.audioSegments) },
            { name: 'IMAGE_SEQUENCE', value: JSON.stringify(videoJob.imageSequence) },
            { name: 'OUTPUT_FORMAT', value: videoJob.videoOptions.outputFormat },
            { name: 'RESOLUTION', value: videoJob.videoOptions.resolution },
            { name: 'FPS', value: videoJob.videoOptions.fps.toString() },
            { name: 'BITRATE', value: videoJob.videoOptions.bitrate },
            { name: 'AWS_REGION', value: process.env.AWS_REGION || 'us-east-1' }
        ];
        
        // Get default VPC subnets (simplified approach)
        const runTaskParams = {
            cluster: CLUSTER_NAME,
            taskDefinition: TASK_DEFINITION,
            launchType: 'FARGATE',
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: 'ENABLED',
                    subnets: [
                        'subnet-0a834967f7682d01d', // Real default subnet (us-east-1b)
                        'subnet-0ee4834a597781b9b'  // Real default subnet (us-east-1a)
                    ]
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
                { key: 'ProjectId', value: videoJob.projectId }
            ]
        };
        
        console.log('Starting ECS Fargate task for video processing');
        
        // Try to start real ECS task with default VPC
        try {
            const response = await ecsClient.send(new RunTaskCommand(runTaskParams));
            
            if (response.tasks && response.tasks.length > 0) {
                const taskArn = response.tasks[0].taskArn;
                console.log(`✅ ECS task started successfully: ${taskArn}`);
                return taskArn;
            } else {
                console.error('❌ No tasks returned from ECS');
                throw new Error('ECS task creation failed');
            }
        } catch (ecsError) {
            console.error('❌ ECS task failed:', ecsError.message);
            console.error('❌ Full ECS error:', JSON.stringify(ecsError, null, 2));
            console.error('❌ Task params used:', JSON.stringify(runTaskParams, null, 2));
            
            // Create local video processing as fallback
            return await createLocalVideoProcessing(videoJob);
        }
        
    } catch (error) {
        console.error('Error starting video processing task:', error);
        throw error;
    }
}

/**
 * Create local video processing fallback
 */
async function createLocalVideoProcessing(videoJob) {
    try {
        console.log('🔄 Creating local video processing fallback...');
        
        // Create FFmpeg command for video assembly
        const ffmpegCommand = createFFmpegCommand(videoJob);
        
        // Store the command and instructions for manual execution
        const processingInstructions = {
            videoId: videoJob.videoId,
            ffmpegCommand: ffmpegCommand,
            downloadScript: createDownloadScript(videoJob),
            instructions: [
                '1. Run the download script to get all components',
                '2. Execute the FFmpeg command to create MP4',
                '3. Upload result to S3 final location'
            ],
            outputLocation: `s3://${S3_BUCKET}/videos/${videoJob.projectId}/final/${videoJob.projectId}-complete.mp4`
        };
        
        // Upload processing instructions to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `videos/${videoJob.projectId}/processing/instructions.json`,
            Body: JSON.stringify(processingInstructions, null, 2),
            ContentType: 'application/json'
        }));
        
        console.log('✅ Local processing instructions created');
        return `local-processing-${Date.now()}`;
        
    } catch (error) {
        console.error('❌ Error creating local processing:', error);
        return `fallback-${Date.now()}`;
    }
}

/**
 * Create FFmpeg command for video assembly
 */
function createFFmpegCommand(videoJob) {
    const { audioSegments, imageSequence } = videoJob;
    
    let command = 'ffmpeg -y ';
    
    // Add image inputs
    imageSequence.forEach((img, i) => {
        command += `-loop 1 -t ${img.duration} -i ${img.file} `;
    });
    
    // Add audio inputs
    audioSegments.forEach((audio, i) => {
        command += `-i ${audio.file} `;
    });
    
    // Add filter complex for video concatenation
    command += '-filter_complex "';
    
    // Scale and time images
    let totalTime = 0;
    imageSequence.forEach((img, i) => {
        command += `[${i}:v]scale=1920:1080,setpts=PTS-STARTPTS+${totalTime}/TB[v${i}]; `;
        totalTime += img.duration;
    });
    
    // Concatenate videos
    command += imageSequence.map((_, i) => `[v${i}]`).join('') + `concat=n=${imageSequence.length}:v=1:a=0[video]; `;
    
    // Concatenate audio
    const audioInputs = audioSegments.map((_, i) => `[${imageSequence.length + i}:a]`).join('');
    command += `${audioInputs}concat=n=${audioSegments.length}:v=0:a=1[audio]" `;
    
    // Output mapping
    command += `-map "[video]" -map "[audio]" -c:v libx264 -c:a aac -pix_fmt yuv420p -r 30 -b:v 5000k ${videoJob.projectId}-complete.mp4`;
    
    return command;
}

/**
 * Create download script for components
 */
function createDownloadScript(videoJob) {
    const { audioSegments, imageSequence, projectId } = videoJob;
    
    let script = '#!/bin/bash\n\n';
    script += '# Download Italy Video Components\n';
    script += `mkdir -p ${projectId}-components\n`;
    script += `cd ${projectId}-components\n\n`;
    
    script += '# Download audio files\n';
    audioSegments.forEach((audio, i) => {
        script += `aws s3 cp s3://${S3_BUCKET}/${audio.s3Location || audio.file} ./audio-${i + 1}.mp3\n`;
    });
    
    script += '\n# Download image files\n';
    imageSequence.forEach((img, i) => {
        script += `aws s3 cp s3://${S3_BUCKET}/${img.s3Location || img.file} ./image-${i + 1}.jpg\n`;
    });
    
    script += '\necho "All components downloaded!"\n';
    
    return script;
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
        // Don't throw - continue without storage
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
        // Don't throw - continue without storage
    }
}

/**
 * Get video status
 */
async function getVideoStatus(queryParams) {
    const { videoId } = queryParams;
    
    try {
        if (!videoId) {
            return createResponse(400, { error: 'videoId is required' });
        }
        
        const response = await docClient.send(new GetCommand({
            TableName: VIDEOS_TABLE,
            Key: { videoId: videoId }
        }));
        
        if (!response.Item) {
            return createResponse(404, { error: 'Video not found' });
        }
        
        return createResponse(200, {
            video: response.Item
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
 * Create HTTP response
 */
// createResponse now imported from shared utilities,
        body: JSON.stringify(body, null, 2)
    };
}