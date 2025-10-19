#!/usr/bin/env node

/**
 * Test URL construction differences
 */

const https = require('https');
const {
    URL
} = require('url');

const API_URL = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';

async function testDirect() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'f00upvjiwg.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/',
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        };

        console.log('Direct - Path:', options.path);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Direct Status:', res.statusCode);
                resolve(res.statusCode);
            });
        });

        req.on('error', (error) => {
            console.log('Direct Error:', error.message);
            resolve(0);
        });

        req.end();
    });
}

async function testWithURL() {
    return new Promise((resolve) => {
        const url = new URL('/', API_URL);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        };

        console.log('URL Constructor - Hostname:', url.hostname);
        console.log('URL Constructor - Pathname:', url.pathname);
        console.log('URL Constructor - Full URL:', url.href);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('URL Constructor Status:', res.statusCode);
                resolve(res.statusCode);
            });
        });

        req.on('error', (error) => {
            console.log('URL Constructor Error:', error.message);
            resolve(0);
        });

        req.end();
    });
}

async function runComparison() {
    console.log('🔍 URL Construction Comparison');
    console.log('==============================');

    console.log('\n1. Direct hostname/path construction:');
    await testDirect();

    console.log('\n2. Using URL constructor (GitHub Actions method):');
    await testWithURL();

    console.log('\n3. URL Analysis:');
    const url = new URL('/', API_URL);
    console.log('Base URL:', API_URL);
    console.log('Endpoint:', '/');
    console.log('Constructed URL:', url.href);
    console.log('Hostname:', url.hostname);
    console.log('Pathname:', url.pathname);
}

runComparison().catch(console.error);