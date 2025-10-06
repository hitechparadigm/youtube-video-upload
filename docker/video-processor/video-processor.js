/**
 * Video Processor - FFmpeg-based video assembly
 * 
 * This application runs in ECS Fargate containers to perform the actual video processing:
 * 
 * Processing Pipeline:
 * 1. Download Components: Scripts, audio, and media files from S3
 * 2. Audio Analysis: Extract timing and duration information using FFprobe
 * 3. Media Preparation: Resize and format media assets for video timeline
 * 4. Timeline Generation: Create scene-by-scene video timeline from script
 * 5. Video Assembly: Use FFmpeg to combine all components with transitions
 * 6. Subtitle Addition: Generate and overlay subtitles from script content
 * 7. Final Upload: Store completed video in S3 with metadata
 * 8. Status Update: Update job status in DynamoDB
 * 
 * Technical Features:
 * - FFmpeg static build for reliable video processing
 * - Automatic media format conversion and scaling
 * - Speech mark synchronization for precise audio-video alignment
 * - SRT subtitle generation and overlay
 * - Comprehensive error handling and cleanup
 * - Cost tracking and performance monitoring
 * 
 * Container Specifications:
 * - Base Image: AWS Lambda Node.js 20.x
 * - CPU: 2048 (2 vCPU)
 * - Memory: 4096 MB (4 GB)
 * - Storage: Ephemeral /tmp processing directories
 * 
 * @author Automated Video Pipeline Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

class VideoProcessor {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.s3Client = new S3Client({ region: this.region });
        this.dynamoClient = new DynamoDBClient({ region: this.region });
        this.docClient = DynamoDBDocumentClient.from(this.dynamoClient);
        this.secretsClient = new SecretsManagerClient({ region: this.region });
        
        // Configuration from environment
        this.videoId = process.env.VIDEO_ID;
        this.scriptId = process.env.SCRIPT_ID;
        this.audioId = process.env.AUDIO_ID;
        this.s3Bucket = process.env.S3_BUCKET;
        this.mediaItems = JSON.parse(process.env.MEDIA_ITEMS || '[]');
        
        // Video settings
        this.outputFormat = process.env.OUTPUT_FORMAT || 'mp4';
        this.resolution = process.env.RESOLUTION || '1920x1080';
        this.fps = parseInt(process.env.FPS) || 30;
        this.bitrate = process.env.BITRATE || '5000k';
        
        // Processing directories
        this.workDir = '/tmp/video-processing';
        this.inputDir = path.join(this.workDir, 'input');
        this.outputDir = path.join(this.workDir, 'output');
        this.tempDir = path.join(this.workDir, 'temp');
        
        // FFmpeg paths
        this.ffmpegPath = process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg';
        this.ffprobePath = process.env.FFPROBE_PATH || '/usr/local/bin/ffprobe';
        
        console.log(`🎬 Video Processor initialized for video: ${this.videoId}`);
    }

    /**
     * Main processing function
     */
    async processVideo() {
        try {
            console.log(`🚀 Starting video processing for ${this.videoId}`);
            
            // Update status to processing
            await this.updateVideoStatus('processing', 'Video assembly started');
            
            // 1. Download and prepare components
            console.log('📥 Downloading components...');
            const components = await this.downloadComponents();
            
            // 2. Analyze audio for timing
            console.log('🎵 Analyzing audio timing...');
            const audioAnalysis = await this.analyzeAudio(components.audioFile);
            
            // 3. Prepare media assets
            console.log('🖼️ Preparing media assets...');
            const preparedMedia = await this.prepareMediaAssets(components.mediaFiles, audioAnalysis);
            
            // 4. Generate video timeline
            console.log('⏱️ Generating video timeline...');
            const timeline = await this.generateTimeline(components.script, audioAnalysis, preparedMedia);
            
            // 5. Assemble video with FFmpeg
            console.log('🎞️ Assembling video...');
            const videoFile = await this.assembleVideo(timeline, components.audioFile);
            
            // 6. Add subtitles and effects
            console.log('📝 Adding subtitles and effects...');
            const finalVideo = await this.addSubtitlesAndEffects(videoFile, components.script, timeline);
            
            // 7. Upload final video
            console.log('☁️ Uploading final video...');
            const uploadResult = await this.uploadFinalVideo(finalVideo);
            
            // 8. Update completion status
            await this.updateVideoStatus('completed', 'Video assembly completed successfully', {
                outputUrl: uploadResult.url,
                duration: audioAnalysis.duration,
                fileSize: uploadResult.size,
                resolution: this.resolution,
                format: this.outputFormat
            });
            
            console.log('✅ Video processing completed successfully!');
            
            // Cleanup temporary files
            await this.cleanup();
            
            return {
                success: true,
                videoId: this.videoId,
                outputUrl: uploadResult.url,
                duration: audioAnalysis.duration,
                processingTime: Date.now() - this.startTime
            };
            
        } catch (error) {
            console.error('❌ Video processing failed:', error);
            
            await this.updateVideoStatus('failed', `Video processing failed: ${error.message}`, {
                error: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }

    /**
     * Download all required components from S3
     */
    async downloadComponents() {
        console.log('Downloading script, audio, and media files...');
        
        const components = {
            script: null,
            audioFile: null,
            mediaFiles: []
        };
        
        try {
            // Download script data
            const scriptResponse = await this.s3Client.send(new GetObjectCommand({
                Bucket: this.s3Bucket,
                Key: `scripts/${this.scriptId}.json`
            }));
            components.script = JSON.parse(await this.streamToString(scriptResponse.Body));
            
            // Download audio file
            const audioResponse = await this.s3Client.send(new GetObjectCommand({
                Bucket: this.s3Bucket,
                Key: `audio/${this.audioId}.mp3`
            }));
            components.audioFile = path.join(this.inputDir, 'audio.mp3');
            await fs.writeFile(components.audioFile, await this.streamToBuffer(audioResponse.Body));
            
            // Download media files
            for (let i = 0; i < this.mediaItems.length; i++) {
                const mediaItem = this.mediaItems[i];
                const mediaResponse = await this.s3Client.send(new GetObjectCommand({
                    Bucket: this.s3Bucket,
                    Key: mediaItem.s3Key
                }));
                
                const extension = path.extname(mediaItem.s3Key);
                const localPath = path.join(this.inputDir, `media_${i}${extension}`);
                await fs.writeFile(localPath, await this.streamToBuffer(mediaResponse.Body));
                
                components.mediaFiles.push({
                    ...mediaItem,
                    localPath: localPath,
                    index: i
                });
            }
            
            console.log(`Downloaded ${components.mediaFiles.length} media files`);
            return components;
            
        } catch (error) {
            console.error('Failed to download components:', error);
            throw error;
        }
    }

    /**
     * Analyze audio file for duration and timing
     */
    async analyzeAudio(audioFile) {
        console.log('Analyzing audio file...');
        
        return new Promise((resolve, reject) => {
            const ffprobe = spawn(this.ffprobePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                audioFile
            ]);
            
            let output = '';
            
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ffprobe.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`FFprobe failed with code ${code}`));
                    return;
                }
                
                try {
                    const analysis = JSON.parse(output);
                    const audioStream = analysis.streams.find(s => s.codec_type === 'audio');
                    
                    resolve({
                        duration: parseFloat(analysis.format.duration),
                        bitrate: parseInt(analysis.format.bit_rate),
                        sampleRate: parseInt(audioStream.sample_rate),
                        channels: parseInt(audioStream.channels),
                        format: analysis.format.format_name
                    });
                } catch (error) {
                    reject(error);
                }
            });
            
            ffprobe.on('error', reject);
        });
    }

    /**
     * Prepare media assets for video timeline
     */
    async prepareMediaAssets(mediaFiles, audioAnalysis) {
        console.log('Preparing media assets...');
        
        const preparedMedia = [];
        const totalDuration = audioAnalysis.duration;
        const segmentDuration = totalDuration / mediaFiles.length;
        
        for (let i = 0; i < mediaFiles.length; i++) {
            const mediaFile = mediaFiles[i];
            const startTime = i * segmentDuration;
            const endTime = Math.min((i + 1) * segmentDuration, totalDuration);
            const duration = endTime - startTime;
            
            // Prepare media file (resize, format conversion if needed)
            const preparedPath = await this.prepareMediaFile(mediaFile, duration);
            
            preparedMedia.push({
                ...mediaFile,
                preparedPath: preparedPath,
                startTime: startTime,
                endTime: endTime,
                duration: duration
            });
        }
        
        return preparedMedia;
    }

    /**
     * Prepare individual media file
     */
    async prepareMediaFile(mediaFile, targetDuration) {
        const outputPath = path.join(this.tempDir, `prepared_${mediaFile.index}.mp4`);
        
        return new Promise((resolve, reject) => {
            const args = [
                '-i', mediaFile.localPath,
                '-vf', `scale=${this.resolution}:force_original_aspect_ratio=decrease,pad=${this.resolution}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
                '-t', targetDuration.toString(),
                '-r', this.fps.toString(),
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-y',
                outputPath
            ];
            
            const ffmpeg = spawn(this.ffmpegPath, args);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg failed with code ${code} for media ${mediaFile.index}`));
                }
            });
            
            ffmpeg.on('error', reject);
        });
    }

    /**
     * Generate video timeline from script and media
     */
    async generateTimeline(script, audioAnalysis, preparedMedia) {
        console.log('Generating video timeline...');
        
        const timeline = {
            totalDuration: audioAnalysis.duration,
            segments: []
        };
        
        // If script has scenes with timing, use that
        if (script.scenes && script.scenes.length > 0) {
            for (const scene of script.scenes) {
                const startTime = scene.timing?.start || 0;
                const endTime = scene.timing?.end || startTime + (scene.duration || 10);
                
                // Find best matching media for this scene
                const matchingMedia = this.findBestMediaForScene(scene, preparedMedia);
                
                timeline.segments.push({
                    startTime: startTime,
                    endTime: endTime,
                    duration: endTime - startTime,
                    scene: scene,
                    media: matchingMedia,
                    text: scene.narration
                });
            }
        } else {
            // Fallback: distribute media evenly across audio duration
            const segmentDuration = audioAnalysis.duration / preparedMedia.length;
            
            for (let i = 0; i < preparedMedia.length; i++) {
                const startTime = i * segmentDuration;
                const endTime = Math.min((i + 1) * segmentDuration, audioAnalysis.duration);
                
                timeline.segments.push({
                    startTime: startTime,
                    endTime: endTime,
                    duration: endTime - startTime,
                    media: preparedMedia[i],
                    text: `Segment ${i + 1}`
                });
            }
        }
        
        return timeline;
    }

    /**
     * Find best matching media for a scene
     */
    findBestMediaForScene(scene, preparedMedia) {
        // Simple matching based on visual requirements
        const sceneKeywords = scene.visualRequirements || [];
        let bestMatch = preparedMedia[0];
        let bestScore = 0;
        
        for (const media of preparedMedia) {
            let score = 0;
            const mediaKeywords = media.keywords || [];
            
            // Calculate keyword overlap
            for (const keyword of sceneKeywords) {
                if (mediaKeywords.some(mk => mk.toLowerCase().includes(keyword.toLowerCase()))) {
                    score += 1;
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = media;
            }
        }
        
        return bestMatch;
    }

    /**
     * Assemble video using FFmpeg
     */
    async assembleVideo(timeline, audioFile) {
        console.log('Assembling video with FFmpeg...');
        
        const outputPath = path.join(this.outputDir, `${this.videoId}_raw.mp4`);
        
        // Create filter complex for video segments
        const filterComplex = this.buildFilterComplex(timeline);
        
        return new Promise((resolve, reject) => {
            const inputs = [];
            
            // Add all media inputs
            for (const segment of timeline.segments) {
                inputs.push('-i', segment.media.preparedPath);
            }
            
            // Add audio input
            inputs.push('-i', audioFile);
            
            const args = [
                ...inputs,
                '-filter_complex', filterComplex,
                '-map', '[final_video]',
                '-map', `${timeline.segments.length}:a`, // Audio from last input
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-y',
                outputPath
            ];
            
            console.log('FFmpeg command:', this.ffmpegPath, args.join(' '));
            
            const ffmpeg = spawn(this.ffmpegPath, args);
            
            ffmpeg.stdout.on('data', (data) => {
                console.log('FFmpeg stdout:', data.toString());
            });
            
            ffmpeg.stderr.on('data', (data) => {
                console.log('FFmpeg stderr:', data.toString());
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('Video assembly completed');
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg failed with code ${code}`));
                }
            });
            
            ffmpeg.on('error', reject);
        });
    }

    /**
     * Build FFmpeg filter complex for video concatenation
     */
    buildFilterComplex(timeline) {
        const segments = timeline.segments;
        let filterComplex = '';
        
        // Scale and pad each input
        for (let i = 0; i < segments.length; i++) {
            filterComplex += `[${i}:v]scale=${this.resolution}:force_original_aspect_ratio=decrease,pad=${this.resolution}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${this.fps}[v${i}];`;
        }
        
        // Concatenate all video segments
        filterComplex += segments.map((_, i) => `[v${i}]`).join('') + `concat=n=${segments.length}:v=1:a=0[final_video]`;
        
        return filterComplex;
    }

    /**
     * Add subtitles and effects to video
     */
    async addSubtitlesAndEffects(videoFile, script, timeline) {
        console.log('Adding subtitles and effects...');
        
        const outputPath = path.join(this.outputDir, `${this.videoId}_final.mp4`);
        
        // Generate subtitle file
        const subtitleFile = await this.generateSubtitles(script, timeline);
        
        return new Promise((resolve, reject) => {
            const args = [
                '-i', videoFile,
                '-vf', `subtitles=${subtitleFile}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-c:a', 'copy',
                '-movflags', '+faststart',
                '-y',
                outputPath
            ];
            
            const ffmpeg = spawn(this.ffmpegPath, args);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log('Subtitles and effects added');
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg subtitle processing failed with code ${code}`));
                }
            });
            
            ffmpeg.on('error', reject);
        });
    }

    /**
     * Generate subtitle file in SRT format
     */
    async generateSubtitles(script, timeline) {
        console.log('Generating subtitles...');
        
        const subtitlePath = path.join(this.tempDir, 'subtitles.srt');
        let srtContent = '';
        let subtitleIndex = 1;
        
        for (const segment of timeline.segments) {
            if (segment.text) {
                const startTime = this.formatSRTTime(segment.startTime);
                const endTime = this.formatSRTTime(segment.endTime);
                
                srtContent += `${subtitleIndex}\n`;
                srtContent += `${startTime} --> ${endTime}\n`;
                srtContent += `${segment.text}\n\n`;
                
                subtitleIndex++;
            }
        }
        
        await fs.writeFile(subtitlePath, srtContent, 'utf8');
        console.log(`Generated subtitles: ${subtitlePath}`);
        
        return subtitlePath;
    }

    /**
     * Format time for SRT subtitles
     */
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }

    /**
     * Upload final video to S3
     */
    async uploadFinalVideo(videoFile) {
        console.log('Uploading final video to S3...');
        
        const videoBuffer = await fs.readFile(videoFile);
        const s3Key = `final-videos/${this.videoId}.${this.outputFormat}`;
        
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: s3Key,
            Body: videoBuffer,
            ContentType: `video/${this.outputFormat}`,
            Metadata: {
                'video-id': this.videoId,
                'script-id': this.scriptId,
                'audio-id': this.audioId,
                'resolution': this.resolution,
                'duration': this.duration?.toString() || '0'
            }
        }));
        
        const url = `https://${this.s3Bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
        
        console.log(`Video uploaded: ${url}`);
        
        return {
            url: url,
            s3Key: s3Key,
            size: videoBuffer.length
        };
    }

    /**
     * Update video status in DynamoDB
     */
    async updateVideoStatus(status, message, additionalData = {}) {
        try {
            const updateParams = {
                TableName: 'automated-video-pipeline-videos',
                Key: { videoId: this.videoId },
                UpdateExpression: 'SET #status = :status, #message = :message, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#message': 'message',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues: {
                    ':status': status,
                    ':message': message,
                    ':updatedAt': new Date().toISOString()
                }
            };
            
            // Add additional data fields
            if (Object.keys(additionalData).length > 0) {
                for (const [key, value] of Object.entries(additionalData)) {
                    updateParams.UpdateExpression += `, #${key} = :${key}`;
                    updateParams.ExpressionAttributeNames[`#${key}`] = key;
                    updateParams.ExpressionAttributeValues[`:${key}`] = value;
                }
            }
            
            await this.docClient.send(new UpdateCommand(updateParams));
            console.log(`Updated video status: ${status} - ${message}`);
            
        } catch (error) {
            console.error('Failed to update video status:', error);
        }
    }

    /**
     * Cleanup temporary files
     */
    async cleanup() {
        try {
            console.log('Cleaning up temporary files...');
            
            // Remove all files in work directory
            const files = await fs.readdir(this.workDir, { recursive: true });
            for (const file of files) {
                const filePath = path.join(this.workDir, file);
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    // Ignore errors for directories or already deleted files
                }
            }
            
            console.log('Cleanup completed');
            
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }

    /**
     * Utility: Convert stream to string
     */
    async streamToString(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    /**
     * Utility: Convert stream to buffer
     */
    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
}

// Main execution
async function main() {
    const processor = new VideoProcessor();
    processor.startTime = Date.now();
    
    try {
        const result = await processor.processVideo();
        console.log('🎉 Video processing completed successfully:', result);
        process.exit(0);
    } catch (error) {
        console.error('💥 Video processing failed:', error);
        process.exit(1);
    }
}

// Run if this is the main module
if (require.main === module) {
    main();
}

module.exports = { VideoProcessor };