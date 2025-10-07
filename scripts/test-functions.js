#!/usr/bin/env node

/**
 * Test Individual Lambda Functions
 * Tests each function individually to ensure they work
 */

const AWS = require('aws-sdk');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize AWS SDK
AWS.config.update({ region: REGION });
const lambda = new AWS.Lambda();

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test a Lambda function
 */
async function testFunction(functionName, payload) {
    try {
        log(`🧪 Testing ${functionName}...`, 'blue');
        
        const params = {
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        };
        
        const result = await lambda.invoke(params).promise();
        
        if (result.StatusCode === 200) {
            const response = JSON.parse(result.Payload);
            
            if (response.errorMessage) {
                log(`❌ ${functionName} failed: ${response.errorMessage}`, 'red');
                return false;
            } else {
                log(`✅ ${functionName} succeeded`, 'green');
                return true;
            }
        } else {
            log(`❌ ${functionName} returned status: ${result.StatusCode}`, 'red');
            return false;
        }
        
    } catch (error) {
        log(`❌ ${functionName} error: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Test all functions
 */
async function testAllFunctions() {
    log('🧪 Testing all Lambda functions...', 'blue');
    log('===================================', 'blue');
    
    const tests = [
        {
            name: 'automated-video-pipeline-topic-management-v2',
            payload: {
                httpMethod: 'GET',
                path: '/topics',
                queryStringParameters: {}
            }
        },
        {
            name: 'automated-video-pipeline-script-generator-v2',
            payload: {
                specificTopic: 'Best Investment Apps for Beginners in 2025',
                targetDuration: 480,
                targetAudience: 'beginners'
            }
        },
        {
            name: 'automated-video-pipeline-media-curator-v2',
            payload: {
                script: {
                    scenes: [
                        {
                            sceneId: 1,
                            visualRequirements: ['investment apps', 'smartphone', 'money']
                        }
                    ]
                },
                videoDuration: 480
            }
        },
        {
            name: 'automated-video-pipeline-audio-generator-v2',
            payload: {
                scriptText: [
                    {
                        narration: 'Welcome to our video about investment apps',
                        duration: 5
                    }
                ],
                voiceSettings: {
                    voiceId: 'Joanna',
                    engine: 'neural'
                }
            }
        },
        {
            name: 'automated-video-pipeline-video-assembler-v2',
            payload: {
                httpMethod: 'GET',
                path: '/video/status',
                queryStringParameters: { videoId: 'test-video' }
            }
        },
        {
            name: 'automated-video-pipeline-youtube-publisher-v2',
            payload: {
                httpMethod: 'GET',
                path: '/status',
                queryStringParameters: { videoId: 'test-video' }
            }
        },
        {
            name: 'automated-video-pipeline-workflow-orchestrator-v2',
            payload: {
                httpMethod: 'GET',
                path: '/stats',
                queryStringParameters: { timeRange: '24h' }
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const success = await testFunction(test.name, test.payload);
        if (success) {
            passed++;
        } else {
            failed++;
        }
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log('', 'reset');
    log('📊 Test Results:', 'blue');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
    
    if (failed === 0) {
        log('🎉 All functions are working!', 'green');
        return true;
    } else {
        log('⚠️ Some functions need attention', 'yellow');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        log('🧪 Lambda Function Testing', 'blue');
        log('==========================', 'blue');
        log('');
        
        const allPassed = await testAllFunctions();
        
        if (allPassed) {
            log('');
            log('🚀 Ready to upload first video!', 'green');
            log('Run: node scripts/upload-first-video.js', 'yellow');
        } else {
            log('');
            log('🔧 Fix the failing functions before proceeding', 'yellow');
        }
        
    } catch (error) {
        log(`❌ Testing failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testFunction, testAllFunctions };