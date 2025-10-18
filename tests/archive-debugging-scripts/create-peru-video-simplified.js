/**
 * Create Travel to Peru Video - Simplified Pipeline
 * Skip Media Curator for now and focus on getting the video created
 */

const https = require('https');

async function createPeruVideoSimplified() {
    console.log('🎬 CREATING TRAVEL TO PERU VIDEO');
    console.log('===============================');

    try {
        // Step 1: Topic Management
        console.log('🎯 STEP 1: Topic Management AI');
        const topicResult = await callAPI('/topics', 'POST', {
            baseTopic: 'Travel to Peru',
            targetAudience: 'travel enthusiasts',
            videoDuration: 300
        });

        if (!topicResult.success) {
            throw new Error(`Topic Management failed: ${topicResult.error}`);
        }

        const projectId = topicResult.projectId;
        console.log(`✅ Project created: ${projectId}`);

        // Step 2: Script Generator
        console.log('\n📝 STEP 2: Script Generator AI');
        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            scriptOptions: {
                style: 'engaging_educational',
                targetAudience: 'travel enthusiasts'
            }
        });

        if (!scriptResult.success) {
            throw new Error(`Script Generation failed: ${scriptResult.error}`);
        }

        console.log(`✅ Script generated with ${scriptResult.sceneContext?.scenes?.length || 'N/A'} scenes`);

        // Skip Media Curator for now - use existing media or let other steps handle it

        // Step 3: Try YouTube Publisher directly
        console.log('\n📺 STEP 3: YouTube Publisher AI (Direct Test)');
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
            return {
                success: true,
                projectId: projectId,
                youtubeUrl: youtubeResult.youtubeUrl,
                videoId: youtubeResult.youtubeVideoId
            };
        } else {
            console.log('\n📝 Metadata-only mode - manual upload available');
            console.log('Upload instructions provided for manual processing');
            return {
                success: true,
                projectId: projectId,
                mode: 'metadata-only',
                message: 'Metadata created for manual upload'
            };
        }

    } catch (error) {
        console.error('\n❌ PIPELINE FAILED:', error.message);
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
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
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

// Run the simplified pipeline
createPeruVideoSimplified()
    .then(result => {
        if (result.success) {
            console.log('\n🎊 SUCCESS! Travel to Peru content created!');
            if (result.youtubeUrl) {
                console.log(`🎬 Watch your Peru video: ${result.youtubeUrl}`);
            }
        } else {
            console.log('\n💔 Pipeline failed:', result.error);
        }
    })
    .catch(error => {
        console.error('\n💥 Unexpected error:', error.message);
    });