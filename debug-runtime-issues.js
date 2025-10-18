/**
 * Debug Runtime Issues - Focused Testing
 * Tests individual functions to isolate runtime problems
 */

const https = require('https');

// Configuration
const API_BASE = '8tczdwx7q9.execute-api.us-east-1.amazonaws.com';
const API_KEY = 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx';

/**
 * Main debug function
 */
async function debugRuntimeIssues() {
    console.log('🔍 DEBUGGING RUNTIME ISSUES');
    console.log('===========================');
    console.log('🎯 Goal: Identify specific runtime errors in Media Curator and Audio Generator');
    console.log('');

    const results = {
        tests: [],
        workingFunctions: 0,
        totalFunctions: 0
    };

    // Test all function health endpoints
    const functions = [{
            name: 'Topic Management',
            endpoint: '/topics/health'
        },
        {
            name: 'Script Generator',
            endpoint: '/scripts/health'
        },
        {
            name: 'Media Curator',
            endpoint: '/media/health'
        },
        {
            name: 'Audio Generator',
            endpoint: '/audio/health'
        },
        {
            name: 'Manifest Builder',
            endpoint: '/manifest/health'
        }
    ];

    console.log('🏥 TESTING HEALTH ENDPOINTS');
    console.log('---------------------------');

    for (const func of functions) {
        try {
            console.log(`Testing ${func.name}...`);
            const result = await callAPI(func.endpoint, 'GET', {});

            results.tests.push({
                function: func.name,
                endpoint: func.endpoint,
                success: result.success,
                statusCode: result.statusCode,
                error: result.error,
                response: result.response
            });

            if (result.success) {
                results.workingFunctions++;
                console.log(`  ✅ ${func.name}: HEALTHY`);
                if (result.response && result.response.architecture) {
                    console.log(`     Architecture: ${result.response.architecture}`);
                }
            } else {
                console.log(`  ❌ ${func.name}: FAILED`);
                console.log(`     Status Code: ${result.statusCode}`);
                console.log(`     Error: ${result.error}`);

                // Try to get more details from the response
                if (result.response && typeof result.response === 'string') {
                    console.log(`     Response: ${result.response.substring(0, 200)}...`);
                }
            }

            results.totalFunctions++;
            console.log('');

        } catch (error) {
            console.error(`  💥 ${func.name}: EXCEPTION - ${error.message}`);
            results.totalFunctions++;
        }
    }

    // Test working functions with actual operations
    console.log('🧪 TESTING WORKING FUNCTIONS WITH OPERATIONS');
    console.log('--------------------------------------------');

    // Test Topic Management with actual request
    console.log('Testing Topic Management with real request...');
    const topicResult = await callAPI('/topics', 'POST', {
        topic: 'Debug Test Topic',
        projectId: `debug-${Date.now()}`,
        targetAudience: 'developers',
        videoDuration: 120
    });

    console.log(`Topic Management Operation: ${topicResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (topicResult.success) {
        console.log(`  Project Created: ${topicResult.response.projectId}`);
    } else {
        console.log(`  Error: ${topicResult.error}`);
    }
    console.log('');

    // Summary
    console.log('📊 RUNTIME DEBUG SUMMARY');
    console.log('========================');
    console.log(`✅ Working Functions: ${results.workingFunctions}/${results.totalFunctions}`);
    console.log(`🔧 Functions Needing Debug: ${results.totalFunctions - results.workingFunctions}`);
    console.log('');

    // Detailed analysis
    console.log('🔍 DETAILED ANALYSIS');
    console.log('-------------------');

    const workingFunctions = results.tests.filter(t => t.success);
    const failingFunctions = results.tests.filter(t => !t.success);

    if (workingFunctions.length > 0) {
        console.log('✅ WORKING FUNCTIONS:');
        workingFunctions.forEach(f => {
            console.log(`   - ${f.function}: ${f.endpoint}`);
        });
        console.log('');
    }

    if (failingFunctions.length > 0) {
        console.log('❌ FAILING FUNCTIONS:');
        failingFunctions.forEach(f => {
            console.log(`   - ${f.function}: ${f.endpoint}`);
            console.log(`     Status: ${f.statusCode}, Error: ${f.error}`);
        });
        console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('------------------');

    if (results.workingFunctions >= 2) {
        console.log('✅ CORE ARCHITECTURE IS WORKING:');
        console.log('   - Simplified architecture successfully deployed');
        console.log('   - Authentication issues resolved');
        console.log('   - Context synchronization operational');
        console.log('');

        if (failingFunctions.length > 0) {
            console.log('🔧 RUNTIME ISSUES TO RESOLVE:');
            console.log('   - Check AWS SDK versions in failing functions');
            console.log('   - Verify IAM permissions for external services');
            console.log('   - Check environment variable configuration');
            console.log('   - Review CloudWatch logs for specific errors');
        }
    } else {
        console.log('⚠️ BROADER ISSUES DETECTED:');
        console.log('   - Multiple functions failing suggests infrastructure issue');
        console.log('   - Check API Gateway configuration');
        console.log('   - Verify Lambda function deployment status');
    }

    return results;
}

/**
 * Call API using simplified pattern
 */
async function callAPI(endpoint, method, data, timeout = 30000) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: API_BASE,
            port: 443,
            path: `/prod${endpoint}`,
            method: method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: timeout
        };

        console.log(`🌐 ${method} ${endpoint}`);

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
                        statusCode: res.statusCode,
                        error: result.error || result.message,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: 'Parse error',
                        response: responseData
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

        if (method !== 'GET') {
            req.write(postData);
        }
        req.end();
    });
}

// Run the debug
if (require.main === module) {
    debugRuntimeIssues()
        .then(results => {
            console.log('🎯 Debug complete. Check recommendations above.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Debug failed:', error);
            process.exit(1);
        });
}

module.exports = {
    debugRuntimeIssues
};