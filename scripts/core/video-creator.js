#!/usr/bin/env node

/**
 * Video Creator - Handles all video creation workflows
 */

import AWSHelpers from '../utils/aws-helpers.js';
import LambdaInvoker from '../utils/lambda-invoker.js';
import FileHelpers from '../utils/file-helpers.js';

class VideoCreator {
    constructor() {
        this.lambdaInvoker = new LambdaInvoker();
        this.s3Client = AWSHelpers.getS3Client();
        this.bucketName = AWSHelpers.getBucketName();
    }

    async createVideo(projectConfig) {
        console.log('🎬 Creating Video');
        console.log('='.repeat(50));

        const projectId = projectConfig.projectId || FileHelpers.generateProjectId('video');
        
        console.log(`📁 Project ID: ${projectId}`);
        console.log(`📝 Title: ${projectConfig.title || 'AI Tools Video'}`);
        console.log(`⏱️  Duration: ${projectConfig.duration || 420}s`);

        try {
            // Step 1: Generate script
            console.log('\n📝 Step 1: Generating Script...');
            const scriptResult = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-script-generator-v2',
                'POST',
                '/scripts/generate-enhanced',
                {
                    topicContext: {
                        mainTopic: projectConfig.title || 'AI Tools for Content Creation',
                        expandedTopics: [{
                            subtopic: projectConfig.title || 'AI Tools for Content Creation',
                            relevanceScore: 95,
                            keywords: projectConfig.keywords || ['AI', 'tools', 'content']
                        }]
                    },
                    baseTopic: projectConfig.title || 'AI Tools for Content Creation',
                    targetLength: projectConfig.duration || 420,
                    projectId: projectId
                }
            );

            if (scriptResult.success) {
                console.log('   ✅ Script generated successfully');
            } else {
                console.log('   ⚠️  Script generation failed, using fallback');
            }

            // Step 2: Curate media
            console.log('\n📸 Step 2: Curating Media...');
            const mediaResult = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-media-curator-v2',
                'POST',
                '/media/search',
                {
                    query: (projectConfig.keywords || ['AI', 'tools']).join(' '),
                    mediaCount: 6,
                    quality: '1080p',
                    projectId: projectId
                }
            );

            if (mediaResult.success) {
                console.log('   ✅ Media curated successfully');
            } else {
                console.log('   ⚠️  Media curation failed, using fallback');
            }

