const https = require('https');

async function testMediaCuratorWithExistingProject() {
    console.log('🧪 Testing Media Curator with existing Peru project...');

    const testData = {
        projectId: '2025-10-17T00-26-06_travel-to-peru'
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
            timeout: 120000 // 2 minute timeout for media processing
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('✅ Media Curator Response:');
                    console.log(JSON.stringify(result, null, 2));

                    if (result.success) {
                        console.log('🎉 Media Curator working with existing project!');
                        if (result.downloadStats) {
                            console.log('📊 Download Stats:', result.downloadStats);
                        }
                        if (result.sceneMediaMapping) {
                            console.log('🎬 Scene Media Mapping:', result.sceneMediaMapping.length, 'scenes');
                        }
                    } else {
                        console.log('❌ Media Curator Error Details:');
                        if (result.error) {
                            console.log('  Type:', result.error.type);
                            console.log('  Message:', result.error.message);
                            if (result.error.details) {
                                console.log('  Details:', JSON.stringify(result.error.details, null, 2));
                            }
                        }
                    }

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
            console.error('❌ Request timeout (2 minutes)');
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

testMediaCuratorWithExistingProject().then(result => {
    console.log('\n🎯 Test completed');
});