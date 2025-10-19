#!/usr/bin/env node

/**
 * Quick Authentication Test
 * Based on documentation: "✅ WORKING - YouTube OAuth authentication test"
 * Tests the YouTube OAuth 2.0 authentication system
 */

const https = require('https');

class QuickAuthTest {
    constructor() {
        this.baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        this.apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';
    }

    async makeRequest(path, method = 'POST', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'User-Agent': 'Quick-Auth-Test/1.0'
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

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testYouTubeAuth() {
        console.log('🔐 Quick YouTube Authentication Test');
        console.log('='.repeat(50));
        console.log(`🌐 API Base URL: ${this.baseUrl}`);
        console.log(`🔑 API Key: ***${this.apiKey.slice(-4)}`);
        console.log('📚 Based on documentation: OAuth 2.0 authentication working');
        console.log('');

        console.log('🧪 Testing YouTube Authentication Check...');

        try {
            const response = await this.makeRequest('/youtube/auth-check', 'POST', {
                testMode: true
            });

            console.log(`📊 Status Code: ${response.statusCode}`);

            if (response.statusCode === 200 && response.body) {
                console.log('✅ SUCCESS: YouTube authentication is working!');
                console.log(`📄 Response: ${JSON.stringify(response.body, null, 2)}`);

                if (response.body.channelId) {
                    console.log(`🎬 Channel ID: ${response.body.channelId}`);
                }
                if (response.body.channelTitle) {
                    console.log(`📺 Channel: ${response.body.channelTitle}`);
                }

                return true;
            } else if (response.statusCode === 403) {
                console.log('❌ FAILED: 403 Forbidden - API Key authentication issue');
                console.log('💡 This suggests the API Gateway configuration has changed');
                return false;
            } else if (response.statusCode === 404) {
                console.log('❌ FAILED: 404 Not Found - Endpoint may have changed');
                console.log('💡 Try alternative endpoints like /youtube/debug-credentials');
                return false;
            } else {
                console.log(`⚠️  UNEXPECTED: Status ${response.statusCode}`);
                console.log(`📄 Response: ${JSON.stringify(response.body, null, 2)}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            return false;
        }
    }

    async testAlternativeEndpoints() {
        console.log('\n🔍 Testing Alternative YouTube Endpoints...');

        const endpoints = [
            '/youtube/debug-credentials',
            '/youtube/status',
            '/youtube/health'
        ];

        for (const endpoint of endpoints) {
            console.log(`\n🧪 Testing: ${endpoint}`);

            try {
                const response = await this.makeRequest(endpoint, 'POST', {
                    testMode: true
                });
                console.log(`   📊 Status: ${response.statusCode}`);

                if (response.statusCode === 200) {
                    console.log(`   ✅ SUCCESS: ${endpoint} is working!`);
                    if (response.body) {
                        console.log(`   📄 Response: ${JSON.stringify(response.body).substring(0, 200)}...`);
                    }
                } else if (response.statusCode === 403) {
                    console.log(`   🔒 FORBIDDEN: API Key issue`);
                } else if (response.statusCode === 404) {
                    console.log(`   🚫 NOT FOUND: Endpoint doesn't exist`);
                } else {
                    console.log(`   ℹ️  Status: ${response.statusCode}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async runTest() {
        const authResult = await this.testYouTubeAuth();

        if (!authResult) {
            await this.testAlternativeEndpoints();
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 QUICK AUTH TEST SUMMARY');
        console.log('='.repeat(50));

        if (authResult) {
            console.log('✅ RESULT: YouTube authentication is working!');
            console.log('📚 This confirms the documentation showing OAuth 2.0 success');
            console.log('🎬 Ready for video publishing operations');
        } else {
            console.log('❌ RESULT: Authentication test failed');
            console.log('📚 Documentation shows working system - may need configuration updates');
            console.log('💡 Possible issues:');
            console.log('   - API Gateway configuration changed');
            console.log('   - API Key expired or rotated');
            console.log('   - Endpoint paths changed');
            console.log('   - Different environment (dev/staging vs prod)');
        }

        console.log('='.repeat(50));
        return authResult;
    }
}

if (require.main === module) {
    const test = new QuickAuthTest();
    test.runTest()
        .then(result => {
            process.exit(result ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = QuickAuthTest;