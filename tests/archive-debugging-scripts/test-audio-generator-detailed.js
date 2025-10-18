const https = require('https');

async function testAudioGeneratorDetailed() {
    console.log('🧪 Testing Audio Generator with detailed error analysis...');

    const testData = {
        projectId: '2025-10-17T00-26-06_travel-to-peru'
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/audio/generate',
            method: 'POST',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000 // API Gateway timeout
        };

        console.log('📤 Making API request to Audio Generator...');
        const startTime = Date.now();

        const req = https.request(options, (res) => {
            let responseData = '';
            console.log('📋 Response Status:', res.statusCode);
            console.log('📋 Response Headers:', res.headers);

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                const duration = Date.now() - startTime;
                console.log(`⏱️ Request took: ${duration}ms`);

                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Audio Generator Response:');
                    console.log(JSON.stringify(result, null, 2));

                    if (result.success) {
                        console.log('🎉 Audio Generator working!');
                        if (result.audioFiles) {
                            console.log('🎵 Audio files generated:', result.audioFiles.length);
                        }
                    } else if (result.error) {
                        console.log('❌ Audio Generator Error Details:');
                        console.log('  Type:', result.error.type);
                        console.log('  Message:', result.error.message);
                        if (result.error.details) {
                            console.log('  Details:', JSON.stringify(result.error.details, null, 2));
                        }
                    }

                    resolve(result);
                } catch (e) {
                    console.log('❌ Failed to parse response:', responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
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
            console.error('❌ Request timeout (30s) - API Gateway limit reached');
            req.destroy();
            resolve({
                success: false,
                error: 'API Gateway timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

testAudioGeneratorDetailed().then(result => {
    console.log('\n🎯 Audio Generator test completed');

    if (result.success) {
        console.log('✅ Status: WORKING');
    } else if (result.error === 'API Gateway timeout') {
        console.log('⏱️ Status: TIMEOUT (function may be working but taking >30s)');
    } else {
        console.log('❌ Status: ERROR -', result.error);
    }
});