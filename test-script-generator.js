const https = require('https');

async function testScriptGenerator() {
    console.log('📝 TESTING SCRIPT GENERATOR');
    console.log('===========================');

    // Try with a new project ID
    const projectId = `2025-10-17T${new Date().toISOString().substr(11, 8)}_travel-to-argentina`;
    console.log(`📍 Test Project: ${projectId}`);

    const testData = {
        projectId: projectId,
        targetDuration: 180,
        style: 'engaging-informative'
    };

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testData);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: '/prod/script/generate',
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
                    console.log('📊 Script Generator Response:');
                    console.log(`   Status Code: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);

                    if (result.success) {
                        console.log(`   ✅ Scenes: ${result.scenes?.length || result.totalScenes || 'N/A'}`);
                        console.log(`   ✅ Duration: ${result.totalDuration || 'N/A'}s`);
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
    testScriptGenerator()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Script Generator working!');
                console.log(`📝 Created script with ${result.scenes?.length || result.totalScenes} scenes`);
            } else {
                console.log('\n❌ Script Generator has issues');
                console.log(`💡 Error: ${result.error}`);
            }
        })
        .catch(error => {
            console.error('\n❌ Script Generator test failed:', error.message);
        });
}

module.exports = {
    testScriptGenerator
};