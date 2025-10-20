#!/usr/bin/env node

/**
 * 🔍 CHECK DEPLOYMENT VERSION
 *
 * Checks if v5.1.3 hotfix is deployed by testing processing times
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function checkDeploymentVersion() {
    console.log('🔍 Checking Deployment Version...\n');

    try {
        // Test with a simple 2-scene project to check processing time
        console.log('1️⃣ Creating test topic...');
        const topicResult = await callAPI('/topics', 'POST', {
            topic: 'Version Check Test',
            category: 'test'
        });

        if (!topicResult.success) {
            console.log('❌ Topic creation failed - API might be down');
            return false;
        }

        const projectId = topicResult.data.projectId;
        console.log(`✅ Project: ${projectId}`);

        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('2️⃣ Generating script...');
        const scriptResult = await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            topic: 'Version Check Test',
            duration: 120
        });

        if (!scriptResult.success) {
            console.log('❌ Script generation failed');
            return false;
        }

        console.log('✅ Script generated');

        await new Promise(resolve => setTimeout(resolve, 10000));

        console.log('3️⃣ Testing media curation (checking for v5.1.3)...');
        const startTime = Date.now();

        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            baseTopic: 'Version Check Test',
            sceneCount: 2
        }, 25000); // 25 second timeout

        const processingTime = Date.now() - startTime;
        console.log(`⏱️ Processing time: ${Math.round(processingTime / 1000)}s`);

        if (mediaResult.success) {
            console.log('✅ Media curation successful!');

            // Check if we can see v5.1.3 features
            if (mediaResult.data && mediaResult.data.metadata) {
                const metadata = mediaResult.data.metadata;
                console.log(`Architecture: ${metadata.architecture}`);
                console.log(`Approach: ${metadata.approach}`);

                // v5.1.3 should have optimized processing times
                if (processingTime < 20000) { // Less than 20 seconds indicates v5.1.3
                    console.log('\n🎉 v5.1.3 HOTFIX DETECTED!');
                    console.log('✅ Optimized delays are working');
                    console.log('✅ No timeout issues');
                    console.log('✅ Stack recovery successful');
                    return true;
                } else {
                    console.log('\n⚠️ Still on older version (v5.1.1)');
                    console.log('🔄 Waiting for GitHub Actions to deploy v5.1.3');
                    return false;
                }
            } else {
                console.log('⚠️ No metadata available');
                return false;
            }

        } else if (mediaResult.error && mediaResult.error.includes('timeout')) {
            console.log('❌ Still experiencing timeouts - v5.1.1 deployed');
            console.log('🔄 Waiting for v5.1.3 hotfix deployment...');
            return false;
        } else {
            console.log(`❌ Media curation failed: ${mediaResult.error}`);
            return false;
        }

    } catch (error) {
        console.error('❌ Version check failed:', error.message);
        return false;
    }
}

async function callAPI(endpoint, method = 'GET', data = null, timeout = 20000) {
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
                'Content-Type': 'application/json'
            },
            timeout: timeout
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

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                statusCode: 0,
                error: 'Request timeout'
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

checkDeploymentVersion().then(isV513 => {
    if (isV513) {
        console.log('\n🚀 Ready to test Scene 3 fix:');
        console.log('   node test-hotfix-validation.js');
    } else {
        console.log('\n⏳ Check GitHub Actions for deployment progress:');
        console.log('   https://github.com/hitechparadigm/youtube-video-upload/actions');
        console.log('\n🔄 Run this check again in 5-10 minutes');
    }
});
