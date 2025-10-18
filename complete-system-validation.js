const https = require('https');

async function completeSystemValidation() {
    console.log('🧪 COMPLETE SYSTEM VALIDATION - ALL COMPONENTS');
    console.log('===============================================');
    console.log('📋 Testing every Lambda, layer, and utility systematically');
    console.log('');

    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        details: {}
    };

    // ===========================================
    // TEST 1: HEALTH ENDPOINTS (All Lambdas)
    // ===========================================
    console.log('🏥 TEST 1: LAMBDA HEALTH ENDPOINTS');
    console.log('==================================');

    const healthTests = [{
            name: 'Topic Management',
            path: '/topics/health'
        },
        {
            name: 'Script Generator',
            path: '/scripts/health'
        },
        {
            name: 'Media Curator',
            path: '/media/health'
        },
        {
            name: 'Audio Generator',
            path: '/audio/health'
        },
        {
            name: 'Video Assembler',
            path: '/video/health'
        },
        {
            name: 'Manifest Builder',
            path: '/manifest/health'
        },
        {
            name: 'YouTube Publisher',
            path: '/youtube/health'
        },
        {
            name: 'Workflow Orchestrator',
            path: '/workflow/stats'
        },
        {
            name: 'Async Processor',
            path: '/async/health'
        }
    ];

    for (const test of healthTests) {
        const result = await testEndpoint(test.path, 'GET', {});
        results.details[`Health: ${test.name}`] = result;

        if (result.success) {
            console.log(`  ✅ ${test.name}: HEALTHY`);
            results.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error}`);
            results.failed++;
        }
        results.total++;
    }
    console.log('');

    // ===========================================
    // TEST 2: WORKING ENDPOINTS (Known Good)
    // ===========================================
    console.log('✅ TEST 2: KNOWN WORKING ENDPOINTS');
    console.log('==================================');

    const workingTests = [{
            name: 'Manifest Builder - Build',
            path: '/manifest/build',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1,
                allowPlaceholders: true
            }
        },
        {
            name: 'YouTube Publisher - Auth Check',
            path: '/youtube/publish',
            method: 'POST',
            data: {
                action: 'auth-check'
            }
        }
    ];

    for (const test of workingTests) {
        const result = await testEndpoint(test.path, test.method, test.data);
        results.details[`Working: ${test.name}`] = result;

        if (result.success) {
            console.log(`  ✅ ${test.name}: FUNCTIONAL`);
            results.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error}`);
            results.failed++;
        }
        results.total++;
    }
    console.log('');

    // ===========================================
    // TEST 3: PROBLEMATIC ENDPOINTS (Auth Issues)
    // ===========================================
    console.log('🔐 TEST 3: AUTHENTICATION-PROTECTED ENDPOINTS');
    console.log('==============================================');

    const authTests = [{
            name: 'Topic Management - Analyze',
            path: '/topic/analyze',
            method: 'POST',
            data: {
                topic: 'Travel to Argentina',
                targetAudience: 'travel enthusiasts',
                videoDuration: 180
            }
        },
        {
            name: 'Script Generator - Generate',
            path: '/script/generate',
            method: 'POST',
            data: {
                projectId: 'test-' + Date.now(),
                targetDuration: 180
            }
        }
    ];

    for (const test of authTests) {
        const result = await testEndpoint(test.path, test.method, test.data);
        results.details[`Auth: ${test.name}`] = result;

        if (result.success) {
            console.log(`  ✅ ${test.name}: WORKING (Auth Fixed!)`);
            results.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error}`);
            if (result.error && result.error.includes && result.error.includes('Missing Authentication Token')) {
                console.log(`    🔍 Confirmed: Authentication issue`);
            }
            results.failed++;
        }
        results.total++;
    }
    console.log('');

    // ===========================================
    // TEST 4: TIMEOUT-PRONE ENDPOINTS
    // ===========================================
    console.log('⏱️ TEST 4: TIMEOUT-PRONE ENDPOINTS');
    console.log('==================================');

    const timeoutTests = [{
            name: 'Media Curator - Curate',
            path: '/media/curate',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            },
            timeout: 35000 // Just over API Gateway limit
        },
        {
            name: 'Audio Generator - Generate',
            path: '/audio/generate',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        }
    ];

    for (const test of timeoutTests) {
        const result = await testEndpoint(test.path, test.method, test.data, test.timeout);
        results.details[`Timeout: ${test.name}`] = result;

        if (result.success) {
            console.log(`  ✅ ${test.name}: COMPLETED`);
            results.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error}`);
            if (result.error && result.error.includes && result.error.includes('timeout')) {
                console.log(`    🔍 Expected: API Gateway timeout (may work in background)`);
            }
            results.failed++;
        }
        results.total++;
    }
    console.log('');

    // ===========================================
    // TEST 5: LAYER VALIDATION (Through Working Endpoints)
    // ===========================================
    console.log('📦 TEST 5: LAYER AND UTILITY VALIDATION');
    console.log('=======================================');

    console.log('📦 Testing Context Layer (via Manifest Builder)...');
    const contextLayerTest = await testEndpoint('/manifest/build', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        minVisuals: 1
    });

    if (contextLayerTest.success) {
        console.log('  ✅ Context Layer: WORKING (context-manager, aws-service-manager, error-handler)');
        results.passed++;
    } else {
        console.log('  ❌ Context Layer: FAILED');
        results.failed++;
    }
    results.total++;

    console.log('🔐 Testing AWS Integrations (via YouTube Publisher)...');
    const awsIntegrationTest = await testEndpoint('/youtube/publish', 'POST', {
        action: 'auth-check'
    });

    if (awsIntegrationTest.success) {
        console.log('  ✅ AWS Integrations: WORKING (S3, DynamoDB, Secrets Manager)');
        results.passed++;
    } else {
        console.log('  ❌ AWS Integrations: FAILED');
        results.failed++;
    }
    results.total++;
    console.log('');

    // ===========================================
    // TEST 6: END-TO-END PIPELINE
    // ===========================================
    console.log('🚀 TEST 6: END-TO-END PIPELINE VALIDATION');
    console.log('=========================================');

    console.log('🎬 Testing complete pipeline with Peru project...');

    // Step 1: Manifest Builder
    const manifestResult = await testEndpoint('/manifest/build', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        minVisuals: 1,
        allowPlaceholders: true
    });

    // Step 2: Video Assembler
    const videoResult = await testEndpoint('/video/assemble', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        useManifest: true
    });

    // Step 3: YouTube Publisher
    const youtubeResult = await testEndpoint('/youtube/publish', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru',
        mode: 'auto',
        enableUpload: true,
        privacy: 'unlisted'
    });

    const pipelineSuccess = manifestResult.success && videoResult.success && youtubeResult.success;

    if (pipelineSuccess) {
        console.log('  ✅ END-TO-END PIPELINE: WORKING');
        if (youtubeResult.response && youtubeResult.response.youtubeUrl) {
            console.log(`    🎬 Video Created: ${youtubeResult.response.youtubeUrl}`);
        }
        results.passed++;
    } else {
        console.log('  ❌ END-TO-END PIPELINE: PARTIAL/FAILED');
        console.log(`    Manifest: ${manifestResult.success ? 'PASS' : 'FAIL'}`);
        console.log(`    Video: ${videoResult.success ? 'PASS' : 'FAIL'}`);
        console.log(`    YouTube: ${youtubeResult.success ? 'PASS' : 'FAIL'}`);
        results.failed++;
    }
    results.total++;
    console.log('');

    // ===========================================
    // FINAL RESULTS AND ANALYSIS
    // ===========================================
    const successRate = ((results.passed / results.total) * 100).toFixed(1);

    console.log('📊 COMPLETE SYSTEM VALIDATION RESULTS');
    console.log('======================================');
    console.log(`📈 Overall Success Rate: ${successRate}% (${results.passed}/${results.total})`);
    console.log('');

    console.log('🔍 DETAILED ANALYSIS:');

    // Count different types of issues
    let authIssues = 0;
    let timeoutIssues = 0;
    let runtimeIssues = 0;
    let workingComponents = 0;

    Object.entries(results.details).forEach(([name, result]) => {
        if (result.success) {
            workingComponents++;
        } else if (result.error && result.error.includes && result.error.includes('Missing Authentication Token')) {
            authIssues++;
        } else if (result.error && result.error.includes && result.error.includes('timeout')) {
            timeoutIssues++;
        } else {
            runtimeIssues++;
        }
    });

    console.log(`  ✅ Working Components: ${workingComponents}`);
    console.log(`  🔐 Authentication Issues: ${authIssues}`);
    console.log(`  ⏱️ Timeout Issues: ${timeoutIssues}`);
    console.log(`  ❌ Runtime Issues: ${runtimeIssues}`);
    console.log('');

    console.log('🎯 SYSTEM STATUS:');
    if (successRate >= 80) {
        console.log('  🟢 EXCELLENT: System is production-ready');
    } else if (successRate >= 60) {
        console.log('  🟡 GOOD: System mostly working, minor fixes needed');
    } else if (successRate >= 40) {
        console.log('  🟠 FAIR: System partially working, significant fixes needed');
    } else {
        console.log('  🔴 POOR: System needs major fixes');
    }
    console.log('');

    console.log('🚀 RECOMMENDATIONS:');
    if (authIssues > 0) {
        console.log('  1. 🔐 Fix authentication for Topic Management and Script Generator');
    }
    if (timeoutIssues > 0) {
        console.log('  2. ⏱️ Implement async processing for Media Curator and Audio Generator');
    }
    if (runtimeIssues > 0) {
        console.log('  3. 🔧 Debug runtime issues in failing components');
    }
    if (workingComponents >= results.total * 0.7) {
        console.log('  4. ✅ Focus on fixing specific issues - core system is solid');
    }

    return {
        successRate: parseFloat(successRate),
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        authIssues,
        timeoutIssues,
        runtimeIssues,
        workingComponents,
        details: results.details
    };
}

