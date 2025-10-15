#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE TEST RUNNER
 * 
 * Executes all test suites in the correct order and provides
 * a comprehensive report of the system status
 */

const {
    execSync
} = require('child_process');
const fs = require('fs');

async function runTestSuite(testName, command) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 RUNNING: ${testName}`);
    console.log(`${'='.repeat(60)}`);

    try {
        const startTime = Date.now();
        const output = execSync(command, {
            encoding: 'utf8',
            stdio: 'inherit',
            timeout: 120000 // 2 minute timeout
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ ${testName} completed in ${duration}s`);
        return {
            success: true,
            duration,
            testName
        };

    } catch (error) {
        console.log(`\n❌ ${testName} failed: ${error.message}`);
        return {
            success: false,
            duration: 0,
            testName,
            error: error.message
        };
    }
}

async function runAllTests() {
    console.log('🚀 AUTOMATED VIDEO PIPELINE - COMPREHENSIVE TEST SUITE');
    console.log('======================================================');
    console.log('Running complete system verification and testing...\n');

    const testSuites = [{
            name: 'System Architecture Verification',
            command: 'node test-system-verification.js',
            description: 'Verifies system structure and component availability'
        },
        {
            name: 'Lambda Functions Testing',
            command: 'node test-lambda-functions.js',
            description: 'Tests individual Lambda function execution and structure'
        },
        {
            name: 'Complete Integration Testing',
            command: 'node test-integration-complete.js',
            description: 'Tests end-to-end integration and agent coordination'
        }
    ];

    const results = [];
    let totalDuration = 0;

    for (const suite of testSuites) {
        console.log(`\n📋 About to run: ${suite.name}`);
        console.log(`📝 Description: ${suite.description}`);

        const result = await runTestSuite(suite.name, suite.command);
        results.push(result);
        totalDuration += parseFloat(result.duration);
    }

    // Final Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log(`${'='.repeat(80)}`);

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const successRate = ((passed / results.length) * 100).toFixed(1);

    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Test Suites: ${results.length}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Total Duration: ${totalDuration.toFixed(1)}s`);

    console.log(`\n📋 DETAILED RESULTS:`);
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.testName} (${result.duration}s)`);
        if (!result.success && result.error) {
            console.log(`      Error: ${result.error}`);
        }
    });

    console.log(`\n🎯 SYSTEM STATUS ASSESSMENT:`);
    if (failed === 0) {
        console.log('✅ SYSTEM FULLY OPERATIONAL');
        console.log('✅ All components properly structured and integrated');
        console.log('✅ Ready for deployment and production use');
        console.log('✅ Architecture matches documentation');
    } else if (failed === 1) {
        console.log('⚠️  SYSTEM MOSTLY OPERATIONAL');
        console.log('⚠️  Minor issues detected that should be addressed');
        console.log('⚠️  Core functionality likely intact');
    } else {
        console.log('❌ SYSTEM HAS SIGNIFICANT ISSUES');
        console.log('❌ Multiple test suites failed');
        console.log('❌ Architecture may not match documentation');
        console.log('❌ Requires attention before deployment');
    }

    console.log(`\n📚 NEXT STEPS:`);
    if (failed === 0) {
        console.log('1. ✅ System verification complete');
        console.log('2. 🚀 Ready for deployment testing');
        console.log('3. 📊 Consider performance optimization');
        console.log('4. 🔄 Set up continuous integration');
    } else {
        console.log('1. 🔍 Review failed test details above');
        console.log('2. 🛠️  Fix identified issues');
        console.log('3. 🔄 Re-run tests to verify fixes');
        console.log('4. 📋 Update documentation if needed');
    }

    // Create test report file
    const reportData = {
        timestamp: new Date().toISOString(),
        totalSuites: results.length,
        passed,
        failed,
        successRate: parseFloat(successRate),
        totalDuration,
        results,
        systemStatus: failed === 0 ? 'OPERATIONAL' : failed === 1 ? 'MOSTLY_OPERATIONAL' : 'ISSUES_DETECTED'
    };

    fs.writeFileSync('test-report.json', JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed test report saved to: test-report.json`);

    return results;
}

// Run all tests if called directly
if (require.main === module) {
    runAllTests()
        .then(results => {
            const failed = results.filter(r => !r.success).length;
            process.exit(failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runAllTests
};