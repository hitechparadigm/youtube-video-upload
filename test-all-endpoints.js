#!/usr/bin/env node

/**
 * Comprehensive Endpoint Testing Script
 * Tests all API Gateway endpoints and validates responses
 */

const https = require('https');
const {
    URL
} = require('url');

// Configuration
const CONFIG = {
    API_URL: process.env.API_URL || 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod',
    API_KEY: process.env.API_KEY || 'YOUR_API_KEY_HERE',
    TIMEOUT: 30000
};

/**
 * Make authenticated API call
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
                'User-Agent': 'Endpoint-Testing-Script/1.0'
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
                        headers: res.headers,
                        body: responseData,
                        data: parsedData,
                        error: parsedData.error || parsedData.message
                    });
                } catch (e) {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        headers: res.headers,
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
 * Validate response structure
 */
function validateResponse(response, expectedFields = []) {
    const validation = {
        valid: true,
        issues: []
    };

    if (!response.success) {
        validation.issues.push(`HTTP ${response.statusCode}: ${response.error}`);
        return validation;
    }

    if (!response.data || typeof response.data !== 'object') {
        validation.issues.push('Response is not valid JSON object');
        validation.valid = false;
        return validation;
    }

    // Check for expected fields
    for (const field of expectedFields) {
        if (!(field in response.data)) {
            validation.issues.push(`Missing expected field: ${field}`);
            validation.valid = false;
        }
    }

    return validation;
}

/**
 * Test all endpoints comprehensively
 */
