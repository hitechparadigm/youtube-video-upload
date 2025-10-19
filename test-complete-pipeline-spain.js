#!/usr/bin/env node

/**
 * Complete End-to-End Pipeline Test - Travel to Spain
 * Tests all 7 AI agents in sequence on AWS
 */

const https = require('https');
const {
    URL
} = require('url');

// Configuration
const CONFIG = {
    API_URL: 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod',
    API_KEY: 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk',
    TIMEOUT: 300000, // 5 minutes for longer operations
    TOPIC: 'Travel to Spain'
};

/**
 * Make authenticated API call with proper URL construction
 */
async function callAPI(endpoint, method = 'GET', data = null, timeout = CONFIG.TIMEOUT) {
    return new Promise((resolve) => {
        // Fix URL construction to preserve API Gateway stage
        const baseUrl = CONFIG.API_URL.endsWith('/') ? CONFIG.API_URL : CONFIG.API_URL + '/';
        const fullUrl = baseUrl + (endpoint.startsWith('/') ? endpoint.substring(1) : endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            timeout: timeout,
            headers: {
                'x-api-key': CONFIG.API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'E2E-Pipeline-Test/1.0'
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

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                statusCode: 0,
                error: 'Request timeout',
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
 * Wait for a specified time
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test the complete pipeline end-to-end
 */
async function testCompletePipeline() {
    console.log('🎬 Complete End-to-End Pipeline Test');
    console.log('====================================');
    console.log(`Topic: "${CONFIG.TOPIC}"`);
    console.log(`API URL: ${CONFIG.API_URL}`);
    console.log(`API Key: ${CONFIG.API_KEY.substring(0, 8)}...`);
    console.log('');

    let projectId = null;
    const results = {
        topicManagement: null,
        scriptGenerator: null,
        mediaCurator: null,
        audioGenerator: null,
        manifestBuilder: null,
        videoAssembler: null,
        youtubePublisher: null
    };

    try {
        // Step 1: Topic Management
        console.log('🎯 Step 1: Topic Management');
        console.log('---------------------------');
        const startTime = Date.now();

        const topicResult = await callAPI('/topics', 'POST', {
            topic: CONFIG.TOPIC,
            targetAudience: 'travelers',
            videoDuration: 300
        });

        const topicDuration = Date.now() - startTime;
        console.log(`⏱️  Duration: ${topicDuration}ms`);
        console.log(`📊 Status: ${topicResult.statusCode}`);

        if (!topicResult.success) {
            console.log(`❌ Topic Management failed: ${topicResult.error}`);
            results.topicManagement = {
                success: false,
                error: topicResult.error
            };
            return results;
        }

        projectId = topicResult.data.projectId;
        console.log(`✅ Topic Management successful!`);
        console.log(`📋 Project ID: ${projectId}`);
        console.log(`📝 Expanded Topics: ${topicResult.data.expandedTopics?.length || 0}`);
        results.topicManagement = {
            success: true,
            projectId,
            duration: topicDuration
        };

        // Wait a bit before next step
        await wait(2000);

        // Step 2: Script Generator
        console.log('\n📝 Step 2: Script Generator');
        console.log('---------------------------');
        const scriptStartTime = Date.now();

        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            scriptOptions: {
                targetLength: 300,
                videoStyle: 'engaging',
                targetAudience: 'travelers'
            }
        });

        const scriptDuration = Date.now() - scriptStartTime;
        console.log(`⏱️  Duration: ${scriptDuration}ms`);
        console.log(`📊 Status: ${scriptResult.statusCode}`);

        if (!scriptResult.success) {
            console.log(`❌ Script Generator failed: ${scriptResult.error}`);
            results.scriptGenerator = {
                success: false,
                error: scriptResult.error
            };
            return results;
        }

        console.log(`✅ Script Generator successful!`);
        console.log(`🎬 Total Scenes: ${scriptResult.data.totalScenes}`);
        console.log(`⏱️  Total Duration: ${scriptResult.data.totalDuration}s`);
        results.scriptGenerator = {
            success: true,
            scenes: scriptResult.data.totalScenes,
            duration: scriptDuration
        };

        // Wait before next step
        await wait(2000);

        // Step 3: Media Curator
        console.log('\n🖼️  Step 3: Media Curator');
        console.log('-------------------------');
        const mediaStartTime = Date.now();

        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            mediaOptions: {
                imageQuality: 'high',
                visualStyle: 'travel',
                safeSearch: true
            }
        }, 120000); // 2 minutes timeout for media curation

        const mediaDuration = Date.now() - mediaStartTime;
        console.log(`⏱️  Duration: ${mediaDuration}ms`);
        console.log(`📊 Status: ${mediaResult.statusCode}`);

        if (!mediaResult.success) {
            console.log(`❌ Media Curator failed: ${mediaResult.error}`);
            results.mediaCurator = {
                success: false,
                error: mediaResult.error
            };
            // Continue with pipeline even if media curation fails
        } else {
            console.log(`✅ Media Curator successful!`);
            console.log(`🖼️  Images Curated: ${mediaResult.data.totalImages || 'Unknown'}`);
            results.mediaCurator = {
                success: true,
                images: mediaResult.data.totalImages,
                duration: mediaDuration
            };
        }

        // Wait before next step
        await wait(3000);

        // Step 4: Audio Generator
        console.log('\n🔊 Step 4: Audio Generator');
        console.log('--------------------------');
        const audioStartTime = Date.now();

        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId,
            audioOptions: {
                voice: 'neural',
                speed: 'normal',
                language: 'en-US'
            }
        }, 180000); // 3 minutes timeout for audio generation

        const audioDuration = Date.now() - audioStartTime;
        console.log(`⏱️  Duration: ${audioDuration}ms`);
        console.log(`📊 Status: ${audioResult.statusCode}`);

        if (!audioResult.success) {
            console.log(`❌ Audio Generator failed: ${audioResult.error}`);
            results.audioGenerator = {
                success: false,
                error: audioResult.error
            };
            // Continue with pipeline
        } else {
            console.log(`✅ Audio Generator successful!`);
            console.log(`🔊 Audio Files: ${audioResult.data.audioFiles?.length || 'Unknown'}`);
            results.audioGenerator = {
                success: true,
                audioFiles: audioResult.data.audioFiles ? audioResult.data.audioFiles.length : 0,
                duration: audioDuration
            };
        }

        // Wait before next step
        await wait(2000);

        // Step 5: Manifest Builder
        console.log('\n📋 Step 5: Manifest Builder');
        console.log('---------------------------');
        const manifestStartTime = Date.now();

        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            manifestOptions: {
                qualityCheck: true,
                validateAssets: true
            }
        });

        const manifestDuration = Date.now() - manifestStartTime;
        console.log(`⏱️  Duration: ${manifestDuration}ms`);
        console.log(`📊 Status: ${manifestResult.statusCode}`);

        if (!manifestResult.success) {
            console.log(`❌ Manifest Builder failed: ${manifestResult.error}`);
            results.manifestBuilder = {
                success: false,
                error: manifestResult.error
            };
            return results;
        }

        console.log(`✅ Manifest Builder successful!`);
        console.log(`📊 Quality Score: ${manifestResult.data.qualityScore || 'Unknown'}`);
        results.manifestBuilder = {
            success: true,
            qualityScore: manifestResult.data.qualityScore,
            duration: manifestDuration
        };

        // Wait before next step
        await wait(2000);

        // Step 6: Video Assembler
        console.log('\n🎥 Step 6: Video Assembler');
        console.log('--------------------------');
        const videoStartTime = Date.now();

        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            videoOptions: {
                resolution: '1080p',
                format: 'mp4',
                quality: 'high'
            }
        }, 300000); // 5 minutes timeout for video assembly

        const videoDuration = Date.now() - videoStartTime;
        console.log(`⏱️  Duration: ${videoDuration}ms`);
        console.log(`📊 Status: ${videoResult.statusCode}`);

        if (!videoResult.success) {
            console.log(`❌ Video Assembler failed: ${videoResult.error}`);
            results.videoAssembler = {
                success: false,
                error: videoResult.error
            };
            return results;
        }

        console.log(`✅ Video Assembler successful!`);
        console.log(`🎥 Video File: ${videoResult.data.videoFile || 'Generated'}`);
        results.videoAssembler = {
            success: true,
            videoFile: videoResult.data.videoFile,
            duration: videoDuration
        };

        // Wait before final step
        await wait(2000);

        // Step 7: YouTube Publisher
        console.log('\n📺 Step 7: YouTube Publisher');
        console.log('----------------------------');
        const youtubeStartTime = Date.now();

        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            publishOptions: {
                title: `${CONFIG.TOPIC} - AI Generated Travel Guide`,
                description: 'Complete travel guide generated by AI',
                tags: ['travel', 'spain', 'ai', 'guide'],
                privacy: 'public'
            }
        }, 180000); // 3 minutes timeout for YouTube publishing

        const youtubeDuration = Date.now() - youtubeStartTime;
        console.log(`⏱️  Duration: ${youtubeDuration}ms`);
        console.log(`📊 Status: ${youtubeResult.statusCode}`);

        if (!youtubeResult.success) {
            console.log(`❌ YouTube Publisher failed: ${youtubeResult.error}`);
            results.youtubePublisher = {
                success: false,
                error: youtubeResult.error
            };
        } else {
            console.log(`✅ YouTube Publisher successful!`);
            console.log(`📺 Video URL: ${youtubeResult.data.videoUrl || 'Published'}`);
            results.youtubePublisher = {
                success: true,
                videoUrl: youtubeResult.data.videoUrl,
                duration: youtubeDuration
            };
        }

    } catch (error) {
        console.log(`❌ Pipeline error: ${error.message}`);
    }

    return results;
}

