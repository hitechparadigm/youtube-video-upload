#!/usr/bin/env node

/**
 * Debug YouTube Publisher to see what's really happening
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function debugYouTubePublisher() {
    console.log('🔍 Debugging YouTube Publisher...\n');

    const projectId = '2025-10-20T15-38-15_travel-to-france';

    try {
        // Test YouTube publisher health first
        console.log('🏥 Testing YouTube Publisher health...');
        const healthResult = await callAPI('/youtube/health', 'GET');
        console.log('📊 Health Result:');
        console.log('   Success:', healthResult.success);
        console.log('   Status Code:', healthResult.statusCode);
        console.log('   Data:', JSON.stringify(healthResult.data, null, 2));

        // Test YouTube authentication
        console.log('\n🔐 Testing YouTube authentication...');
        const authResult = await callAPI('/youtube/auth/status', 'GET');
        console.log('📊 Auth Result:');
        console.log('   Success:', authResult.success);
        console.log('   Status Code:', authResult.statusCode);
        console.log('   Data:', JSON.stringify(authResult.data, null, 2));

        // Test YouTube publish with detailed logging
        console.log('\n📺 Testing YouTube publish...');
        const publishResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            title: 'Travel to France - Debug Test',
            description: 'Debug test for YouTube publishing functionality.',
            tags: ['France', 'Travel', 'Debug'],
            visibility: 'unlisted', // Use unlisted for testing
            category: 'Travel & Events'
        });

        console.log('📊 Publish Result:');
        console.log('   Success:', publishResult.success);
        console.log('   Status Code:', publishResult.statusCode);
        console.log('   Error:', publishResult.error);
        console.log('   Full Data:', JSON.stringify(publishResult.data, null, 2));

        // Check if there are any specific error details
        if (publishResult.data && publishResult.data.details) {
            console.log('\n🔍 Detailed Error Information:');
            console.log(JSON.stringify(publishResult.data.details, null, 2));
        }

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

        console.log(`🔗 Calling: ${method} ${fullUrl}`);
        if (postData) {
            console.log(`📤 Payload: ${postData}`);
        }

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'YouTube-Debug/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`📥 Response (${res.statusCode}): ${responseData}`);
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
            console.log(`❌ Request error: ${error.message}`);
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

debugYouTubePublisher();
