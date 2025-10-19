#!/usr/bin/env node

/**
 * Local Deployment Testing Script
 * Test the API Gateway and Lambda functions locally without GitHub Actions
 */

const https = require('https');
const {
    URL
} = require('url');

// Configuration - Update these with your actual values
const CONFIG = {
    // Get these from your AWS CloudFormation stack outputs
    API_URL: process.env.API_URL || 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod',
    API_KEY: process.env.API_KEY || 'YOUR_API_KEY_HERE',

    // Test configuration
    TIMEOUT: 30000,
    RETRY_COUNT: 3
};

/**
 * Make API call with proper authentication
 */
async function callAPI(endpoint, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const url = new URL(endpoint, CONFIG.API_URL);
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            timeout: CONFIG.TIMEOUT,
            headers: {
                'x-api-key': CONFIG.API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'Local-Testing-Script/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        body: responseData,
                        error: 'JSON parse error'
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                statusCode: 0,
                error: error.message,
                body: ''
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                statusCode: 0,
                error: 'Request timeout',
                body: ''
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

/**
 * Test all API endpoints
 */
async function runTests() {
    console.log('🧪 Starting Local API Testing...');
    console.log('API URL:', CONFIG.API_URL);
    console.log('API Key:', CONFIG.API_KEY ? `${CONFIG.API_KEY.substring(0, 8)}...` : 'Not provided');
    console.log('');

    if (!CONFIG.API_URL.includes('YOUR_API_ID') && !CONFIG.API_KEY.includes('YOUR_API_KEY')) {
        console.log('✅ Configuration looks valid, proceeding with tests...');
    } else {
        console.log('⚠️ Please update CONFIG with your actual API URL and API Key');
        console.log('');
        console.log('To get these values, run:');
        console.log('aws cloudformation describe-stacks --stack-name automated-video-pipeline-prod --query "Stacks[0].Outputs"');
        console.log('');
        return;
    }

    const tests = [{
            name: 'Health Check (Root)',
            endpoint: '/',
            method: 'GET',
            description: 'Test API Gateway root endpoint'
        },
        {
            name: 'Health Check Endpoint',
            endpoint: '/health',
            method: 'GET',
            description: 'Test dedicated health endpoint'
        },
        {
            name: 'Topic Management Health',
            endpoint: '/topics',
            method: 'GET',
            description: 'Test topic management service health'
        },
        {
            name: 'Script Generator Health',
            endpoint: '/scripts/generate',
            method: 'GET',
            description: 'Test script generator service health'
        },
        {
            name: 'Topic Creation Test',
            endpoint: '/topics',
            method: 'POST',
            data: {
                topic: 'Local Testing Topic',
                targetAudience: 'developers',
                videoDuration: 300
            },
            description: 'Test topic creation functionality'
        },
        {
            name: 'Script Generation Test',
            endpoint: '/scripts/generate',
            method: 'POST',
            data: {
                projectId: 'test-project-' + Date.now(),
                scriptOptions: {
                    targetLength: 300,
                    videoStyle: 'engaging'
                }
            },
            description: 'Test script generation (will fail without topic context)'
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        console.log(`\n🔍 Running: ${test.name}`);
        console.log(`   📝 ${test.description}`);

        try {
            const result = await callAPI(test.endpoint, test.method, test.data);

            console.log(`   📊 Status: ${result.statusCode}`);

            if (result.success) {
                console.log(`   ✅ ${test.name}: PASSED`);
                passedTests++;

                // Show response preview for successful tests
                if (result.data && typeof result.data === 'object') {
                    if (result.data.service) {
                        console.log(`   🔧 Service: ${result.data.service}`);
                    }
                    if (result.data.status) {
                        console.log(`   💚 Status: ${result.data.status}`);
                    }
                    if (result.data.projectId) {
                        console.log(`   📋 Project ID: ${result.data.projectId}`);
                    }
                }
            } else if (result.statusCode === 400) {
                console.log(`   ⚠️  ${test.name}: BAD REQUEST (endpoint exists, data issue)`);
                console.log(`   💡 Error: ${result.error || 'Invalid request data'}`);
                passedTests += 0.5; // Partial credit
            } else if (result.statusCode === 403) {
                console.log(`   🔒 ${test.name}: FORBIDDEN (authentication issue)`);
                console.log(`   💡 Check API key configuration`);
            } else if (result.statusCode === 404) {
                console.log(`   🚫 ${test.name}: NOT FOUND (endpoint may not exist)`);
            } else {
                console.log(`   ❌ ${test.name}: FAILED`);
                console.log(`   📄 Error: ${result.error || result.body}`);
            }

        } catch (error) {
            console.log(`   ❌ ${test.name}: ERROR - ${error.message}`);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests >= totalTests * 0.8) {
        console.log('✅ API Gateway is working correctly!');
    } else if (passedTests > 0) {
        console.log('⚠️ API Gateway is partially working - some endpoints need attention');
    } else {
        console.log('❌ API Gateway is not responding - check configuration');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. If tests are passing, your API Gateway is working correctly');
    console.log('2. If getting 403 errors, check your API key');
    console.log('3. If getting timeouts, check your AWS region and network');
    console.log('4. For detailed logs, check CloudWatch logs for each Lambda function');
}

/**
 * Get stack outputs helper
 */
function printStackOutputsCommand() {
    console.log('\n📋 To get your API URL and API Key, run:');
    console.log('');
    console.log('# Get stack outputs');
    console.log('aws cloudformation describe-stacks --stack-name automated-video-pipeline-prod --query "Stacks[0].Outputs"');
    console.log('');
    console.log('# Get API key value');
    console.log('API_KEY_ID=$(aws cloudformation describe-stacks --stack-name automated-video-pipeline-prod --query "Stacks[0].Outputs[?OutputKey==\`ApiKey\`].OutputValue" --output text)');
    console.log('aws apigateway get-api-key --api-key $API_KEY_ID --include-value --query "value" --output text');
    console.log('');
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('Local API Testing Script');
        console.log('');
        console.log('Usage:');
        console.log('  node test-local-deployment.js                    # Run with config values');
        console.log('  API_URL=https://... API_KEY=... node test-local-deployment.js  # Run with env vars');
        console.log('  node test-local-deployment.js --help             # Show this help');
        console.log('');
        printStackOutputsCommand();
    } else {
        runTests().catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
    }
}

module.exports = {
    callAPI,
    runTests
};