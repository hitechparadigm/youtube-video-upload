const https = require('https');

async function testManifestBuilder() {
    console.log('🧪 Testing Manifest Builder with existing Peru project...');

    const testData = {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        minVisuals: 1,
        allowPlaceholders: true
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/manifest/build',
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
                    console.log('✅ Manifest Builder Response:');
                    console.log(JSON.stringify(result, null, 2));
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

testManifestBuilder().then(result => {
    if (result.success) {
        console.log('🎉 Manifest Builder working!');
        if (result.kpis) {
            console.log('📊 KPIs:', result.kpis);
        }
    } else {
        console.log('❌ Manifest Builder issues');
    }
});