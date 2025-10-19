#!/usr/bin/env node

/**
 * Debug API Headers - Test different header combinations
 */

const https = require('https');
const {
    URL
} = require('url');

const API_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function testHeaders(testName, headers) {
    return new Promise((resolve) => {
        const url = new URL('/', API_URL);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'GET',
            headers: headers
        };

        console.log(`\n🧪 Testing: ${testName}`);
        console.log('Headers:', JSON.stringify(headers, null, 2));

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Response: ${responseData.substring(0, 100)}...`);
                resolve(res.statusCode);
            });
        });

        req.on('error', (error) => {
            console.log(`Error: ${error.message}`);
            resolve(0);
        });

        req.end();
    });
}

async function debugHeaders() {
    console.log('🔍 API Header Debugging');
    console.log('=======================');

    // Test 1: Minimal headers (like PowerShell)
    await testHeaders('Minimal Headers', {
        'x-api-key': API_KEY
    });

    // Test 2: With Content-Type
    await testHeaders('With Content-Type', {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    });

    // Test 3: With User-Agent
    await testHeaders('With User-Agent', {
        'x-api-key': API_KEY,
        'User-Agent': 'GitHub-Actions-Validator/1.0'
    });

    // Test 4: With both (current GitHub Actions)
    await testHeaders('GitHub Actions Headers', {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-Actions-Validator/1.0'
    });

    // Test 5: Different User-Agent
    await testHeaders('Different User-Agent', {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js/Test'
    });

    // Test 6: No User-Agent, just Content-Type
    await testHeaders('No User-Agent', {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    });
}

debugHeaders().catch(console.error);