            // Step 3: Generate audio (optional)
            console.log('\n🎵 Step 3: Generating Audio...');
            const audioResult = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-audio-generator-v2',
                'POST',
                '/audio/generate',
                {
                    text: projectConfig.narration || 'Welcome to our video about AI tools for content creation.',
                    voiceId: projectConfig.voiceId || 'Joanna',
                    engine: 'standard',
                    outputFormat: 'mp3',
                    projectId: projectId
                }
            );

            if (audioResult.success) {
                console.log('   ✅ Audio generated successfully');
            } else {
                console.log('   ⚠️  Audio generation failed');
            }

            // Step 4: Create video project data
            console.log('\n🎬 Step 4: Creating Video Project...');
            const videoProject = {
                projectId,
                title: projectConfig.title || 'AI Tools for Content Creation',
                description: projectConfig.description || 'A comprehensive guide to AI tools',
                duration: projectConfig.duration || 420,
                script: scriptResult.success ? scriptResult.data : null,
                media: mediaResult.success ? mediaResult.data : null,
                audio: audioResult.success ? audioResult.data : null,
                status: 'ready-for-assembly',
                createdAt: new Date().toISOString(),
                createdBy: 'video-creator'
            };

            // Save project to S3
            const projectKey = `videos/${projectId}/project.json`;
            await AWSHelpers.uploadToS3(projectKey, JSON.stringify(videoProject, null, 2));

            console.log('✅ Video project created and saved to S3');
            console.log(`   📁 S3 Key: ${projectKey}`);

            return {
                success: true,
                projectId,
                projectKey,
                videoProject,
                components: {
                    script: scriptResult.success,
                    media: mediaResult.success,
                    audio: audioResult.success
                }
            };

        } catch (error) {
            console.log(`💥 Video creation failed: ${error.message}`);
            throw error;
        }
    }

    async createFirstVideo() {
        console.log('🎬 Creating First Video - Default Configuration');
        console.log('='.repeat(60));

        const defaultConfig = {
            title: '5 AI Tools That Will Transform Your Content in 2025',
            description: 'Discover the top 5 AI tools for content creation that will revolutionize your workflow',
            keywords: ['AI tools', 'content creation', 'productivity', 'automation', 'ChatGPT', 'Midjourney'],
            duration: 420,
            voiceId: 'Joanna',
            narration: 'Welcome to our comprehensive guide on 5 AI tools that will transform your content creation in 2025. These powerful tools will help you create content 10 times faster.'
        };

        return await this.createVideo(defaultConfig);
    }

    async downloadVideo(videoId) {
        console.log(`📥 Downloading Video: ${videoId}`);
        console.log('='.repeat(50));

        try {
            // List objects in the video project folder
            const objects = await AWSHelpers.listS3Objects(`videos/${videoId}/`);

            if (!objects.Contents || objects.Contents.length === 0) {
                console.log('❌ No video files found');
                return { success: false, error: 'No video files found' };
            }

            console.log('📁 Available files:');
            objects.Contents.forEach(obj => {
                console.log(`   📄 ${obj.Key} (${Math.round(obj.Size / 1024)}KB)`);
            });

            // Look for video files
            const videoFiles = objects.Contents.filter(obj => 
                obj.Key.endsWith('.mp4') || obj.Key.endsWith('.mov') || obj.Key.endsWith('.avi')
            );

            if (videoFiles.length > 0) {
                console.log(`\n🎬 Found ${videoFiles.length} video file(s):`);
                videoFiles.forEach(file => {
                    console.log(`   🎥 ${file.Key} (${Math.round(file.Size / 1024 / 1024)}MB)`);
                });

                console.log('\n📥 Download Instructions:');
                console.log('1. AWS Console: https://s3.console.aws.amazon.com/s3/home?region=us-east-1');
                console.log(`2. Bucket: ${this.bucketName}`);
                console.log(`3. Folder: videos/${videoId}/`);
                console.log('4. Download the video files');

                return {
                    success: true,
                    videoFiles: videoFiles.map(f => f.Key),
                    totalSize: videoFiles.reduce((sum, f) => sum + f.Size, 0)
                };
            } else {
                console.log('⚠️  No video files found, but project data exists');
                console.log('💡 Video may still be processing or needs assembly');

                return {
                    success: false,
                    error: 'No video files found',
                    availableFiles: objects.Contents.map(obj => obj.Key)
                };
            }

        } catch (error) {
            console.log(`💥 Download failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async uploadToYouTube(videoData) {
        console.log('📺 Uploading to YouTube');
        console.log('='.repeat(50));

        try {
            const result = await this.lambdaInvoker.invokeWithHTTP(
                'automated-video-pipeline-youtube-publisher-v2',
                'POST',
                '/youtube/publish',
                {
                    videoId: videoData.projectId,
                    title: videoData.title,
                    description: videoData.description,
                    tags: videoData.keywords || ['AI', 'tools', 'content'],
                    privacy: videoData.privacy || 'public'
                }
            );

            if (result.success) {
                console.log('✅ YouTube upload initiated successfully');
                return result;
            } else {
                console.log('❌ YouTube upload failed');
                console.log(`   Error: ${result.error || 'Unknown error'}`);
                return result;
            }

        } catch (error) {
            console.log(`💥 YouTube upload failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async listProjects() {
        console.log('📁 Listing Video Projects');
        console.log('='.repeat(50));

        try {
            const objects = await AWSHelpers.listS3Objects('videos/');
            
            if (!objects.Contents || objects.Contents.length === 0) {
                console.log('📂 No video projects found');
                return { success: true, projects: [] };
            }

            // Extract project IDs from S3 keys
            const projectIds = new Set();
            objects.Contents.forEach(obj => {
                const match = obj.Key.match(/^videos\/([^\/]+)\//);
                if (match) {
                    projectIds.add(match[1]);
                }
            });

            const projects = Array.from(projectIds);
            
            console.log(`📁 Found ${projects.length} video projects:`);
            projects.forEach(projectId => {
                console.log(`   📁 ${projectId}`);
            });

            return { success: true, projects };

        } catch (error) {
            console.log(`💥 Failed to list projects: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default VideoCreator;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const creator = new VideoCreator();
    
    const command = process.argv[2] || 'create-first';
    const arg = process.argv[3];
    
    switch (command) {
        case 'create-first':
            creator.createFirstVideo().then(result => {
                console.log('\n🎉 First video creation completed!');
                console.log(`📁 Project: ${result.projectId}`);
            });
            break;
        case 'download':
            if (!arg) {
                console.log('Usage: node video-creator.js download <video-id>');
                break;
            }
            creator.downloadVideo(arg);
            break;
        case 'list':
            creator.listProjects();
            break;
        default:
            console.log('Usage: node video-creator.js [create-first|download <id>|list]');
    }
}