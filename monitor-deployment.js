#!/usr/bin/env node

/**
 * 🔍 MONITOR DEPLOYMENT PROGRESS
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function monitorDeployment() {
    console.log('🔍 Monitoring Deployment Progress...\n');
    console.log('GitHub Actions: https://github.com/hitechparadigm/youtube-video-upload/actions\n');

    let attempts = 0;
    const maxAttempts = 20; // 10 minutes max

    while (attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);

        try {
            // Test basic API connectivity
            const healthResult = await callAPI('/topics', 'GET');
            console.log(`  API Gateway: ${healthResult.statusCode === 200 ? '✅' : '❌'} (${healthResult.statusCode})`);

            if (healthResult.statusCode === 200) {
                // Test Media Curator architecture
                const testResult = await callAPI('/media/curate', 'POST', {
                    projectId: '2025-10-20T16-27-09_travel-to-france',
                    baseTopic: 'Travel to France',
                    sceneCount: 1
                });

                if (testResult.success && testResult.data && testResult.data.metadata) {
                    const architecture = testResult.data.metadata.architecture;
                    console.log(`  Architecture: ${architecture}`);

                    if (architecture === 'multi-scene-processor-v1') {
                        console.log('\n🎉 DEPLOYMENT COMPLETE!');
                        console.log('✅ MultiSceneProcessor v5.1.0 is deployed and ready');
                        console.log('\n🚀 Run comprehensive tests:');
                        console.log('   node test-deployed-multi-scene-fix.js');
                        return true;
                    } else {
                        console.log(`  Status: Old architecture (${architecture})`);
                    }
                } else {
                    console.log(`  Media Curator: ❌ (${testResult.error || 'No response'})`);
                }
            }

        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }

        if (attempts < maxAttempts) {
            console.log('  Waiting 30 seconds...\n');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    console.log('\n⏰ Monitoring timeout reached');
    console.log('Check GitHub Actions for deployment status:');
    console.log('https://github.com/hitechparadigm/youtube-video-upload/actions');
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
                'Content-Type': 'application/json'
            },
            timeout: 10000
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

monitorDeployment();
