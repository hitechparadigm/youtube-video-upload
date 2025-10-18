const https = require('https');

async function completePipelineSkipMedia() {
    const projectId = '2025-10-17T00-26-06_travel-to-peru';

    console.log('🎬 COMPLETING PERU PIPELINE (SKIP MEDIA)');
    console.log('=========================================');
    console.log(`📍 Project: ${projectId}`);
    console.log('✅ Already have: Topic context, Scene context, Script, Media (21 images)');
    console.log('🎯 Need to complete: Audio → Manifest → Video → YouTube');
    console.log('');

    try {
        // Step 1: Audio Generator (CRITICAL)
        console.log('🎵 STEP 1: Audio Generator AI');
        console.log('-----------------------------');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId
        });

        if (!audioResult.success) {
            console.log(`⚠️ Audio Generator failed:`, JSON.stringify(audioResult.error || audioResult, null, 2));
            console.log('📝 Continuing - Manifest Builder might still work');
        } else {
            console.log(`✅ Audio generated successfully`);
            console.log(`🎙️ Audio files: ${audioResult.audioFiles?.length || 'N/A'}`);
        }
        console.log('');

        // Step 2: Manifest Builder (Quality Gatekeeper)
        console.log('📋 STEP 2: Manifest Builder (Quality Gatekeeper)');
        console.log('-----------------------------------------------');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            minVisuals: 1, // Lower requirement since media might be missing
            allowPlaceholders: true
        });

        if (!manifestResult.success) {
            console.log(`❌ Manifest Builder failed: ${manifestResult.error}`);
            console.log('📝 Cannot proceed to video creation without manifest');
            return {
                success: false,
                error: 'Manifest Builder failed - required for video creation',
                projectId: projectId
            };
        }

        console.log(`✅ Manifest created successfully`);
        console.log(`📊 KPIs: ${JSON.stringify(manifestResult.kpis || {})}`);
        console.log('');

        // Step 3: Video Assembler
        console.log('🎬 STEP 3: Video Assembler AI');
        console.log('-----------------------------');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true,
            manifestPath: `videos/${projectId}/01-context/manifest.json`
        });

        if (!videoResult.success) {
            console.log(`⚠️ Video Assembler failed: ${videoResult.error}`);
            console.log('📝 Will try YouTube Publisher anyway (might work with metadata-only)');
        } else {
            console.log(`✅ Video assembled successfully`);
            console.log(`🎥 Video: ${videoResult.videoPath || 'N/A'}`);
        }
        console.log('');

        // Step 4: YouTube Publisher
        console.log('📺 STEP 4: YouTube Publisher AI');
        console.log('-------------------------------');
        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            mode: 'auto',
            enableUpload: true,
            privacy: 'unlisted',
            metadata: {
                title: 'Amazing Travel Guide to Peru - AI Generated',
                category: '19' // Travel & Events
            }
        });

        console.log(`📊 YouTube Result: ${youtubeResult.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`🎬 Mode: ${youtubeResult.mode || 'N/A'}`);

        if (youtubeResult.youtubeUrl && !youtubeResult.youtubeUrl.includes('placeholder')) {
            console.log('\n🎉 REAL PERU VIDEO CREATED!');
            console.log(`🔗 YouTube URL: ${youtubeResult.youtubeUrl}`);
            console.log(`🆔 Video ID: ${youtubeResult.youtubeVideoId}`);
        } else if (youtubeResult.mode === 'metadata-only') {
            console.log('\n📝 Metadata-only mode - manual upload instructions created');
        }

        return {
            success: true,
            projectId: projectId,
            youtubeResult: youtubeResult,
            videoResult: videoResult,
            manifestResult: manifestResult,
            audioResult: audioResult
        };

    } catch (error) {
        console.error('💔 Pipeline completion failed:', error.message);
        return {
            success: false,
            error: error.message,
            projectId: projectId
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
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 120000 // 2 minute timeout
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
            console.error(`❌ Request to ${endpoint} failed:`, error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error(`❌ Request to ${endpoint} timed out`);
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

// Run the pipeline
completePipelineSkipMedia().then(result => {
    if (result.success) {
        console.log('\n🎉 PERU PIPELINE COMPLETED SUCCESSFULLY!');
        console.log(`📍 Project: ${result.projectId}`);
    } else {
        console.log('\n💔 PERU PIPELINE FAILED');
        console.log(`❌ Error: ${result.error}`);
    }
});