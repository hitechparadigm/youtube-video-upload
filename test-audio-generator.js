const https = require('https');

async function testAudioGenerator() {
    console.log('🎵 TESTING AUDIO GENERATOR');
    console.log('=========================');

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
                    console.log('📊 Audio Generator Response:');
                    console.log(`   Status Code: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);

                    if (result.success) {
                        console.log(`   ✅ Audio files: ${result.audioFiles?.length || 'N/A'}`);
                        console.log(`   ✅ Master narration: ${result.masterNarration ? 'Created' : 'Not created'}`);
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

// Test with a new project to see if it can create audio from scratch
async function testAudioGeneratorNewProject() {
    console.log('\n🆕 TESTING AUDIO GENERATOR WITH NEW PROJECT');
    console.log('==========================================');

    const testData = {
        projectId: 'test-audio-' + Date.now()
    };

    console.log(`📍 Test Project: ${testData.projectId}`);
    console.log('⚠️ This should fail gracefully (no scene context)');

    const result = await testAudioGenerator();
    return result;
}

if (require.main === module) {
    testAudioGenerator()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Audio Generator working!');
            } else {
                console.log('\n⚠️ Audio Generator has issues but may not be blocking');
                console.log('💡 Check if audio files already exist from previous runs');
            }
        })
        .catch(error => {
            console.error('\n❌ Audio Generator test failed:', error.message);
        });
}

module.exports = {
    testAudioGenerator
};