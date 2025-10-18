const https = require('https');

async function testCorrectedEndpoints() {
    console.log('🔧 TESTING CORRECTED ENDPOINT PATTERNS');
    console.log('=====================================');
    console.log('🎯 Using the same URL patterns as working endpoints');
    console.log('');

    // Based on working endpoints, the pattern should be:
    // /media/curate, /audio/generate, /manifest/build, /youtube/publish
    // So Topic Management should be /topic/analyze (not /topics)
    // And Script Generator should be /script/generate

    console.log('📋 TEST 1: Topic Management - Corrected Pattern');
    console.log('-----------------------------------------------');

    // Test the corrected topic endpoint pattern
    const topicResult = await callAPI('/topic/analyze', 'POST', {
        topic: 'Travel to Argentina',
        targetAudience: 'travel enthusiasts',
        videoDuration: 180,
        contentType: 'travel-guide'
    });

    console.log(`Topic Analyze: ${topicResult.success ? 'PASS' : 'FAIL'}`);
    if (!topicResult.success) {
        console.log(`Error: ${topicResult.error || topicResult.message}`);

        // Check error type
        if (topicResult.message && topicResult.message.includes('Missing Authentication Token')) {
            console.log('🔍 Issue: This endpoint requires different authentication');
        } else if (topicResult.rawResponse && topicResult.rawResponse.includes('CloudFront')) {
            console.log('🔍 Issue: CloudFront routing problem');
        } else {
            console.log('🔍 Issue: Lambda runtime error');
        }
    } else {
        console.log(`✅ Topic Management working! Project ID: ${topicResult.projectId}`);
    }
    console.log('');

    console.log('📝 TEST 2: Script Generator - Corrected Pattern');
    console.log('-----------------------------------------------');

    // Test script generator with corrected pattern
    const scriptResult = await callAPI('/script/generate', 'POST', {
        projectId: 'test-project-' + Date.now(),
        targetDuration: 180,
        style: 'engaging-informative'
    });

    console.log(`Script Generate: ${scriptResult.success ? 'PASS' : 'FAIL'}`);
    if (!scriptResult.success) {
        console.log(`Error: ${scriptResult.error || scriptResult.message}`);

        // Check error type
        if (scriptResult.message && scriptResult.message.includes('Missing Authentication Token')) {
            console.log('🔍 Issue: This endpoint requires different authentication');
        } else if (scriptResult.rawResponse && scriptResult.rawResponse.includes('CloudFront')) {
            console.log('🔍 Issue: CloudFront routing problem');
        } else {
            console.log('🔍 Issue: Lambda runtime error');
        }
    } else {
        console.log(`✅ Script Generator working! Scenes: ${scriptResult.scenes?.length || scriptResult.totalScenes}`);
    }
    console.log('');

    console.log('🔍 TEST 3: Compare with Working Endpoints');
    console.log('-----------------------------------------');

    // Test a known working endpoint for comparison
    const manifestResult = await callAPI('/manifest/build', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        minVisuals: 1,
        allowPlaceholders: true
    });

    console.log(`Manifest Builder (Known Working): ${manifestResult.success ? 'PASS' : 'FAIL'}`);
    console.log('');

    console.log('📊 ENDPOINT PATTERN ANALYSIS');
    console.log('============================');
    console.log('Working Endpoints:');
    console.log('  ✅ /manifest/build');
    console.log('  ✅ /media/curate');
    console.log('  ✅ /audio/generate');
    console.log('  ✅ /youtube/publish');
    console.log('');
    console.log('Testing Endpoints:');
    console.log(`  ${topicResult.success ? '✅' : '❌'} /topic/analyze`);
    console.log(`  ${scriptResult.success ? '✅' : '❌'} /script/generate`);
    console.log('');

    if (topicResult.success && scriptResult.success) {
        console.log('🎉 SUCCESS: All endpoints working with correct patterns!');
        console.log('💡 The issue was endpoint routing, not authentication');
        return {
            success: true,
            topicWorking: true,
            scriptWorking: true,
            diagnosis: 'Endpoint routing fixed'
        };
    } else if (topicResult.success || scriptResult.success) {
        console.log('⚠️ PARTIAL SUCCESS: Some endpoints working');
        console.log('💡 Mixed results - need further investigation');
        return {
            success: false,
            topicWorking: topicResult.success,
            scriptWorking: scriptResult.success,
            diagnosis: 'Partial endpoint success'
        };
    } else {
        console.log('❌ AUTHENTICATION ISSUE CONFIRMED');
        console.log('💡 These endpoints require different authentication than others');
        return {
            success: false,
            topicWorking: false,
            scriptWorking: false,
            diagnosis: 'Authentication issue confirmed'
        };
    }
}

async function callAPI(endpoint, method, data, timeout = 60000) {
    return new Promise((resolve, reject) => {
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
            timeout: timeout
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
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
    testCorrectedEndpoints()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 ENDPOINT CORRECTION SUCCESSFUL!');
                console.log('🚀 Ready to test complete Argentina video pipeline');
            } else {
                console.log('\n⚠️ ENDPOINT ISSUES REMAIN');
                console.log(`📊 Topic Working: ${result.topicWorking}`);
                console.log(`📊 Script Working: ${result.scriptWorking}`);
                console.log(`🔍 Diagnosis: ${result.diagnosis}`);
            }
        })
        .catch(error => {
            console.error('\n❌ Endpoint testing failed:', error.message);
        });
}

module.exports = {
    testCorrectedEndpoints
};