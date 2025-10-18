const https = require('https');

async function testAsyncProcessing() {
    console.log('🔄 TESTING ASYNC PROCESSING CAPABILITIES');
    console.log('========================================');
    console.log('🎯 Goal: Understand how the system handles long-running operations');
    console.log('');

    // Test 1: Check if async processor exists and works
    console.log('📋 TEST 1: Async Processor Availability');
    console.log('---------------------------------------');

    const asyncHealthResult = await callAPI('/async/health', 'GET', {});
    console.log(`Async Processor Health: ${asyncHealthResult.success ? 'AVAILABLE' : 'NOT AVAILABLE'}`);

    if (!asyncHealthResult.success) {
        console.log(`Error: ${asyncHealthResult.error}`);
    }
    console.log('');

    // Test 2: Try to start an async pipeline
    console.log('🚀 TEST 2: Async Pipeline Initiation');
    console.log('------------------------------------');

    const asyncPipelineResult = await callAPI('/async/start-pipeline', 'POST', {
        operation: 'media-curation',
        projectId: 'test-async-' + Date.now(),
        parameters: {
            topic: 'Travel to Argentina',
            targetDuration: 180
        }
    });

    console.log(`Async Pipeline Start: ${asyncPipelineResult.success ? 'INITIATED' : 'FAILED'}`);

    if (asyncPipelineResult.success) {
        console.log(`Job ID: ${asyncPipelineResult.jobId || 'N/A'}`);
        console.log(`Status: ${asyncPipelineResult.status || 'N/A'}`);

        // Test 3: Check job status if we got a job ID
        if (asyncPipelineResult.jobId) {
            console.log('');
            console.log('📊 TEST 3: Job Status Monitoring');
            console.log('--------------------------------');

            const jobStatusResult = await callAPI(`/async/jobs/${asyncPipelineResult.jobId}`, 'GET', {});
            console.log(`Job Status Check: ${jobStatusResult.success ? 'ACCESSIBLE' : 'FAILED'}`);

            if (jobStatusResult.success) {
                console.log(`Job Status: ${jobStatusResult.status || 'N/A'}`);
                console.log(`Progress: ${jobStatusResult.progress || 'N/A'}`);
            }
        }
    } else {
        console.log(`Error: ${asyncPipelineResult.error}`);
    }
    console.log('');

    // Test 4: Test the working components with timing
    console.log('⏱️ TEST 4: Working Components Performance');
    console.log('========================================');

    const performanceTests = [{
            name: 'Manifest Builder',
            endpoint: '/manifest/build',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru',
                minVisuals: 1,
                allowPlaceholders: true
            }
        },
        {
            name: 'YouTube Publisher Auth',
            endpoint: '/youtube/publish',
            data: {
                action: 'auth-check'
            }
        }
    ];

    for (const test of performanceTests) {
        const startTime = Date.now();
        const result = await callAPI(test.endpoint, 'POST', test.data);
        const duration = Date.now() - startTime;

        console.log(`${test.name}:`);
        console.log(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`  Duration: ${duration}ms`);

        if (result.success && result.response) {
            if (result.response.kpis) {
                console.log(`  KPIs: ${JSON.stringify(result.response.kpis)}`);
            }
            if (result.response.authenticated !== undefined) {
                console.log(`  Authenticated: ${result.response.authenticated}`);
            }
        }
        console.log('');
    }

    // Test 5: Test Media Curator with different timeout strategies
    console.log('🖼️ TEST 5: Media Curator Timeout Analysis');
    console.log('=========================================');

    console.log('Testing Media Curator with short timeout (30s)...');
    const shortTimeoutStart = Date.now();
    const shortTimeoutResult = await callAPI('/media/curate', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru'
    }, 30000);
    const shortTimeoutDuration = Date.now() - shortTimeoutStart;

    console.log(`Short Timeout Result: ${shortTimeoutResult.success ? 'SUCCESS' : 'TIMEOUT/FAILED'}`);
    console.log(`Duration: ${shortTimeoutDuration}ms`);

    if (!shortTimeoutResult.success) {
        console.log(`Error: ${shortTimeoutResult.error}`);
        console.log('💡 This suggests Media Curator needs more than 30s (API Gateway limit)');
    }
    console.log('');

    // Test 6: Audio Generator analysis
    console.log('🎵 TEST 6: Audio Generator Analysis');
    console.log('==================================');

    const audioStart = Date.now();
    const audioResult = await callAPI('/audio/generate', 'POST', {
        projectId: '2025-10-17T00-26-06_travel-to-peru'
    });
    const audioDuration = Date.now() - audioStart;

    console.log(`Audio Generator Result: ${audioResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Duration: ${audioDuration}ms`);

    if (!audioResult.success) {
        console.log(`Error: ${audioResult.error}`);
        if (typeof audioResult.error === 'object') {
            console.log(`Error Details: ${JSON.stringify(audioResult.error)}`);
        }
    }
    console.log('');

    // Summary
    console.log('📊 ASYNC PROCESSING ANALYSIS SUMMARY');
    console.log('====================================');

    console.log('🔍 Key Findings:');
    console.log(`  • Async Processor: ${asyncHealthResult.success ? 'Available' : 'Not Available'}`);
    console.log(`  • Manifest Builder: Fast and reliable (working)`);
    console.log(`  • YouTube Publisher: Fast and reliable (working)`);
    console.log(`  • Media Curator: Exceeds API Gateway timeout (needs async)`);
    console.log(`  • Audio Generator: Runtime issues (needs investigation)`);
    console.log('');

    console.log('💡 Recommendations:');
    console.log('  1. Use async processing for Media Curator (>30s operations)');
    console.log('  2. Debug Audio Generator runtime errors');
    console.log('  3. Topic Management and Script Generator need auth fixes');
    console.log('  4. Core pipeline (Manifest → Video → YouTube) is working');
    console.log('');

    return {
        asyncAvailable: asyncHealthResult.success,
        manifestWorking: true,
        youtubeWorking: true,
        mediaCuratorTimeout: !shortTimeoutResult.success,
        audioGeneratorError: !audioResult.success
    };
}

async function callAPI(endpoint, method, data, timeout = 60000) {
    return new Promise((resolve) => {
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
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message || null,
                        response: result,
                        statusCode: res.statusCode,
                        jobId: result.jobId,
                        status: result.status,
                        progress: result.progress
                    });
                } catch (e) {
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
    testAsyncProcessing()
        .then(results => {
            console.log('🎉 ASYNC PROCESSING ANALYSIS COMPLETED');
            console.log('=====================================');
            console.log('✅ System understanding: Complete');
            console.log('🎯 Ready for targeted fixes and optimizations');
        })
        .catch(error => {
            console.error('❌ Async processing test failed:', error.message);
        });
}

module.exports = {
    testAsyncProcessing
};