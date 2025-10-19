#!/usr/bin/env node

/**
 * Endpoint Discovery Tool
 * Based on documentation showing 100% working system
 * Let's discover the actual working endpoints and authentication
 */

const https = require('https');

const baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function testEndpoint(path, method = 'GET', headers = {}, data = null) {
    return new Promise((resolve) => {
        const url = new URL(path, baseUrl);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Endpoint-Discovery/1.0',
                ...headers
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

async function discoverEndpoints() {
    console.log('🔍 Discovering Working Endpoints');
    console.log('='.repeat(50));
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🔑 API Key: ***${apiKey.slice(-4)}`);
    console.log('');
    console.log('📚 Based on documentation: System is 100% operational with real YouTube videos published');
    console.log('🎯 Goal: Discover the actual working authentication and endpoints');
    console.log('');

    // Test different authentication methods
    const authMethods = [{
            name: 'x-api-key header',
            headers: {
                'x-api-key': apiKey
            }
        },
        {
            name: 'Authorization header',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        },
        {
            name: 'Authorization API Key',
            headers: {
                'Authorization': `ApiKey ${apiKey}`
            }
        },
        {
            name: 'API-Key header',
            headers: {
                'API-Key': apiKey
            }
        },
        {
            name: 'No auth',
            headers: {}
        }
    ];

    // Test different endpoint patterns
    const endpointPatterns = [
        // From SAM template
        {
            name: 'Topics (SAM)',
            path: '/topics',
            method: 'POST'
        },
        {
            name: 'Scripts Generate (SAM)',
            path: '/scripts/generate',
            method: 'POST'
        },
        {
            name: 'Media Curate (SAM)',
            path: '/media/curate',
            method: 'POST'
        },
        {
            name: 'Audio Generate (SAM)',
            path: '/audio/generate',
            method: 'POST'
        },
        {
            name: 'Manifest Build (SAM)',
            path: '/manifest/build',
            method: 'POST'
        },
        {
            name: 'Video Assemble (SAM)',
            path: '/video/assemble',
            method: 'POST'
        },
        {
            name: 'YouTube Publish (SAM)',
            path: '/youtube/publish',
            method: 'POST'
        },

        // Alternative patterns
        {
            name: 'Topic Create',
            path: '/topic/create',
            method: 'POST'
        },
        {
            name: 'Script Generate',
            path: '/script/generate',
            method: 'POST'
        },
        {
            name: 'Root',
            path: '/',
            method: 'GET'
        },
        {
            name: 'Health',
            path: '/health',
            method: 'GET'
        },
        {
            name: 'Status',
            path: '/status',
            method: 'GET'
        }
    ];

    console.log('🧪 Testing Authentication Methods');
    console.log('-'.repeat(30));

    // Test root endpoint with different auth methods
    for (const auth of authMethods) {
        console.log(`\n🔐 Testing: ${auth.name}`);
        const result = await testEndpoint('/', 'GET', auth.headers);

        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   📊 Status: ${result.statusCode}`);
            if (result.statusCode !== 403) {
                console.log(`   ✅ POTENTIAL SUCCESS: ${auth.name} returned ${result.statusCode}`);
                if (result.body) {
                    console.log(`   📄 Response: ${JSON.stringify(result.body).substring(0, 200)}...`);
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n\n🎯 Testing Endpoint Patterns (using x-api-key)');
    console.log('-'.repeat(40));

    // Test endpoints with the most common auth method
    const commonAuth = {
        'x-api-key': apiKey
    };

    for (const endpoint of endpointPatterns) {
        console.log(`\n🧪 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);

        const testData = endpoint.method === 'POST' ? {
            topic: 'Travel to Spain',
            test: true
        } : null;

        const result = await testEndpoint(endpoint.path, endpoint.method, commonAuth, testData);

        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   📊 Status: ${result.statusCode}`);

            if (result.statusCode === 200) {
                console.log(`   ✅ SUCCESS: ${endpoint.name} is working!`);
                if (result.body) {
                    console.log(`   📄 Response: ${JSON.stringify(result.body).substring(0, 300)}...`);
                }
            } else if (result.statusCode === 400) {
                console.log(`   ⚠️  BAD REQUEST: Endpoint exists but needs different data`);
                if (result.body) {
                    console.log(`   📄 Error: ${JSON.stringify(result.body).substring(0, 200)}...`);
                }
            } else if (result.statusCode === 404) {
                console.log(`   🚫 NOT FOUND: Endpoint doesn't exist`);
            } else if (result.statusCode === 403) {
                console.log(`   🔒 FORBIDDEN: Authentication issue`);
            } else {
                console.log(`   ℹ️  Other: ${result.statusCode}`);
                if (result.body) {
                    console.log(`   📄 Response: ${JSON.stringify(result.body).substring(0, 200)}...`);
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n\n🎯 DISCOVERY SUMMARY');
    console.log('='.repeat(50));
    console.log('📚 Documentation Status: System is 100% operational');
    console.log('🎬 Proof: Multiple real YouTube videos published');
    console.log('🔍 Discovery Goal: Find working authentication and endpoints');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Check results above for any non-403 responses');
    console.log('   2. Look for working authentication methods');
    console.log('   3. Identify actual endpoint patterns');
    console.log('   4. Update test with working configuration');
    console.log('='.repeat(50));
}

discoverEndpoints().catch(console.error);