/**
 * Display final results
 */
function displayResults(results) {
    console.log('\n📊 Pipeline Results Summary');
    console.log('============================');

    const steps = [{
            name: 'Topic Management',
            key: 'topicManagement',
            icon: '🎯'
        },
        {
            name: 'Script Generator',
            key: 'scriptGenerator',
            icon: '📝'
        },
        {
            name: 'Media Curator',
            key: 'mediaCurator',
            icon: '🖼️'
        },
        {
            name: 'Audio Generator',
            key: 'audioGenerator',
            icon: '🔊'
        },
        {
            name: 'Manifest Builder',
            key: 'manifestBuilder',
            icon: '📋'
        },
        {
            name: 'Video Assembler',
            key: 'videoAssembler',
            icon: '🎥'
        },
        {
            name: 'YouTube Publisher',
            key: 'youtubePublisher',
            icon: '📺'
        }
    ];

    let successCount = 0;
    let totalDuration = 0;

    steps.forEach((step, index) => {
        const result = results[step.key];
        const stepNum = index + 1;

        if (result === null) {
            console.log(`${step.icon} ${stepNum}. ${step.name}: ⏭️  SKIPPED`);
        } else if (result.success) {
            console.log(`${step.icon} ${stepNum}. ${step.name}: ✅ SUCCESS (${result.duration}ms)`);
            successCount++;
            totalDuration += result.duration || 0;
        } else {
            console.log(`${step.icon} ${stepNum}. ${step.name}: ❌ FAILED - ${result.error}`);
        }
    });

    console.log('\n📈 Overall Statistics');
    console.log('--------------------');
    console.log(`✅ Successful Steps: ${successCount}/7`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📊 Success Rate: ${Math.round((successCount / 7) * 100)}%`);

    if (results.topicManagement && results.topicManagement.projectId) {
        console.log(`📋 Project ID: ${results.topicManagement.projectId}`);
    }

    if (results.youtubePublisher && results.youtubePublisher.videoUrl) {
        console.log(`📺 YouTube Video: ${results.youtubePublisher.videoUrl}`);
    }

    console.log('\n🎯 Pipeline Status');
    console.log('------------------');
    if (successCount === 7) {
        console.log('🎉 COMPLETE SUCCESS - All 7 AI agents working perfectly!');
    } else if (successCount >= 5) {
        console.log('✅ MOSTLY SUCCESSFUL - Core pipeline working with minor issues');
    } else if (successCount >= 3) {
        console.log('⚠️ PARTIAL SUCCESS - Some components need attention');
    } else {
        console.log('❌ PIPELINE ISSUES - Multiple components need fixing');
    }
}

// Main execution
if (require.main === module) {
    console.log('🚀 Starting Complete End-to-End Pipeline Test');
    console.log('===============================================');
    console.log('This will test all 7 AI agents in sequence with "Travel to Spain" topic');
    console.log('Expected duration: 5-10 minutes depending on processing times');
    console.log('');

    testCompletePipeline()
        .then(results => {
            displayResults(results);
        })
        .catch(error => {
            console.error('❌ Pipeline test failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testCompletePipeline,
    displayResults
};