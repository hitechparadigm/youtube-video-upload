const https = require('https');

async function testTopicManagement() {
    console.log('📋 TESTING TOPIC MANAGEMENT');
    console.log('===========================');

    const testData = {
        topic: 'Travel to Argentina',
        targetAudience: 'travel enthusiasts',
        videoDuration: 180
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/topic/analyze',
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
                    console.log('📊 Topic Management Response:');
                    console.log(`   Status Code: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);

                    if (result.success) {
                        console.log(`   ✅ Project ID: ${result.projectId || 'N/A'}`);
                        console.log(`   ✅ Subtopics: ${result.expandedTopics?.length || 'N/A'}`);
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
    testTopicManagement()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Topic Management working!');
                console.log(`📍 Created project: ${result.projectId}`);
            } else {
                console.log('\n❌ Topic Management has issues');
                console.log(`💡 Error: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('\n❌ Topic Management test failed:', error.message);
        });
}

module.exports = {
    testTopicManagement
};