async function testAllEndpoints() {
    console.log('🧪 Comprehensive Endpoint Testing');
    console.log('=================================');
    console.log('API URL:', CONFIG.API_URL);
    console.log('API Key:', CONFIG.API_KEY ? `${CONFIG.API_KEY.substring(0, 8)}...` : 'Not provided');
    console.log('');

    if (CONFIG.API_URL.includes('YOUR_API_ID') || CONFIG.API_KEY.includes('YOUR_API_KEY')) {
        console.log('⚠️ Please set API_URL and API_KEY environment variables');
        console.log('');
        console.log('Example:');
        console.log('API_URL="https://abc123.execute-api.us-east-1.amazonaws.com/prod" \\');
        console.log('API_KEY="your-api-key-here" \\');
        console.log('node test-all-endpoints.js');
        return;
    }

    const tests = [{
            name: 'Root Health Check',
            endpoint: '/',
            method: 'GET',
            expectedFields: ['status', 'timestamp'],
            description: 'API Gateway root endpoint health check'
        },
        {
            name: 'Dedicated Health Endpoint',
            endpoint: '/health',
            method: 'GET',
            expectedFields: ['status', 'timestamp'],
            description: 'Dedicated health check endpoint'
        },
        {
            name: 'Topic Management Health',
            endpoint: '/topics',
            method: 'GET',
            expectedFields: ['service', 'status', 'endpoints'],
            description: 'Topic management service health and info'
        },
        {
            name: 'Script Generator Health',
            endpoint: '/scripts/generate',
            method: 'GET',
            expectedFields: ['service', 'status', 'endpoints'],
            description: 'Script generator service health and info'
        },
        {
            name: 'Topic Creation',
            endpoint: '/topics',
            method: 'POST',
            data: {
                topic: 'Comprehensive Testing Topic',
                targetAudience: 'developers',
                videoDuration: 300
            },
            expectedFields: ['success', 'projectId', 'topic'],
            description: 'Create new topic and generate context'
        },
        {
            name: 'Script Generation (No Context)',
            endpoint: '/scripts/generate',
            method: 'POST',
            data: {
                projectId: 'non-existent-project-' + Date.now(),
                scriptOptions: {
                    targetLength: 300,
                    videoStyle: 'engaging'
                }
            },
            expectedFields: ['success', 'error'],
            expectError: true,
            description: 'Test script generation without topic context (should fail gracefully)'
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;
    let createdProjectId = null;

    console.log(`Running ${totalTests} comprehensive tests...\n`);

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n📋 Test ${i + 1}/${totalTests}: ${test.name}`);
        console.log(`   📝 ${test.description}`);
        console.log(`   🔗 ${test.method} ${test.endpoint}`);

        try {
            const startTime = Date.now();
            const result = await callAPI(test.endpoint, test.method, test.data);
            const duration = Date.now() - startTime;

            console.log(`   ⏱️  Duration: ${duration}ms`);
            console.log(`   📊 Status: ${result.statusCode}`);

            // Validate response
            const validation = validateResponse(result, test.expectedFields);

            if (test.expectError) {
                // This test should fail gracefully
                if (result.statusCode === 400 && result.data && result.data.error) {
                    console.log(`   ✅ Expected error handled gracefully: ${result.data.error}`);
                    passedTests++;
                } else {
                    console.log(`   ⚠️  Expected graceful error, got: ${result.statusCode}`);
                }
            } else if (validation.valid && result.success) {
                console.log(`   ✅ PASSED - All validations successful`);
                passedTests++;

                // Store project ID for later tests
                if (result.data.projectId) {
                    createdProjectId = result.data.projectId;
                    console.log(`   📋 Created project: ${createdProjectId}`);
                }

                // Show key response data
                if (result.data.service) {
                    console.log(`   🔧 Service: ${result.data.service}`);
                }
                if (result.data.status) {
                    console.log(`   💚 Status: ${result.data.status}`);
                }
                if (result.data.version) {
                    console.log(`   📦 Version: ${result.data.version}`);
                }
            } else {
                console.log(`   ❌ FAILED - Validation issues:`);
                validation.issues.forEach(issue => {
                    console.log(`      • ${issue}`);
                });

                if (result.body && result.body.length < 500) {
                    console.log(`   📄 Response: ${result.body}`);
                }
            }

        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If we created a project, test script generation with it
    if (createdProjectId) {
        console.log(`\n🎯 Bonus Test: Script Generation with Valid Context`);
        console.log(`   📋 Using project: ${createdProjectId}`);

        try {
            const scriptResult = await callAPI('/scripts/generate', 'POST', {
                projectId: createdProjectId,
                scriptOptions: {
                    targetLength: 300,
                    videoStyle: 'engaging'
                }
            });

            if (scriptResult.success && scriptResult.data.script) {
                console.log(`   ✅ Script generated successfully!`);
                console.log(`   📊 Scenes: ${scriptResult.data.totalScenes}`);
                console.log(`   ⏱️  Duration: ${scriptResult.data.totalDuration}s`);
                passedTests += 0.5; // Bonus points
            } else {
                console.log(`   ⚠️  Script generation failed: ${scriptResult.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Script generation error: ${error.message}`);
        }
    }

    // Final results
    console.log(`\n📊 Test Results Summary`);
    console.log(`======================`);
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests >= totalTests * 0.9) {
        console.log(`✅ EXCELLENT - API Gateway is working perfectly!`);
    } else if (passedTests >= totalTests * 0.7) {
        console.log(`✅ GOOD - API Gateway is mostly working, minor issues to address`);
    } else if (passedTests >= totalTests * 0.5) {
        console.log(`⚠️ PARTIAL - API Gateway has significant issues that need attention`);
    } else {
        console.log(`❌ CRITICAL - API Gateway is not working properly`);
    }

    console.log(`\n🎯 Next Steps:`);
    if (passedTests >= totalTests * 0.8) {
        console.log(`1. ✅ Your API Gateway is ready for production use`);
        console.log(`2. 🚀 You can proceed with GitHub Actions deployment`);
        console.log(`3. 📊 Consider setting up monitoring and alerting`);
    } else {
        console.log(`1. 🔍 Check CloudWatch logs for detailed error information`);
        console.log(`2. 🔧 Verify API key configuration and permissions`);
        console.log(`3. 🏗️  Consider redeploying the SAM template`);
    }

    if (createdProjectId) {
        console.log(`\n📋 Test Project Created: ${createdProjectId}`);
        console.log(`You can use this project ID for further testing of other pipeline components.`);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('Comprehensive Endpoint Testing Script');
        console.log('');
        console.log('Usage:');
        console.log('  API_URL="https://..." API_KEY="..." node test-all-endpoints.js');
        console.log('');
        console.log('Environment Variables:');
        console.log('  API_URL    - Your API Gateway URL');
        console.log('  API_KEY    - Your API Gateway API key');
        console.log('');
        console.log('Example:');
        console.log('  API_URL="https://abc123.execute-api.us-east-1.amazonaws.com/prod" \\');
        console.log('  API_KEY="gNmDejkM..." \\');
        console.log('  node test-all-endpoints.js');
    } else {
        testAllEndpoints().catch(error => {
            console.error('❌ Testing failed:', error);
            process.exit(1);
        });
    }
}

module.exports = {
    callAPI,
    validateResponse,
    testAllEndpoints
};