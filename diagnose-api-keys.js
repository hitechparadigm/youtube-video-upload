#!/usr/bin/env node

/**
 * Diagnose API key and external service issues
 */

const https = require('https');

const API_BASE_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function diagnoseAPIKeys() {
    console.log('🔍 Diagnosing API Keys and External Services...\n');

    try {
        // Test a simple media curation to see the error details
        console.log('🎬 Testing media curation with error details...');
        const mediaResult = await callAPI('/media/curate', 'POST', {
            projectId: 'test-api-keys-debug',
            baseTopic: 'simple test',
            sceneCount: 1,
            quality: '720p'
        });

        console.log('📊 Media Curation Detailed Result:');
        console.log('   Success:', mediaResult.success);
        console.log('   Status Code:', mediaResult.statusCode);
        console.log('   Error:', mediaResult.error);

        // Look for specific error patterns
        if (mediaResult.data) {
            console.log('\n🔍 Analyzing response for API key issues...');
            const responseStr = JSON.stringify(mediaResult.data, null, 2);

            if (responseStr.includes('API key')) {
                console.log('   ❌ API key issue detected');
            }
            if (responseStr.includes('rate limit')) {
                console.log('   ⚠️ Rate limiting detected');
            }
            if (responseStr.includes('fallback')) {
                console.log('   🔄 Fallback mode activated');
            }
            if (responseStr.includes('Secrets Manager')) {
                console.log('   🔐 Secrets Manager issue detected');
            }

            console.log('\n📄 Full Response:');
            console.log(responseStr);
        }

        // Test video assembler FFmpeg availability
        console.log('\n🎬 Testing video assembler FFmpeg status...');
        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: 'test-ffmpeg-debug',
            quality: 'low',
            format: 'mp4'
        });

        console.log('📊 Video Assembly Result:');
        console.log('   Success:', videoResult.success);
        console.log('   FFmpeg Available:', videoResult.data ? .ffmpegStatus ? .available);
        console.log('   Processing Mode:', videoResult.data ? .processingMode);
        console.log('   Video Size:', videoResult.data ? .performance ? .videoSize);

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    }
}

async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
        const fullUrl = baseUrl + (endpoint.startsWith('/') ? endpoint.substring(1) : endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        console.log(`🔗 Calling: ${method} ${fullUrl}`);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'API-Diagnosis/1.0'
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

diagnoseAPIKeys();
