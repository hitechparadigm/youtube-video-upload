#!/usr/bin/env node

/**
 * Simple Node.js test using fetch (if available) or basic approach
 */

// Try using fetch if available (Node 18+)
async function testWithFetch() {
    try {
        const response = await fetch('https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod/', {
            method: 'GET',
            headers: {
                'x-api-key': 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk'
            }
        });

        console.log('Fetch Status:', response.status);
        const text = await response.text();
        console.log('Fetch Response:', text.substring(0, 200));
        return response.status;
    } catch (error) {
        console.log('Fetch not available or error:', error.message);
        return null;
    }
}

// Test with basic HTTPS but different approach
async function testWithHTTPS() {
    const https = require('https');

    return new Promise((resolve) => {
        const options = {
            hostname: 'f00upvjiwg.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/',
            method: 'GET',
            headers: {
                'x-api-key': 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('HTTPS Status:', res.statusCode);
                console.log('HTTPS Response:', data.substring(0, 200));
                resolve(res.statusCode);
            });
        });

        req.on('error', (error) => {
            console.log('HTTPS Error:', error.message);
            resolve(0);
        });

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Simple Node.js API Tests');
    console.log('===========================');

    console.log('\n1. Testing with fetch (Node 18+):');
    await testWithFetch();

    console.log('\n2. Testing with HTTPS module:');
    await testWithHTTPS();

    console.log('\n3. Node.js version:');
    console.log(process.version);
}

runTests().catch(console.error);