#!/usr/bin/env node

/**
 * Debug why Scene 3 is getting placeholders while Scenes 1-2 get real media
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function debugScene3Issue() {
    console.log('🔍 Debugging Scene 3 Placeholder Issue...\n');

    try {
        // Test multiple single-scene projects to see if it's a sequence issue
        console.log('🧪 Testing multiple single-scene projects...');

        for (let i = 1; i <= 3; i++) {
            console.log(`\n--- Test ${i} ---`);

            // Create topic
            const topicResult = await callAPI('/topics', 'POST', {
                topic: `France Test ${i}`,
                category: 'travel',
                targetAudience: 'travelers',
                duration: 'short'
            });

            if (!topicResult.success) {
                console.log(`❌ Topic ${i} failed: ${topicResult.error}`);
                continue;
            }

            const projectId = topicResult.data.projectId;
            console.log(`📋 Project ${i}: ${projectId}`);

            // Generate script
            await new Promise(resolve => setTimeout(resolve, 3000));
            const scriptResult = await callAPI('/scripts/generate', 'POST', {
                projectId: projectId,
                topic: `France Test ${i}`,
                duration: 60
            });

            if (!scriptResult.success) {
                console.log(`❌ Script ${i} failed: ${scriptResult.error}`);
                continue;
            }

            // Test media curation
            await new Promise(resolve => setTimeout(resolve, 5000));
            const mediaResult = await callAPI('/media/curate', 'POST', {
                projectId: projectId,
                baseTopic: `France Test ${i}`,
                sceneCount: 1,
                quality: '720p'
            });

            if (mediaResult.success && mediaResult.data && mediaResult.data.sceneMediaMapping) {
                const scene = mediaResult.data.sceneMediaMapping[0];
                if (scene && scene.images && scene.images.length > 0) {
                    const firstImage = scene.images[0];
                    const isReal = firstImage.size > 100;
                    const status = isReal ? '✅ REAL' : '❌ PLACEHOLDER';
                    console.log(`   Result: ${firstImage.size}B from ${firstImage.source} ${status}`);
                }
            } else {
                console.log(`❌ Media ${i} failed: ${mediaResult.error}`);
            }

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n🔍 Testing rapid sequential calls (simulating multi-scene)...');

        // Create one project with rapid sequential media calls
        const topicResult = await callAPI('/topics', 'POST', {
            topic: 'Sequential Test',
            category: 'travel',
            targetAudience: 'travelers',
            duration: 'medium'
        });

        if (topicResult.success) {
            const projectId = topicResult.data.projectId;
            console.log(`📋 Sequential Project: ${projectId}`);

            // Generate script
            await new Promise(resolve => setTimeout(resolve, 3000));
            await callAPI('/scripts/generate', 'POST', {
                projectId: projectId,
                topic: 'Sequential Test',
                duration: 180
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // Make 3 rapid media curation calls
            console.log('\n🚀 Making 3 rapid media calls...');
            const promises = [];
            for (let i = 1; i <= 3; i++) {
                promises.push(
                    callAPI('/media/curate', 'POST', {
                        projectId: `${projectId}-scene-${i}`,
                        baseTopic: `Sequential Test Scene ${i}`,
                        sceneCount: 1,
                        quality: '720p'
                    })
                );
            }

            const results = await Promise.all(promises);
            results.forEach((result, index) => {
                if (result.success && result.data && result.data.sceneMediaMapping) {
                    const scene = result.data.sceneMediaMapping[0];
                    if (scene && scene.images && scene.images.length > 0) {
                        const firstImage = scene.images[0];
                        const isReal = firstImage.size > 100;
                        const status = isReal ? '✅ REAL' : '❌ PLACEHOLDER';
                        console.log(`   Call ${index + 1}: ${firstImage.size}B from ${firstImage.source} ${status}`);
                    }
                } else {
                    console.log(`   Call ${index + 1}: ❌ Failed - ${result.error}`);
                }
            });
        }

        console.log('\n🎯 Analysis:');
        console.log('   - If single calls work but sequential calls fail, it\'s likely rate limiting');
        console.log('   - If all calls fail, it\'s likely an API key or permission issue');
        console.log('   - If random calls fail, it\'s likely duplicate prevention or API quota issues');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
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
                'User-Agent': 'Scene3-Debug/1.0'
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

debugScene3Issue();
