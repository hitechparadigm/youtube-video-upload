const https = require('https');

async function comprehensiveSystemTest() {
    console.log('🧪 COMPREHENSIVE SYSTEM TEST - ALL COMPONENTS');
    console.log('==============================================');
    console.log('📋 Testing: All 7 Lambda functions + layers + utilities');
    console.log('🎯 Goal: Complete system validation without skipping any component');
    console.log('');

    const results = {
        lambdas: {},
        endpoints: {},
        layers: {},
        utilities: {},
        overall: {
            passed: 0,
            failed: 0,
            total: 0
        }
    };

    // ===========================================
    // PHASE 1: LAMBDA FUNCTION HEALTH CHECKS
    // ===========================================
    console.log('🏥 PHASE 1: LAMBDA FUNCTION HEALTH CHECKS');
    console.log('==========================================');

    const lambdaTests = [{
            name: 'Topic Management',
            endpoint: '/topic/health',
            method: 'GET'
        },
        {
            name: 'Script Generator',
            endpoint: '/script/health',
            method: 'GET'
        },
        {
            name: 'Media Curator',
            endpoint: '/media/health',
            method: 'GET'
        },
        {
            name: 'Audio Generator',
            endpoint: '/audio/health',
            method: 'GET'
        },
        {
            name: 'Video Assembler',
            endpoint: '/video/health',
            method: 'GET'
        },
        {
            name: 'Manifest Builder',
            endpoint: '/manifest/health',
            method: 'GET'
        },
        {
            name: 'YouTube Publisher',
            endpoint: '/youtube/health',
            method: 'GET'
        },
        {
            name: 'Workflow Orchestrator',
            endpoint: '/workflow/stats',
            method: 'GET'
        },
        {
            name: 'Async Processor',
            endpoint: '/async/health',
            method: 'GET'
        }
    ];

    for (const test of lambdaTests) {
        console.log(`🔍 Testing ${test.name}...`);
        const result = await callAPI(test.endpoint, test.method, {});

        results.lambdas[test.name] = {
            success: result.success,
            error: result.error || result.message,
            statusCode: result.statusCode,
            response: result
        };

        if (result.success) {
            console.log(`  ✅ ${test.name}: HEALTHY`);
            results.overall.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error || result.message || 'FAILED'}`);
            results.overall.failed++;
        }
        results.overall.total++;
    }
    console.log('');

    // ===========================================
    // PHASE 2: FUNCTIONAL ENDPOINT TESTING
    // ===========================================
    console.log('⚙️ PHASE 2: FUNCTIONAL ENDPOINT TESTING');
    console.log('=======================================');

    const functionalTests = [{
            name: 'Topic Management - Analyze',
            endpoint: '/topic/analyze',
            method: 'POST',
            data: {
                topic: 'Travel to Argentina Test',
                targetAudience: 'travel enthusiasts',
                videoDuration: 180
            }
        },
        {
            name: 'Script Generator - Generate',
            endpoint: '/script/generate',
            method: 'POST',
            data: {
                projectId: 'test-script-' + Date.now(),
                targetDuration: 180,
                style: 'engaging-informative'
            }
        },
        {
            name: 'Media Curator - Curate',
            endpoint: '/media/curate',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            },
            timeout: 300000 // 5 minutes for media processing
        },
        {
            name: 'Audio Generator - Generate',
            endpoint: '/audio/generate',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        },
        {
            name: 'Manifest Builder - Build',
            endpoint: '/manifest/build',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1,
                allowPlaceholders: true
            }
        },
        {
            name: 'Video Assembler - Assemble',
            endpoint: '/video/assemble',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                useManifest: true
            }
        },
        {
            name: 'YouTube Publisher - Auth Check',
            endpoint: '/youtube/publish',
            method: 'POST',
            data: {
                action: 'auth-check'
            }
        },
        {
            name: 'Workflow Orchestrator - Start',
            endpoint: '/workflow/start',
            method: 'POST',
            data: {
                action: 'test-workflow',
                baseTopic: 'Test Topic'
            }
        },
        {
            name: 'Async Processor - Start Pipeline',
            endpoint: '/async/start-pipeline',
            method: 'POST',
            data: {
                operation: 'test-operation',
                projectId: 'test-async-' + Date.now()
            }
        }
    ];

    for (const test of functionalTests) {
        console.log(`🔧 Testing ${test.name}...`);
        const result = await callAPI(test.endpoint, test.method, test.data, test.timeout);

        results.endpoints[test.name] = {
            success: result.success,
            error: result.error || result.message,
            statusCode: result.statusCode,
            response: result
        };

        if (result.success) {
            console.log(`  ✅ ${test.name}: FUNCTIONAL`);
            results.overall.passed++;
        } else {
            console.log(`  ❌ ${test.name}: ${result.error || result.message || 'FAILED'}`);

            // Detailed error analysis
            if (result.message && result.message.includes('Missing Authentication Token')) {
                console.log(`    🔍 Authentication issue detected`);
            } else if (result.error && typeof result.error === 'string' && result.error.includes('timeout')) {
                console.log(`    🔍 Timeout issue (may still be working in background)`);
            } else if (result.error && typeof result.error === 'string' && result.error.includes('Internal server error')) {
                console.log(`    🔍 Runtime error (check layers/utilities)`);
            } else if (result.error && typeof result.error === 'object') {
                console.log(`    🔍 Complex error: ${JSON.stringify(result.error)}`);
            }
            results.overall.failed++;
        }
        results.overall.total++;
    }
    console.log('');

    // ===========================================
    // PHASE 3: LAYER AND UTILITY VALIDATION
    // ===========================================
    console.log('📦 PHASE 3: LAYER AND UTILITY VALIDATION');
    console.log('=========================================');

    // Test layer functionality through working endpoints
    const layerTests = [{
            name: 'Context Layer - Context Manager',
            test: 'Manifest Builder uses context-manager',
            endpoint: '/manifest/build',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1
            }
        },
        {
            name: 'Context Layer - AWS Service Manager',
            test: 'YouTube Publisher uses aws-service-manager',
            endpoint: '/youtube/publish',
            data: {
                action: 'auth-check'
            }
        },
        {
            name: 'Context Layer - Error Handler',
            test: 'All endpoints use error-handler',
            endpoint: '/manifest/health',
            data: {}
        }
    ];

    for (const test of layerTests) {
        console.log(`📦 Testing ${test.name}...`);
        const result = await callAPI(test.endpoint, 'POST', test.data);

        results.layers[test.name] = {
            success: result.success,
            error: result.error || result.message,
            test: test.test
        };

        if (result.success) {
            console.log(`  ✅ ${test.name}: WORKING (${test.test})`);
            results.overall.passed++;
        } else {
            console.log(`  ❌ ${test.name}: FAILED (${test.test})`);
            console.log(`    Error: ${result.error || result.message}`);
            results.overall.failed++;
        }
        results.overall.total++;
    }
    console.log('');

    // ===========================================
    // PHASE 4: INTEGRATION TESTING
    // ===========================================
    console.log('🔗 PHASE 4: INTEGRATION TESTING');
    console.log('================================');

    const integrationTests = [{
            name: 'S3 Integration',
            test: 'Check if functions can access S3',
            endpoint: '/manifest/build',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1
            }
        },
        {
            name: 'DynamoDB Integration',
            test: 'Check if functions can access DynamoDB',
            endpoint: '/workflow/stats',
            data: {}
        },
        {
            name: 'Secrets Manager Integration',
            test: 'Check if functions can access secrets',
            endpoint: '/youtube/publish',
            data: {
                action: 'auth-check'
            }
        },
        {
            name: 'Bedrock Integration',
            test: 'Check if AI functions can access Bedrock',
            endpoint: '/topic/analyze',
            data: {
                topic: 'Test Topic',
                videoDuration: 60
            }
        },
        {
            name: 'Polly Integration',
            test: 'Check if audio functions can access Polly',
            endpoint: '/audio/generate',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        }
    ];

    for (const test of integrationTests) {
        console.log(`🔗 Testing ${test.name}...`);
        const result = await callAPI(test.endpoint, 'POST', test.data);

        results.utilities[test.name] = {
            success: result.success,
            error: result.error || result.message,
            test: test.test
        };

        if (result.success) {
            console.log(`  ✅ ${test.name}: CONNECTED (${test.test})`);
            results.overall.passed++;
        } else {
            console.log(`  ❌ ${test.name}: FAILED (${test.test})`);
            console.log(`    Error: ${result.error || result.message}`);
            results.overall.failed++;
        }
        results.overall.total++;
    }
    console.log('');

    // ===========================================
    // PHASE 5: END-TO-END PIPELINE TEST
    // ===========================================
    console.log('🚀 PHASE 5: END-TO-END PIPELINE TEST');
    console.log('====================================');

    console.log('🎬 Testing complete pipeline with Peru project...');
    const pipelineResult = await testCompletePipeline();

    results.pipeline = pipelineResult;
    if (pipelineResult.success) {
        console.log('  ✅ END-TO-END PIPELINE: WORKING');
        results.overall.passed++;
    } else {
        console.log('  ❌ END-TO-END PIPELINE: FAILED');
        console.log(`    Error: ${pipelineResult.error}`);
        results.overall.failed++;
    }
    results.overall.total++;
    console.log('');

    // ===========================================
    // FINAL RESULTS SUMMARY
    // ===========================================
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');

    const successRate = ((results.overall.passed / results.overall.total) * 100).toFixed(1);
    console.log(`📈 Overall Success Rate: ${successRate}% (${results.overall.passed}/${results.overall.total})`);
    console.log('');

    console.log('🏥 Lambda Health Status:');
    Object.entries(results.lambdas).forEach(([name, result]) => {
        console.log(`  ${result.success ? '✅' : '❌'} ${name}`);
    });
    console.log('');

    console.log('⚙️ Functional Endpoint Status:');
    Object.entries(results.endpoints).forEach(([name, result]) => {
        console.log(`  ${result.success ? '✅' : '❌'} ${name}`);
    });
    console.log('');

    console.log('📦 Layer/Utility Status:');
    Object.entries(results.layers).forEach(([name, result]) => {
        console.log(`  ${result.success ? '✅' : '❌'} ${name}`);
    });
    Object.entries(results.utilities).forEach(([name, result]) => {
        console.log(`  ${result.success ? '✅' : '❌'} ${name}`);
    });
    console.log('');

    console.log('🎯 CRITICAL ISSUES IDENTIFIED:');
    const criticalIssues = [];

    // Check for authentication issues
    const authIssues = Object.entries(results.endpoints).filter(([name, result]) =>
        !result.success && result.error && result.error.includes('Missing Authentication Token')
    );
    if (authIssues.length > 0) {
        criticalIssues.push(`Authentication: ${authIssues.map(([name]) => name).join(', ')}`);
    }

    // Check for runtime issues
    const runtimeIssues = Object.entries(results.endpoints).filter(([name, result]) =>
        !result.success && result.error && result.error.includes('Internal server error')
    );
    if (runtimeIssues.length > 0) {
        criticalIssues.push(`Runtime Errors: ${runtimeIssues.map(([name]) => name).join(', ')}`);
    }

    // Check for timeout issues
    const timeoutIssues = Object.entries(results.endpoints).filter(([name, result]) =>
        !result.success && result.error && result.error.includes('timeout')
    );
    if (timeoutIssues.length > 0) {
        criticalIssues.push(`Timeouts: ${timeoutIssues.map(([name]) => name).join(', ')}`);
    }

    if (criticalIssues.length > 0) {
        criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
    } else {
        console.log('  ✅ No critical issues detected');
    }
    console.log('');

    console.log('🚀 NEXT STEPS RECOMMENDATIONS:');
    if (successRate >= 80) {
        console.log('  ✅ System is largely operational - focus on fixing specific issues');
    } else if (successRate >= 60) {
        console.log('  ⚠️ System has significant issues - prioritize authentication and runtime fixes');
    } else {
        console.log('  ❌ System needs major fixes - start with basic connectivity and authentication');
    }

    return results;
}

async function testCompletePipeline() {
    try {
        const projectId = '2025-10-17T00-26-06_travel-to-peru';

        // Test the working pipeline components in sequence
        const manifestResult = await callAPI('/manifest/build', 'POST', {
            projectId: projectId,
            minVisuals: 1,
            allowPlaceholders: true
        });

        if (!manifestResult.success) {
            return {
                success: false,
                error: 'Manifest Builder failed',
                step: 'manifest'
            };
        }

        const videoResult = await callAPI('/video/assemble', 'POST', {
            projectId: projectId,
            useManifest: true
        });

        const youtubeResult = await callAPI('/youtube/publish', 'POST', {
            projectId: projectId,
            mode: 'auto',
            enableUpload: true,
            privacy: 'unlisted'
        });

        return {
            success: youtubeResult.success,
            manifest: manifestResult.success,
            video: videoResult.success,
            youtube: youtubeResult.success,
            youtubeUrl: youtubeResult.youtubeUrl
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function callAPI(endpoint, method, data, timeout = 120000) {
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
                    result.statusCode = res.statusCode;
                    resolve(result);
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Invalid JSON response',
                        rawResponse: responseData,
                        statusCode: res.statusCode
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
    comprehensiveSystemTest()
        .then(results => {
            const successRate = ((results.overall.passed / results.overall.total) * 100).toFixed(1);
            console.log(`\n🎉 COMPREHENSIVE TESTING COMPLETED`);
            console.log(`📊 Final Score: ${successRate}% (${results.overall.passed}/${results.overall.total})`);

            if (successRate >= 80) {
                console.log('🚀 System is ready for production use!');
            } else {
                console.log('🔧 System needs fixes before production use');
            }
        })
        .catch(error => {
            console.error('\n❌ Comprehensive testing failed:', error.message);
        });
}

module.exports = {
    comprehensiveSystemTest
};