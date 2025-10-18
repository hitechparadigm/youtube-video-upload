const https = require('https');

async function testAPIGatewayMedia() {
    console.log('🧪 Testing Media Curator via API Gateway...');

    const testData = {
        projectId: 'test-peru-travel-' + Date.now(),
        sceneContext: {
            scenes: [{
                id: 'scene1',
                purpose: 'introduction',
                script: 'Welcome to Peru, a land of ancient mysteries and breathtaking landscapes.',
                keywords: ['Peru', 'travel', 'introduction', 'landscape']
            }]
        },
        searchKeywords: ['Peru travel', 'Machu Picchu', 'Andes mountains']
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/media/curate',
            method: 'POST',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ API Gateway Response:', JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (e) {
                    console.log('❌ Failed to parse response:', responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response'
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error('❌ Request timeout');
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

testAPIGatewayMedia().then(result => {
    if (result.success) {
        console.log('🎉 Media Curator working via API Gateway!');
    } else {
        console.log('❌ Media Curator still has issues:', result.error);
    }
});