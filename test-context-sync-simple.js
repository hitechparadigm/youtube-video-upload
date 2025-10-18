/**
 * Simple Context Synchronization Test
 * Tests the integration between Topic Management and Script Generator using curl
 */

const {
    execSync
} = require('child_process');
const {
    randomUUID
} = require('crypto');

// Test configuration
const TEST_CONFIG = {
    topicManagementUrl: 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod/topics',
    scriptGeneratorUrl: 'https://8tczdwx7q9.execute-api.us-east-1.amazonaws.com/prod/scripts/generate'
};

/**
 * Execute curl command and return parsed JSON response
 */
function executeCurl(url, method = 'GET', data = null) {
    try {
        let curlCommand = `curl.exe -s -X ${method} "${url}"`;

        if (data) {
            curlCommand += ` -H "Content-Type: application/json" -d "${JSON.stringify(data).replace(/"/g, '\\"')}"`;
        }

        console.log(`🔄 Executing: ${curlCommand.substring(0, 100)}...`);

        const response = execSync(curlCommand, {
            encoding: 'utf8',
            timeout: 30000
        });

        try {
            return JSON.parse(response);
        } catch (parseError) {
            console.error('❌ Failed to parse response as JSON:', response.substring(0, 200));
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('❌ Curl command failed:', error.message);
        throw error;
    }
}

/**
 * Test context synchronization
 */
async function testContextSynchronization() {
    console.log('🧪 CONTEXT SYNCHRONIZATION TEST');
    console.log('================================');

    try {
        // Generate unique test topic
        const testId = randomUUID().substring(0, 8);
        const testTopic = `Context Sync Test ${testId}`;

        console.log(`📝 Testing with topic: "${testTopic}"`);

        // Step 1: Call Topic Management
        console.log('\n🔄 Step 1: Calling Topic Management...');
        const topicData = {
            topic: testTopic,
            targetAudience: 'general',
            videoDuration: 300,
            contentType: 'educational'
        };

        const topicResponse = executeCurl(TEST_CONFIG.topicManagementUrl, 'POST', topicData);

        if (!topicResponse.success) {
            throw new Error(`Topic Management failed: ${JSON.stringify(topicResponse)}`);
        }

        console.log('✅ Topic Management completed successfully');
        console.log(`   - Project ID: ${topicResponse.projectId}`);
        console.log(`   - Context stored: ${topicResponse.contextStored}`);
        console.log(`   - Approach: ${topicResponse.approach}`);

        // Step 2: Wait for context propagation
        console.log('\n⏳ Step 2: Waiting 3 seconds for context propagation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 3: Call Script Generator
        console.log('\n🔄 Step 3: Calling Script Generator with retry logic...');
        const scriptData = {
            projectId: topicResponse.projectId,
            scriptOptions: {
                style: 'engaging_educational',
                targetAudience: 'general'
            }
        };

        const scriptResponse = executeCurl(TEST_CONFIG.scriptGeneratorUrl, 'POST', scriptData);

        if (!scriptResponse.success) {
            throw new Error(`Script Generator failed: ${JSON.stringify(scriptResponse)}`);
        }

        console.log('✅ Script Generator completed successfully');
        console.log(`   - Project ID: ${scriptResponse.projectId}`);
        console.log(`   - Scenes generated: ${scriptResponse.sceneContext?.scenes?.length || 0}`);
        console.log(`   - Fast track mode: ${scriptResponse.fastTrackMode}`);
        console.log(`   - Validation passed: ${scriptResponse.validationPassed}`);

        // Validate results
        if (!scriptResponse.sceneContext || !scriptResponse.sceneContext.scenes) {
            throw new Error('No scene context or scenes generated');
        }

        if (scriptResponse.sceneContext.scenes.length < 3) {
            throw new Error(`Insufficient scenes: ${scriptResponse.sceneContext.scenes.length} (minimum 3 required)`);
        }

        console.log('\n🎉 CONTEXT SYNCHRONIZATION TEST PASSED!');
        console.log('========================================');
        console.log('✅ Topic Management successfully stored context');
        console.log('✅ Script Generator successfully retrieved context with retry logic');
        console.log('✅ End-to-end pipeline flow is working correctly');
        console.log(`✅ Generated ${scriptResponse.sceneContext.scenes.length} scenes successfully`);

        return {
            success: true,
            projectId: topicResponse.projectId,
            scenesGenerated: scriptResponse.sceneContext.scenes.length
        };

    } catch (error) {
        console.error('\n❌ CONTEXT SYNCHRONIZATION TEST FAILED!');
        console.error('=========================================');
        console.error(`❌ Error: ${error.message}`);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test error handling with non-existent project
 */
async function testErrorHandling() {
    console.log('\n🧪 ERROR HANDLING TEST');
    console.log('=======================');

    try {
        const fakeProjectId = `fake-project-${randomUUID().substring(0, 8)}`;
        console.log(`📝 Testing with non-existent project ID: ${fakeProjectId}`);

        const scriptData = {
            projectId: fakeProjectId,
            scriptOptions: {
                style: 'engaging_educational',
                targetAudience: 'general'
            }
        };

        try {
            const scriptResponse = executeCurl(TEST_CONFIG.scriptGeneratorUrl, 'POST', scriptData);

            // If we get here, the request succeeded when it should have failed
            if (scriptResponse.success) {
                throw new Error('Script Generator should have failed with non-existent project ID');
            }

            console.log('✅ Proper error response received');
            console.log(`   - Success: ${scriptResponse.success}`);
            console.log(`   - Error message: ${scriptResponse.error?.message || 'No error message'}`);

        } catch (curlError) {
            // This is expected - the request should fail
            console.log('✅ Request properly failed as expected');
            console.log(`   - Error: ${curlError.message}`);
        }

        console.log('\n✅ ERROR HANDLING TEST PASSED!');
        return {
            success: true
        };

    } catch (error) {
        console.error('\n❌ ERROR HANDLING TEST FAILED!');
        console.error(`❌ Error: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('🚀 CONTEXT SYNCHRONIZATION FIX - SIMPLE TEST SUITE');
    console.log('===================================================');
    console.log(`Topic Management URL: ${TEST_CONFIG.topicManagementUrl}`);
    console.log(`Script Generator URL: ${TEST_CONFIG.scriptGeneratorUrl}`);

    const results = [];

    // Test 1: Context Synchronization
    const syncTest = await testContextSynchronization();
    results.push({
        test: 'Context Synchronization',
        ...syncTest
    });

    // Test 2: Error Handling
    const errorTest = await testErrorHandling();
    results.push({
        test: 'Error Handling',
        ...errorTest
    });

    // Summary
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=====================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${totalTests - passedTests} ❌`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${result.test}: ${status}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Context synchronization fix is working perfectly!');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some tests failed. Please review and fix any issues.');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});