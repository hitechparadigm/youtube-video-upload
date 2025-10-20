#!/usr/bin/env node

/**
 * 🔍 CHECK DEPLOYMENT STATUS
 *
 * Simple script to check if the new MultiSceneProcessor is deployed
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function checkDeploymentStatus() {
    console.log('🔍 Checking Deployment Status...\n');

    try {
        // Quick health check
        console.log('1️⃣ Testing API Gateway connectivity...');
        const healthResult = await callAPI('/topics', 'GET');

        if (healthResult.success || healthResult.statusCode === 200) {
            console.log('✅ API Gateway is responding');
        } else {
            console.log(`⚠️ API Gateway status: ${healthResult.statusCode}`);
        }

        // Test a quick media curation to check architecture
        console.log('\n2️⃣ Checking MultiSceneProcessor deployment...');
        const projectId = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}_status-check`;

        // Create minimal test
        await callAPI('/topics', 'POST', {
            topic: 'Deployment Status Check',
            category: 'test'
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
        await callAPI('/scripts/generate', 'POST', {
            projectId: projectId,
            topic: 'Deployment Status Check',
            duration: 60
        });

        await new Promise(resolve => setTimeout(resolve, 5000));
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            baseTopic: 'Deployment Status Check',
            sceneCount: 1
        });

        if (mediaResult.success && mediaResult.data.metadata) {
            const architecture = mediaResult.data.metadata.architecture;
            const approach = mediaResult.data.metadata.approach;

            console.log('✅ Media Curator is responding');
            console.log(`📋 Architecture: ${architecture}`);
            console.log(`📋 Approach: ${approach}`);

            if (architecture === 'multi-scene-processor-v1') {
                console.log('\n🎉 SUCCESS! MultiSceneProcessor v5.1.0 is deployed!');
                console.log('✅ Ready to test multi-scene rate limiting fix');

                // Show available features
                if (mediaResult.data.metadata.rateLimitingEnabled) {
                    console.log('✅ Rate limiting enabled');
                }
                if (mediaResult.data.metadata.apiRotationEnabled) {
                    console.log('✅ API rotation enabled');
                }
                if (mediaResult.data.metadata.multiSceneProcessingStats) {
                    console.log('✅ Processing stats available');
                }

                return true;
            } else {
                console.log('\n⚠️ Old architecture detected');
                console.log('🔄 Deployment may still be in progress or failed');
                console.log(`   Current: ${architecture}`);
                console.log(`   Expected: multi-scene-processor-v1`);
                return false;
            }
        } else {
            console.log('❌ Media Curator not responding properly');
            console.log(`   Error: ${mediaResult.error}`);
            return false;
        }

    } catch (error) {
        console.error('❌ Status check failed:', error.message);
        return false;
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
                'User-Agent': 'Deployment-Status-Check/1.0'
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

checkDeploymentStatus().then(success => {
    if (success) {
        console.log('\n🚀 Ready to run comprehensive tests:');
        console.log('   node test-deployed-multi-scene-fix.js');
    } else {
        console.log('\n⏳ Deployment not ready yet. Check again in a few minutes.');
    }
}).catch(console.error);
