const https = require('https');

async function testTopicManagementDetailed() {
    console.log('📋 DETAILED TOPIC MANAGEMENT TESTING');
    console.log('====================================');
    console.log('🔍 Testing different endpoints and methods to identify auth issue');
    console.log('');

    // Test 1: Health endpoint (should work if handler is correct)
    console.log('🏥 TEST 1: Health Check Endpoint');
    console.log('--------------------------------');
    const healthResult = await callAPI('/topic/health', 'GET', {});
    console.log(`Health Check: ${healthResult.success ? 'PASS' : 'FAIL'}`);
    if (!healthResult.success) {
        console.log(`Error: ${healthResult.error || healthResult.message}`);
    }
    console.log('');

    // Test 2: Alternative health endpoint
    console.log('🏥 TEST 2: Alternative Health Endpoint');
    console.log('-------------------------------------');
    const altHealthResult = await callAPI('/topics/health', 'GET', {});
    console.log(`Alt Health Check: ${altHealthResult.success ? 'PASS' : 'FAIL'}`);
    if (!altHealthResult.success) {
        console.log(`Error: ${altHealthResult.error || altHealthResult.message}`);
    }
    console.log('');

    // Test 3: GET topics (list)
    console.log('📋 TEST 3: List Topics');
    console.log('----------------------');
    const listResult = await callAPI('/topics', 'GET', {});
    console.log(`List Topics: ${listResult.success ? 'PASS' : 'FAIL'}`);
    if (!listResult.success) {
        console.log(`Error: ${listResult.error || listResult.message}`);
    }
    console.log('');

    // Test 4: POST topic analyze (the main endpoint)
    console.log('🎯 TEST 4: Topic Analyze (Main Function)');
    console.log('----------------------------------------');
    const analyzeResult = await callAPI('/topic/analyze', 'POST', {
        topic: 'Travel to Argentina',
        targetAudience: 'travel enthusiasts',
        videoDuration: 180
    });
    console.log(`Topic Analyze: ${analyzeResult.success ? 'PASS' : 'FAIL'}`);
    if (!analyzeResult.success) {
        console.log(`Error: ${analyzeResult.error || analyzeResult.message}`);
        console.log(`Raw Response: ${analyzeResult.rawResponse || 'N/A'}`);
    }
    console.log('');

    // Test 5: Check if it's a handler path issue by testing different paths
    console.log('🔧 TEST 5: Different Topic Endpoints');
    console.log('------------------------------------');
    const endpoints = ['/topics', '/topics/health', '/topic/analyze'];

    for (const endpoint of endpoints) {
        const method = endpoint.includes('analyze') ? 'POST' : 'GET';
        const data = endpoint.includes('analyze') ? {
            topic: 'Test Topic'
        } : {};

        const result = await callAPI(endpoint, method, data);
        console.log(`${endpoint} (${method}): ${result.success ? 'PASS' : 'FAIL'}`);

        if (!result.success) {
            const errorMsg = result.error || result.message || 'Unknown error';
            console.log(`  Error: ${errorMsg}`);

            // Check for specific error types
            if (errorMsg.includes('Missing Authentication Token')) {
                console.log('  🔍 Issue: API Gateway authentication problem');
            } else if (errorMsg.includes('Internal server error')) {
                console.log('  🔍 Issue: Lambda runtime error (likely handler path)');
            } else if (errorMsg.includes('timeout')) {
                console.log('  🔍 Issue: Lambda timeout');
            }
        }
    }

    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('====================');
    console.log('Based on the test results:');

    if (!healthResult.success && !altHealthResult.success && !listResult.success) {
        console.log('❌ ALL endpoints failing - likely handler configuration issue');
        console.log('💡 Recommendation: Check Lambda handler path (should be index.handler)');
    } else if (healthResult.success || altHealthResult.success) {
        console.log('✅ Health endpoints working - handler is correct');
        console.log('❌ Main function failing - likely authentication or validation issue');
    } else {
        console.log('⚠️ Mixed results - need further investigation');
    }
}

async function callAPI(endpoint, method, data, timeout = 30000) {
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
                    console.log(`⚠️ Failed to parse response from ${endpoint}:`, responseData);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Request to ${endpoint} failed:`, error.message);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error(`❌ Request to ${endpoint} timed out`);
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
    testTopicManagementDetailed()
        .then(() => {
            console.log('\n✅ Detailed Topic Management testing completed');
        })
        .catch(error => {
            console.error('\n❌ Detailed testing failed:', error.message);
        });
}

module.exports = {
    testTopicManagementDetailed
};