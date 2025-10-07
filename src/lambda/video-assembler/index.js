/**
 * AI-Powered Video Assembly Orchestrator
 * Creates engaging, dynamic videos with intelligent media sequencing
 */

const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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
        if (httpMethod === 'POST' && path === '/video/assemble-project') {
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
 * Load all project components from S3
 */
async function loadProjectComponents(projectId) {
    try {
        console.log(`📂 Loading project components for: ${projectId}`);
        
        const projectData = {
            script: null,
            audio: null,
            media: [],
            metadata: null,
            audioDuration: 0
        };
        
        // Load project summary to get component references
        try {
            const summaryResponse = await s3Client.send(new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: `videos/${projectId}/metadata/project.json`
            }));
            
            const summaryData = JSON.parse(await streamToString(summaryResponse.Body));
            console.log(`📋 Project summary loaded, status: ${summaryData.status}`);
            
            // Load script
            if (summaryData.components?.script) {
                const scriptResponse = await s3Client.send(new GetObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: `videos/${projectId}/script/${summaryData.components.script.scriptId}.json`
                }));
                projectData.script = JSON.parse(await streamToString(scriptResponse.Body));
                console.log(`📝 Script loaded: ${projectData.script.wordCount} words`);
            }
            
            // Load audio info (we'll reference the file path)
            if (summaryData.components?.audio) {
                projectData.audio = summaryData.components.audio;
                projectData.audioDuration = summaryData.components.audio.duration || 480; // fallback
                console.log(`🎵 Audio info loaded: ${projectData.audioDuration}s duration`);
            }
            
        } catch (error) {
            console.error('Error loading project summary:', error);
            throw new Error('Project summary not found or invalid');
        }
        
        // Load media assets
        try {
            const mediaPrefix = `videos/${projectId}/media/`;
            
            // List all media files
            const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
            const mediaResponse = await s3Client.send(new ListObjectsV2Command({
                Bucket: S3_BUCKET,
                Prefix: mediaPrefix
            }));
            
            if (mediaResponse.Contents) {
                for (const object of mediaResponse.Contents) {
                    if (object.Key.endsWith('.jpg') || object.Key.endsWith('.jpeg') || 
                        object.Key.endsWith('.png') || object.Key.endsWith('.mp4')) {
                        
                        const mediaType = object.Key.includes('/images/') ? 'image' : 'video';
                        const fileName = object.Key.split('/').pop();
                        
                        projectData.media.push({
                            type: mediaType,
                            s3Key: object.Key,
                            fileName: fileName,
                            size: object.Size,
                            url: `s3://${S3_BUCKET}/${object.Key}`
                        });
                    }
                }
            }
            
            console.log(`🖼️ Loaded ${projectData.media.length} media assets`);
            
        } catch (error) {
            console.error('Error loading media assets:', error);
        }
        
        return projectData;
        
    } catch (error) {
        console.error('Error loading project components:', error);
        throw error;
    }
}

/**
 * Create engaging media sequence with optimal timing for YouTube engagement
 */
