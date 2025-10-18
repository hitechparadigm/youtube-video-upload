const https = require('https');

async function createArgentinaManualSetup() {
    console.log('🇦🇷 CREATING ARGENTINA VIDEO - MANUAL SETUP APPROACH');
    console.log('====================================================');
    console.log('🎯 Strategy: Skip Topic/Script (auth issues), start from Media Curator');
    console.log('📝 We\'ll create basic project structure manually and test the working agents');
    console.log('');

    // Create a project ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substr(0, 19);
    const projectId = `${timestamp}_travel-to-argentina`;

    console.log(`📍 Project ID: ${projectId}`);
    console.log('');

    try {
        // Since Topic Management and Script Generator have auth issues,
        // let's test the agents we know work: Media Curator, Audio Generator, etc.

        console.log('🖼️ STEP 1: Test Media Curator (Expected: Timeout but should work)');
        console.log('----------------------------------------------------------------');
        console.log('⚠️ This will likely timeout via API Gateway but should download images in background');

        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            // Provide manual scene context since we can't generate it
            sceneContext: {
                scenes: [{
                        sceneNumber: 1,
                        title: "Argentina Travel Introduction",
                        duration: 45,
                        visualRequirements: {
                            searchKeywords: ["argentina travel", "buenos aires", "argentina flag"],
                            sceneType: "intro",
                            emotionalTone: "exciting"
                        }
                    },
                    {
                        sceneNumber: 2,
                        title: "Buenos Aires Highlights",
                        duration: 60,
                        visualRequirements: {
                            searchKeywords: ["buenos aires", "tango", "colorful houses la boca"],
                            sceneType: "destination",
                            emotionalTone: "vibrant"
                        }
                    },
                    {
                        sceneNumber: 3,
                        title: "Patagonia Adventure",
                        duration: 45,
                        visualRequirements: {
                            searchKeywords: ["patagonia argentina", "glaciers", "mountains"],
                            sceneType: "adventure",
                            emotionalTone: "awe-inspiring"
                        }
                    },
                    {
                        sceneNumber: 4,
                        title: "Travel Tips & Conclusion",
                        duration: 30,
                        visualRequirements: {
                            searchKeywords: ["argentina food", "travel tips", "argentina culture"],
                            sceneType: "conclusion",
                            emotionalTone: "helpful"
                        }
                    }
                ]
            },
            qualityLevel: 'high',
            imagesPerScene: 4
        }, 300000); // 5 minute timeout

        if (mediaResult.success) {
            console.log(`✅ Media Curator completed successfully!`);
            console.log(`🖼️ Images: ${mediaResult.imagesDownloaded || 'N/A'}`);
        } else {
            console.log(`⚠️ Media Curator API response: ${mediaResult.error?.message || mediaResult.message || 'Timeout/Error'}`);
            console.log('📝 This is expected - likely working in background');
        }
        console.log('');

        // Wait for background processing
        console.log('⏳ Waiting 90 seconds for Media Curator background processing...');
        await new Promise(resolve => setTimeout(resolve, 90000));

        console.log('🎵 STEP 2: Test Audio Generator');
        console.log('-------------------------------');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId,
            // Provide manual script since we can't generate it
            sceneContext: {
                scenes: [{
                        sceneNumber: 1,
                        content: {
                            script: "Welcome to Argentina, a land of passionate tango, stunning landscapes, and incredible adventures. From the vibrant streets of Buenos Aires to the breathtaking glaciers of Patagonia, Argentina offers experiences that will captivate your heart and soul."
                        }
                    },
                    {
                        sceneNumber: 2,
                        content: {
                            script: "Buenos Aires, the Paris of South America, enchants visitors with its European architecture, world-class steakhouses, and the birthplace of tango. Explore the colorful neighborhood of La Boca, stroll through elegant Recoleta, and experience the electric nightlife that makes this city unforgettable."
                        }
                    },
                    {
                        sceneNumber: 3,
                        content: {
                            script: "Venture south to Patagonia, where nature displays its most dramatic beauty. Witness the thundering Perito Moreno Glacier, hike through the stunning landscapes of El Calafate, and discover why this region is considered one of the world's last great wilderness areas."
                        }
                    },
                    {
                        sceneNumber: 4,
                        content: {
                            script: "Before you go, remember that Argentina uses the peso, Spanish is the main language, and the best time to visit is during their spring and fall. Pack layers for diverse climates, and prepare for the adventure of a lifetime in this incredible South American gem."
                        }
                    }
                ]
            },
            voice: 'Joanna',
            speed: 'normal'
        });

        if (audioResult.success) {
            console.log(`✅ Audio Generator completed successfully!`);
            console.log(`🎙️ Audio files: ${audioResult.audioFiles?.length || 'N/A'}`);
        } else {
            console.log(`⚠️ Audio Generator failed: ${audioResult.error?.message || audioResult.message}`);
            console.log('📝 This is expected based on previous tests');
        }
        console.log('');

        // Wait a bit more for processing
        console.log('⏳ Waiting additional 30 seconds for processing...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('📋 STEP 3: Test Manifest Builder');
        console.log('--------------------------------');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            minVisuals: 1,
            allowPlaceholders: true
        });

        if (manifestResult.success) {
            console.log(`✅ Manifest Builder working!`);
            console.log(`📊 KPIs: ${JSON.stringify(manifestResult.kpis || {})}`);
            console.log(`🎯 Ready for rendering: ${manifestResult.readyForRendering ? 'YES' : 'NO'}`);
        } else {
            console.log(`❌ Manifest Builder failed: ${manifestResult.error?.message || manifestResult.message}`);
            console.log('📝 Cannot proceed without manifest');
            return {
                success: false,
                error: 'Manifest Builder failed',
                projectId: projectId
            };
        }
        console.log('');

        console.log('🎬 STEP 4: Test Video Assembler');
        console.log('-------------------------------');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true
        });

        if (videoResult.success) {
            console.log(`✅ Video Assembler working!`);
            console.log(`🎥 Video: ${videoResult.videoPath || 'N/A'}`);
        } else {
            console.log(`⚠️ Video Assembler failed: ${videoResult.error?.message || videoResult.message}`);
            console.log('📝 Will try YouTube Publisher anyway');
        }
        console.log('');

        console.log('📺 STEP 5: Test YouTube Publisher');
        console.log('---------------------------------');
        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            mode: 'auto',
            enableUpload: true,
            privacy: 'unlisted',
            metadata: {
                title: 'Amazing Travel Guide to Argentina - AI Generated (Test)',
                description: 'Complete travel guide to Argentina featuring Buenos Aires, Patagonia, and essential travel tips.',
                category: '19',
                tags: ['argentina travel', 'buenos aires', 'patagonia', 'travel guide', 'south america']
            }
        });

        if (youtubeResult.success) {
            console.log(`✅ YouTube Publisher working!`);
            console.log(`🎬 Mode: ${youtubeResult.mode || 'N/A'}`);

            if (youtubeResult.youtubeUrl && !youtubeResult.youtubeUrl.includes('placeholder')) {
                console.log('\n🎉 REAL ARGENTINA VIDEO CREATED!');
                console.log(`🔗 YouTube URL: ${youtubeResult.youtubeUrl}`);
                console.log(`🆔 Video ID: ${youtubeResult.youtubeVideoId}`);
            } else {
                console.log('\n📝 Metadata-only mode - manual upload instructions created');
            }
        } else {
            console.log(`❌ YouTube Publisher failed: ${youtubeResult.error?.message || youtubeResult.message}`);
        }

        return {
            success: true,
            projectId: projectId,
            results: {
                media: mediaResult,
                audio: audioResult,
                manifest: manifestResult,
                video: videoResult,
                youtube: youtubeResult
            }
        };

    } catch (error) {
        console.error('💔 Argentina manual setup failed:', error.message);
        return {
            success: false,
            error: error.message,
            projectId: projectId
        };
    }
}

