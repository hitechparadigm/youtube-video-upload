/**
 * Comprehensive Test Suite for Context Synchronization Fix
 * Tests the integration between Topic Management and Script Generator
 */

const {
    randomUUID
} = require('crypto');

// Test configuration
const TEST_CONFIG = {
    region: 'us-east-1',
    profile: 'hitechparadigm',
    topicManagementUrl: 'https://ixqhqhqhqh.execute-api.us-east-1.amazonaws.com/prod/topics',
    scriptGeneratorUrl: 'https://ixqhqhqhqh.execute-api.us-east-1.amazonaws.com/prod/scripts/generate',
    testTopic: 'Context Synchronization Testing',
    testTimeout: 60000 // 60 seconds
};

/**
 * Test 1: Context Storage Integration
 * Validates that Topic Management creates proper DynamoDB Context table entries
 */
async function testContextStorageIntegration() {
    console.log('\n🧪 TEST 1: Context Storage Integration');
    console.log('=====================================');

    try {
        // Generate unique test topic
        const testId = randomUUID().substring(0, 8);
        const testTopic = `${TEST_CONFIG.testTopic} ${testId}`;

        console.log(`📝 Testing with topic: "${testTopic}"`);

        // Call Topic Management
        console.log('🔄 Calling Topic Management...');
        const topicResponse = await fetch(TEST_CONFIG.topicManagementUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: testTopic,
                targetAudience: 'general',
                videoDuration: 300,
                contentType: 'educational'
            })
        });

        if (!topicResponse.ok) {
            throw new Error(`Topic Management failed: ${topicResponse.status} ${topicResponse.statusText}`);
        }

        const topicResult = await topicResponse.json();
        console.log('✅ Topic Management completed successfully');
        console.log(`   - Project ID: ${topicResult.projectId}`);
        console.log(`   - Context stored: ${topicResult.contextStored}`);

        // Verify context storage structure
        if (!topicResult.projectId) {
            throw new Error('No project ID returned from Topic Management');
        }

        if (!topicResult.contextStored) {
            throw new Error('Context storage not confirmed by Topic Management');
        }

        console.log('✅ Context storage integration test PASSED');
        return {
            success: true,
            projectId: topicResult.projectId,
            testTopic: testTopic
        };

    } catch (error) {
        console.error('❌ Context storage integration test FAILED:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test 2: Context Retrieval with Retry Logic
 * Tests Script Generator's ability to retrieve context with retry logic
 */
async function testContextRetrievalWithRetry(projectId, testTopic) {
    console.log('\n🧪 TEST 2: Context Retrieval with Retry Logic');
    console.log('==============================================');

    try {
        console.log(`📝 Testing context retrieval for project: ${projectId}`);

        // Call Script Generator immediately after Topic Management
        console.log('🔄 Calling Script Generator with retry logic...');
        const scriptResponse = await fetch(TEST_CONFIG.scriptGeneratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: projectId,
                scriptOptions: {
                    style: 'engaging_educational',
                    targetAudience: 'general'
                }
            })
        });

        if (!scriptResponse.ok) {
            const errorText = await scriptResponse.text();
            throw new Error(`Script Generator failed: ${scriptResponse.status} ${scriptResponse.statusText} - ${errorText}`);
        }

        const scriptResult = await scriptResponse.json();
        console.log('✅ Script Generator completed successfully');
        console.log(`   - Project ID: ${scriptResult.projectId}`);
        console.log(`   - Scenes generated: ${scriptResult.sceneContext?.scenes?.length || 0}`);
        console.log(`   - Fast track mode: ${scriptResult.fastTrackMode}`);

        // Verify script generation results
        if (!scriptResult.success) {
            throw new Error('Script generation was not successful');
        }

        if (!scriptResult.sceneContext || !scriptResult.sceneContext.scenes) {
            throw new Error('No scene context or scenes generated');
        }

        if (scriptResult.sceneContext.scenes.length < 3) {
            throw new Error(`Insufficient scenes generated: ${scriptResult.sceneContext.scenes.length} (minimum 3 required)`);
        }

        console.log('✅ Context retrieval with retry logic test PASSED');
        return {
            success: true,
            scenesGenerated: scriptResult.sceneContext.scenes.length,
            fastTrackMode: scriptResult.fastTrackMode
        };

    } catch (error) {
        console.error('❌ Context retrieval with retry logic test FAILED:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test 3: End-to-End Context Flow
 * Tests complete flow from Topic Management to Script Generator
 */
async function testEndToEndContextFlow() {
    console.log('\n🧪 TEST 3: End-to-End Context Flow');
    console.log('===================================');

    try {
        // Run Test 1: Context Storage
        const storageTest = await testContextStorageIntegration();
        if (!storageTest.success) {
            throw new Error(`Context storage test failed: ${storageTest.error}`);
        }

        // Wait a moment for context propagation
        console.log('⏳ Waiting 2 seconds for context propagation...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run Test 2: Context Retrieval
        const retrievalTest = await testContextRetrievalWithRetry(storageTest.projectId, storageTest.testTopic);
        if (!retrievalTest.success) {
            throw new Error(`Context retrieval test failed: ${retrievalTest.error}`);
        }

        console.log('✅ End-to-end context flow test PASSED');
        return {
            success: true,
            projectId: storageTest.projectId,
            testTopic: storageTest.testTopic,
            scenesGenerated: retrievalTest.scenesGenerated
        };

    } catch (error) {
        console.error('❌ End-to-end context flow test FAILED:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test 4: Context Synchronization Timing
 * Tests various timing scenarios for context availability
 */
async function testContextSynchronizationTiming() {
    console.log('\n🧪 TEST 4: Context Synchronization Timing');
    console.log('==========================================');

    try {
        const testId = randomUUID().substring(0, 8);
        const testTopic = `Timing Test ${testId}`;

        console.log(`📝 Testing timing with topic: "${testTopic}"`);

        // Start Topic Management
        console.log('🔄 Starting Topic Management...');
        const topicPromise = fetch(TEST_CONFIG.topicManagementUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: testTopic,
                targetAudience: 'general',
                videoDuration: 240,
                contentType: 'educational'
            })
        });

        // Wait for Topic Management to complete
        const topicResponse = await topicPromise;
        if (!topicResponse.ok) {
            throw new Error(`Topic Management failed: ${topicResponse.status}`);
        }

        const topicResult = await topicResponse.json();
        console.log('✅ Topic Management completed');

        // Immediately call Script Generator (tests retry logic)
        console.log('🔄 Immediately calling Script Generator (testing retry logic)...');
        const scriptResponse = await fetch(TEST_CONFIG.scriptGeneratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: topicResult.projectId,
                scriptOptions: {
                    style: 'engaging_educational',
                    targetAudience: 'general'
                }
            })
        });

        if (!scriptResponse.ok) {
            const errorText = await scriptResponse.text();
            throw new Error(`Script Generator failed: ${scriptResponse.status} - ${errorText}`);
        }

        const scriptResult = await scriptResponse.json();
        console.log('✅ Script Generator completed with retry logic');
        console.log(`   - Success: ${scriptResult.success}`);
        console.log(`   - Scenes: ${scriptResult.sceneContext?.scenes?.length || 0}`);

        console.log('✅ Context synchronization timing test PASSED');
        return {
            success: true,
            projectId: topicResult.projectId,
            immediateRetrieval: true
        };

    } catch (error) {
        console.error('❌ Context synchronization timing test FAILED:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test 5: Error Handling and Recovery
 * Tests behavior when context is not found or corrupted
 */
async function testErrorHandlingAndRecovery() {
    console.log('\n🧪 TEST 5: Error Handling and Recovery');
    console.log('======================================');

    try {
        // Test with non-existent project ID
        const fakeProjectId = `fake-project-${randomUUID().substring(0, 8)}`;
        console.log(`📝 Testing with non-existent project ID: ${fakeProjectId}`);

        console.log('🔄 Calling Script Generator with fake project ID...');
        const scriptResponse = await fetch(TEST_CONFIG.scriptGeneratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: fakeProjectId,
                scriptOptions: {
                    style: 'engaging_educational',
                    targetAudience: 'general'
                }
            })
        });

        // This should fail with a 400 error
        if (scriptResponse.ok) {
            throw new Error('Script Generator should have failed with non-existent project ID');
        }

        if (scriptResponse.status !== 400) {
            throw new Error(`Expected 400 error, got ${scriptResponse.status}`);
        }

        const errorResult = await scriptResponse.json();
        console.log('✅ Proper error handling confirmed');
        console.log(`   - Status: ${scriptResponse.status}`);
        console.log(`   - Error type: ${(errorResult.error && errorResult.error.type) || 'unknown'}`);

        // Verify error message mentions retry attempts
        const errorMessage = (errorResult.error && errorResult.error.message) || errorResult.message || '';
        if (!errorMessage.includes('retry')) {
            console.log('⚠️ Error message does not mention retry attempts');
        } else {
            console.log('✅ Error message includes retry attempt information');
        }

        console.log('✅ Error handling and recovery test PASSED');
        return {
            success: true,
            properErrorHandling: true,
            errorStatus: scriptResponse.status
        };

    } catch (error) {
        console.error('❌ Error handling and recovery test FAILED:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 CONTEXT SYNCHRONIZATION FIX - COMPREHENSIVE TEST SUITE');
    console.log('=========================================================');
    console.log(`Test Configuration:`);
    console.log(`  - Region: ${TEST_CONFIG.region}`);
    console.log(`  - Profile: ${TEST_CONFIG.profile}`);
    console.log(`  - Topic Management URL: ${TEST_CONFIG.topicManagementUrl}`);
    console.log(`  - Script Generator URL: ${TEST_CONFIG.scriptGeneratorUrl}`);
    console.log(`  - Test Timeout: ${TEST_CONFIG.testTimeout}ms`);

    const testResults = {
        totalTests: 5,
        passedTests: 0,
        failedTests: 0,
        results: []
    };

    try {
        // Test 1: Context Storage Integration
        const test1 = await testContextStorageIntegration();
        testResults.results.push({
            test: 'Context Storage Integration',
            ...test1
        });
        if (test1.success) testResults.passedTests++;
        else testResults.failedTests++;

        // Test 2: Context Retrieval (only if Test 1 passed)
        if (test1.success) {
            const test2 = await testContextRetrievalWithRetry(test1.projectId, test1.testTopic);
            testResults.results.push({
                test: 'Context Retrieval with Retry',
                ...test2
            });
            if (test2.success) testResults.passedTests++;
            else testResults.failedTests++;
        } else {
            testResults.results.push({
                test: 'Context Retrieval with Retry',
                success: false,
                error: 'Skipped due to Test 1 failure'
            });
            testResults.failedTests++;
        }

        // Test 3: End-to-End Flow
        const test3 = await testEndToEndContextFlow();
        testResults.results.push({
            test: 'End-to-End Context Flow',
            ...test3
        });
        if (test3.success) testResults.passedTests++;
        else testResults.failedTests++;

        // Test 4: Timing
        const test4 = await testContextSynchronizationTiming();
        testResults.results.push({
            test: 'Context Synchronization Timing',
            ...test4
        });
        if (test4.success) testResults.passedTests++;
        else testResults.failedTests++;

        // Test 5: Error Handling
        const test5 = await testErrorHandlingAndRecovery();
        testResults.results.push({
            test: 'Error Handling and Recovery',
            ...test5
        });
        if (test5.success) testResults.passedTests++;
        else testResults.failedTests++;

    } catch (error) {
        console.error('❌ Test suite execution failed:', error.message);
    }

    // Print summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${testResults.totalTests}`);
    console.log(`Passed: ${testResults.passedTests} ✅`);
    console.log(`Failed: ${testResults.failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((testResults.passedTests / testResults.totalTests) * 100)}%`);

    console.log('\n📋 DETAILED RESULTS:');
    testResults.results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${result.test}: ${status}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    if (testResults.passedTests === testResults.totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Context synchronization fix is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the results and fix any issues.');
    }

    return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests()
        .then(results => {
            process.exit(results.passedTests === results.totalTests ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runAllTests,
    testContextStorageIntegration,
    testContextRetrievalWithRetry,
    testEndToEndContextFlow,
    testContextSynchronizationTiming,
    testErrorHandlingAndRecovery
};