async function createEngagingMediaSequence(script, mediaAssets, totalDuration) {
    try {
        console.log(`🎯 Creating engaging sequence for ${totalDuration}s video`);
        
        const sequence = [];
        const images = mediaAssets.filter(m => m.type === 'image');
        const videos = mediaAssets.filter(m => m.type === 'video');
        
        // YouTube engagement best practices:
        // - Change visuals every 3-8 seconds for high retention
        // - Use videos for key moments (intro, main points, conclusion)
        // - Images with motion effects for supporting content
        // - Faster cuts in first 15 seconds (hook period)
        
        const segments = [];
        let currentTime = 0;
        
        // Hook period (0-15s): Fast cuts every 3-4 seconds
        const hookDuration = Math.min(15, totalDuration * 0.1);
        while (currentTime < hookDuration) {
            const segmentDuration = Math.random() * 2 + 3; // 3-5 seconds
            const duration = Math.min(segmentDuration, hookDuration - currentTime);
            
            segments.push({
                startTime: currentTime,
                duration: duration,
                phase: 'hook',
                priority: 'high'
            });
            
            currentTime += duration;
        }
        
        // Main content (15s - 90%): Moderate cuts every 5-8 seconds
        const mainEndTime = totalDuration * 0.9;
        while (currentTime < mainEndTime) {
            const segmentDuration = Math.random() * 3 + 5; // 5-8 seconds
            const duration = Math.min(segmentDuration, mainEndTime - currentTime);
            
            segments.push({
                startTime: currentTime,
                duration: duration,
                phase: 'main',
                priority: 'medium'
            });
            
            currentTime += duration;
        }
        
        // Conclusion (last 10%): Slower cuts for call-to-action
        while (currentTime < totalDuration) {
            const segmentDuration = Math.random() * 4 + 6; // 6-10 seconds
            const duration = Math.min(segmentDuration, totalDuration - currentTime);
            
            segments.push({
                startTime: currentTime,
                duration: duration,
                phase: 'conclusion',
                priority: 'low'
            });
            
            currentTime += duration;
        }
        
        console.log(`📊 Created ${segments.length} segments: ${segments.filter(s => s.phase === 'hook').length} hook, ${segments.filter(s => s.phase === 'main').length} main, ${segments.filter(s => s.phase === 'conclusion').length} conclusion`);
        
        // Assign media to segments with intelligent selection
        let mediaIndex = 0;
        let videoIndex = 0;
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let selectedMedia;
            let effects = [];
            
            // Use videos for key moments (every 4-6 segments or important phases)
            const useVideo = (
                videos.length > 0 && 
                videoIndex < videos.length && 
                (i % 5 === 0 || segment.phase === 'hook' || segment.phase === 'conclusion')
            );
            
            if (useVideo) {
                selectedMedia = videos[videoIndex % videos.length];
                videoIndex++;
                
                // Video effects for engagement
                effects = [
                    'scale=1920:1080:force_original_aspect_ratio=increase',
                    'crop=1920:1080',
                    segment.phase === 'hook' ? 'fade=in:0:30' : null
                ].filter(Boolean);
                
            } else {
                // Use images with motion effects
                selectedMedia = images[mediaIndex % images.length];
                mediaIndex++;
                
                // Ken Burns effect and transitions for images
                const kenBurnsEffects = [
                    'zoompan=z=1.1:d=25*3:s=1920x1080', // Slow zoom
                    'zoompan=z=1.05:x=iw*0.1:d=25*3:s=1920x1080', // Pan right
                    'zoompan=z=1.08:y=ih*0.1:d=25*3:s=1920x1080', // Pan down
                    'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'
                ];
                
                effects = [
                    kenBurnsEffects[i % kenBurnsEffects.length],
                    segment.phase === 'hook' ? 'fade=in:0:15' : null,
                    i === segments.length - 1 ? 'fade=out:st=' + (segment.duration - 1) + ':d=1' : null
                ].filter(Boolean);
            }
            
            sequence.push({
                segmentIndex: i,
                startTime: segment.startTime,
                duration: segment.duration,
                media: selectedMedia,
                effects: effects,
                phase: segment.phase,
                transition: i > 0 ? 'crossfade:0.5' : null
            });
        }
        
        console.log(`✅ Media sequence created: ${sequence.filter(s => s.media.type === 'video').length} video segments, ${sequence.filter(s => s.media.type === 'image').length} image segments`);
        
        return sequence;
        
    } catch (error) {
        console.error('Error creating media sequence:', error);
        throw error;
    }
}

/**
 * Generate comprehensive FFmpeg command for video assembly
 */
