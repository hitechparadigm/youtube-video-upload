/**
 * Fix Lambda Configuration Issues
 * Based on comprehensive testing, fix the authentication and handler issues
 */

const https = require('https');

async function fixLambdaConfigurations() {
    console.log('🔧 FIXING LAMBDA CONFIGURATION ISSUES');
    console.log('=====================================');
    console.log('🎯 Goal: Fix authentication and handler configuration problems');
    console.log('');

    // The issues identified:
    // 1. Topic Management and Script Generator: "Missing Authentication Token"
    // 2. Audio Generator: "Internal server error" (runtime issue)
    // 3. Health endpoints: CloudFront 403 errors (routing issue)

    console.log('📋 ISSUE ANALYSIS FROM TESTING:');
    console.log('===============================');
    console.log('✅ Working: Manifest Builder, YouTube Publisher');
    console.log('🔐 Auth Issues: Topic Management, Script Generator');
    console.log('⏱️ Timeout: Media Curator (works but >30s)');
    console.log('❌ Runtime: Audio Generator (internal server error)');
    console.log('🌐 Routing: Health endpoints (CloudFront 403)');
    console.log('');

    // Based on lessons learned, the fixes needed are:
    console.log('🔧 REQUIRED FIXES:');
    console.log('==================');
    console.log('1. Update Lambda handler paths from "handler.handler" to "index.handler"');
    console.log('2. Update all functions to use layer v59 consistently');
    console.log('3. Fix timeout and memory allocation for processing functions');
    console.log('4. Add missing environment variables');
    console.log('');

    // Generate AWS CLI commands to fix the issues
    console.log('📝 AWS CLI COMMANDS TO FIX ISSUES:');
    console.log('==================================');
    console.log('');

    console.log('# 1. Fix Topic Management handler and configuration');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-topic-management-v3" \\');
    console.log('  --handler "index.handler" \\');
    console.log('  --timeout 300 \\');
    console.log('  --memory-size 1024 \\');
    console.log('  --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59"');
    console.log('');

    console.log('# 2. Fix Script Generator handler and configuration');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-script-generator-v3" \\');
    console.log('  --handler "index.handler" \\');
    console.log('  --timeout 300 \\');
    console.log('  --memory-size 1024 \\');
    console.log('  --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59"');
    console.log('');

    console.log('# 3. Fix Audio Generator (already has correct config but may need layer update)');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-audio-generator-v3" \\');
    console.log('  --handler "index.handler" \\');
    console.log('  --timeout 300 \\');
    console.log('  --memory-size 1024 \\');
    console.log('  --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59" \\');
    console.log('  --environment "Variables={S3_BUCKET_NAME=automated-video-pipeline-v2-786673323159-us-east-1,S3_BUCKET=automated-video-pipeline-v2-786673323159-us-east-1,CONTEXT_TABLE_NAME=automated-video-pipeline-context-v2,CONTEXT_TABLE=automated-video-pipeline-context-v2,API_KEYS_SECRET_NAME=automated-video-pipeline/api-keys,NODE_ENV=production}"');
    console.log('');

    console.log('# 4. Ensure Media Curator has proper timeout (already working but timing out via API Gateway)');
    console.log('aws lambda update-function-configuration \\');
    console.log('  --function-name "automated-video-pipeline-media-curator-v3" \\');
    console.log('  --handler "index.handler" \\');
    console.log('  --timeout 300 \\');
    console.log('  --memory-size 1024 \\');
    console.log('  --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59"');
    console.log('');

    console.log('# 5. Update all other functions to ensure consistency');
    const functions = [
        'automated-video-pipeline-video-assembler-v3',
        'automated-video-pipeline-manifest-builder-v3',
        'automated-video-pipeline-youtube-publisher-v3',
        'automated-video-pipeline-workflow-orchestrator-v3'
    ];

    functions.forEach(funcName => {
        console.log(`aws lambda update-function-configuration \\`);
        console.log(`  --function-name "${funcName}" \\`);
        console.log(`  --handler "index.handler" \\`);
        console.log(`  --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59"`);
        console.log('');
    });

    console.log('💡 EXPLANATION OF FIXES:');
    console.log('========================');
    console.log('');
    console.log('🔧 Handler Path Fix:');
    console.log('  Problem: Functions configured with "handler.handler"');
    console.log('  Solution: Change to "index.handler" (matches actual code structure)');
    console.log('  Impact: Fixes "Missing Authentication Token" errors');
    console.log('');
    console.log('📦 Layer Consistency:');
    console.log('  Problem: Some functions using old layer versions');
    console.log('  Solution: All functions use layer v59 with complete dependencies');
    console.log('  Impact: Fixes runtime errors and shared utilities issues');
    console.log('');
    console.log('⏱️ Resource Allocation:');
    console.log('  Problem: Insufficient timeout/memory for external API operations');
    console.log('  Solution: 300s timeout, 1024MB memory for processing functions');
    console.log('  Impact: Allows Media Curator and Audio Generator to complete');
    console.log('');
    console.log('🔐 Environment Variables:');
    console.log('  Problem: Missing API_KEYS_SECRET_NAME in Audio Generator');
    console.log('  Solution: Add complete environment variable set');
    console.log('  Impact: Enables access to AWS Polly and external APIs');
    console.log('');

    return {
        fixesGenerated: true,
        commandsCount: functions.length + 4,
        priority: 'Run these AWS CLI commands to fix the issues'
    };
}

