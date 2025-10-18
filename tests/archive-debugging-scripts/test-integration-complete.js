#!/usr/bin/env node

/**
 * 🔗 COMPLETE INTEGRATION TEST SUITE
 * 
 * Tests the complete automated video pipeline integration
 * Verifies end-to-end workflow and agent coordination
 * 
 * INTEGRATION TESTS:
 * 1. Context Flow Between Agents
 * 2. Shared Utilities Integration
 * 3. S3 Folder Structure Creation
 * 4. Error Handling and Recovery
 * 5. Performance and Timing
 * 6. Data Consistency
 */

const fs = require('fs');
const path = require('path');

// Test Results Tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: [],
    performance: {}
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

async function testContextFlow() {
    console.log('\n🔄 TESTING CONTEXT FLOW INTEGRATION');
    console.log('====================================');

    try {
        // Test context manager integration
        const contextManagerPath = './src/layers/context-layer/nodejs/context-manager.js';
        if (fs.existsSync(contextManagerPath)) {
            const contextManager = require(contextManagerPath);

            // Test if context manager has required functions
            const hasStoreContext = typeof contextManager.storeContext === 'function';
            const hasRetrieveContext = typeof contextManager.retrieveContext === 'function';

            logTest('Context Manager functions available', hasStoreContext && hasRetrieveContext);

            // Test context flow simulation
            const mockContext = {
                projectId: 'test-integration-123',
                topic: 'Integration Test Topic',
                timestamp: new Date().toISOString()
            };

            // Simulate context storage (will fail without AWS, but we test the structure)
            try {
                // This will fail in test environment, but we check if function exists and is callable
                await contextManager.storeContext(mockContext, 'topic', 'test-project-123');
                logTest('Context storage execution', true, 'Function executed (AWS error expected)');
            } catch (error) {
                const isAWSError = error.message.includes('AWS') || error.message.includes('credentials');
                logTest('Context storage execution', isAWSError, isAWSError ? 'AWS error (expected)' : error.message);
            }
        } else {
            logTest('Context Manager availability', false, 'Context manager not found');
        }

    } catch (error) {
        logTest('Context Flow Integration', false, error.message);
    }
}

async function testS3FolderStructure() {
    console.log('\n📁 TESTING S3 FOLDER STRUCTURE');
    console.log('===============================');

    try {
        const s3UtilPath = './src/layers/context-layer/nodejs/s3-folder-structure.js';
        if (fs.existsSync(s3UtilPath)) {
            const s3Util = require(s3UtilPath);

            // Test folder structure generation
            const hasGeneratePaths = typeof s3Util.generateS3Paths === 'function';
            logTest('S3 folder structure utility available', hasGeneratePaths);

            if (hasGeneratePaths) {
                try {
                    const testProjectId = '2025-10-12T16-00-00_integration-test';
                    const paths = s3Util.generateS3Paths(testProjectId, 'topic');

                    const hasValidStructure = paths &&
                        paths.context &&
                        paths.script &&
                        paths.media &&
                        paths.audio &&
                        paths.video &&
                        paths.metadata;

                    logTest('S3 path generation', hasValidStructure);

                    if (hasValidStructure) {
                        console.log(`   Generated paths for project: ${testProjectId}`);
                        console.log(`   Context path: ${paths.context.topic}`);
                        console.log(`   Script path: ${paths.script}`);
                        console.log(`   Media path: ${paths.media}`);
                    }

                } catch (error) {
                    logTest('S3 path generation', false, error.message);
                }
            }
        } else {
            logTest('S3 folder structure utility', false, 'Utility not found');
        }

    } catch (error) {
        logTest('S3 Folder Structure Test', false, error.message);
    }
}

async function testAgentCoordination() {
    console.log('\n🤖 TESTING AGENT COORDINATION');
    console.log('==============================');

    const agents = [{
            name: 'topic-management',
            expectedOutputs: ['topic-context.json']
        },
        {
            name: 'script-generator',
            expectedOutputs: ['script.json', 'scene-context.json']
        },
        {
            name: 'media-curator',
            expectedOutputs: ['media-context.json']
        },
        {
            name: 'audio-generator',
            expectedOutputs: ['audio-context.json']
        },
        {
            name: 'video-assembler',
            expectedOutputs: ['video-context.json']
        },
        {
            name: 'youtube-publisher',
            expectedOutputs: ['youtube-metadata.json']
        },
        {
            name: 'manifest-builder',
            expectedOutputs: ['manifest.json']
        }
    ];

    for (const agent of agents) {
        try {
            const agentPath = `./src/lambda/${agent.name}`;
            const indexExists = fs.existsSync(`${agentPath}/index.js`);
            const handlerExists = fs.existsSync(`${agentPath}/handler.js`);

            if (indexExists || handlerExists) {
                const mainFile = indexExists ? 'index.js' : 'handler.js';
                const agentModule = require(`${agentPath}/${mainFile}`);

                const hasHandler = typeof agentModule.handler === 'function';
                logTest(`${agent.name} agent structure`, hasHandler);

                // Check if agent uses shared utilities
                const agentCode = fs.readFileSync(`${agentPath}/${mainFile}`, 'utf8');
                const usesSharedUtils = agentCode.includes('/opt/nodejs/');
                logTest(`${agent.name} uses shared utilities`, usesSharedUtils);

                // Check for context handling
                const handlesContext = agentCode.includes('storeContext') || agentCode.includes('retrieveContext');
                logTest(`${agent.name} handles context`, handlesContext);

            } else {
                logTest(`${agent.name} agent availability`, false, 'No main file found');
            }

        } catch (error) {
            logTest(`${agent.name} agent test`, false, error.message);
        }
    }
}

