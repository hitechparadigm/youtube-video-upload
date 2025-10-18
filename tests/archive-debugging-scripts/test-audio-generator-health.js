const https = require('https');

async function testAudioGeneratorHealth() {
    console.log('🧪 Testing Audio Generator health endpoint...');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/audio/health',
            method: 'GET',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx'
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            console.log('📋 Response Status:', res.statusCode);

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Audio Generator Health Response:');
                    console.log(JSON.stringify(result, null, 2));
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
            console.error('❌ Request timeout');
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.end();
    });
}

testAudioGeneratorHealth().then(result => {
    if (result.service === 'audio-generator') {
        console.log('🎉 Audio Generator health check working!');
    } else {
        console.log('❌ Audio Generator health check failed');
    }
});