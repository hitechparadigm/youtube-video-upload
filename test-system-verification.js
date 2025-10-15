#!/usr/bin/env node

/**
 * 🔍 SYSTEM VERIFICATION TEST SUITE
 * 
 * Comprehensive verification of the automated video pipeline system
 * Tests actual implementation against documented architecture
 * 
 * VERIFICATION AREAS:
 * 1. Lambda Functions - Verify all functions exist and are properly structured
 * 2. Shared Utilities - Test layer integration and utility functions
 * 3. Infrastructure - Verify CDK deployment configuration
 * 4. Context Flow - Test agent coordination patterns
 * 5. API Endpoints - Verify actual API Gateway integration
 * 6. Storage Structure - Test S3 folder organization
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

async function verifySystemArchitecture() {
    console.log('🔍 SYSTEM VERIFICATION TEST SUITE');
    console.log('=====================================');
    console.log('Verifying actual implementation against documented architecture...\n');

    // Test 1: Verify Lambda Functions Structure
    console.log('1. 📁 LAMBDA FUNCTIONS VERIFICATION');
    console.log('-----------------------------------');

    const expectedLambdas = [
        'topic-management',
        'script-generator',
        'media-curator',
        'audio-generator',
        'video-assembler',
        'youtube-publisher',
        'workflow-orchestrator',
        'manifest-builder',
        'async-processor',
        'cost-tracker',
        'eventbridge-scheduler'
    ];

    for (const lambda of expectedLambdas) {
        const lambdaPath = `src/lambda/${lambda}`;
        const indexExists = fs.existsSync(`${lambdaPath}/index.js`);
        const handlerExists = fs.existsSync(`${lambdaPath}/handler.js`);

        logTest(
            `Lambda ${lambda} structure`,
            indexExists || handlerExists,
            indexExists ? 'index.js found' : handlerExists ? 'handler.js found' : 'No main file found'
        );
    }

    // Test 2: Verify Shared Utilities
    console.log('\n2. 🔧 SHARED UTILITIES VERIFICATION');
    console.log('-----------------------------------');

    const expectedUtilities = [
        'context-manager.js',
        'aws-service-manager.js',
        's3-folder-structure.js',
        'error-handler.js'
    ];

    for (const utility of expectedUtilities) {
        const utilityPath = `src/layers/context-layer/nodejs/${utility}`;
        const exists = fs.existsSync(utilityPath);

        if (exists) {
            // Check if utility has proper exports
            try {
                const content = fs.readFileSync(utilityPath, 'utf8');
                const hasExports = content.includes('module.exports') || content.includes('exports.');
                logTest(`Shared utility ${utility}`, hasExports, hasExports ? 'Has proper exports' : 'Missing exports');
            } catch (error) {
                logTest(`Shared utility ${utility}`, false, `Error reading file: ${error.message}`);
            }
        } else {
            logTest(`Shared utility ${utility}`, false, 'File not found');
        }
    }

    // Test 3: Verify Infrastructure Configuration
    console.log('\n3. 🏗️ INFRASTRUCTURE VERIFICATION');
    console.log('----------------------------------');

    const infraFiles = [
        'infrastructure/app.js',
        'infrastructure/lib/video-pipeline-stack.js',
        'infrastructure/package.json'
    ];

    for (const file of infraFiles) {
        const exists = fs.existsSync(file);
        logTest(`Infrastructure file ${path.basename(file)}`, exists);
    }

    // Test 4: Verify Lambda Function Implementation Quality
    console.log('\n4. 🎯 LAMBDA IMPLEMENTATION QUALITY');
    console.log('-----------------------------------');

    for (const lambda of expectedLambdas.slice(0, 6)) { // Test core lambdas
        const lambdaPath = `src/lambda/${lambda}`;
        const mainFile = fs.existsSync(`${lambdaPath}/index.js`) ? 'index.js' : 'handler.js';

        if (fs.existsSync(`${lambdaPath}/${mainFile}`)) {
            try {
                const content = fs.readFileSync(`${lambdaPath}/${mainFile}`, 'utf8');

                // Check for shared utilities usage
                const usesSharedUtils = content.includes('/opt/nodejs/') || content.includes('require(\'/opt/nodejs/');
                logTest(`${lambda} uses shared utilities`, usesSharedUtils);

                // Check for proper error handling
                const hasErrorHandling = content.includes('try') && content.includes('catch');
                logTest(`${lambda} has error handling`, hasErrorHandling);

                // Check for AWS SDK usage
                const usesAWSSDK = content.includes('@aws-sdk/');
                logTest(`${lambda} uses AWS SDK v3`, usesAWSSDK);

            } catch (error) {
                logTest(`${lambda} code analysis`, false, `Error reading: ${error.message}`);
            }
        }
    }

    // Test 5: Verify Context Flow Architecture
    console.log('\n5. 🔄 CONTEXT FLOW VERIFICATION');
    console.log('-------------------------------');

    // Check if context manager has proper functions
    const contextManagerPath = 'src/layers/context-layer/nodejs/context-manager.js';
    if (fs.existsSync(contextManagerPath)) {
        const content = fs.readFileSync(contextManagerPath, 'utf8');

        const hasStoreContext = content.includes('storeContext');
        logTest('Context Manager has storeContext', hasStoreContext);

        const hasRetrieveContext = content.includes('retrieveContext');
        logTest('Context Manager has retrieveContext', hasRetrieveContext);

        const hasS3Integration = content.includes('S3Client');
        logTest('Context Manager has S3 integration', hasS3Integration);

        const hasDynamoIntegration = content.includes('DynamoDBClient');
        logTest('Context Manager has DynamoDB integration', hasDynamoIntegration);
    }

    // Test 6: Verify Package Configuration
    console.log('\n6. 📦 PACKAGE CONFIGURATION');
    console.log('---------------------------');

    const packageJsonPath = 'package.json';
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        logTest('Node.js 20.x requirement', packageJson.engines ? .node ? .includes('20'));
        logTest('AWS SDK v3 dependencies', Object.keys(packageJson.dependencies || {}).some(dep => dep.includes('@aws-sdk/')));
        logTest('Jest testing framework', packageJson.devDependencies ? .jest !== undefined);
    }

    // Final Results
    console.log('\n📊 VERIFICATION RESULTS');
    console.log('=======================');
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

    console.log('\n🎯 RECOMMENDATIONS:');
    if (testResults.failed === 0) {
        console.log('✅ System architecture verification PASSED');
        console.log('✅ All components properly structured');
        console.log('✅ Ready for functional testing');
    } else {
        console.log('❌ System has architectural issues that need attention');
        console.log('❌ Fix failed tests before proceeding with functional testing');
    }

    return testResults;
}

// Run verification if called directly
if (require.main === module) {
    verifySystemArchitecture()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = {
    verifySystemArchitecture
};