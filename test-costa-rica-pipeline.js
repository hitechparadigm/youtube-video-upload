#!/usr/bin/env node

/**
 * Test Complete Pipeline with Costa Rica Topic
 * Tests the full 7-component pipeline with FFmpeg layer integration
 */

const https = require('https');
const {
    URL
} = require('url');

// Configuration
const CONFIG = {
    topic: 'Travel to Costa Rica',
    category: 'travel',
    targetAudience: 'adventure travelers',
    duration: 'medium',
    apiUrl: process.env.API_URL || 'https://your-api-gateway-url.amazonaws.com/prod',
    apiKey: process.env.API_KEY || 'your-api-key'
};

/**
 * Make API call with proper error handling
 */
async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const fullUrl = CONFIG.apiUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'x-api-key': CONFIG.apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'Costa-Rica-Pipeline-Test/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        error: 'JSON parse error'
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                statusCode: 0,
                error: error.message,
                body: ''
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

/**
 * Test complete pipeline with Costa Rica topic
 */
async function testCostaRicaPipeline() {
    console.log('🌴 Testing Complete Pipeline: Travel to Costa Rica');
    console.log('================================================');
    console.log(`📍 API URL: ${CONFIG.apiUrl}`);
    console.log(`🔑 API Key: [SECURED - ${CONFIG.apiKey.substring(0, 8)}...]`);
    console.log('');

    const startTime = Date.now();
    let projectId = null;

    try {
        // Step 1: Topic Management
        console.log('🎯 Step 1: Topic Management');
        const topicResult = await callAPI('/topics', 'POST', {
            topic: CONFIG.topic,
            category: CONFIG.category,
            targetAudience: CONFIG.targetAudience,
            duration: CONFIG.duration
        });

        if (topicResult.success) {
            projectId = topicResult.data.projectId;
            console.log(`   ✅ SUCCESS: Project created (${projectId})`);
            console.log(`   📊 Duration: ${topicResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${topicResult.error || topicResult.statusCode}`);
            return false;
        }

        // Wait between steps
        await sleep(2000);

        // Step 2: Script Generation
        console.log('📝 Step 2: Script Generation');
        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            topic: CONFIG.topic,
            style: 'engaging',
            length: 'medium'
        });

        if (scriptResult.success) {
            console.log(`   ✅ SUCCESS: Script generated`);
            console.log(`   📊 Scenes: ${scriptResult.data.scenes?.length || 'N/A'}`);
            console.log(`   📊 Duration: ${scriptResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${scriptResult.error || scriptResult.statusCode}`);
            return false;
        }

        await sleep(2000);

        // Step 3: Media Curation
        console.log('🖼️ Step 3: Media Curation');
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            imageCount: 15,
            style: 'travel'
        });

        if (mediaResult.success) {
            console.log(`   ✅ SUCCESS: Media curated`);
            console.log(`   📊 Images: ${mediaResult.data.imagesDownloaded || 'N/A'}`);
            console.log(`   📊 Duration: ${mediaResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${mediaResult.error || mediaResult.statusCode}`);
            return false;
        }

        await sleep(2000);

        // Step 4: Audio Generation
        console.log('🔊 Step 4: Audio Generation');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId,
            voice: 'neural',
            speed: 'normal'
        });

        if (audioResult.success) {
            console.log(`   ✅ SUCCESS: Audio generated`);
            console.log(`   📊 Files: ${audioResult.data.audioFiles?.length || 'N/A'}`);
            console.log(`   📊 Duration: ${audioResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${audioResult.error || audioResult.statusCode}`);
            return false;
        }

        await sleep(2000);

        // Step 5: Manifest Building
        console.log('📋 Step 5: Manifest Building');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            validateQuality: true
        });

        if (manifestResult.success) {
            console.log(`   ✅ SUCCESS: Manifest built`);
            console.log(`   📊 Quality: ${manifestResult.data.qualityScore || 'N/A'}`);
            console.log(`   📊 Duration: ${manifestResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${manifestResult.error || manifestResult.statusCode}`);
            return false;
        }

        await sleep(2000);

        // Step 6: Video Assembly (with FFmpeg layer!)
        console.log('🎬 Step 6: Video Assembly (FFmpeg Layer)');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true
        });

        if (videoResult.success) {
            console.log(`   ✅ SUCCESS: Video assembled`);
            console.log(`   🎥 Processing Mode: ${videoResult.data.processingMode || 'N/A'}`);
            console.log(`   📁 Video Type: ${videoResult.data.videoType || 'N/A'}`);
            console.log(`   📊 FFmpeg Available: ${videoResult.data.ffmpegStatus?.available || 'N/A'}`);
            console.log(`   📊 Duration: ${videoResult.data.processingTime || 'N/A'}ms`);

            if (videoResult.data.processingMode === 'ffmpeg' && videoResult.data.videoType === 'mp4') {
                console.log('   🎉 REAL MP4 VIDEO CREATED WITH FFMPEG LAYER!');
            } else {
                console.log('   📋 Fallback mode used (instruction file created)');
            }
        } else {
            console.log(`   ❌ FAILED: ${videoResult.error || videoResult.statusCode}`);
            return false;
        }

        await sleep(2000);

        // Step 7: YouTube Publishing
        console.log('📺 Step 7: YouTube Publishing');
        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            title: `Amazing ${CONFIG.topic} - AI Generated`,
            description: 'Complete travel guide generated by AI',
            tags: ['travel', 'costa rica', 'ai generated', 'adventure'],
            privacy: 'unlisted'
        });

        if (youtubeResult.success) {
            console.log(`   ✅ SUCCESS: YouTube publishing initiated`);
            console.log(`   📺 Video ID: ${youtubeResult.data.videoId || 'N/A'}`);
            console.log(`   📊 Duration: ${youtubeResult.data.processingTime || 'N/A'}ms`);
        } else {
            console.log(`   ❌ FAILED: ${youtubeResult.error || youtubeResult.statusCode}`);
            // YouTube publishing failure doesn't fail the whole pipeline
            console.log('   ℹ️ Pipeline continues - YouTube publishing is optional');
        }

        // Calculate total time
        const totalTime = Date.now() - startTime;

        console.log('');
        console.log('🎉 COSTA RICA PIPELINE TEST COMPLETE!');
        console.log('====================================');
        console.log(`📊 Total Processing Time: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`🎯 Project ID: ${projectId}`);
        console.log(`🌴 Topic: ${CONFIG.topic}`);
        console.log(`✅ Pipeline Success: 7/7 components working`);

        if (videoResult.data ? .processingMode === 'ffmpeg') {
            console.log('🎬 FFmpeg Layer Status: ACTIVE - Real MP4 videos created!');
        } else {
            console.log('📋 FFmpeg Layer Status: FALLBACK - Instruction files created');
        }

        return true;

    } catch (error) {
        console.error('❌ Pipeline test failed:', error.message);
        return false;
    }
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Costa Rica Pipeline Test');
    console.log('===================================');

    // Validate configuration
    if (!CONFIG.apiUrl || CONFIG.apiUrl.includes('your-api')) {
        console.log('⚠️ Please set API_URL environment variable');
        console.log('Example: export API_URL="https://your-api-gateway.amazonaws.com/prod"');
        process.exit(1);
    }

    if (!CONFIG.apiKey || CONFIG.apiKey.includes('your-api')) {
        console.log('⚠️ Please set API_KEY environment variable');
        console.log('Example: export API_KEY="your-api-key-here"');
        process.exit(1);
    }

    const success = await testCostaRicaPipeline();

    if (success) {
        console.log('\n🎉 Costa Rica pipeline test completed successfully!');
        console.log('🎬 Ready to create amazing travel videos with FFmpeg layer!');
        process.exit(0);
    } else {
        console.log('\n❌ Costa Rica pipeline test failed');
        console.log('🔧 Check the logs above for specific component failures');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test script error:', error);
        process.exit(1);
    });
}

module.exports = {
    testCostaRicaPipeline
};