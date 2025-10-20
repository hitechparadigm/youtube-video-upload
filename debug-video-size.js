#!/usr/bin/env node

/**
 * Debug video file size and content
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function debugVideoSize() {
    console.log('🔍 Debugging video file size and content...\n');

    const projectId = '2025-10-20T15-38-15_travel-to-france';

    try {
        // Test video assembler with detailed logging
        console.log('🎬 Testing video assembly...');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            quality: 'high',
            format: 'mp4'
        });

        console.log('📊 Video Assembly Result:');
        console.log('   Success:', videoResult.success);
        console.log('   Status Code:', videoResult.statusCode);
        console.log('   Error:', videoResult.error);
        console.log('   Full Data:', JSON.stringify(videoResult.data, null, 2));

        // Check if there are file size details
        if (videoResult.data && videoResult.data.videoFile) {
            console.log('\n📁 Video File Details:');
            console.log('   Path:', videoResult.data.videoFile.path);
            console.log('   Size:', videoResult.data.videoFile.size);
            console.log('   Format:', videoResult.data.videoFile.format);
        }

        // Test video assembler health
        console.log('\n🏥 Testing Video Assembler health...');
        const healthResult = await callAPI('/video/health', 'GET');
        console.log('📊 Health Result:');
        console.log('   Success:', healthResult.success);
        console.log('   Status Code:', healthResult.statusCode);
        console.log('   Data:', JSON.stringify(healthResult.data, null, 2));

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
                'User-Agent': 'Video-Debug/1.0'
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

debugVideoSize();
