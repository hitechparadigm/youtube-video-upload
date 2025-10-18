/**
 * Debug Media Curator Issue
 */

const https = require('https');

async function testMediaCurator() {
    console.log('🖼️ Testing Media Curator with Travel to Peru project');

    const projectId = '2025-10-17T00-18-50_travel-to-peru';

    const postData = JSON.stringify({
        projectId
    });

    const options = {
        hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
        port: 443,
        path: '/prod/media/curate',
        method: 'POST',
        headers: {
            'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Response:', data);
            try {
                const response = JSON.parse(data);
                console.log('Parsed:', JSON.stringify(response, null, 2));
            } catch (e) {
                console.log('Failed to parse JSON');
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error);
    });

    req.write(postData);
    req.end();
}

testMediaCurator();