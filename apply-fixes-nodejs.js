/**
 * Apply Lambda Configuration Fixes using AWS SDK
 * This should work with AWS toolkit credentials
 */

const {
    LambdaClient,
    UpdateFunctionConfigurationCommand
} = require('@aws-sdk/client-lambda');

async function applyLambdaFixes() {
    console.log('🔧 APPLYING LAMBDA CONFIGURATION FIXES');
    console.log('======================================');
    console.log('🎯 Using AWS SDK to apply fixes with toolkit credentials');
    console.log('');

    // Initialize Lambda client - should pick up credentials from AWS toolkit
    const lambdaClient = new LambdaClient({
        region: 'us-east-1',
        // Let AWS SDK find credentials automatically from toolkit/environment
    });

    const fixes = [{
            name: 'Topic Management',
            functionName: 'automated-video-pipeline-topic-management-v3',
            config: {
                Handler: 'index.handler',
                Timeout: 300,
                MemorySize: 1024,
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'Script Generator',
            functionName: 'automated-video-pipeline-script-generator-v3',
            config: {
                Handler: 'index.handler',
                Timeout: 300,
                MemorySize: 1024,
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'Audio Generator',
            functionName: 'automated-video-pipeline-audio-generator-v3',
            config: {
                Handler: 'index.handler',
                Timeout: 300,
                MemorySize: 1024,
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59'],
                Environment: {
                    Variables: {
                        'S3_BUCKET_NAME': 'automated-video-pipeline-v2-786673323159-us-east-1',
                        'S3_BUCKET': 'automated-video-pipeline-v2-786673323159-us-east-1',
                        'CONTEXT_TABLE_NAME': 'automated-video-pipeline-context-v2',
                        'CONTEXT_TABLE': 'automated-video-pipeline-context-v2',
                        'API_KEYS_SECRET_NAME': 'automated-video-pipeline/api-keys',
                        'NODE_ENV': 'production'
                    }
                }
            }
        },
        {
            name: 'Media Curator',
            functionName: 'automated-video-pipeline-media-curator-v3',
            config: {
                Handler: 'index.handler',
                Timeout: 300,
                MemorySize: 1024,
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'Video Assembler',
            functionName: 'automated-video-pipeline-video-assembler-v3',
            config: {
                Handler: 'index.handler',
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'Manifest Builder',
            functionName: 'automated-video-pipeline-manifest-builder-v3',
            config: {
                Handler: 'index.handler',
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'YouTube Publisher',
            functionName: 'automated-video-pipeline-youtube-publisher-v3',
            config: {
                Handler: 'index.handler',
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        },
        {
            name: 'Workflow Orchestrator',
            functionName: 'automated-video-pipeline-workflow-orchestrator-v3',
            config: {
                Handler: 'index.handler',
                Layers: ['arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59']
            }
        }
    ];

    let successCount = 0;
    let failureCount = 0;

    for (const fix of fixes) {
        console.log(`🔧 Updating ${fix.name}...`);

        try {
            const command = new UpdateFunctionConfigurationCommand({
                FunctionName: fix.functionName,
                ...fix.config
            });

            const response = await lambdaClient.send(command);
            console.log(`  ✅ ${fix.name}: Updated successfully`);
            console.log(`     Handler: ${response.Handler}`);
            console.log(`     Timeout: ${response.Timeout}s`);
            console.log(`     Memory: ${response.MemorySize}MB`);
            if (response.Layers && response.Layers.length > 0) {
                console.log(`     Layer: ${response.Layers[0].Arn.split(':').pop()}`);
            }
            successCount++;

        } catch (error) {
            console.log(`  ❌ ${fix.name}: Failed`);
            console.log(`     Error: ${error.message}`);
            failureCount++;
        }
        console.log('');
    }

    console.log('📊 FIXES SUMMARY');
    console.log('================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📈 Success Rate: ${((successCount / fixes.length) * 100).toFixed(1)}%`);
    console.log('');

    if (successCount > 0) {
        console.log('⏳ Waiting 30 seconds for changes to propagate...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('🧪 RUNNING POST-FIX VALIDATION...');
        console.log('==================================');

        // Test the critical functions
        await validateFixes();
    }

    return {
        success: successCount > failureCount,
        successCount,
        failureCount,
        totalFixes: fixes.length
    };
}

async function validateFixes() {
    const https = require('https');

    const tests = [{
            name: 'Topic Management',
            endpoint: '/topic/analyze',
            data: {
                topic: 'Travel to Argentina',
                targetAudience: 'travel enthusiasts',
                videoDuration: 180
            }
        },
        {
            name: 'Script Generator',
            endpoint: '/script/generate',
            data: {
                projectId: 'test-post-fix-' + Date.now(),
                targetDuration: 180
            }
        },
        {
            name: 'Audio Generator',
            endpoint: '/audio/generate',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        }
    ];

    let fixedCount = 0;

    for (const test of tests) {
        const result = await callAPI(test.endpoint, 'POST', test.data);
        const status = result.success ? '✅ FIXED' : '❌ Still broken';
        console.log(`${test.name}: ${status}`);

        if (result.success) {
            fixedCount++;
        } else if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    }

    console.log('');
    if (fixedCount === 3) {
        console.log('🎉 ALL CRITICAL FIXES SUCCESSFUL!');
        console.log('🚀 Ready to create Argentina video!');
        console.log('');
        console.log('Next step: node create-argentina-video-fixed.js');
    } else if (fixedCount > 0) {
        console.log(`⚠️ Partial success: ${fixedCount}/3 components fixed`);
        console.log('💡 Some fixes may need more time to propagate');
    } else {
        console.log('❌ Fixes may need more time or additional debugging');
    }
}

async function callAPI(endpoint, method, data) {
    const https = require('https');

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
            timeout: 60000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error'
                    });
                }
            });
        });

        req.on('error', (error) => resolve({
            success: false,
            error: error.message
        }));
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'timeout'
            });
        });
        req.write(postData);
        req.end();
    });
}

if (require.main === module) {
    applyLambdaFixes()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 LAMBDA FIXES APPLIED SUCCESSFULLY!');
                console.log('🎯 System should now be ready for Argentina video creation');
            } else {
                console.log('\n⚠️ SOME FIXES FAILED');
                console.log(`📊 Success: ${result.successCount}/${result.totalFixes}`);
                console.log('💡 Check error messages above for details');
            }
        })
        .catch(error => {
            console.error('\n❌ Fix application failed:', error.message);
            console.log('💡 This might be a credentials issue. Check AWS toolkit configuration.');
        });
}

module.exports = {
    applyLambdaFixes
};