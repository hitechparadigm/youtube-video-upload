/**
 * Fix Audio Generator Runtime Issues
 * Based on the "Internal server error" response, identify and fix the specific issue
 */

const https = require('https');

async function fixAudioGeneratorRuntime() {
    console.log('🔧 FIXING AUDIO GENERATOR RUNTIME ISSUES');
    console.log('========================================');
    console.log('🎯 Goal: Identify and fix the specific runtime error');
    console.log('');

    // The issue is likely one of these:
    console.log('🔍 POTENTIAL ISSUES:');
    console.log('===================');
    console.log('1. Missing environment variables (we added API_KEYS_SECRET_NAME)');
    console.log('2. Shared utilities layer import issues');
    console.log('3. AWS Polly permissions or configuration');
    console.log('4. Handler path mismatch');
    console.log('');

    // Let's check if the issue is with the handler by testing a simple health check
    console.log('📋 STEP 1: Test Basic Health Check');
    console.log('----------------------------------');

    const healthResult = await callAPI('/audio/health', 'GET', {});
    console.log(`Health Check: ${healthResult.success ? 'SUCCESS' : 'FAILED'}`);

    if (!healthResult.success) {
        console.log(`Error: ${healthResult.error}`);

        if (healthResult.error && typeof healthResult.error === 'object') {
            console.log('Error details:', JSON.stringify(healthResult.error));
        }
    }
    console.log('');

    // Based on the error pattern, let's apply specific fixes
    console.log('🔧 APPLYING TARGETED FIXES');
    console.log('==========================');

    console.log('Fix 1: Update Audio Generator with additional environment variables');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-audio-generator-v3" \\');
    console.log('  --environment "Variables={');
    console.log('    S3_BUCKET_NAME=automated-video-pipeline-v2-786673323159-us-east-1,');
    console.log('    S3_BUCKET=automated-video-pipeline-v2-786673323159-us-east-1,');
    console.log('    CONTEXT_TABLE_NAME=automated-video-pipeline-context-v2,');
    console.log('    CONTEXT_TABLE=automated-video-pipeline-context-v2,');
    console.log('    API_KEYS_SECRET_NAME=automated-video-pipeline/api-keys,');
    console.log('    AWS_REGION=us-east-1,');
    console.log('    NODE_ENV=production');
    console.log('  }" \\');
    console.log('  --region us-east-1 --profile hitechparadigm');
    console.log('');

    console.log('Fix 2: Ensure proper timeout and memory for Polly operations');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-audio-generator-v3" \\');
    console.log('  --timeout 300 \\');
    console.log('  --memory-size 1024 \\');
    console.log('  --region us-east-1 --profile hitechparadigm');
    console.log('');

    // Let's also check if the issue is with the specific project context
    console.log('📋 STEP 2: Test with Different Project Context');
    console.log('----------------------------------------------');

    // Test with a minimal project context
    const minimalTest = await callAPI('/audio/generate', 'POST', {
        projectId: 'test-minimal-' + Date.now(),
        // Provide minimal context to avoid dependency issues
        testMode: true
    });

    console.log(`Minimal Test: ${minimalTest.success ? 'SUCCESS' : 'FAILED'}`);
    if (!minimalTest.success) {
        console.log(`Error: ${minimalTest.error}`);
    }
    console.log('');

    return {
        healthWorking: healthResult.success,
        minimalWorking: minimalTest.success,
        needsEnvironmentFix: !healthResult.success,
        needsContextFix: !minimalTest.success
    };
}

async function callAPI(endpoint, method, data) {
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
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({
                        success: result.success || res.statusCode === 200,
                        error: result.error || result.message,
                        response: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error',
                        response: responseData
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
    fixAudioGeneratorRuntime()
        .then(result => {
            console.log('📊 DIAGNOSIS RESULTS');
            console.log('====================');
            console.log(`Health Check: ${result.healthWorking ? 'WORKING' : 'FAILED'}`);
            console.log(`Minimal Test: ${result.minimalWorking ? 'WORKING' : 'FAILED'}`);
            console.log('');

            if (!result.healthWorking) {
                console.log('🔧 RECOMMENDED FIXES:');
                console.log('1. Apply the environment variable fix above');
                console.log('2. Ensure AWS_REGION is set correctly');
                console.log('3. Check if shared utilities layer is accessible');
            } else {
                console.log('✅ Basic function is working - issue is with specific audio generation logic');
            }
        })
        .catch(error => {
            console.error('❌ Runtime fix analysis failed:', error.message);
        });
}

module.exports = {
    fixAudioGeneratorRuntime
};