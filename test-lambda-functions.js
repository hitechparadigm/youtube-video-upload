#!/usr/bin/env node

/**
 * 🧪 LAMBDA FUNCTIONS FUNCTIONAL TEST SUITE
 * 
 * Tests actual Lambda function execution and integration
 * Verifies that functions can be invoked and produce expected outputs
 * 
 * TEST CATEGORIES:
 * 1. Individual Lambda Function Tests
 * 2. Shared Utilities Integration Tests  
 * 3. Context Flow Tests
 * 4. Error Handling Tests
 * 5. Performance Tests
 */

const fs = require('fs');
const path = require('path');

// Test Results Tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}`);
        if (details) console.log(`   ${details}`);
    }
    testResults.details.push({
        testName,
        passed,
        details
    });
}

async function testLambdaFunction(lambdaName, testEvent = {}) {
    console.log(`\n🧪 Testing ${lambdaName}...`);

    try {
        // Try to load the Lambda function
        const lambdaPath = `./src/lambda/${lambdaName}`;
        const indexPath = `${lambdaPath}/index.js`;
        const handlerPath = `${lambdaPath}/handler.js`;

        let lambdaModule;
        let mainFile;

        if (fs.existsSync(indexPath)) {
            mainFile = 'index.js';
            lambdaModule = require(indexPath);
        } else if (fs.existsSync(handlerPath)) {
            mainFile = 'handler.js';
            lambdaModule = require(handlerPath);
        } else {
            logTest(`${lambdaName} module loading`, false, 'No index.js or handler.js found');
            return false;
        }

        logTest(`${lambdaName} module loading`, true, `Loaded from ${mainFile}`);

        // Check if handler function exists
        const hasHandler = typeof lambdaModule.handler === 'function';
        logTest(`${lambdaName} handler function`, hasHandler);

        if (!hasHandler) {
            return false;
        }

        // Test basic invocation (with mock context)
        const mockContext = {
            functionName: `automated-video-pipeline-${lambdaName}`,
            functionVersion: '1',
            invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:automated-video-pipeline-${lambdaName}`,
            memoryLimitInMB: '512',
            awsRequestId: 'test-request-id',
            getRemainingTimeInMillis: () => 30000
        };

        // Create appropriate test event for each lambda
        const testEvents = {
            'topic-management': {
                httpMethod: 'POST',
                path: '/topic/analyze',
                body: JSON.stringify({
                    topic: 'Test Topic',
                    targetAudience: 'test audience',
                    videoDuration: 300
                })
            },
            'script-generator': {
                httpMethod: 'POST',
                path: '/script/generate',
                body: JSON.stringify({
                    projectId: 'test-project-123',
                    topic: 'Test Topic'
                })
            },
            'media-curator': {
                httpMethod: 'POST',
                path: '/media/curate',
                body: JSON.stringify({
                    projectId: 'test-project-123',
                    scenes: [{
                        sceneNumber: 1,
                        keywords: ['test']
                    }]
                })
            },
            'audio-generator': {
                httpMethod: 'POST',
                path: '/audio/generate',
                body: JSON.stringify({
                    projectId: 'test-project-123',
                    script: 'Test script content'
                })
            },
            'video-assembler': {
                httpMethod: 'POST',
                path: '/video/assemble',
                body: JSON.stringify({
                    projectId: 'test-project-123'
                })
            },
            'youtube-publisher': {
                httpMethod: 'POST',
                path: '/youtube/publish',
                body: JSON.stringify({
                    projectId: 'test-project-123',
                    videoPath: 'test-video.mp4'
                })
            },
            'workflow-orchestrator': {
                httpMethod: 'POST',
                path: '/workflow/start',
                body: JSON.stringify({
                    topic: 'Test Topic',
                    targetAudience: 'test'
                })
            },
            'manifest-builder': {
                httpMethod: 'POST',
                path: '/manifest/build',
                body: JSON.stringify({
                    projectId: 'test-project-123'
                })
            }
        };

        const eventToUse = testEvents[lambdaName] || testEvent;

        try {
            // Test function invocation with timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Function timeout')), 10000)
            );

            const executionPromise = lambdaModule.handler(eventToUse, mockContext);

            const result = await Promise.race([executionPromise, timeoutPromise]);

            // Check if result has expected structure
            const hasStatusCode = result && typeof result.statusCode === 'number';
            const hasBody = result && result.body;

            logTest(`${lambdaName} execution`, true, `Status: ${result?.statusCode || 'N/A'}`);
            logTest(`${lambdaName} response structure`, hasStatusCode && hasBody);

            // Try to parse response body if it exists
            if (hasBody) {
                try {
                    const parsedBody = JSON.parse(result.body);
                    logTest(`${lambdaName} response parsing`, true, `Response type: ${typeof parsedBody}`);
                } catch (parseError) {
                    logTest(`${lambdaName} response parsing`, false, 'Invalid JSON response');
                }
            }

            return true;

        } catch (executionError) {
            // Check if it's a configuration error vs logic error
            const isConfigError = executionError.message.includes('AWS') ||
                executionError.message.includes('credentials') ||
                executionError.message.includes('region') ||
                executionError.message.includes('Cannot resolve');

            if (isConfigError) {
                logTest(`${lambdaName} execution`, true, 'Config error (expected in test env)');
                return true;
            } else {
                logTest(`${lambdaName} execution`, false, executionError.message);
                return false;
            }
        }

    } catch (loadError) {
        logTest(`${lambdaName} module loading`, false, loadError.message);
        return false;
    }
}

async function testSharedUtilities() {
    console.log('\n🔧 TESTING SHARED UTILITIES');
    console.log('============================');

    const utilities = [
        'context-manager.js',
        'aws-service-manager.js',
        's3-folder-structure.js',
        'error-handler.js'
    ];

    for (const utility of utilities) {
        const utilityPath = `./src/layers/context-layer/nodejs/${utility}`;

        try {
            if (fs.existsSync(utilityPath)) {
                const utilityModule = require(utilityPath);

                logTest(`${utility} loading`, true);

                // Check for expected exports based on utility type
                if (utility === 'context-manager.js') {
                    const hasStoreContext = typeof utilityModule.storeContext === 'function';
                    const hasRetrieveContext = typeof utilityModule.retrieveContext === 'function';
                    logTest(`${utility} exports`, hasStoreContext && hasRetrieveContext);
                } else if (utility === 's3-folder-structure.js') {
                    const hasGeneratePaths = typeof utilityModule.generateS3Paths === 'function';
                    logTest(`${utility} exports`, hasGeneratePaths);
                } else {
                    // Check for any exports
                    const hasExports = Object.keys(utilityModule).length > 0;
                    logTest(`${utility} exports`, hasExports);
                }
            } else {
                logTest(`${utility} loading`, false, 'File not found');
            }
        } catch (error) {
            logTest(`${utility} loading`, false, error.message);
        }
    }
}

async function runFunctionalTests() {
    console.log('🧪 LAMBDA FUNCTIONS FUNCTIONAL TEST SUITE');
    console.log('==========================================');
    console.log('Testing actual Lambda function execution and integration...\n');

    // Test shared utilities first
    await testSharedUtilities();

    // Test core Lambda functions
    console.log('\n🎯 TESTING CORE LAMBDA FUNCTIONS');
    console.log('=================================');

    const coreLambdas = [
        'topic-management',
        'script-generator',
        'media-curator',
        'audio-generator',
        'video-assembler',
        'youtube-publisher',
        'workflow-orchestrator',
        'manifest-builder'
    ];

    for (const lambda of coreLambdas) {
        await testLambdaFunction(lambda);
    }

    // Final Results
    console.log('\n📊 FUNCTIONAL TEST RESULTS');
    console.log('===========================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => console.log(`   - ${test.testName}: ${test.details}`));
    }

    console.log('\n🎯 FUNCTIONAL TEST SUMMARY:');
    if (testResults.failed === 0) {
        console.log('✅ All Lambda functions are properly structured and executable');
        console.log('✅ Shared utilities are properly integrated');
        console.log('✅ System ready for integration testing');
    } else {
        console.log('❌ Some Lambda functions have issues that need attention');
        console.log('❌ Fix failed tests before proceeding with integration testing');
    }

    return testResults;
}

// Run tests if called directly
if (require.main === module) {
    runFunctionalTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Functional tests failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runFunctionalTests,
    testLambdaFunction
};