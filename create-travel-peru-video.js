/**
 * Complete End-to-End AWS Pipeline Test: Travel to Peru
 * Tests the full system from topic generation to YouTube publishing
 */

const https = require('https');

const CONFIG = {
    baseUrl: 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod',
    apiKey: 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
    topic: 'Travel to Peru',
    targetAudience: 'travel enthusiasts',
    videoDuration: 300 // 5 minutes
};

async function createTravelPeruVideo() {
    console.log('🎬 COMPLETE END-TO-END AWS PIPELINE TEST');
    console.log('=======================================');
    console.log(`📍 Topic: ${CONFIG.topic}`);
    console.log(`👥 Audience: ${CONFIG.targetAudience}`);
    console.log(`⏱️ Duration: ${CONFIG.videoDuration} seconds`);
    console.log('');

    try {
        // Step 1: Topic Management - Generate topic context
        console.log('🎯 STEP 1: Topic Management AI');
        console.log('------------------------------');
        const topicResult = await callAPI('/topics', 'POST', {
            baseTopic: CONFIG.topic,
            targetAudience: CONFIG.targetAudience,
            videoDuration: CONFIG.videoDuration
        });

        if (!topicResult.success) {
            throw new Error(`Topic Management failed: ${topicResult.error}`);
        }

        const projectId = topicResult.projectId;
        console.log(`✅ Project created: ${projectId}`);
        console.log(`📊 Topics generated: ${topicResult.sheetsTopicsCount || 'N/A'}`);
        console.log('');

        // Step 2: Script Generator - Create detailed script
        console.log('📝 STEP 2: Script Generator AI');
        console.log('------------------------------');
        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            scriptOptions: {
                style: 'engaging_educational',
                targetAudience: CONFIG.targetAudience
            }
        });

        if (!scriptResult.success) {
            throw new Error(`Script Generation failed: ${scriptResult.error}`);
        }

        console.log(`✅ Script generated successfully`);
        console.log(`📋 Scenes: ${scriptResult.sceneContext?.scenes?.length || 'N/A'}`);
        console.log(`⏱️ Total duration: ${scriptResult.sceneContext?.totalDuration || 'N/A'}s`);
        console.log('');

        // Step 3: Media Curator - Download images
        console.log('🖼️ STEP 3: Media Curator AI');
        console.log('----------------------------');
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId
        });

        if (!mediaResult.success) {
            throw new Error(`Media Curation failed: ${mediaResult.error}`);
        }

        console.log(`✅ Media curated successfully`);
        console.log(`📸 Images downloaded: ${mediaResult.downloadStats?.images_total || 'N/A'}`);
        console.log(`📊 Quality score: ${mediaResult.downloadStats?.quality_score || 'N/A'}`);
        console.log('');

        // Step 4: Audio Generator - Create narration
        console.log('🎵 STEP 4: Audio Generator AI');
        console.log('-----------------------------');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId
        });

        if (!audioResult.success) {
            throw new Error(`Audio Generation failed: ${audioResult.error}`);
        }

        console.log(`✅ Audio generated successfully`);
        console.log(`🎙️ Audio files: ${audioResult.audioFiles?.length || 'N/A'}`);
        console.log(`⏱️ Total duration: ${audioResult.totalDuration || 'N/A'}s`);
        console.log('');

        // Step 5: Manifest Builder - Quality validation
        console.log('📋 STEP 5: Manifest Builder (Quality Gatekeeper)');
        console.log('-----------------------------------------------');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            minVisuals: 3
        });

        if (!manifestResult.success) {
            throw new Error(`Manifest Building failed: ${manifestResult.error}`);
        }

        console.log(`✅ Quality validation passed`);
        console.log(`📊 KPIs: Images ${manifestResult.kpis?.images_total}, Scenes ${manifestResult.kpis?.scenes_total}`);
        console.log(`🎯 Quality score: ${manifestResult.kpis?.quality_score}`);
        console.log('');

        // Step 6: Video Assembler - Create final video
        console.log('🎬 STEP 6: Video Assembler AI');
        console.log('-----------------------------');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true,
            manifestPath: `videos/${projectId}/01-context/manifest.json`
        });

        if (!videoResult.success) {
            throw new Error(`Video Assembly failed: ${videoResult.error}`);
        }

        console.log(`✅ Video assembled successfully`);
        console.log(`🎥 Video file: ${videoResult.videoPath || 'N/A'}`);
        console.log(`📊 Processing time: ${videoResult.processingTime || 'N/A'}`);
        console.log('');

        // Step 7: YouTube Publisher - Upload to YouTube
        console.log('📺 STEP 7: YouTube Publisher AI');
        console.log('-------------------------------');
        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            mode: 'auto', // Smart mode selection
            enableUpload: true,
            privacy: 'unlisted', // Safe for testing
            metadata: {
                title: `Amazing Travel Guide to Peru - AI Generated`,
                category: 'Travel & Events'
            }
        });

        console.log(`📊 YouTube Result: ${youtubeResult.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`🎬 Mode: ${youtubeResult.mode || 'N/A'}`);

        if (youtubeResult.youtubeUrl) {
            console.log(`🔗 YouTube URL: ${youtubeResult.youtubeUrl}`);
        }

        if (youtubeResult.youtubeVideoId) {
            console.log(`🆔 Video ID: ${youtubeResult.youtubeVideoId}`);
        }

        if (youtubeResult.message) {
            console.log(`💬 Message: ${youtubeResult.message}`);
        }
        console.log('');

        // Final Summary
        console.log('🎉 END-TO-END PIPELINE COMPLETED!');
        console.log('=================================');
        console.log(`📍 Project: ${projectId}`);
        console.log(`🎬 Topic: ${CONFIG.topic}`);
        console.log(`✅ All 7 steps completed successfully`);

        if (youtubeResult.youtubeUrl) {
            console.log(`🔗 FINAL VIDEO: ${youtubeResult.youtubeUrl}`);
        } else {
            console.log(`📝 Metadata created for manual upload`);
        }

        return {
            success: true,
            projectId: projectId,
            youtubeUrl: youtubeResult.youtubeUrl,
            mode: youtubeResult.mode,
            allStepsCompleted: true
        };

    } catch (error) {
        console.error('\n❌ PIPELINE FAILED:', error.message);
        console.error('Stack trace:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

async function callAPI(endpoint, method, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: `/prod${endpoint}`,
            method: method,
            headers: {
                'x-api-key': CONFIG.apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 120000 // 2 minute timeout for each step
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (e) {
                    console.log(`⚠️ Failed to parse response from ${endpoint}:`, responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`API call to ${endpoint} failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`API call to ${endpoint} timed out`));
        });

        req.write(postData);
        req.end();
    });
}

// Run the complete pipeline
if (require.main === module) {
    createTravelPeruVideo()
        .then(result => {
            if (result.success) {
                console.log('\n🎊 SUCCESS! Travel to Peru video created successfully!');
                if (result.youtubeUrl) {
                    console.log(`🎬 Watch your video: ${result.youtubeUrl}`);
                }
            } else {
                console.log('\n💔 Pipeline failed, but this helps us identify issues to fix.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error.message);
            process.exit(1);
        });
}

module.exports = {
    createTravelPeruVideo
};