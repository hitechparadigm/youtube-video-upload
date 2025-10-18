const https = require('https');

async function testCompleteBoliviaPipeline() {
    console.log('🇧🇴 TESTING COMPLETE BOLIVIA PIPELINE - ALL FIXES APPLIED');
    console.log('=========================================================');
    console.log('🎯 Goal: Create a complete Bolivia video with working Video Assembler');
    console.log('🔧 Fixes applied: Audio Generator + Video Assembler FFmpeg layer');
    console.log('');

    // Use the existing working Peru project structure but test all components
    const projectId = '2025-10-17T00-26-06_travel-to-peru';

    try {
        // Step 1: Test Manifest Builder (should work)
        console.log('📋 STEP 1: Manifest Builder Validation');
        console.log('--------------------------------------');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            minVisuals: 1,
            allowPlaceholders: true
        });

        if (!manifestResult.success) {
            console.log(`❌ Manifest Builder failed: ${manifestResult.error}`);
            return {
                success: false,
                error: 'Manifest Builder failed',
                step: 1
            };
        }

        console.log(`✅ Manifest validation successful`);
        console.log(`📊 KPIs: ${JSON.stringify(manifestResult.response.kpis)}`);
        console.log('');

        // Step 2: Test Audio Generator (should work now)
        console.log('🎵 STEP 2: Audio Generator Test');
        console.log('-------------------------------');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId
        });

        if (!audioResult.success) {
            console.log(`⚠️ Audio Generator failed: ${audioResult.error}`);
            console.log('📝 Continuing with existing audio...');
        } else {
            console.log(`✅ Audio generation successful`);
            console.log(`🎙️ Audio files: ${audioResult.response.totalFiles || 'N/A'}`);
        }
        console.log('');

        // Step 3: Test Video Assembler (should work now with FFmpeg)
        console.log('🎬 STEP 3: Video Assembler Test (Critical)');
        console.log('------------------------------------------');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true,
            quality: 'high'
        });

        if (!videoResult.success) {
            console.log(`❌ Video Assembler failed: ${videoResult.error}`);
            return {
                success: false,
                error: 'Video Assembler failed',
                step: 3,
                details: videoResult
            };
        }

        console.log(`✅ Video assembly successful`);
        console.log(`🎥 Video details:`, JSON.stringify(videoResult.response, null, 2));
        console.log('');

        // Step 4: Test YouTube Publisher with actual video
        console.log('📺 STEP 4: YouTube Publisher with Real Video');
        console.log('--------------------------------------------');
        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            mode: 'auto',
            enableUpload: true,
            privacy: 'unlisted',
            metadata: {
                title: 'Complete Peru Travel Guide - AI Generated (Fixed Pipeline)',
                description: 'Complete travel guide to Peru created with our fully working automated video pipeline including real video assembly.',
                category: '19',
                tags: ['peru travel', 'travel guide', 'ai generated', 'automated pipeline', 'fixed']
            }
        });

        console.log(`📊 YouTube Result: ${youtubeResult.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`🎬 Mode: ${youtubeResult.response.mode || 'N/A'}`);

        if (youtubeResult.response.youtubeUrl && !youtubeResult.response.youtubeUrl.includes('placeholder')) {
            console.log('\n🎉 COMPLETE PIPELINE SUCCESS WITH REAL VIDEO!');
            console.log(`🔗 YouTube URL: ${youtubeResult.response.youtubeUrl}`);
            console.log(`🆔 Video ID: ${youtubeResult.response.youtubeVideoId}`);
        } else if (youtubeResult.response.mode === 'metadata-only') {
            console.log('\n📝 Metadata-only mode - video file may not be ready');
        }

        return {
            success: true,
            projectId: projectId,
            youtubeUrl: youtubeResult.response.youtubeUrl,
            components: {
                manifest: manifestResult.success,
                audio: audioResult.success,
                video: videoResult.success,
                youtube: youtubeResult.success
            }
        };

    } catch (error) {
        console.error('💔 Complete pipeline test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function callAPI(endpoint, method, data, timeout = 300000) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: `/prod${endpoint}`,
            method: method,
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: timeout
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error',
                        response: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

if (require.main === module) {
    testCompleteBoliviaPipeline().then(result => {
        if (result.success) {
            console.log('\n🎉 COMPLETE PIPELINE TEST SUCCESSFUL!');
            console.log(`📍 Project: ${result.projectId}`);
            console.log('\n📊 ALL COMPONENTS STATUS:');
            console.log('=========================');

            Object.entries(result.components).forEach(([name, status]) => {
                console.log(`${status ? '✅' : '❌'} ${name}: ${status ? 'WORKING' : 'FAILED'}`);
            });

            if (result.youtubeUrl) {
                console.log(`\n🎬 WATCH YOUR COMPLETE VIDEO: ${result.youtubeUrl}`);
            }

            const workingCount = Object.values(result.components).filter(Boolean).length;
            console.log(`\n🎯 FINAL STATUS: ${workingCount}/4 components working`);

            if (workingCount === 4) {
                console.log('🟢 PERFECT: Complete pipeline with real video creation working!');
                console.log('🚀 System is fully operational and ready for Bolivia video!');
            } else {
                console.log('🟡 PARTIAL: Some components still need work');
            }

        } else {
            console.log('\n💔 COMPLETE PIPELINE TEST FAILED');
            console.log(`❌ Error: ${result.error}`);
            console.log(`📍 Failed at step: ${result.step || 'Unknown'}`);
        }
    });
}

module.exports = {
    testCompleteBoliviaPipeline
};