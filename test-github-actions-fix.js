#!/usr/bin/env node

/**
 * Test script to verify GitHub Actions validation issue
 * This replicates the exact same logic as the GitHub Actions validation
 */

const https = require('https');
const {
    URL
} = require('url');

// Use the same values as GitHub Actions would get
const API_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const url = new URL(endpoint, API_URL);
        const postData = data ? JSON.stringify(data) : null;

        console.log(`Making request to: ${url.href}`);
        console.log(`Method: ${method}`);
        console.log(`API Key: ${API_KEY.substring(0, 8)}...`);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'GitHub-Actions-Validator/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        console.log('Request headers:', JSON.stringify(options.headers, null, 2));

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        error: 'JSON parse error'
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.log('Request error:', error);
            resolve({
                success: false,
                statusCode: 0,
                error: error.message,
                body: ''
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testGitHubActionsLogic() {
    console.log('🧪 Testing GitHub Actions Validation Logic');
    console.log('==========================================');
    console.log('API URL:', API_URL);
    console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'Not provided');
    console.log('');

    const tests = [{
            name: 'API Gateway Root Check',
            endpoint: '/',
            method: 'GET'
        },
        {
            name: 'Topic Management Health',
            endpoint: '/topics',
            method: 'GET'
        },
        {
            name: 'Script Generation Health',
            endpoint: '/scripts/generate',
            method: 'GET'
        }
    ];

    for (const test of tests) {
        console.log(`\n🔍 Running: ${test.name}`);
        try {
            const result = await callAPI(test.endpoint, test.method, test.data);

            console.log(`   📊 Status: ${result.statusCode}`);
            console.log(`   📄 Response: ${result.body ? result.body.substring(0, 200) : 'Empty'}...`);

            if (result.success || result.statusCode === 200 || result.statusCode === 201) {
                console.log(`   ✅ ${test.name}: PASSED`);
            } else if (result.statusCode === 403) {
                console.log(`   🔒 ${test.name}: FORBIDDEN (authentication issue)`);
                console.log(`   💡 This suggests API Gateway is deployed but auth config needs review`);
            } else {
                console.log(`   ❌ ${test.name}: FAILED`);
                console.log(`   📄 Error: ${result.error || result.body}`);
            }
        } catch (error) {
            console.log(`   ❌ ${test.name}: ERROR - ${error.message}`);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

testGitHubActionsLogic().catch(console.error);