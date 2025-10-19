#!/usr/bin/env node

/**
 * Test the fixed URL construction logic
 */

const https = require('https');
const {
    URL
} = require('url');

const API_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function callAPIFixed(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        // Fixed URL construction to preserve API Gateway stage
        const baseUrl = API_URL.endsWith('/') ? API_URL : API_URL + '/';
        const fullUrl = baseUrl + (endpoint.startsWith('/') ? endpoint.substring(1) : endpoint);
        const url = new URL(fullUrl);
        const postData = data ? JSON.stringify(data) : null;

        console.log(`Fixed URL Construction:`);
        console.log(`  Base URL: ${API_URL}`);
        console.log(`  Endpoint: ${endpoint}`);
        console.log(`  Full URL: ${fullUrl}`);
        console.log(`  Final URL: ${url.href}`);

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

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    statusCode: res.statusCode,
                    body: responseData
                });
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

async function testFixedLogic() {
    console.log('🧪 Testing Fixed URL Construction Logic');
    console.log('=======================================');

    const tests = [{
            name: 'Root Endpoint',
            endpoint: '/'
        },
        {
            name: 'Topics Endpoint',
            endpoint: '/topics'
        },
        {
            name: 'Scripts Endpoint',
            endpoint: '/scripts/generate'
        }
    ];

    for (const test of tests) {
        console.log(`\n🔍 Testing: ${test.name}`);
        const result = await callAPIFixed(test.endpoint);
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        if (result.body) {
            console.log(`   Response: ${result.body.substring(0, 100)}...`);
        }
    }
}

testFixedLogic().catch(console.error);