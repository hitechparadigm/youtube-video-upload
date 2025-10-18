const https = require('https');

async function testSimpleMediaCurator() {
    console.log('🧪 Testing Media Curator health endpoint...');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/media/health',
            method: 'GET',
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx'
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Health check response:', JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (e) {
                    console.log('❌ Failed to parse health response:', responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response'
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Health check error:', error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error('❌ Health check timeout');
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.end();
    });
}

testSimpleMediaCurator().then(result => {
    console.log('Health check completed');
});