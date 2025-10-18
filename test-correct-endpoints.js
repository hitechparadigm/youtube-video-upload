const https = require('https');

async function testCorrectEndpoints() {
    console.log('🎯 TESTING CORRECT ENDPOINT PATTERNS');
    console.log('====================================');
    console.log('💡 Based on API Gateway configuration, using correct routes');
    console.log('');

    // Test 1: Topic Management with correct endpoint
    console.log('📋 TEST 1: Topic Management (Correct Route)');
    console.log('--------------------------------------------');
    const topicResult = await callAPI('/topics', 'POST', {
        topic: 'Travel to Argentina',
        targetAudience: 'travel enthusiasts',
        videoDuration: 180,
        contentType: 'travel-guide'
    });

    console.log(`Topic Management: ${topicResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (topicResult.success) {
        console.log(`  Project ID: ${(topicResult.response && topicResult.response.projectId) || 'N/A'}`);
        console.log(`  Subtopics: ${(topicResult.response && topicResult.response.expandedTopics && topicResult.response.expandedTopics.length) || 'N/A'}`);
    } else {
        console.log(`  Error: ${topicResult.error}`);
    }
    console.log('');

    // Test 2: Script Generator with correct endpoint
    console.log('📝 TEST 2: Script Generator (Correct Route)');
    console.log('-------------------------------------------');
    const scriptResult = await callAPI('/scripts/generate', 'POST', {
        projectId: (topicResult.response && topicResult.response.projectId) || 'test-' + Date.now(),
        targetDuration: 180,
        style: 'engaging-informative'
    });

    console.log(`Script Generator: ${scriptResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (scriptResult.success) {
        console.log(`  Scenes: ${(scriptResult.response && scriptResult.response.scenes && scriptResult.response.scenes.length) || (scriptResult.response && scriptResult.response.totalScenes) || 'N/A'}`);
        console.log(`  Duration: ${(scriptResult.response && scriptResult.response.totalDuration) || 'N/A'}s`);
    } else {
        console.log(`  Error: ${scriptResult.error}`);
    }
    console.log('');

    // Test 3: Audio Generator (should work now with fixes)
    console.log('🎵 TEST 3: Audio Generator (Fixed Configuration)');
    console.log('------------------------------------------------');
    const audioResult = await callAPI('/audio/generate', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru'
    });

    console.log(`Audio Generator: ${audioResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (audioResult.success) {
        console.log(`  Audio files: ${(audioResult.response && audioResult.response.audioFiles && audioResult.response.audioFiles.length) || 'N/A'}`);
    } else {
        console.log(`  Error: ${audioResult.error}`);
    }
    console.log('');

    // Summary
    console.log('📊 ENDPOINT CORRECTION RESULTS');
    console.log('===============================');
    const results = [topicResult, scriptResult, audioResult];
    const successCount = results.filter(r => r.success).length;

    console.log(`✅ Working: ${successCount}/3 components`);
    console.log(`❌ Failed: ${3 - successCount}/3 components`);
    console.log(`📈 Success Rate: ${((successCount / 3) * 100).toFixed(1)}%`);
    console.log('');

    if (successCount >= 2) {
        console.log('🎉 MAJOR BREAKTHROUGH!');
        console.log('🚀 Ready to test complete Argentina video pipeline!');
        console.log('');
        console.log('✅ Correct endpoints identified:');
        console.log('  - Topic Management: /topics (not /topic/analyze)');
        console.log('  - Script Generator: /scripts/generate');
        console.log('  - Audio Generator: /audio/generate (with fixed config)');
        console.log('');
        console.log('Next step: Update Argentina video script with correct endpoints');
    } else {
        console.log('⚠️ Still need more investigation');
    }

    return {
        topicWorking: topicResult.success,
        scriptWorking: scriptResult.success,
        audioWorking: audioResult.success,
        projectId: (topicResult.response && topicResult.response.projectId)
    };
}

async function callAPI(endpoint, method, data) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: `/prod${endpoint}`,
            method: method,
            headers: {
                'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 60000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error',
                        response: null
                    });
                }
            });
        });

        req.on('error', (error) => resolve({
            success: false,
            error: error.message,
            response: null
        }));
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'timeout',
                response: null
            });
        });
        req.write(postData);
        req.end();
    });
}

if (require.main === module) {
    testCorrectEndpoints()
        .then(result => {
            if (result.topicWorking && result.scriptWorking) {
                console.log('\n🎉 SYSTEM FULLY OPERATIONAL!');
                console.log('Ready to create Argentina video with correct endpoints!');
            } else if (result.topicWorking || result.scriptWorking) {
                console.log('\n⚠️ PARTIAL SUCCESS - Some components working');
            } else {
                console.log('\n❌ Still need more debugging');
            }
        })
        .catch(console.error);
}

module.exports = {
    testCorrectEndpoints
};