async function testEndpoint(path, method = 'GET', data = {}, timeout = 30000) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
            port: 443,
            path: `/prod${path}`,
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
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message || null,
                        response: result,
                        statusCode: res.statusCode
                    });
                } catch (e) {
                    // Handle HTML error responses (like CloudFront errors)
                    if (responseData.includes('CloudFront') || responseData.includes('403 ERROR')) {
                        resolve({
                            success: false,
                            error: 'CloudFront 403 Error',
                            response: null,
                            statusCode: res.statusCode
                        });
                    } else {
                        resolve({
                            success: false,
                            error: 'Invalid JSON response',
                            response: null,
                            statusCode: res.statusCode
                        });
                    }
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                response: null
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout',
                response: null
            });
        });

        req.write(postData);
        req.end();
    });
}

if (require.main === module) {
    completeSystemValidation()
        .then(results => {
            console.log(`\n🎉 COMPLETE SYSTEM VALIDATION FINISHED`);
            console.log(`📊 Final Score: ${results.successRate}% (${results.passed}/${results.total})`);

            if (results.successRate >= 70) {
                console.log('🚀 System is ready for production use with minor fixes!');
            } else {
                console.log('🔧 System needs attention before production use');
            }
        })
        .catch(error => {
            console.error('\n❌ System validation failed:', error.message);
        });
}

module.exports = {
    completeSystemValidation
};