// Also create a test script to validate fixes
async function createPostFixValidation() {
    console.log('🧪 POST-FIX VALIDATION SCRIPT');
    console.log('=============================');
    console.log('Run this after applying the AWS CLI fixes:');
    console.log('');

    const validationTests = [{
            name: 'Topic Management - Should work after handler fix',
            endpoint: '/topic/analyze',
            method: 'POST',
            data: {
                topic: 'Travel to Argentina',
                targetAudience: 'travel enthusiasts',
                videoDuration: 180
            }
        },
        {
            name: 'Script Generator - Should work after handler fix',
            endpoint: '/script/generate',
            method: 'POST',
            data: {
                projectId: 'test-post-fix-' + Date.now(),
                targetDuration: 180
            }
        },
        {
            name: 'Audio Generator - Should work after layer/env fix',
            endpoint: '/audio/generate',
            method: 'POST',
            data: {
                projectId: '2025-10-17T00-26-06_travel-to-peru'
            }
        }
    ];

    console.log('node -e "');
    console.log('const https = require(\"https\");');
    console.log('');
    console.log('async function validateFixes() {');
    console.log('  console.log(\"🧪 VALIDATING FIXES...\");');
    console.log('  ');

    validationTests.forEach((test, index) => {
        console.log(`  // Test ${index + 1}: ${test.name}`);
        console.log(`  const result${index + 1} = await callAPI(\"${test.endpoint}\", \"${test.method}\", ${JSON.stringify(test.data)});`);
        console.log(`  console.log(\"${test.name}: \" + (result${index + 1}.success ? \"✅ FIXED\" : \"❌ Still broken\"));`);
        console.log('  ');
    });

    console.log('  if (result1.success && result2.success && result3.success) {');
    console.log('    console.log(\"🎉 ALL FIXES SUCCESSFUL - Ready for Argentina video!\");');
    console.log('  } else {');
    console.log('    console.log(\"⚠️ Some issues remain - check individual results\");');
    console.log('  }');
    console.log('}');
    console.log('');
    console.log('async function callAPI(endpoint, method, data) {');
    console.log('  return new Promise((resolve) => {');
    console.log('    const postData = JSON.stringify(data);');
    console.log('    const options = {');
    console.log('      hostname: \"8tczdwx7q9.execute-api.us-east-1.amazonaws.com\",');
    console.log('      port: 443,');
    console.log('      path: `/prod${endpoint}`,');
    console.log('      method: method,');
    console.log('      headers: {');
    console.log('        \"x-api-key\": \"Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx\",');
    console.log('        \"Content-Type\": \"application/json\",');
    console.log('        \"Content-Length\": Buffer.byteLength(postData)');
    console.log('      },');
    console.log('      timeout: 60000');
    console.log('    };');
    console.log('    const req = https.request(options, (res) => {');
    console.log('      let responseData = \"\";');
    console.log('      res.on(\"data\", (chunk) => responseData += chunk);');
    console.log('      res.on(\"end\", () => {');
    console.log('        try {');
    console.log('          const result = JSON.parse(responseData);');
    console.log('          resolve({ success: result.success || res.statusCode === 200, error: result.error || result.message });');
    console.log('        } catch (e) {');
    console.log('          resolve({ success: false, error: \"Parse error\" });');
    console.log('        }');
    console.log('      });');
    console.log('    });');
    console.log('    req.on(\"error\", (error) => resolve({ success: false, error: error.message }));');
    console.log('    req.on(\"timeout\", () => { req.destroy(); resolve({ success: false, error: \"timeout\" }); });');
    console.log('    req.write(postData);');
    console.log('    req.end();');
    console.log('  });');
    console.log('}');
    console.log('');
    console.log('validateFixes().catch(console.error);');
    console.log('"');
}

if (require.main === module) {
    fixLambdaConfigurations()
        .then(result => {
            console.log('\n🎯 NEXT STEPS:');
            console.log('==============');
            console.log('1. Run the AWS CLI commands above to fix the Lambda configurations');
            console.log('2. Wait 1-2 minutes for changes to propagate');
            console.log('3. Run the validation script to confirm fixes');
            console.log('4. Test the Argentina video creation pipeline');
            console.log('');
            console.log('📋 Expected Results After Fixes:');
            console.log('✅ Topic Management: Should create project contexts');
            console.log('✅ Script Generator: Should generate scripts');
            console.log('✅ Audio Generator: Should generate audio without runtime errors');
            console.log('✅ Complete Pipeline: Should create Argentina video end-to-end');
            console.log('');

            createPostFixValidation();
        })
        .catch(error => {
            console.error('❌ Fix generation failed:', error.message);
        });
}

module.exports = {
    fixLambdaConfigurations
};