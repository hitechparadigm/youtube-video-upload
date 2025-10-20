#!/usr/bin/env node

/**
 * Clean France Pipeline Test - No Optional Chaining Issues
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function runFrancePipeline() {
    console.log('🇫🇷 Starting "Travel to France" Video Pipeline...\n');

    let projectId = `2025-10-20T${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}_travel-to-france`;
    console.log(`📋 Project ID: ${projectId}`);

    try {
        // Step 1: Topic Management
        console.log('\n1️⃣ Creating France travel topic...');
        const topicResult = await callAPI('/topics', 'POST', {
            topic: 'Travel to France',
            category: 'travel',
            targetAudience: 'travel enthusiasts',
            duration: 'medium',
            style: 'informative and engaging',
            keywords: ['France', 'Paris', 'travel guide', 'French culture', 'tourism']
        });

        if (!topicResult.success) {
            throw new Error(`Topic creation failed: ${topicResult.error}`);
        }
        console.log('✅ Topic created successfully');

        // Update projectId if returned
        if (topicResult.data && topicResult.data.projectId) {
            projectId = topicResult.data.projectId;
            console.log(`   Updated Project ID: ${projectId}`);
        }

        // Step 2: Script Generation
        console.log('\n2️⃣ Generating video script...');
        console.log('   Waiting 3 seconds for topic context...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            topic: 'Travel to France',
            duration: 300,
            style: 'engaging travel guide',
            targetAudience: 'travel enthusiasts'
        });

        if (!scriptResult.success) {
            throw new Error(`Script generation failed: ${scriptResult.error}`);
        }
        console.log('✅ Script generated successfully');
        console.log(`📝 Generated scenes: ${scriptResult.totalScenes || 'multiple'}`);

        // Step 3: Media Curation with Duplicate Prevention
        console.log('\n3️⃣ Curating media with duplicate prevention...');
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            baseTopic: 'Travel to France',
            sceneCount: 4,
            quality: '1080p'
        });

        if (!mediaResult.success) {
            throw new Error(`Media curation failed: ${mediaResult.error}`);
        }
        console.log('✅ Media curated successfully');
        console.log(`🎬 Downloaded unique media files: ${mediaResult.totalImages || 'multiple'}`);

        // Step 4: Audio Generation
        console.log('\n4️⃣ Generating audio narration...');
        const audioResult = await callAPI('/audio/generate', 'POST', {
            projectId: projectId,
            voiceId: 'Joanna',
            speed: 'medium'
        });

        if (!audioResult.success) {
            throw new Error(`Audio generation failed: ${audioResult.error}`);
        }
        console.log('✅ Audio generated successfully');

        // Step 5: Manifest Building
        console.log('\n5️⃣ Building video manifest...');
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            title: 'Travel to France - Complete Guide',
            description: 'Discover the beauty and culture of France in this comprehensive travel guide.',
            tags: ['France', 'Travel', 'Paris', 'Tourism', 'Europe']
        });

        if (!manifestResult.success) {
            throw new Error(`Manifest building failed: ${manifestResult.error}`);
        }
        console.log('✅ Manifest built successfully');

        // Step 6: Video Assembly
        console.log('\n6️⃣ Assembling video with FFmpeg...');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            quality: 'high',
            format: 'mp4'
        });

        if (!videoResult.success) {
            throw new Error(`Video assembly failed: ${videoResult.error}`);
        }
        console.log('✅ Video assembled successfully');

        // Step 7: YouTube Publishing
        console.log('\n7️⃣ Publishing to YouTube...');
        const publishResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            title: 'Travel to France - Complete Guide 2025',
            description: 'Discover the beauty, culture, and hidden gems of France in this comprehensive travel guide. From Paris landmarks to French cuisine, get ready for your perfect French adventure!',
            tags: ['France', 'Travel', 'Paris', 'Tourism', 'Europe', 'Travel Guide', '2025'],
            visibility: 'public',
            category: 'Travel & Events'
        });

        if (!publishResult.success) {
            throw new Error(`YouTube publishing failed: ${publishResult.error}`);
        }
        console.log('✅ Video published to YouTube successfully!');

        // Success Summary
        console.log('\n🎉 PIPELINE COMPLETE! 🎉');
        console.log('═══════════════════════════════════════');
        console.log(`📋 Project: ${projectId}`);
        console.log('🇫🇷 Topic: Travel to France');
        console.log('🎬 Video: High-quality MP4 with unique content');
        console.log('📺 YouTube: Published successfully');
        console.log('🚀 Duplicate Prevention: ACTIVE');
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('\n❌ Pipeline failed:', error.message);
        console.log('\n🔧 Check CloudWatch logs for detailed errors');
        process.exit(1);
    }
}

async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
        const fullUrl = baseUrl + (endpoint.startsWith('/') ? endpoint.substring(1) : endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'France-Pipeline/1.0'
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
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        data: {
                            raw: responseData
                        },
                        error: 'JSON parse error'
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                statusCode: 0,
                error: error.message
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

runFrancePipeline();