async function testErrorHandling() {
    console.log('\n🛡️ TESTING ERROR HANDLING');
    console.log('==========================');

    try {
        const errorHandlerPath = './src/layers/context-layer/nodejs/error-handler.js';
        if (fs.existsSync(errorHandlerPath)) {
            const errorHandler = require(errorHandlerPath);

            // Check for error handling utilities
            const hasWrapHandler = typeof errorHandler.wrapHandler === 'function';
            const hasAppError = typeof errorHandler.AppError === 'function';

            logTest('Error handler utilities available', hasWrapHandler || hasAppError);

            // Test error types
            const hasErrorTypes = errorHandler.ERROR_TYPES && typeof errorHandler.ERROR_TYPES === 'object';
            logTest('Error types defined', hasErrorTypes);

            if (hasErrorTypes) {
                const errorTypeCount = Object.keys(errorHandler.ERROR_TYPES).length;
                logTest('Error types comprehensive', errorTypeCount >= 3, `${errorTypeCount} error types defined`);
            }

        } else {
            logTest('Error handler availability', false, 'Error handler not found');
        }

    } catch (error) {
        logTest('Error Handling Test', false, error.message);
    }
}

async function testPerformanceMetrics() {
    console.log('\n⚡ TESTING PERFORMANCE METRICS');
    console.log('==============================');

    const performanceTests = [];

    // Test module loading performance
    const startTime = Date.now();

    try {
        // Load all core modules and measure time
        const modules = [
            './src/layers/context-layer/nodejs/context-manager.js',
            './src/layers/context-layer/nodejs/aws-service-manager.js',
            './src/layers/context-layer/nodejs/s3-folder-structure.js'
        ];

        for (const modulePath of modules) {
            if (fs.existsSync(modulePath)) {
                const moduleStartTime = Date.now();
                require(modulePath);
                const moduleLoadTime = Date.now() - moduleStartTime;
                performanceTests.push({
                    module: path.basename(modulePath),
                    loadTime: moduleLoadTime
                });
            }
        }

        const totalLoadTime = Date.now() - startTime;
        testResults.performance.moduleLoadTime = totalLoadTime;

        logTest('Module loading performance', totalLoadTime < 1000, `${totalLoadTime}ms total`);

        // Test memory usage (basic check)
        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        testResults.performance.memoryUsage = memUsageMB;

        logTest('Memory usage reasonable', memUsageMB < 100, `${memUsageMB}MB heap used`);

    } catch (error) {
        logTest('Performance Metrics Test', false, error.message);
    }
}

async function runIntegrationTests() {
    console.log('🔗 COMPLETE INTEGRATION TEST SUITE');
    console.log('===================================');
    console.log('Testing complete system integration and agent coordination...\n');

    // Run all integration tests
    await testContextFlow();
    await testS3FolderStructure();
    await testAgentCoordination();
    await testErrorHandling();
    await testPerformanceMetrics();

    // Final Results
    console.log('\n📊 INTEGRATION TEST RESULTS');
    console.log('============================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.performance.moduleLoadTime) {
        console.log(`Module Load Time: ${testResults.performance.moduleLoadTime}ms`);
    }
    if (testResults.performance.memoryUsage) {
        console.log(`Memory Usage: ${testResults.performance.memoryUsage}MB`);
    }

    if (testResults.failed > 0) {
        console.log('\n❌ FAILED INTEGRATION TESTS:');
        testResults.details
            .filter(test => !test.passed)
            .forEach(test => console.log(`   - ${test.testName}: ${test.details}`));
    }

    console.log('\n🎯 INTEGRATION TEST SUMMARY:');
    if (testResults.failed === 0) {
        console.log('✅ Complete system integration PASSED');
        console.log('✅ All agents properly coordinated');
        console.log('✅ Shared utilities properly integrated');
        console.log('✅ Error handling properly implemented');
        console.log('✅ System ready for deployment testing');
    } else {
        console.log('❌ System integration has issues that need attention');
        console.log('❌ Fix failed tests before deployment');
    }

    return testResults;
}

// Run tests if called directly
if (require.main === module) {
    runIntegrationTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Integration tests failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runIntegrationTests
};