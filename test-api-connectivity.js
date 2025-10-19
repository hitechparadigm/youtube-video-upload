#!/usr/bin/env node

/**
 * API Connectivity Test - Diagnose API Gateway and endpoints
 */

const https = require('https');

const baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function testEndpoint(path, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const url = new URL(path, baseUrl);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'User-Agent': 'API-Connectivity-Test/1.0'
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : body
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                error: error.message
            });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runDiagnostics() {
    console.log('🔍 API Gateway Connectivity Diagnostics');
    console.log('='.repeat(50));
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🔑 API Key: ***${apiKey.slice(-4)}`);
    console.log('');

    // Test different endpoints and methods
    const tests = [{
            name: 'Root GET',
            path: '/',
            method: 'GET'
        },
        {
            name: 'Root POST',
            path: '/',
            method: 'POST'
        },
        {
            name: 'Topic Management',
            path: '/topic/create',
            method: 'POST',
            data: {
                topic: 'test'
            }
        },
        {
            name: 'Script Generation',
            path: '/script/generate',
            method: 'POST',
            data: {
                topic: 'test'
            }
        },
        {
            name: 'Audio Generation',
            path: '/audio/generate',
            method: 'POST',
            data: {
                script: 'test'
            }
        },
        {
            name: 'Media Curation',
            path: '/media/curate',
            method: 'POST',
            data: {
                topic: 'test'
            }
        },
        {
            name: 'Video Assembly',
            path: '/video/assemble',
            method: 'POST',
            data: {
                topicId: 'test'
            }
        },
        {
            name: 'Manifest Builder',
            path: '/manifest/build',
            method: 'POST',
            data: {
                topicId: 'test'
            }
        },
        {
            name: 'YouTube Publishing',
            path: '/youtube/publish',
            method: 'POST',
            data: {
                manifest: {}
            }
        }
    ];

    for (const test of tests) {
        console.log(`🧪 Testing: ${test.name} (${test.method} ${test.path})`);
        const result = await testEndpoint(test.path, test.method, test.data);

        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   📊 Status: ${result.statusCode}`);
            if (result.statusCode === 200) {
                console.log(`   ✅ Success: ${JSON.stringify(result.body).substring(0, 100)}...`);
            } else if (result.statusCode === 403) {
                console.log(`   🔒 Forbidden: Check API Key`);
            } else if (result.statusCode === 404) {
                console.log(`   🚫 Not Found: Endpoint doesn't exist`);
            } else if (result.statusCode === 400) {
                console.log(`   ⚠️  Bad Request: ${JSON.stringify(result.body).substring(0, 100)}...`);
            } else {
                console.log(`   ℹ️  Response: ${JSON.stringify(result.body).substring(0, 100)}...`);
            }
        }
        console.log('');

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('🏁 Diagnostics Complete');
    console.log('='.repeat(50));
}

runDiagnostics().catch(console.error);