const https = require('https');

async function testMediaCurator() {
    console.log('🖼️ TESTING MEDIA CURATOR');
    console.log('========================');

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
                    console.log('📊 Media Curator Response:');
                    console.log(`   Status Code: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);

                    if (result.success) {
                        console.log(`   ✅ Images downloaded: ${result.imagesDownloaded || 'N/A'}`);
                        console.log(`   ✅ Scenes processed: ${result.scenesProcessed || 'N/A'}`);
                    } else {
                        console.log(`   ❌ Error: ${result.error?.message || result.message || 'Unknown error'}`);
                        console.log(`   ❌ Type: ${result.error?.type || result.type || 'Unknown'}`);
                    }

                    console.log('\n📝 Full Response:');
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

        req.write(postData);
        req.end();
    });
}

if (require.main === module) {
    testMediaCurator()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Media Curator working!');
            } else {
                console.log('\n⚠️ Media Curator has issues but may not be blocking');
                console.log('💡 Check if media files already exist from previous runs');
            }
        })
        .catch(error => {
            console.error('\n❌ Media Curator test failed:', error.message);
        });
}

module.exports = {
    testMediaCurator
};