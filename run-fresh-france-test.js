#!/usr/bin/env node

/**
 * Fresh France Pipeline Test - Post Secrets Manager Fix
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function runFreshFranceTest() {
    console.log('🇫🇷 Running FRESH France Pipeline Test (Post-Fix)...\n');

    // Generate completely new project ID with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let projectId = `${timestamp}_france-post-fix`;
    console.log(`📋 Fresh Project ID: ${projectId}`);

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
        console.log('   Waiting 5 seconds for topic context...');
        await new Promise(resolve => setTimeout(resolve, 5000));

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
        console.log(`📝 Generated scenes: ${scriptResult.data?.script?.sceneCount || 'multiple'}`);

        // Step 3: Wait for context storage
        console.log('\n⏳ Waiting 10 seconds for script context to be stored...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Step 4: Media Curation with Detailed Analysis
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

        // Detailed analysis of downloaded media
        if (mediaResult.data && mediaResult.data.sceneMediaMapping) {
            console.log('\n📊 DETAILED MEDIA ANALYSIS:');
            let totalRealMedia = 0;
            let totalPlaceholders = 0;

            mediaResult.data.sceneMediaMapping.forEach((scene, sceneIndex) => {
                console.log(`\n   Scene ${scene.sceneNumber}:`);
                if (scene.images && scene.images.length > 0) {
                    scene.images.forEach((image, imgIndex) => {
                        const isReal = image.size > 100;
                        const sizeDisplay = isReal ? `${Math.round(image.size / 1024)}KB` : `${image.size}B`;
                        const status = isReal ? '✅ REAL' : '❌ PLACEHOLDER';

                        console.log(`     ${imgIndex + 1}. ${sizeDisplay} from ${image.source} ${status}`);

                        if (isReal) totalRealMedia++;
                        else totalPlaceholders++;
                    });
                }
            });

            console.log('\n🎯 FINAL RESULTS:');
            console.log(`   Real Media Files: ${totalRealMedia}`);
            console.log(`   Placeholder Files: ${totalPlaceholders}`);
            console.log(`   Project ID: ${projectId}`);

            if (totalRealMedia > 0 && totalPlaceholders === 0) {
                console.log('   🎉 SUCCESS: All media files are real (no placeholders)!');
                console.log('   ✅ Secrets Manager fix is working perfectly!');
            } else if (totalRealMedia > 0 && totalPlaceholders > 0) {
                console.log('   ⚠️  MIXED: Some real media, some placeholders');
                console.log('   🔧 May need additional debugging');
            } else {
                console.log('   ❌ FAILURE: Still getting only placeholder files');
                console.log('   🚨 Secrets Manager fix may not be fully effective');
            }
        }

        console.log('\n📋 Next Steps:');
        console.log(`   - Check S3 bucket for project: ${projectId}`);
        console.log(`   - Verify media files in: videos/${projectId}/03-media/`);
        console.log(`   - Compare with old project: 2025-10-20T16-18-42_travel-to-france`);

    } catch (error) {
        console.error('\n❌ Fresh France test failed:', error.message);
        console.log('\n🔧 This indicates the Secrets Manager fix may need additional time to propagate');
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
                'User-Agent': 'Fresh-France-Test/1.0'
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

runFreshFranceTest();