async function generateFFmpegCommand(projectId, projectData, mediaSequence, videoOptions = {}) {
    try {
        console.log(`⚙️ Generating FFmpeg command for ${mediaSequence.length} segments`);
        
        const audioPath = `videos/${projectId}/audio/${projectData.audio.audioId}.mp3`;
        const outputPath = `videos/${projectId}/output/final-video.mp4`;
        
        // Build complex FFmpeg command for engaging video
        const inputs = [];
        const filterComplex = [];
        const maps = [];
        
        // Add audio input
        inputs.push(`-i s3://${S3_BUCKET}/${audioPath}`);
        
        // Add media inputs
        mediaSequence.forEach((segment, index) => {
            inputs.push(`-i s3://${S3_BUCKET}/${segment.media.s3Key}`);
        });
        
        // Create video segments with effects
        let videoStreams = [];
        
        mediaSequence.forEach((segment, index) => {
            const inputIndex = index + 1; // +1 because audio is input 0
            const streamName = `v${index}`;
            
            let filter = `[${inputIndex}:v]`;
            
            // Apply effects based on media type and segment
            if (segment.media.type === 'image') {
                // Image processing with Ken Burns effect
                filter += segment.effects.join(',');
                filter += `,setpts=PTS-STARTPTS,fps=30,format=yuv420p[${streamName}]`;
            } else {
                // Video processing
                filter += segment.effects.join(',');
                filter += `,setpts=PTS-STARTPTS[${streamName}]`;
            }
            
            filterComplex.push(filter);
            videoStreams.push(`[${streamName}]`);
        });
        
        // Concatenate all video segments
        const concatFilter = videoStreams.join('') + `concat=n=${mediaSequence.length}:v=1:a=0[outv]`;
        filterComplex.push(concatFilter);
        
        // Build final FFmpeg command
        const ffmpegCommand = [
            'ffmpeg',
            '-y', // Overwrite output
            ...inputs,
            '-filter_complex', `"${filterComplex.join('; ')}"`,
            '-map', '[outv]',
            '-map', '0:a', // Use original audio
            '-c:v', videoOptions.videoCodec || 'libx264',
            '-c:a', videoOptions.audioCodec || 'aac',
            '-preset', videoOptions.preset || 'medium',
            '-crf', videoOptions.crf || '23',
            '-b:v', videoOptions.bitrate || '8000k',
            '-b:a', '192k',
            '-ar', '44100',
            '-r', videoOptions.fps || '30',
            '-s', videoOptions.resolution || '1920x1080',
            '-movflags', '+faststart', // Optimize for web streaming
            '-metadata', `title="${projectData.script.title}"`,
            '-metadata', `comment="Generated by AI Video Pipeline"`,
            `s3://${S3_BUCKET}/${outputPath}`
        ].join(' ');
        
        console.log(`✅ FFmpeg command generated (${ffmpegCommand.length} chars)`);
        
        return {
            command: ffmpegCommand,
            inputCount: inputs.length,
            outputPath: outputPath,
            estimatedProcessingTime: Math.ceil(projectData.audioDuration * 0.5), // Rough estimate
            complexity: mediaSequence.length,
            effects: {
                kenBurns: mediaSequence.filter(s => s.media.type === 'image').length,
                videoSegments: mediaSequence.filter(s => s.media.type === 'video').length,
                transitions: mediaSequence.filter(s => s.transition).length
            }
        };
        
    } catch (error) {
        console.error('Error generating FFmpeg command:', error);
        throw error;
    }
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

/**
 * Assemble video from project configuration with intelligent media sequencing
 */
async function assembleProjectVideo(requestBody) {
    const { 
        projectId,
        scriptId,
        audioId,
        mediaAssets = [],
        videoOptions = {}
    } = requestBody;
    
    try {
        console.log(`🎬 Assembling dynamic video for project: ${projectId}`);
        console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));
        
        if (!projectId) {
            return createResponse(400, { error: 'projectId is required' });
        }
        
        // Load project components from S3
        const projectData = await loadProjectComponents(projectId);
        
        if (!projectData.script || !projectData.audio || !projectData.media.length) {
            return createResponse(400, { 
                error: 'Incomplete project data',
                missing: {
                    script: !projectData.script,
                    audio: !projectData.audio,
                    media: !projectData.media.length
                }
            });
        }
        
        console.log(`📊 Project loaded: ${projectData.media.length} media assets, ${Math.floor(projectData.audioDuration)}s audio`);
        
        // Create intelligent media sequence for engaging video
        const mediaSequence = await createEngagingMediaSequence(
            projectData.script,
            projectData.media,
            projectData.audioDuration
        );
        
        console.log(`🎯 Generated ${mediaSequence.length} media segments for dynamic video`);
        
        // Generate FFmpeg command for video assembly
        const ffmpegCommand = await generateFFmpegCommand(
            projectId,
            projectData,
            mediaSequence,
            videoOptions
        );
        
        // Create video job
        const videoJob = {
            videoId: `video-${projectId}-${Date.now()}`,
            projectId: projectId,
            status: 'queued',
            createdAt: new Date().toISOString(),
            estimatedDuration: projectData.audioDuration,
            mediaSequence: mediaSequence,
            ffmpegCommand: ffmpegCommand,
            videoOptions: {
                outputFormat: 'mp4',
                resolution: '1920x1080',
                fps: 30,
                bitrate: '8000k', // Higher bitrate for quality
                audioCodec: 'aac',
                videoCodec: 'libx264',
                preset: 'medium',
                crf: 23, // Good quality/size balance
                ...videoOptions
            },
            components: {
                script: projectData.script.scriptId,
                audio: projectData.audio.audioId,
                mediaCount: projectData.media.length,
                segmentCount: mediaSequence.length
            }
        };
        
        // Store video job
        await storeVideoJob(videoJob);
        
        // For now, return the FFmpeg command and job details
        // In production, this would trigger ECS task or Lambda processing
        videoJob.status = 'ready_for_processing';
        videoJob.createdAt = new Date().toISOString();
        
        return createResponse(200, {
            success: true,
            message: 'Video assembly plan created successfully',
            video: videoJob,
            ffmpegCommand: videoJob.ffmpegCommand,
            processingInfo: {
                segmentCount: videoJob.mediaSequence.length,
                estimatedDuration: videoJob.estimatedDuration,
                complexity: videoJob.ffmpegCommand.complexity,
                effects: videoJob.ffmpegCommand.effects
            },
            nextSteps: [
                'FFmpeg command generated for dynamic video assembly',
                'Media sequence optimized for YouTube engagement',
                'Ready for video processing pipeline'
            ]
        });
        
    } catch (error) {
        console.error('Error assembling project video:', error);
        console.error('Error stack:', error.stack);
        return createResponse(500, { 
            success: false,
            error: 'Video assembly failed',
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
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
        },
        body: JSON.stringify(body, null, 2)
    };
}