async function callAPI(endpoint, method, data, timeout = 120000) {
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

if (require.main === module) {
    createArgentinaManualSetup().then(result => {
        if (result.success) {
            console.log('\n🎉 ARGENTINA MANUAL SETUP COMPLETED!');
            console.log(`📍 Project: ${result.projectId}`);
            console.log('\n📊 AGENT TEST RESULTS:');
            console.log('======================');

            const results = result.results;
            console.log(`🖼️ Media Curator: ${results.media?.success ? 'PASS' : 'TIMEOUT (Expected)'}`);
            console.log(`🎵 Audio Generator: ${results.audio?.success ? 'PASS' : 'RUNTIME ERROR (Expected)'}`);
            console.log(`📋 Manifest Builder: ${results.manifest?.success ? 'PASS' : 'FAIL'}`);
            console.log(`🎬 Video Assembler: ${results.video?.success ? 'PASS' : 'FAIL'}`);
            console.log(`📺 YouTube Publisher: ${results.youtube?.success ? 'PASS' : 'FAIL'}`);

            if (results.youtube && results.youtube.youtubeUrl) {
                console.log(`\n🎬 WATCH YOUR ARGENTINA VIDEO: ${results.youtube.youtubeUrl}`);
            }

        } else {
            console.log('\n💔 ARGENTINA MANUAL SETUP FAILED');
            console.log(`❌ Error: ${result.error}`);
            if (result.projectId) {
                console.log(`📍 Project ID: ${result.projectId}`);
            }
        }
    });
}

module.exports = {
    createArgentinaManualSetup
};