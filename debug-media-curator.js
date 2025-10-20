#!/usr/bin/env node

/**
 * Debug Media Curator to see what's actually being downloaded
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function debugMediaCurator() {
    console.log('🔍 Debugging Media Curator real media download...\n');

    const projectId = '2025-10-20T15-38-15_travel-to-france';

    try {
        // Test media curator with detailed logging
        console.log('🎬 Testing media curation...');
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: projectId,
            baseTopic: 'Travel to France',
            sceneCount: 4,
            quality: '1080p'
        });

        console.log('📊 Media Curation Result:');
        console.log('   Success:', mediaResult.success);
        console.log('   Status Code:', mediaResult.statusCode);
        console.log('   Error:', mediaResult.error);
        console.log('   Full Data:', JSON.stringify(mediaResult.data, null, 2));

        // Check specific details about downloaded files
        if (mediaResult.data && mediaResult.data.sceneMediaMapping) {
            console.log('\n📁 Scene Media Details:');
            mediaResult.data.sceneMediaMapping.forEach((scene, index) => {
                console.log(`   Scene ${scene.sceneNumber}:`);
                console.log(`     Images: ${scene.imageCount}`);
                if (scene.images) {
                    scene.images.forEach((image, imgIndex) => {
                        console.log(`       ${imgIndex + 1}. Size: ${image.size} bytes, Source: ${image.source}, Type: ${image.type || 'image'}`);
                    });
                }
            });
        }

        // Test media curator health
        console.log('\n🏥 Testing Media Curator health...');
        const healthResult = await callAPI('/media/health', 'GET');
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
                'User-Agent': 'Media-Debug/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`📥 Response (${res.statusCode}): ${responseData.substring(0, 1000)}${responseData.length > 1000 ? '...' : ''}`);
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

debugMediaCurator();
