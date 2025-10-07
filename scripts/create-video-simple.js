#!/usr/bin/env node

/**
 * Simple Video Creation Script
 * Creates a video using the first topic from our synced topics
 */

const AWS = require('aws-sdk');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region: REGION });

const lambda = new AWS.Lambda();

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get topics from the topic management function
 */
async function getTopics() {
    try {
        log('📋 Getting topics from database...', 'blue');
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-topic-management-v2',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                pathParameters: null,
                queryStringParameters: { limit: '1' }
            })
        }).promise();
        
        const response = JSON.parse(result.Payload);
        const body = JSON.parse(response.body);
        
        if (body.topics && body.topics.length > 0) {
            log(`✅ Found ${body.topics.length} topics`, 'green');
            return body.topics[0]; // Return first topic
        } else {
            throw new Error('No topics found. Please sync your spreadsheet first.');
        }
        
    } catch (error) {
        log(`❌ Failed to get topics: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Generate script for the topic
 */
async function generateScript(topic, projectId) {
    try {
        log(`🤖 Generating script for: ${topic.topic}`, 'blue');
        
        const payload = {
            httpMethod: 'POST',
            path: '/scripts/generate',
            body: JSON.stringify({
                topic: topic.topic,
                title: topic.topic,
                targetLength: 480, // 8 minutes
                style: 'engaging_educational',
                targetAudience: 'general',
                projectId: projectId // Pass project ID for organized storage
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-script-generator-v2',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            log(`✅ Script generated successfully!`, 'green');
            log(`📝 Script ID: ${body.script.scriptId}`, 'blue');
            return body.script;
        } else {
            throw new Error(`Script generation failed: ${response.body}`);
        }
        
    } catch (error) {
        log(`❌ Failed to generate script: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Generate audio for the script
 */
async function generateAudio(script, projectId) {
    try {
        log(`🎙️ Generating audio narration...`, 'blue');
        
        // Extract the full script text from the generated script
        const scriptText = script.scenes && script.scenes.length > 0 
            ? script.scenes.map(scene => scene.script).join('\n\n')
            : script.content || script.title || 'Default script content';
        
        const payload = {
            httpMethod: 'POST',
            path: '/audio/generate-from-script',
            body: JSON.stringify({
                scriptId: script.scriptId,
                voiceId: 'Ruth',
                engine: 'generative',
                outputFormat: 'mp3',
                projectId: projectId, // Pass project ID for organized storage
                generateByScene: true, // Generate audio for each scene separately
                audioOptions: {
                    languageCode: 'en-US'
                }
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-audio-generator-v2',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            log(`✅ Audio generated successfully!`, 'green');
            
            // Handle scene-by-scene audio generation response
            if (body.masterAudio && body.sceneAudios) {
                log(`🎵 Master Audio ID: ${body.masterAudio.audioId}`, 'blue');
                log(`🎬 Generated ${body.totalScenes} scene audio files`, 'blue');
                log(`⏱️ Total Duration: ${Math.floor(body.totalDuration)}s`, 'blue');
                return body.masterAudio;
            } else {
                log(`🎵 Audio ID: ${body.audio.audioId}`, 'blue');
                return body.audio;
            }
        } else {
            throw new Error(`Audio generation failed: ${response.body}`);
        }
        
    } catch (error) {
        log(`❌ Failed to generate audio: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Curate relevant media with AI-powered analysis
 */
async function curateMedia(topic, script, projectId) {
    try {
        log(`🖼️ Curating media with AI relevance analysis...`, 'blue');
        
        // Extract script text for context
        const scriptText = script.scenes && script.scenes.length > 0 
            ? script.scenes.map(scene => scene.script).join(' ')
            : script.title || topic.topic;
        
        const payload = {
            httpMethod: 'POST',
            path: '/media/curate',
            body: JSON.stringify({
                topic: topic.topic,
                script: scriptText,
                projectId: projectId, // Pass project ID for organized file structure
                mediaRequirements: {
                    images: Math.min(20, Math.ceil(script.estimatedDuration / 15)), // ~1 image per 15 seconds, max 20
                    videos: Math.min(6, Math.ceil(script.estimatedDuration / 60)), // ~1 video per minute, max 6
                    minRelevanceScore: 70,
                    requireVisualAnalysis: true
                },
                sceneContext: 'Investment education for beginners, focusing on mobile apps and financial planning'
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-media-curator-v2',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            log(`✅ AI media curation completed!`, 'green');
            log(`🎯 ${body.summary.selected} items selected from ${body.summary.totalFound} found`, 'blue');
            log(`🤖 Average AI relevance score: ${body.summary.averageRelevanceScore?.toFixed(1)}%`, 'blue');
            return body;
        } else {
            throw new Error(`AI media curation failed: ${response.body}`);
        }
        
    } catch (error) {
        log(`❌ Failed to curate media: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Assemble video with intelligent media sequencing
 */
async function assembleVideo(projectId, script, audio, media) {
    try {
        log(`🎬 Assembling dynamic video...`, 'blue');
        
        const payload = {
            httpMethod: 'POST',
            path: '/video/assemble-project',
            body: JSON.stringify({
                projectId: projectId,
                scriptId: script.scriptId,
                audioId: audio.audioId,
                mediaAssets: media.media || [],
                videoOptions: {
                    resolution: '1920x1080',
                    fps: 30,
                    bitrate: '8000k',
                    preset: 'medium',
                    crf: 23
                }
            })
        };
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-video-assembler-v2',
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            log(`✅ Video assembly initiated!`, 'green');
            log(`🎯 ${body.video?.components?.segmentCount || 0} dynamic segments created`, 'blue');
            return body.video;
        } else {
            throw new Error(`Video assembly failed: ${response.body}`);
        }
        
    } catch (error) {
        log(`❌ Failed to assemble video: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Main function to create a video
 */
async function createVideo() {
    try {
        log('🎬 Starting Video Creation Process', 'green');
        log('=====================================', 'green');
        
        // Generate a readable project ID with date stamp
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const projectId = `${dateStr}_${timeStr}_investing-beginners-usa`;
        log(`📁 Project ID: ${projectId}`, 'blue');
        
        // Step 1: Get a topic
        const topic = await getTopics();
        log(`🎯 Selected topic: "${topic.topic}"`, 'yellow');
        
        // Step 2: Generate script
        const script = await generateScript(topic, projectId);
        
        // Step 3: Generate audio
        const audio = await generateAudio(script, projectId);
        
        // Step 4: Curate relevant media with AI analysis
        const media = await curateMedia(topic, script, projectId);
        
        // Step 5: Assemble dynamic video with FFmpeg
        const video = await assembleVideo(projectId, script, audio, media);
        
        log('', 'reset');
        log('🎉 Video Creation Process Completed!', 'green');
        log('====================================', 'green');
        log(`📁 Project ID: ${projectId}`, 'blue');
        log(`📝 Script: ${script.scriptId}`, 'blue');
        log(`🎵 Audio: ${audio.audioId}`, 'blue');
        log(`🖼️ Media Assets: ${media.summary?.successfullySaved || 0} items saved to S3`, 'blue');
        log(`🎬 Video Assembly: ${video?.components?.segmentCount || 0} dynamic segments`, 'blue');
        log(`⏱️ Estimated Duration: ${script.estimatedDuration} seconds`, 'blue');
        log(`📊 Word Count: ${script.wordCount} words`, 'blue');
        
        log('', 'reset');
        log('📋 Production Pipeline:', 'yellow');
        log('1. ✅ Script generated with engaging content', 'green');
        log('2. ✅ Audio narration created with generative voice (Ruth)', 'green');
        log('3. ✅ Media assets curated with AI relevance analysis', 'green');
        log('4. ✅ Video assembled with dynamic sequencing & effects', 'green');
        log('5. 🔄 YouTube upload with SEO optimization - Coming next', 'yellow');
        
        return {
            projectId,
            topic,
            script,
            audio,
            media,
            video,
            status: 'video_assembled'
        };
        
    } catch (error) {
        log(`❌ Video creation failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createVideo();
}

module.exports = { createVideo };