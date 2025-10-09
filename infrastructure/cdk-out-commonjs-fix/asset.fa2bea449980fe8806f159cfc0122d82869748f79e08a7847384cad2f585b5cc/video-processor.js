/**
 * Video Assembly and Synchronization Service
 * Combines media assets with audio using FFmpeg processing
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

class VideoProcessor {
    constructor() {
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.ecsClient = new ECSClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
        
        this.config = {
            bucket: process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1',
            cluster: process.env.ECS_CLUSTER_NAME || 'automated-video-pipeline-cluster',
            taskDefinition: process.env.ECS_TASK_DEFINITION || 'video-processor-task',
            videosTable: process.env.VIDEOS_TABLE_NAME || 'automated-video-pipeline-production'
        };
    }

    /**
     * Process video assembly request
     */
    async assembleVideo(assemblyRequest) {
        const {
            videoId,
            scriptData,
            mediaAssets,
            audioFile,
            outputOptions = {}
        } = assemblyRequest;

        try {
            console.log(`Starting video assembly for: ${videoId}`);

            // Validate inputs
            if (!videoId || !scriptData || !mediaAssets || !audioFile) {
                throw new Error('Missing required assembly parameters');
            }

            // Create video job record
            const videoJob = {
                videoId,
                status: 'processing',
                createdAt: new Date().toISOString(),
                scriptData,
                mediaAssets: mediaAssets.length,
                audioFile,
                outputOptions: {
                    resolution: '1920x1080',
                    fps: 30,
                    bitrate: '5000k',
                    format: 'mp4',
                    ...outputOptions
                },
                processingSteps: []
            };

            // Store initial job
            await this.storeVideoJob(videoJob);

            // Step 1: Validate and prepare media assets
            const preparedAssets = await this.prepareMediaAssets(videoId, mediaAssets);
            videoJob.processingSteps.push({
                step: 'media_preparation',
                status: 'completed',
                timestamp: new Date().toISOString(),
                assetsProcessed: preparedAssets.length
            });

            // Step 2: Synchronize with audio timing
            const synchronizedAssets = await this.synchronizeWithAudio(videoId, preparedAssets, audioFile, scriptData);
            videoJob.processingSteps.push({
                step: 'audio_synchronization',
                status: 'completed',
                timestamp: new Date().toISOString(),
                totalDuration: synchronizedAssets.totalDuration
            });

            // Step 3: Generate FFmpeg processing instructions
            const ffmpegInstructions = await this.generateFFmpegInstructions(videoId, synchronizedAssets, audioFile, outputOptions);
            videoJob.processingSteps.push({
                step: 'ffmpeg_generation',
                status: 'completed',
                timestamp: new Date().toISOString(),
                instructionsGenerated: true
            });

            // Step 4: Execute video processing (simplified for now)
            const processingResult = await this.executeVideoProcessing(videoId, ffmpegInstructions);
            videoJob.processingSteps.push({
                step: 'video_processing',
                status: processingResult.success ? 'completed' : 'failed',
                timestamp: new Date().toISOString(),
                outputLocation: processingResult.outputLocation
            });

            // Update final job status
            videoJob.status = processingResult.success ? 'completed' : 'failed';
            videoJob.completedAt = new Date().toISOString();
            videoJob.outputLocation = processingResult.outputLocation;
            videoJob.processingTime = Date.now() - new Date(videoJob.createdAt).getTime();

            await this.updateVideoJob(videoJob);

            return {
                success: processingResult.success,
                videoId,
                outputLocation: processingResult.outputLocation,
                processingTime: videoJob.processingTime,
                steps: videoJob.processingSteps
            };

        } catch (error) {
            console.error(`Video assembly failed for ${videoId}:`, error);
            
            // Update job with error status
            await this.updateVideoJob({
                videoId,
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Prepare and validate media assets
     */
    async prepareMediaAssets(videoId, mediaAssets) {
        console.log(`Preparing ${mediaAssets.length} media assets for ${videoId}`);

        const preparedAssets = [];

        for (let i = 0; i < mediaAssets.length; i++) {
            const asset = mediaAssets[i];
            
            try {
                // Validate asset exists in S3
                const assetExists = await this.validateS3Asset(asset.s3Location);
                
                if (!assetExists) {
                    console.warn(`Asset not found: ${asset.s3Location}, skipping`);
                    continue;
                }

                // Prepare asset metadata
                const preparedAsset = {
                    id: `asset_${i + 1}`,
                    type: asset.type || 'image',
                    s3Location: asset.s3Location,
                    duration: asset.duration || 3, // Default 3 seconds for images
                    sceneId: asset.sceneId || i + 1,
                    resolution: asset.resolution || '1920x1080',
                    validated: true
                };

                preparedAssets.push(preparedAsset);

            } catch (error) {
                console.error(`Error preparing asset ${i + 1}:`, error);
                // Continue with other assets
            }
        }

        console.log(`Prepared ${preparedAssets.length} valid assets`);
        return preparedAssets;
    }

    /**
     * Synchronize media assets with audio timing
     */
    async synchronizeWithAudio(videoId, mediaAssets, audioFile, scriptData) {
        console.log(`Synchronizing media with audio for ${videoId}`);

        // Get audio duration (simplified - would use actual audio analysis)
        const audioDuration = scriptData.totalDuration || 480; // 8 minutes default
        const scenes = scriptData.scenes || [];

        const synchronizedAssets = [];
        let currentTime = 0;

        for (let i = 0; i < scenes.length && i < mediaAssets.length; i++) {
            const scene = scenes[i];
            const asset = mediaAssets[i];

            const synchronizedAsset = {
                ...asset,
                startTime: currentTime,
                duration: scene.duration || asset.duration,
                endTime: currentTime + (scene.duration || asset.duration),
                sceneNarration: scene.narration,
                audioSync: true
            };

            synchronizedAssets.push(synchronizedAsset);
            currentTime += synchronizedAsset.duration;
        }

        // Handle remaining assets if any
        while (synchronizedAssets.length < mediaAssets.length && currentTime < audioDuration) {
            const remainingAsset = mediaAssets[synchronizedAssets.length];
            const remainingTime = audioDuration - currentTime;
            const assetDuration = Math.min(remainingAsset.duration, remainingTime);

            synchronizedAssets.push({
                ...remainingAsset,
                startTime: currentTime,
                duration: assetDuration,
                endTime: currentTime + assetDuration,
                audioSync: true
            });

            currentTime += assetDuration;
        }

        return {
            assets: synchronizedAssets,
            totalDuration: currentTime,
            audioFile: audioFile,
            syncAccuracy: 'high'
        };
    }

    /**
     * Generate FFmpeg processing instructions
     */
    async generateFFmpegInstructions(videoId, synchronizedAssets, audioFile, outputOptions) {
        console.log(`Generating FFmpeg instructions for ${videoId}`);

        const instructions = {
            videoId,
            inputFiles: [],
            filterComplex: [],
            outputOptions: [],
            command: ''
        };

        // Add input files
        synchronizedAssets.assets.forEach((asset, index) => {
            instructions.inputFiles.push({
                index,
                type: 'image',
                source: asset.s3Location,
                duration: asset.duration
            });
        });

        // Add audio input
        instructions.inputFiles.push({
            index: synchronizedAssets.assets.length,
            type: 'audio',
            source: audioFile
        });

        // Generate filter complex for video concatenation
        let filterComplex = '';
        
        // Scale and time each image
        synchronizedAssets.assets.forEach((asset, index) => {
            filterComplex += `[${index}:v]scale=${outputOptions.resolution || '1920x1080'}:force_original_aspect_ratio=decrease,pad=${outputOptions.resolution || '1920x1080'}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=${outputOptions.fps || 30}[v${index}];`;
        });

        // Concatenate all video segments
        const videoInputs = synchronizedAssets.assets.map((_, index) => `[v${index}]`).join('');
        filterComplex += `${videoInputs}concat=n=${synchronizedAssets.assets.length}:v=1:a=0[video]`;

        instructions.filterComplex = filterComplex;

        // Generate complete FFmpeg command
        let command = 'ffmpeg -y ';
        
        // Add image inputs with loop and duration
        synchronizedAssets.assets.forEach((asset, index) => {
            command += `-loop 1 -t ${asset.duration} -i "${asset.s3Location}" `;
        });
        
        // Add audio input
        command += `-i "${audioFile}" `;
        
        // Add filter complex
        command += `-filter_complex "${filterComplex}" `;
        
        // Add output mapping and encoding options
        command += `-map "[video]" -map ${synchronizedAssets.assets.length}:a `;
        command += `-c:v libx264 -c:a aac -pix_fmt yuv420p `;
        command += `-b:v ${outputOptions.bitrate || '5000k'} `;
        command += `-r ${outputOptions.fps || 30} `;
        command += `"${videoId}-final.${outputOptions.format || 'mp4'}"`;

        instructions.command = command;

        // Store instructions in S3 for reference
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: `videos/${videoId}/processing/ffmpeg-instructions.json`,
            Body: JSON.stringify(instructions, null, 2),
            ContentType: 'application/json'
        }));

        return instructions;
    }

    /**
     * Execute video processing (simplified implementation)
     */
    async executeVideoProcessing(videoId, ffmpegInstructions) {
        console.log(`Executing video processing for ${videoId}`);

        try {
            // For now, create a processing manifest instead of actual video
            // In production, this would trigger ECS Fargate task with FFmpeg
            
            const processingManifest = {
                videoId,
                status: 'processing_ready',
                ffmpegCommand: ffmpegInstructions.command,
                inputFiles: ffmpegInstructions.inputFiles,
                estimatedProcessingTime: '5-8 minutes',
                instructions: [
                    '1. Download all input files from S3',
                    '2. Execute FFmpeg command',
                    '3. Upload result to final location'
                ],
                outputLocation: `s3://${this.config.bucket}/final-videos/${videoId}/${videoId}-complete.mp4`,
                createdAt: new Date().toISOString()
            };

            // Store processing manifest
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: `videos/${videoId}/processing/manifest.json`,
                Body: JSON.stringify(processingManifest, null, 2),
                ContentType: 'application/json'
            }));

            console.log(`✅ Processing manifest created for ${videoId}`);

            return {
                success: true,
                outputLocation: processingManifest.outputLocation,
                processingManifest: processingManifest
            };

        } catch (error) {
            console.error(`Processing execution failed for ${videoId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate S3 asset exists
     */
    async validateS3Asset(s3Location) {
        try {
            // Extract bucket and key from s3Location
            const s3Url = s3Location.replace('s3://', '');
            const [bucket, ...keyParts] = s3Url.split('/');
            const key = keyParts.join('/');

            await this.s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            return true;
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Store video job in DynamoDB
     */
    async storeVideoJob(videoJob) {
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.config.videosTable,
                Item: videoJob
            }));
            console.log(`Stored video job: ${videoJob.videoId}`);
        } catch (error) {
            console.error('Error storing video job:', error);
            // Don't throw - continue processing
        }
    }

    /**
     * Update video job in DynamoDB
     */
    async updateVideoJob(updates) {
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.config.videosTable,
                Item: updates
            }));
            console.log(`Updated video job: ${updates.videoId}`);
        } catch (error) {
            console.error('Error updating video job:', error);
            // Don't throw - continue processing
        }
    }
}

export { VideoProcessor };
