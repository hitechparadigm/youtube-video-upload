/**
 * YouTube Publishing Service
 * Handles video upload and metadata optimization for YouTube
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class YouTubeService {
    constructor() {
        this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
        
        this.config = {
            bucket: process.env.S3_BUCKET_NAME || 'automated-video-pipeline-786673323159-us-east-1',
            secretName: process.env.YOUTUBE_SECRET_NAME || 'automated-video-pipeline/youtube-credentials',
            videosTable: process.env.VIDEOS_TABLE_NAME || 'automated-video-pipeline-production'
        };

        this.youtube = null;
    }

    /**
     * Initialize YouTube API client with OAuth credentials
     */
    async initializeYouTubeClient() {
        try {
            console.log('Initializing YouTube API client...');

            // Get credentials from AWS Secrets Manager
            const credentials = await this.getYouTubeCredentials();
            
            // Create OAuth2 client
            const oauth2Client = new google.auth.OAuth2(
                credentials.client_id,
                credentials.client_secret,
                credentials.redirect_uri
            );

            // Set refresh token
            oauth2Client.setCredentials({
                refresh_token: credentials.refresh_token
            });

            // Initialize YouTube API
            this.youtube = google.youtube({
                version: 'v3',
                auth: oauth2Client
            });

            console.log('✅ YouTube API client initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize YouTube client:', error);
            throw new Error(`YouTube initialization failed: ${error.message}`);
        }
    }

    /**
     * Publish video to YouTube with optimized metadata
     */
    async publishVideo(publishRequest) {
        const {
            videoId,
            videoFilePath,
            title,
            description,
            tags = [],
            thumbnail = null,
            privacy = 'public',
            category = '22' // People & Blogs
        } = publishRequest;

        try {
            console.log(`🚀 Starting YouTube upload for video: ${videoId}`);

            // Validate inputs first
            if (!videoId || !videoFilePath) {
                throw new Error('Missing required parameters: videoId and videoFilePath are required');
            }

            // Initialize YouTube client if not already done
            if (!this.youtube) {
                await this.initializeYouTubeClient();
            }

            // Create upload record
            const uploadRecord = {
                videoId,
                status: 'uploading',
                startedAt: new Date().toISOString(),
                title,
                description,
                tags,
                privacy,
                category
            };

            await this.storeUploadRecord(uploadRecord);

            // Step 1: Download video file from S3 to local temp
            const localVideoPath = await this.downloadVideoFile(videoFilePath);
            
            // Step 2: Upload video to YouTube
            const youtubeVideoId = await this.uploadVideoToYouTube({
                localVideoPath,
                title,
                description,
                tags,
                privacy,
                category
            });

            // Step 3: Upload thumbnail if provided
            if (thumbnail) {
                await this.uploadThumbnail(youtubeVideoId, thumbnail);
            }

            // Step 4: Update record with success
            uploadRecord.status = 'completed';
            uploadRecord.youtubeVideoId = youtubeVideoId;
            uploadRecord.youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
            uploadRecord.completedAt = new Date().toISOString();
            uploadRecord.uploadTime = Date.now() - new Date(uploadRecord.startedAt).getTime();

            await this.updateUploadRecord(uploadRecord);

            // Clean up local file
            await this.cleanupLocalFile(localVideoPath);

            console.log(`✅ Video uploaded successfully: ${uploadRecord.youtubeUrl}`);

            return {
                success: true,
                videoId,
                youtubeVideoId,
                youtubeUrl: uploadRecord.youtubeUrl,
                uploadTime: uploadRecord.uploadTime
            };

        } catch (error) {
            console.error(`❌ YouTube upload failed for ${videoId}:`, error);

            // Update record with error
            await this.updateUploadRecord({
                videoId,
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Upload video file to YouTube
     */
    async uploadVideoToYouTube(uploadParams) {
        const { localVideoPath, title, description, tags, privacy, category } = uploadParams;

        try {
            console.log('📤 Uploading video to YouTube...');

            const response = await this.youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: title,
                        description: description,
                        tags: tags,
                        categoryId: category,
                        defaultLanguage: 'en',
                        defaultAudioLanguage: 'en'
                    },
                    status: {
                        privacyStatus: privacy,
                        selfDeclaredMadeForKids: false
                    }
                },
                media: {
                    body: fs.createReadStream(localVideoPath)
                }
            });

            const youtubeVideoId = response.data.id;
            console.log(`✅ Video uploaded to YouTube: ${youtubeVideoId}`);

            return youtubeVideoId;

        } catch (error) {
            console.error('❌ YouTube upload error:', error);
            throw new Error(`YouTube upload failed: ${error.message}`);
        }
    }

    /**
     * Upload custom thumbnail
     */
    async uploadThumbnail(youtubeVideoId, thumbnailPath) {
        try {
            console.log(`🖼️ Uploading thumbnail for video: ${youtubeVideoId}`);

            // Download thumbnail from S3 if it's an S3 path
            let localThumbnailPath = thumbnailPath;
            if (thumbnailPath.startsWith('s3://')) {
                localThumbnailPath = await this.downloadThumbnailFile(thumbnailPath);
            }

            await this.youtube.thumbnails.set({
                videoId: youtubeVideoId,
                media: {
                    body: fs.createReadStream(localThumbnailPath)
                }
            });

            console.log('✅ Thumbnail uploaded successfully');

            // Clean up local thumbnail if we downloaded it
            if (localThumbnailPath !== thumbnailPath) {
                await this.cleanupLocalFile(localThumbnailPath);
            }

        } catch (error) {
            console.error('❌ Thumbnail upload failed:', error);
            // Don't throw - thumbnail upload is optional
        }
    }

    /**
     * Download video file from S3 to local temp directory
     */
    async downloadVideoFile(s3VideoPath) {
        try {
            console.log(`⬇️ Downloading video from S3: ${s3VideoPath}`);

            // Parse S3 path
            const s3Url = s3VideoPath.replace('s3://', '');
            const [bucket, ...keyParts] = s3Url.split('/');
            const key = keyParts.join('/');

            // Create local temp path
            const tempDir = '/tmp';
            const fileName = path.basename(key);
            const localPath = path.join(tempDir, `${Date.now()}-${fileName}`);

            // Download from S3
            const response = await this.s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            // Write to local file
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(localPath, buffer);

            console.log(`✅ Video downloaded to: ${localPath}`);
            return localPath;

        } catch (error) {
            console.error('❌ Video download failed:', error);
            throw new Error(`Failed to download video: ${error.message}`);
        }
    }

    /**
     * Download thumbnail file from S3
     */
    async downloadThumbnailFile(s3ThumbnailPath) {
        try {
            console.log(`⬇️ Downloading thumbnail from S3: ${s3ThumbnailPath}`);

            // Parse S3 path
            const s3Url = s3ThumbnailPath.replace('s3://', '');
            const [bucket, ...keyParts] = s3Url.split('/');
            const key = keyParts.join('/');

            // Create local temp path
            const tempDir = '/tmp';
            const fileName = path.basename(key);
            const localPath = path.join(tempDir, `thumb-${Date.now()}-${fileName}`);

            // Download from S3
            const response = await this.s3Client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            // Write to local file
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(localPath, buffer);

            console.log(`✅ Thumbnail downloaded to: ${localPath}`);
            return localPath;

        } catch (error) {
            console.error('❌ Thumbnail download failed:', error);
            throw error;
        }
    }

    /**
     * Get YouTube credentials from AWS Secrets Manager
     */
    async getYouTubeCredentials() {
        try {
            const response = await this.secretsClient.send(new GetSecretValueCommand({
                SecretId: this.config.secretName
            }));

            const credentials = JSON.parse(response.SecretString);
            
            // Validate required fields
            const required = ['client_id', 'client_secret', 'refresh_token'];
            for (const field of required) {
                if (!credentials[field]) {
                    throw new Error(`Missing required credential: ${field}`);
                }
            }

            return credentials;

        } catch (error) {
            console.error('❌ Failed to get YouTube credentials:', error);
            throw new Error(`Credentials retrieval failed: ${error.message}`);
        }
    }

    /**
     * Generate SEO-optimized metadata
     */
    generateOptimizedMetadata(scriptData, trendData) {
        const { title, description, tags } = scriptData.clickWorthyMetadata || {};
        
        // Optimize title for YouTube algorithm
        const optimizedTitle = this.optimizeTitle(title, trendData);
        
        // Create engaging description with timestamps
        const optimizedDescription = this.createEngagingDescription(description, scriptData);
        
        // Generate strategic tags
        const optimizedTags = this.generateStrategicTags(tags, trendData);

        return {
            title: optimizedTitle,
            description: optimizedDescription,
            tags: optimizedTags
        };
    }

    /**
     * Optimize title for YouTube algorithm
     */
    optimizeTitle(originalTitle, trendData) {
        if (!originalTitle) return 'Automated Video Content';

        // Ensure title is within YouTube limits (100 characters)
        let optimizedTitle = originalTitle.substring(0, 100);

        // Add trending keywords if space allows
        if (trendData && trendData.hotKeywords && optimizedTitle.length < 80) {
            const trendingKeyword = trendData.hotKeywords[0];
            if (trendingKeyword && !optimizedTitle.toLowerCase().includes(trendingKeyword.toLowerCase())) {
                optimizedTitle = `${optimizedTitle} | ${trendingKeyword}`;
            }
        }

        return optimizedTitle;
    }

    /**
     * Create engaging description with timestamps
     */
    createEngagingDescription(originalDescription, scriptData) {
        let description = originalDescription || 'Automated video content created with AI.';

        // Add timestamps if scenes are available
        if (scriptData.scenes && scriptData.scenes.length > 0) {
            description += '\n\n🔥 TIMESTAMPS:\n';
            let currentTime = 0;
            
            scriptData.scenes.forEach((scene, index) => {
                const minutes = Math.floor(currentTime / 60);
                const seconds = currentTime % 60;
                const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                description += `${timestamp} - ${scene.type || `Scene ${index + 1}`}\n`;
                currentTime += scene.duration || 30;
            });
        }

        // Add call to action
        description += '\n\n💰 SUBSCRIBE for more content like this!\n';
        description += '\n#AutomatedContent #AI #VideoGeneration';

        return description;
    }

    /**
     * Generate strategic tags for YouTube SEO
     */
    generateStrategicTags(originalTags = [], trendData) {
        let tags = [...originalTags];

        // Add trending keywords as tags
        if (trendData && trendData.hotKeywords) {
            tags.push(...trendData.hotKeywords.slice(0, 5));
        }

        // Add general tags
        tags.push('automated content', 'ai generated', '2025');

        // Remove duplicates and limit to 15 tags (YouTube recommendation)
        tags = [...new Set(tags)].slice(0, 15);

        return tags;
    }

    /**
     * Store upload record in DynamoDB
     */
    async storeUploadRecord(uploadRecord) {
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.config.videosTable,
                Item: uploadRecord
            }));
            console.log(`📝 Stored upload record: ${uploadRecord.videoId}`);
        } catch (error) {
            console.error('❌ Error storing upload record:', error);
            // Don't throw - continue processing
        }
    }

    /**
     * Update upload record in DynamoDB
     */
    async updateUploadRecord(updates) {
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.config.videosTable,
                Item: updates
            }));
            console.log(`📝 Updated upload record: ${updates.videoId}`);
        } catch (error) {
            console.error('❌ Error updating upload record:', error);
            // Don't throw - continue processing
        }
    }

    /**
     * Clean up local temporary file
     */
    async cleanupLocalFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Cleaned up local file: ${filePath}`);
            }
        } catch (error) {
            console.error('❌ Error cleaning up file:', error);
            // Don't throw - cleanup is optional
        }
    }

    /**
     * Get upload status
     */
    async getUploadStatus(videoId) {
        try {
            const response = await this.docClient.send(new GetCommand({
                TableName: this.config.videosTable,
                Key: { videoId: videoId }
            }));

            return response.Item || null;

        } catch (error) {
            console.error('❌ Error getting upload status:', error);
            throw error;
        }
    }
}

module.exports = { YouTubeService };
